"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ModelProvider = "chatgpt" | "deepseek" | "gemini" | "qwen" | "glm";

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

const providerOrder: ModelProvider[] = ["glm", "qwen", "deepseek", "gemini", "chatgpt"];
const labels: Record<ModelProvider, string> = {
  glm: "GLM",
  qwen: "Qwen",
  deepseek: "DeepSeek",
  gemini: "Gemini",
  chatgpt: "ChatGPT"
};

export default function ConnectionTestPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ConnectionResult[]>([]);
  const [testedAt, setTestedAt] = useState("");
  const [error, setError] = useState("");

  const sortedResults = useMemo(() => {
    const rank = new Map(providerOrder.map((value, idx) => [value, idx]));
    return [...results].sort((a, b) => (rank.get(a.provider) || 99) - (rank.get(b.provider) || 99));
  }, [results]);

  async function runTests(provider?: ModelProvider) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/connection-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(provider ? { provider } : {})
      });

      const data = (await res.json().catch(() => ({}))) as {
        testedAt?: string;
        results?: ConnectionResult[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data?.error || "Connection test request failed");
      }

      const fetched = Array.isArray(data.results) ? data.results : [];
      setTestedAt(String(data.testedAt || ""));

      // Preserve previous results when running a single-provider test.
      if (provider && fetched.length === 1) {
        setResults((prev) => {
          const next = prev.filter((item) => item.provider !== provider);
          next.push(fetched[0]);
          return next;
        });
      } else {
        setResults(fetched);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function statusClass(item: ConnectionResult) {
    if (item.ok) return "ok";
    if (item.reason === "missing_key") return "warn";
    return "bad";
  }

  return (
    <div className="conn-shell">
      <header className="conn-head panel">
        <div>
          <h1>Connection Test</h1>
          <p className="panel-sub">Run quick connectivity checks for GLM, Qwen, DeepSeek, Gemini, and ChatGPT.</p>
          {testedAt ? <p className="panel-sub">Last tested: {testedAt}</p> : null}
        </div>
        <div className="conn-head-actions">
          <Link href="/" className="light-button">
            Back to Roleplay
          </Link>
          <button type="button" className="primary-button conn-run-all" onClick={() => void runTests()} disabled={loading}>
            {loading ? "Testing..." : "Run All Tests"}
          </button>
        </div>
      </header>

      <section className="panel conn-tools">
        <p className="panel-sub">Single-provider retest</p>
        <div className="conn-provider-actions">
          {providerOrder.map((provider) => (
            <button
              key={provider}
              type="button"
              className="light-button conn-provider-btn"
              onClick={() => void runTests(provider)}
              disabled={loading}
            >
              Test {labels[provider]}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <section className="panel">
          <p className="conn-global-error">{error}</p>
        </section>
      ) : null}

      <section className="conn-results">
        {sortedResults.map((item) => (
          <article key={item.provider} className="panel conn-card">
            <div className="conn-card-head">
              <h2>{item.label}</h2>
              <span className={`conn-status ${statusClass(item)}`}>
                {item.ok ? "Connected" : item.reason === "missing_key" ? "Missing Key" : "Failed"}
              </span>
            </div>
            <p className="conn-meta">Latency: {item.latencyMs}ms</p>
            <p className="conn-meta">Configured model: {item.configuredModel}</p>
            <p className="conn-meta">Configured endpoint: {item.configuredEndpoint}</p>
            {item.usedModel ? <p className="conn-meta">Used model: {item.usedModel}</p> : null}
            {item.usedEndpoint ? <p className="conn-meta">Used endpoint: {item.usedEndpoint}</p> : null}
            {item.finishReason ? <p className="conn-meta">Finish reason: {item.finishReason}</p> : null}
            {item.replyPreview ? <p className="conn-preview">Reply preview: {item.replyPreview}</p> : null}
            {item.error ? <pre className="conn-error">{item.error}</pre> : null}
          </article>
        ))}
      </section>
    </div>
  );
}
