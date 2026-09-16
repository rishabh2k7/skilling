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
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
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

export async function askAI(message, history = []) {
  const provider = activeProvider();
  if (!provider) {
    throw new Error(
      "No AI provider configured. Add one API key to .env: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY."
    );
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history
      .filter((m) => m && m.text)
      .slice(-8)
      .map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: String(m.text) })),
    { role: "user", content: message },
  ];

  const response = await fetch(provider.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env[provider.envKey]}`,
      ...(provider.headers || {}),
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${provider.id} API error ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error(`${provider.id} returned no content`);
  return reply;
}
