import { getProviderConfig, type ModelProvider, type ProviderConfig } from "./model";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatOptions = {
  temperature: number;
  maxTokens: number;
};

type CreateChatResult = {
  text: string;
  finishReason: string;
  model: string;
  endpoint: string;
};

type AttemptPlan = {
  endpoint: string;
  model: string;
};

function joinContentParts(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object") {
          const node = part as Record<string, unknown>;
          if (typeof node.text === "string") {
            return node.text;
          }
          if (typeof node.content === "string") {
            return node.content;
          }
        }

        return "";
      })
      .join("")
      .trim();

    return text;
  }

  return "";
}

function extractModelText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const data = payload as Record<string, unknown>;
  const choices = data.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return "";
  }

  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    return "";
  }

  const choice = firstChoice as Record<string, unknown>;
  const message = choice.message as Record<string, unknown> | undefined;

  const contentText = joinContentParts(message?.content);
  if (contentText) {
    return contentText;
  }

  if (typeof message?.refusal === "string" && message.refusal.trim()) {
    return `Model refusal: ${message.refusal.trim()}`;
  }

  const delta = choice.delta as Record<string, unknown> | undefined;
  if (typeof delta?.content === "string" && delta.content.trim()) {
    return delta.content.trim();
  }

  return "";
}

function extractProviderError(status: number, payload: unknown): string {
  if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    const error = data.error as Record<string, unknown> | undefined;
    if (typeof error?.message === "string" && error.message.trim()) {
      return `Model API error: ${error.message.trim()}`;
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return `Model API error: ${data.message.trim()}`;
    }
    if (typeof data.msg === "string" && data.msg.trim()) {
      return `Model API error: ${data.msg.trim()}`;
    }
  }

  return `Model API request failed (HTTP ${status})`;
}

function extractFinishReason(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "unknown";
  }

  const data = payload as Record<string, unknown>;
  const choices = data.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return "unknown";
  }

  const first = choices[0];
  if (!first || typeof first !== "object") {
    return "unknown";
  }

  const choice = first as Record<string, unknown>;
  if (typeof choice.finish_reason === "string" && choice.finish_reason.trim()) {
    return choice.finish_reason.trim();
  }

  return "unknown";
}

function uniqueList(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const text = value.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    output.push(text);
  }
  return output;
}

function modelCandidates(provider: ModelProvider, model: string) {
  if (provider !== "gemini") {
    return [model];
  }

  const fallback = [
    model,
    model.replace(/-lite$/i, ""),
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ];

  return uniqueList(fallback);
}

function endpointCandidates(provider: ModelProvider, endpoint: string) {
  if (provider === "qwen") {
    const list = [endpoint];
    const hosts = [
      "dashscope-us.aliyuncs.com",
      "dashscope-intl.aliyuncs.com",
      "dashscope.aliyuncs.com"
    ];
    const current = hosts.find((host) => endpoint.includes(host));
    if (current) {
      for (const host of hosts) {
        if (host !== current) {
          list.push(endpoint.replace(current, host));
        }
      }
    }
    return uniqueList(list);
  }

  if (provider === "gemini") {
    const list = [endpoint];
    if (endpoint.includes("/v1beta/openai")) {
      list.push(endpoint.replace("/v1beta/openai", "/v1/openai"));
    }
    if (endpoint.includes("/v1/openai")) {
      list.push(endpoint.replace("/v1/openai", "/v1beta/openai"));
    }
    return uniqueList(list);
  }

  return [endpoint];
}

function buildAttempts(provider: ModelProvider, endpoint: string, model: string): AttemptPlan[] {
  const endpoints = endpointCandidates(provider, endpoint);
  const models = modelCandidates(provider, model);
  const plans: AttemptPlan[] = [];

  for (const ep of endpoints) {
    for (const m of models) {
      plans.push({ endpoint: ep, model: m });
    }
  }

  return plans;
}

function shouldUseMaxCompletionTokens(provider: ModelProvider, model: string) {
  if (provider !== "chatgpt") return false;
  return /^gpt-5/i.test(model) || /^o[1-9]/i.test(model);
}

function createHeaders(provider: ModelProvider, apiKey: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  };

  if (provider === "gemini") {
    headers["x-goog-api-key"] = apiKey;
  }

  if (provider === "qwen") {
    headers["X-DashScope-Api-Key"] = apiKey;
  }

  return headers;
}

function createBody(
  provider: ModelProvider,
  model: string,
  messages: ChatMessage[],
  options: ChatOptions
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages
  };

  if (provider === "chatgpt" && /^gpt-5/i.test(model)) {
    body.temperature = 1;
  } else {
    body.temperature = options.temperature;
  }

  if (shouldUseMaxCompletionTokens(provider, model)) {
    body.max_completion_tokens = options.maxTokens;
  } else {
    body.max_tokens = options.maxTokens;
  }

  return body;
}

function geminiNativeBases(configuredEndpoint: string) {
  const raw = configuredEndpoint.replace(/\/+$/, "");
  const bases: string[] = [];
  const v1beta = raw.match(/^(https?:\/\/[^/]+\/v1beta)\b/i)?.[1];
  const v1 = raw.match(/^(https?:\/\/[^/]+\/v1)\b/i)?.[1];
  if (v1beta) bases.push(v1beta);
  if (v1) bases.push(v1);
  bases.push("https://generativelanguage.googleapis.com/v1beta");
  bases.push("https://generativelanguage.googleapis.com/v1");
  return uniqueList(bases.map((item) => item.replace(/\/+$/, "")));
}

function createGeminiNativeBody(messages: ChatMessage[], options: ChatOptions) {
  const systemText = messages
    .filter((item) => item.role === "system")
    .map((item) => item.content.trim())
    .filter(Boolean)
    .join("\n\n");

  const conversation = messages.filter((item) => item.role !== "system");
  const contents = (conversation.length ? conversation : [{ role: "user" as const, content: "ping" }]).map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content }]
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options.temperature,
      maxOutputTokens: options.maxTokens
    }
  };

  if (systemText) {
    body.systemInstruction = {
      parts: [{ text: systemText }]
    };
  }

  return body;
}

function extractGeminiNativeText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as Record<string, unknown>;
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const first = candidates[0] as Record<string, unknown>;
  const content = first.content as Record<string, unknown> | undefined;
  const parts = content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const node = part as Record<string, unknown>;
      return typeof node.text === "string" ? node.text : "";
    })
    .join("")
    .trim();
}

function extractGeminiNativeFinishReason(payload: unknown) {
  if (!payload || typeof payload !== "object") return "unknown";
  const data = payload as Record<string, unknown>;
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "unknown";
  const first = candidates[0] as Record<string, unknown>;
  const finishReason = first.finishReason;
  return typeof finishReason === "string" && finishReason.trim() ? finishReason : "unknown";
}

async function callGeminiNative(
  provider: ProviderConfig,
  messages: ChatMessage[],
  options: ChatOptions
): Promise<CreateChatResult> {
  const models = modelCandidates("gemini", provider.model);
  const bases = geminiNativeBases(provider.endpoint);
  const errors: string[] = [];

  for (const base of bases) {
    for (const model of models) {
      const endpoint = `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(
        provider.apiKey
      )}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(createGeminiNativeBody(messages, options))
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = extractProviderError(response.status, payload);
        errors.push(`${model} @ ${endpoint} -> ${err}`);
        continue;
      }

      const text = extractGeminiNativeText(payload);
      const finishReason = extractGeminiNativeFinishReason(payload);
      if (!text) {
        errors.push(`${model} @ ${endpoint} -> Model returned empty content (finish_reason: ${finishReason})`);
        continue;
      }

      return {
        text,
        finishReason,
        model,
        endpoint
      };
    }
  }

  throw new Error(`Gemini native attempts failed: ${errors.join(" | ")}`);
}

async function callProvider(
  messages: ChatMessage[],
  options: ChatOptions,
  providerInput?: ModelProvider
): Promise<CreateChatResult> {
  const provider = getProviderConfig(providerInput);
  if (!provider.apiKey) {
    throw new Error(`Missing ${provider.keyEnvName}.`);
  }

  const errors: string[] = [];

  if (provider.provider === "gemini") {
    try {
      return await callGeminiNative(provider, messages, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(message);
    }
  }

  const attempts = buildAttempts(provider.provider, provider.endpoint, provider.model);

  for (const attempt of attempts) {
    const response = await fetch(attempt.endpoint, {
      method: "POST",
      headers: createHeaders(provider.provider, provider.apiKey),
      body: JSON.stringify(createBody(provider.provider, attempt.model, messages, options))
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = extractProviderError(response.status, payload);
      errors.push(`${attempt.model} @ ${attempt.endpoint} -> ${err}`);
      continue;
    }

    const text = extractModelText(payload);
    const finishReason = extractFinishReason(payload);
    if (!text) {
      const err = `Model returned empty content (finish_reason: ${finishReason})`;
      errors.push(`${attempt.model} @ ${attempt.endpoint} -> ${err}`);
      continue;
    }

    return {
      text,
      finishReason,
      model: attempt.model,
      endpoint: attempt.endpoint
    };
  }

  if (errors.length) {
    throw new Error(`All provider attempts failed: ${errors.join(" | ")}`);
  }

  throw new Error("Model API request failed.");
}

export async function createChatCompletion(
  messages: ChatMessage[],
  options: ChatOptions,
  providerInput?: ModelProvider
) {
  const result = await callProvider(messages, options, providerInput);
  return result.text;
}

export async function createChatCompletionWithMeta(
  messages: ChatMessage[],
  options: ChatOptions,
  providerInput?: ModelProvider
): Promise<CreateChatResult> {
  return callProvider(messages, options, providerInput);
}
