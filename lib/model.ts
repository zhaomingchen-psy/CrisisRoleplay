export type ModelProvider = "chatgpt" | "deepseek" | "gemini" | "qwen" | "glm";

export type ProviderConfig = {
  provider: ModelProvider;
  label: string;
  apiKey: string;
  model: string;
  endpoint: string;
  keyEnvName: string;
};

function firstNonEmpty(values: Array<string | undefined>) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function ensureEndpoint(baseOrEndpoint: string, fallbackBase: string, pathSuffix: string) {
  const raw = (baseOrEndpoint || fallbackBase).trim();
  if (!raw) return `${fallbackBase.replace(/\/+$/, "")}${pathSuffix}`;

  // If caller already provided a full completions endpoint, use as-is.
  if (/\/chat\/completions\/?$/i.test(raw) || /\/api\/paas\/v4\/chat\/completions\/?$/i.test(raw)) {
    return raw.replace(/\/+$/, "");
  }

  return `${raw.replace(/\/+$/, "")}${pathSuffix}`;
}

function normalizeProvider(input: string | undefined): ModelProvider {
  const value = String(input || "glm").toLowerCase();
  if (value === "chatgpt") return "chatgpt";
  if (value === "deepseek") return "deepseek";
  if (value === "gemini") return "gemini";
  if (value === "qwen") return "qwen";
  return "glm";
}

export function getProviderConfig(input?: string): ProviderConfig {
  const provider = normalizeProvider(input);

  if (provider === "chatgpt") {
    const apiKey = firstNonEmpty([process.env.OPENAI_API_KEY, process.env.CHATGPT_API_KEY]);
    const model = firstNonEmpty([process.env.OPENAI_MODEL, process.env.CHATGPT_MODEL]) || "gpt-4o-mini";
    const base = firstNonEmpty([process.env.OPENAI_BASE_URL, process.env.CHATGPT_BASE_URL]) || "https://api.openai.com/v1";

    return {
      provider,
      label: "ChatGPT",
      apiKey,
      model,
      endpoint: ensureEndpoint(base, "https://api.openai.com/v1", "/chat/completions"),
      keyEnvName: "OPENAI_API_KEY"
    };
  }

  if (provider === "deepseek") {
    const apiKey = firstNonEmpty([process.env.DEEPSEEK_API_KEY]);
    const model = firstNonEmpty([process.env.DEEPSEEK_MODEL]) || "deepseek-chat";
    const base = firstNonEmpty([process.env.DEEPSEEK_BASE_URL]) || "https://api.deepseek.com/v1";

    return {
      provider,
      label: "DeepSeek",
      apiKey,
      model,
      endpoint: ensureEndpoint(base, "https://api.deepseek.com/v1", "/chat/completions"),
      keyEnvName: "DEEPSEEK_API_KEY"
    };
  }

  if (provider === "gemini") {
    const apiKey = firstNonEmpty([process.env.GEMINI_API_KEY, process.env.GOOGLE_API_KEY]);
    const model = firstNonEmpty([process.env.GEMINI_MODEL]) || "gemini-2.0-flash-lite";
    const base = firstNonEmpty([process.env.GEMINI_BASE_URL]) || "https://generativelanguage.googleapis.com/v1beta/openai";

    return {
      provider,
      label: "Gemini",
      apiKey,
      model,
      endpoint: ensureEndpoint(base, "https://generativelanguage.googleapis.com/v1beta/openai", "/chat/completions"),
      keyEnvName: "GEMINI_API_KEY"
    };
  }

  if (provider === "qwen") {
    const apiKey = firstNonEmpty([process.env.QWEN_API_KEY]);
    const model = firstNonEmpty([process.env.QWEN_MODEL]) || "qwen-flash";
    const base = firstNonEmpty([process.env.QWEN_BASE_URL]) || "https://dashscope.aliyuncs.com/compatible-mode/v1";

    return {
      provider,
      label: "Qwen",
      apiKey,
      model,
      endpoint: ensureEndpoint(base, "https://dashscope.aliyuncs.com/compatible-mode/v1", "/chat/completions"),
      keyEnvName: "QWEN_API_KEY"
    };
  }

  const apiKey = firstNonEmpty([process.env.GLM_API_KEY, process.env.BIGMODEL_API_KEY]);
  const model = firstNonEmpty([process.env.GLM_MODEL, process.env.BIGMODEL_MODEL]) || "GLM-4.7-FlashX";
  const base = firstNonEmpty([process.env.GLM_BASE_URL, process.env.BIGMODEL_BASE_URL]) || "https://open.bigmodel.cn";

  return {
    provider: "glm",
    label: "GLM",
    apiKey,
    model,
    endpoint: ensureEndpoint(base, "https://open.bigmodel.cn", "/api/paas/v4/chat/completions"),
    keyEnvName: "GLM_API_KEY (or BIGMODEL_API_KEY)"
  };
}
