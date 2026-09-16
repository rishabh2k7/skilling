import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { askAI, getProviderStatus } from "./ai.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

/* ---------- API routes ---------- */

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, provider: getProviderStatus() });
});

app.get("/api/skills", (_req, res) => {
  res.json({
    role: "Full Stack Developer",
    readiness: 64,
    skills: [
      { name: "JavaScript", value: 90, tone: "strong" },
      { name: "React", value: 82, tone: "strong" },
      { name: "SQL", value: 70, tone: "steady" },
      { name: "Node.js", value: 65, tone: "steady" },
      { name: "Docker", value: 40, tone: "gap" },
      { name: "AWS", value: 30, tone: "gap" },
    ],
  });
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "message is required" });
    }
    const reply = await askAI(String(message), history);
    res.json({ reply, provider: getProviderStatus() });
  } catch (err) {
    console.error("[ai] error:", err.message);
    res.status(502).json({ error: err.message || "AI request failed" });
  }
});

/* ---------- Static frontend (production) ---------- */

const distDir = path.join(__dirname, "..", "dist");
app.use(express.static(distDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, () => {
  const status = getProviderStatus();
  console.log(`API server ready on http://localhost:${PORT}`);
  console.log(
    status.configured
      ? `AI provider: ${status.provider} (${status.model})`
      : "AI provider: none configured — add an API key to .env (see README)"
  );
});
