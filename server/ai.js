/**
 * Multi-provider AI layer.
 *
 * Set ONE of these in your .env file and the server picks it up automatically:
 *   OPENAI_API_KEY / OPENAI_MODEL       (default gpt-4o-mini)
 *   ANTHROPIC_API_KEY / ANTHROPIC_MODEL (default claude-sonnet-4-5)
 *   GEMINI_API_KEY / GEMINI_MODEL       (default gemini-2.0-flash)
 *   GROQ_API_KEY / GROQ_MODEL           (default llama-3.3-70b-versatile)
 *   OPENROUTER_API_KEY / OPENROUTER_MODEL
 *
 * All providers are called through their OpenAI-compatible chat API, so the
 * request shape is identical — only the base URL and key differ.
 */

const SYSTEM_PROMPT = `You are the Skilling Signal Desk, a concise career-skills coach inside a demo app.
The demo learner is Aarav Mehta, targeting "Full Stack Developer".
His Skill DNA: JavaScript 90, React 82, SQL 70, Node.js 65, Docker 40 (next-best skill), AWS 30.
His current roadmap: build a Containerized REST API (Docker), take the Docker checkpoint, add a project reflection.
Style: 2-4 short sentences, practical, encouraging, no markdown headers, no bullet lists unless asked.`;

const PROVIDERS = [
  {
    id: "openai",
    envKey: "OPENAI_API_KEY",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1/chat/completions",
  },
  {
    id: "anthropic",
    envKey: "ANTHROPIC_API_KEY",
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
    baseUrl: "https://api.anthropic.com/v1/chat/completions",
    // Anthropic's OpenAI-compat endpoint needs the version header
    headers: { "anthropic-version": "2023-06-01" },
  },
  {
    id: "gemini",
    envKey: "GEMINI_API_KEY",
    // flash-lite has a far higher free-tier request limit than the flagship
    // flash models (which allow only ~20 req/min and 429 within seconds)
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  },
  {
    id: "groq",
    envKey: "GROQ_API_KEY",
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
  },
  {
    id: "openrouter",
    envKey: "OPENROUTER_API_KEY",
    model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
  },
  {
    id: "ollama",
    envKey: "OLLAMA_BASE_URL",
    model: process.env.OLLAMA_MODEL || "llama3.2",
    baseUrl: (process.env.OLLAMA_BASE_URL || "http://localhost:11434") + "/v1/chat/completions",
  },
];

function activeProvider() {
  // Explicit override wins: AI_PROVIDER=groq etc.
  const forced = process.env.AI_PROVIDER;
  if (forced) {
    const found = PROVIDERS.find((p) => p.id === forced && process.env[p.envKey]);
    if (found) return found;
  }
  return PROVIDERS.find((p) => process.env[p.envKey]);
}

export function getProviderStatus() {
  const p = activeProvider();
  if (!p) return { configured: false };
  return { configured: true, provider: p.id, model: p.model };
}

export async function askAI(message, history = [], context = {}) {
  const provider = activeProvider();
  if (!provider) {
    throw Object.assign(
      new Error(
        "No AI provider configured. Add one API key to .env: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY."
      ),
      { kind: "not_configured" }
    );
  }

  // Personalize the system prompt with the caller's profile when available
  let systemPrompt = SYSTEM_PROMPT;
  if (context.profile) {
    const p = context.profile;
    systemPrompt +=
      `\nThe person you are advising is ${p.name}, targeting "${p.target_role || "Full Stack Developer"}" with readiness ${p.readiness}/100.` +
      (p.user_id ? " They have a personal account." : "");
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...history
      .filter((m) => m && m.text)
      .slice(-8)
      .map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: String(m.text) })),
    { role: "user", content: message },
  ];

  const body = JSON.stringify({
    model: provider.model,
    messages,
    // Gemini's thinking tokens count against this budget — keep headroom
    max_tokens: provider.id === "gemini" ? 1024 : 400,
    temperature: 0.7,
  });
  const headers = {
    "Content-Type": "application/json",
    ...(provider.authHeader
      ? provider.authHeader(process.env[provider.envKey])
      : { Authorization: `Bearer ${process.env[provider.envKey]}` }),
    ...(provider.headers || {}),
  };

  /* Free-tier providers (Gemini especially) fail intermittently with 429/503.
     Retry transient failures — for 429s, Google tells us exactly how long to wait
     ("Please retry in 32.19s"); wait that long when it's short enough to be sane. */
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(provider.baseUrl, { method: "POST", headers, body });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        const err = new Error(`${provider.id} API error ${response.status}: ${detail.slice(0, 200)}`);
        err.status = response.status;
        if (response.status === 429) {
          const hint = /retry in ([\d.]+)s/i.exec(detail);
          err.retryIn = hint ? Number(hint[1]) : null;
        }
        throw err;
      }
      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) throw new Error(`${provider.id} returned no content`);
      return reply;
    } catch (err) {
      lastErr = err;
      const transient = err.status === 429 || err.status === 503 || err.status === 529 || /fetch failed|network/i.test(err.message || "");
      if (!transient || attempt === 3) break;
      // Honor the provider's own retry hint when it exists and is reasonable;
      // otherwise short backoff for transient 5xx/load errors.
      let waitMs = attempt * 1200;
      if (err.status === 429 && err.retryIn != null) {
        if (err.retryIn > 20) break; // don't hang the request for a long quota window
        waitMs = err.retryIn * 1000 + 500;
      }
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  if (lastErr.status === 429) {
    throw Object.assign(new Error("The AI provider rate limit was hit — wait a few seconds and try again."), { kind: "rate_limited" });
  }
  if (lastErr.status === 503 || lastErr.status === 529) {
    throw Object.assign(new Error("The AI model is under heavy load right now — try again in a moment."), { kind: "overloaded" });
  }
  throw lastErr;
}
