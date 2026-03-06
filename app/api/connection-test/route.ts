import { NextResponse } from "next/server";
import { createChatCompletionWithMeta } from "../../../lib/bigmodel";
import { getProviderConfig, type ModelProvider } from "../../../lib/model";

const providers: ModelProvider[] = ["glm", "qwen", "deepseek", "gemini", "chatgpt"];

type ConnectionResult = {
  provider: ModelProvider;
  label: string;
  ok: boolean;
  reason: "success" | "missing_key" | "request_failed";
  latencyMs: number;
  configuredModel: string;
  configuredEndpoint: string;
  usedModel?: string;
  usedEndpoint?: string;
  finishReason?: string;
  replyPreview?: string;
  error?: string;
};

function normalizeProvider(input: unknown): ModelProvider | null {
  const value = String(input || "").toLowerCase();
  if (value === "glm" || value === "qwen" || value === "deepseek" || value === "gemini" || value === "chatgpt") {
    return value;
  }
  return null;
}

function shortText(value: string, max = 220) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

async function testOneProvider(provider: ModelProvider): Promise<ConnectionResult> {
  const config = getProviderConfig(provider);
  const start = Date.now();

  if (!config.apiKey) {
    return {
      provider,
      label: config.label,
      ok: false,
      reason: "missing_key",
      latencyMs: Date.now() - start,
      configuredModel: config.model,
      configuredEndpoint: config.endpoint,
      error: `Missing ${config.keyEnvName}`
    };
  }

  try {
    const maxTokens = provider === "glm" ? 2048 : 256;

    const result = await createChatCompletionWithMeta(
      [
        { role: "system", content: "Reply with exactly one short word: PONG." },
        { role: "user", content: "ping" }
      ],
      { temperature: 0.2, maxTokens },
      provider
    );

    return {
      provider,
      label: config.label,
      ok: true,
      reason: "success",
      latencyMs: Date.now() - start,
      configuredModel: config.model,
      configuredEndpoint: config.endpoint,
      usedModel: result.model,
      usedEndpoint: result.endpoint,
      finishReason: result.finishReason,
      replyPreview: shortText(result.text, 80)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      provider,
      label: config.label,
      ok: false,
      reason: "request_failed",
      latencyMs: Date.now() - start,
      configuredModel: config.model,
      configuredEndpoint: config.endpoint,
      error: shortText(message, 700)
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { provider?: string };
    const provider = normalizeProvider(body?.provider);
    const targetProviders = provider ? [provider] : providers;

    const results = await Promise.all(targetProviders.map((item) => testOneProvider(item)));
    return NextResponse.json({
      testedAt: new Date().toISOString(),
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
