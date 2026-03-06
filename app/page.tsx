"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useMemo, useState } from "react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ReplySource = "model" | "unknown";
type ModelProvider = "chatgpt" | "deepseek" | "gemini" | "qwen" | "glm";

type CaseProfile = {
  title: string;
  riskLevel: string;
  background: string;
  goals: string[];
  redFlags: string[];
};

type CaseTemplate = {
  id: string;
  title: string;
  riskTag: "low" | "medium" | "high";
  description: string;
  brief: string;
  opening: string;
  profile: CaseProfile;
};

const caseTemplates: CaseTemplate[] = [
  {
    id: "college_passive_ideation",
    title: "Academic overload (low-medium risk)",
    riskTag: "low",
    description: "Practice alliance-building, emotion labeling, and stressor mapping.",
    brief:
      "Client has prolonged academic and relationship pressure. Goal: practice empathic reflection and collaborative exploration.",
    opening:
      "My mind has been racing lately. I can't sleep well, and the more I think, the more I feel like a failure.",
    profile: {
      title: "Graduate student with hopelessness and withdrawal",
      riskLevel: "Medium risk (requires ongoing assessment)",
      background:
        "22-year-old graduate student with stacked academic and relationship stress, poor sleep, reduced appetite, and social withdrawal.",
      goals: [
        "Build therapeutic alliance",
        "Assess passive vs active suicidal ideation",
        "Identify protective factors and support system"
      ],
      redFlags: ["Hopelessness", "Worsening night insomnia", "Avoidance of help-seeking"]
    }
  },
  {
    id: "workplace_recent_plan",
    title: "Relationship rupture + passive SI (medium risk)",
    riskTag: "medium",
    description: "Practice supportive direct inquiry and basic safety planning.",
    brief:
      "Client presents significant hopelessness after relationship rupture. Goal: practice warm but direct risk-assessment questions.",
    opening:
      "Lately everything feels meaningless. Last night I even thought maybe I should stop trying at all.",
    profile: {
      title: "Working adult with escalating crisis language",
      riskLevel: "High risk (may require urgent referral)",
      background:
        "29-year-old with one week of severe insomnia, recent layoff and debt stress, and reduced contact with family.",
      goals: [
        "Clarify current risk level",
        "Ask about plan/means/timeline",
        "Build immediate safety actions and referral path"
      ],
      redFlags: ["Plan-like language", "Weak support network", "Marked functional decline"]
    }
  },
  {
    id: "adolescent_self_harm_history",
    title: "Relapse risk with prior self-harm history (high risk)",
    riskTag: "high",
    description: "Practice escalation judgment and supervisor-referral awareness.",
    brief:
      "Client has prior self-harm history and rising family conflict. Goal: move quickly into structured safety assessment.",
    opening:
      "I don't want to say much. Talking doesn't help anyway. I've started wanting to hurt myself again.",
    profile: {
      title: "Adolescent with prior self-harm and relapse risk",
      riskLevel: "Medium-high risk (family/supervisor coordination needed)",
      background:
        "17-year-old high school student with prior self-harm. Family conflict increased recently, school attendance is dropping.",
      goals: [
        "Build emotional safety and alliance",
        "Assess triggers and immediate danger",
        "Include guardian and multi-party coordination"
      ],
      redFlags: ["High concealment", "Impulsivity risk", "Limited peer support"]
    }
  },
  {
    id: "burnout_healthcare_worker",
    title: "Burnout and emotional numbness (medium risk)",
    riskTag: "medium",
    description: "Practice validating fatigue while screening for self-harm risk.",
    brief:
      "Client is emotionally exhausted and detached. Goal: combine validation, gentle structure, and direct risk checks.",
    opening:
      "I feel empty all the time now. I used to care about people, but now I just feel done with everything.",
    profile: {
      title: "Healthcare worker with burnout and hopelessness",
      riskLevel: "Medium risk (monitor for escalation)",
      background:
        "31-year-old nurse with repeated overtime and poor sleep, reporting emotional numbness and social withdrawal.",
      goals: [
        "Validate burnout without normalizing risk",
        "Check passive/active self-harm thoughts",
        "Identify immediate supports for tonight"
      ],
      redFlags: ["Severe fatigue", "Meaninglessness", "Reduced connection to others"]
    }
  },
  {
    id: "postpartum_overwhelm",
    title: "Postpartum overwhelm and shame (medium-high risk)",
    riskTag: "high",
    description: "Practice compassionate inquiry under intense self-criticism.",
    brief:
      "Client reports severe overwhelm and shame in parenting role. Goal: maintain safety focus while reducing shame.",
    opening:
      "I keep thinking my baby deserves a better mom. Sometimes I scare myself with how dark my thoughts get.",
    profile: {
      title: "Postpartum distress with intrusive dark thoughts",
      riskLevel: "Medium-high risk (urgent assessment if active intent appears)",
      background: "26-year-old new parent with sleep deprivation, crying spells, and fear of being judged.",
      goals: [
        "Reduce shame and increase disclosure",
        "Assess intent/plan/timing clearly",
        "Engage support network quickly"
      ],
      redFlags: ["Self-worth collapse", "Sleep deprivation", "Fear-based concealment"]
    }
  },
  {
    id: "lgbtq_rejection_family",
    title: "Family rejection and identity distress (high risk)",
    riskTag: "high",
    description: "Practice culturally sensitive, direct safety inquiry.",
    brief:
      "Client reports rejection and active conflict at home. Goal: establish safety quickly and identify safe contacts.",
    opening:
      "My family says I'd be better off gone. I feel trapped in that house and I don't know how long I can take it.",
    profile: {
      title: "Identity-based rejection with acute distress",
      riskLevel: "High risk (safety planning required)",
      background: "19-year-old living at home, experiencing verbal hostility and fear of escalation.",
      goals: [
        "Build affirming alliance fast",
        "Assess immediate intent and means access",
        "Create practical same-day safety steps"
      ],
      redFlags: ["Hostile home environment", "Entrapment", "Escalating despair"]
    }
  },
  {
    id: "chronic_pain_hopelessness",
    title: "Chronic pain and hopelessness (medium-high risk)",
    riskTag: "high",
    description: "Practice integrating physical suffering with risk assessment.",
    brief:
      "Client has long-term pain and decreasing hope. Goal: keep empathy while clarifying dangerous thinking patterns.",
    opening: "Pain is there all day, every day. Sometimes I think ending everything would be the only real relief.",
    profile: {
      title: "Persistent pain with suicidal language",
      riskLevel: "Medium-high risk (needs structured assessment)",
      background: "47-year-old with chronic pain, job loss, and reduced daily functioning.",
      goals: [
        "Validate pain without reinforcing defeat",
        "Clarify ideation, intent, and timeframe",
        "Identify immediate reasons for living and supports"
      ],
      redFlags: ["Pain-related hopelessness", "Functional collapse", "Relief-seeking language"]
    }
  },
  {
    id: "international_student_visa_stress",
    title: "Visa stress and academic panic (medium risk)",
    riskTag: "medium",
    description: "Practice high-pressure problem framing with safety checks.",
    brief:
      "Client is under severe immigration and academic pressure. Goal: reduce panic, assess risk, and sequence next steps.",
    opening:
      "If I fail this term, I could lose my visa. I feel trapped and I've started thinking about ending it all.",
    profile: {
      title: "International student in acute pressure cycle",
      riskLevel: "Medium risk (watch for rapid escalation)",
      background: "24-year-old student facing visa uncertainty, financial stress, and limited local support.",
      goals: [
        "Stabilize panic enough for assessment",
        "Assess risk detail and immediacy",
        "Build short, concrete support actions"
      ],
      redFlags: ["Entrapment", "Catastrophic thinking", "Limited support access"]
    }
  }
];

const modelOptions: Array<{ value: ModelProvider; label: string }> = [
  { value: "glm", label: "GLM" },
  { value: "qwen", label: "Qwen" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "gemini", label: "Gemini" },
  { value: "chatgpt", label: "ChatGPT" }
];

function riskTone(level: string) {
  const value = level.toLowerCase();
  if (value.includes("high")) return "high";
  if (value.includes("medium")) return "mid";
  return "low";
}

export default function Home() {
  const [modelProvider, setModelProvider] = useState<ModelProvider>("deepseek");
  const [selectedCaseId, setSelectedCaseId] = useState<string>("random");
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [sessionIsBlind, setSessionIsBlind] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastReplySource, setLastReplySource] = useState<ReplySource>("unknown");
  const [lastTrace, setLastTrace] = useState("");

  const selectedCase = useMemo(
    () => caseTemplates.find((item) => item.id === selectedCaseId) ?? caseTemplates[0],
    [selectedCaseId]
  );

  const activeCase = useMemo(
    () => caseTemplates.find((item) => item.id === activeCaseId) ?? null,
    [activeCaseId]
  );

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading && Boolean(activeCase),
    [activeCase, input, loading]
  );
  const activeModelLabel = useMemo(
    () => modelOptions.find((item) => item.value === modelProvider)?.label || "GLM",
    [modelProvider]
  );

  function startSession() {
    const randomMode = selectedCaseId === "random";
    const sessionCase = randomMode
      ? caseTemplates[Math.floor(Math.random() * caseTemplates.length)]
      : selectedCase;
    setActiveCaseId(sessionCase.id);
    setSessionIsBlind(randomMode);
    setShowProfile(false);
    setMessages([{ role: "assistant", content: sessionCase.opening }]);
    setInput("");
    setLastReplySource("unknown");
    setLastTrace("");
  }

  function resetSession() {
    setActiveCaseId(null);
    setSessionIsBlind(false);
    setShowProfile(false);
    setMessages([]);
    setInput("");
    setLoading(false);
    setLastReplySource("unknown");
    setLastTrace("");
  }

  async function sendMessage() {
    if (!canSend || !activeCase) return;

    const nextUser: ChatMessage = { role: "user", content: input.trim() };
    const nextMessages = [...messages, nextUser];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/roleplay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: nextMessages,
          caseProfile: activeCase.profile,
          modelProvider
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Request failed");
      }

      const data = (await res.json()) as {
        reply: string;
        meta?: {
          source?: "model";
          calledApi?: boolean;
          provider?: ModelProvider;
          trace?: string[];
          model?: string;
          endpoint?: string;
          finishReason?: string;
          retried?: boolean;
        };
      };

      const assistantReply = data.reply || "No reply generated.";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantReply }]);
      setLastReplySource(data.meta?.source || "model");
      setLastTrace(
        data.meta?.calledApi
          ? `calledApi:true${data.meta?.provider ? ` | provider:${data.meta.provider}` : ""}${
              data.meta?.model ? ` | model:${data.meta.model}` : ""
            }${
              data.meta?.endpoint ? ` | endpoint:${data.meta.endpoint}` : ""
            }${data.meta?.finishReason ? ` | finishReason:${data.meta.finishReason}` : ""}${
              typeof data.meta?.retried === "boolean" ? ` | retried:${String(data.meta.retried)}` : ""
            }${data.meta?.trace?.length ? ` | ${data.meta.trace.join(" | ")}` : ""}`
          : "calledApi:false"
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) => [...prev, { role: "assistant", content: `System error: ${message}` }]);
      setLastReplySource("unknown");
      setLastTrace(`error:${message}`);
    } finally {
      setLoading(false);
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    await sendMessage();
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className="demo-shell ct-shell">
      <header className="window-bar">
        <div className="window-left">
          <button type="button" className="icon-button" aria-label="Close">
            ×
          </button>
          <p className="window-title">CrisisRoleplay</p>
        </div>
        <div className="window-right">
          <div className="header-model-picker">
            <label htmlFor="model-provider">Model</label>
            <select
              id="model-provider"
              value={modelProvider}
              onChange={(e) => setModelProvider(e.target.value as ModelProvider)}
            >
              {modelOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <Link href="/connection-test" className="light-button">
            Connection Test
          </Link>
          <button type="button" className="light-button" onClick={resetSession}>
            Reset
          </button>
        </div>
      </header>

      <main className="demo-main ct-main">
        {!activeCase ? (
          <section className="panel">
            <h2>Select a role-play scenario</h2>
            <p className="panel-sub">Choose one client profile to start a pure role-play session.</p>

            <div className="scenario-picker">
              <label htmlFor="scenario-select">Client scenario</label>
              <select id="scenario-select" value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)}>
                <option value="random">Random (Blind training mode)</option>
                {caseTemplates.map((item, idx) => (
                  <option key={item.id} value={item.id}>
                    {idx + 1}. {item.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="scenario-picker">
              <label htmlFor="scenario-model">Model provider</label>
              <select
                id="scenario-model"
                value={modelProvider}
                onChange={(e) => setModelProvider(e.target.value as ModelProvider)}
              >
                {modelOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="selected-scenario">
              <div className="scenario-head">
                <h3>{selectedCaseId === "random" ? "Random client will be selected at session start" : selectedCase.title}</h3>
                {selectedCaseId === "random" ? (
                  <span className="risk-badge mid">blind</span>
                ) : (
                  <span className={`risk-badge ${riskTone(selectedCase.profile.riskLevel)}`}>{selectedCase.riskTag}</span>
                )}
              </div>
              <p>
                {selectedCaseId === "random"
                  ? "Client details will be hidden during session to simulate realistic uncertainty."
                  : selectedCase.description}
              </p>
            </div>

            <div className="trainer-brief">
              <h4>Trainer brief</h4>
              <p>{selectedCaseId === "random" ? "Brief hidden in blind mode." : selectedCase.brief}</p>
            </div>

            {showProfile && selectedCaseId !== "random" ? (
              <div className="profile-box">
                <h4>Client profile</h4>
                <p>
                  <strong>Theme:</strong> {selectedCase.profile.title}
                </p>
                <p>
                  <strong>Risk level:</strong> {selectedCase.profile.riskLevel}
                </p>
                <p>
                  <strong>Background:</strong> {selectedCase.profile.background}
                </p>
                <p>
                  <strong>Training goals:</strong> {selectedCase.profile.goals.join(", ")}
                </p>
                <p>
                  <strong>Red flags:</strong> {selectedCase.profile.redFlags.join(", ")}
                </p>
              </div>
            ) : null}

            <div className="panel-actions">
              <p className="notice">Training simulation only. Not a crisis response service.</p>
              <button
                type="button"
                className="light-button"
                onClick={() => setShowProfile((v) => !v)}
                disabled={selectedCaseId === "random"}
              >
                {selectedCaseId === "random"
                  ? "Profile hidden in random mode"
                  : showProfile
                    ? "Hide client profile"
                    : "View client profile"}
              </button>
            </div>

            <button type="button" className="primary-button" onClick={startSession}>
              Start role play
            </button>
          </section>
        ) : (
          <section className="ct-layout">
            <aside className="ct-left">
              <div className="ct-brand panel">
                <h2>CrisisRoleplay</h2>
                <p className="panel-sub">Role play only mode (feedback removed)</p>
              </div>

              <div className="panel ct-card">
                <h3>Current Session</h3>
                <div className="ct-session-pill active">
                  <strong>Scenario</strong>
                  <span>{sessionIsBlind ? "Hidden profile (random mode)" : activeCase.title}</span>
                </div>
                <div className="ct-session-pill">
                  <strong>Model</strong>
                  <span>{activeModelLabel}</span>
                </div>
              </div>

              <div className="panel ct-card">
                <h3>Session Notice</h3>
                <p className="panel-sub">
                  This clone keeps only AI client role play. All feedback, coaching, and report generation modules are removed.
                </p>
              </div>
            </aside>

            <div className="ct-center panel">
              <div className="ct-chat-head">
                <div>
                  <h2>Anonymous Texter</h2>
                  <p className="panel-sub">Online · Simulated crisis</p>
                </div>
                {sessionIsBlind ? null : (
                  <span className={`risk-badge ${riskTone(activeCase.profile.riskLevel)}`}>{activeCase.riskTag}</span>
                )}
              </div>

              <p className="mode-indicator live">
                Live API · last source:
                {lastReplySource === "model" && " model output"}
                {lastReplySource === "unknown" && " n/a"}
              </p>
              {lastTrace ? <p className="trace-line">Trace: {lastTrace}</p> : null}

              <div className="chat-wrap ct-chat-wrap">
                <div className="chat-log">
                  {messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`bubble ${message.role}`}>
                      <strong>{message.role === "assistant" ? "Client" : "Counselor"}:</strong> {message.content}
                    </div>
                  ))}
                </div>

                <form className="chat-controls" onSubmit={onSend}>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onInputKeyDown}
                    placeholder="Type your response..."
                  />
                  <button type="submit" className="primary-button mini" disabled={!canSend}>
                    {loading ? "Sending..." : "Send"}
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
