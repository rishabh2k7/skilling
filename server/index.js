import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { askAI, getProviderStatus } from "./ai.js";
import { q } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

/* Resolve the demo profile (single-user demo: first profile in DB) */
function getProfile() {
  return q.profile.getDefault();
}

/* ---------------- Health ---------------- */

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, provider: getProviderStatus() });
});

/* ---------------- Profile + Skill DNA ---------------- */

app.get("/api/profile", (_req, res) => {
  const profile = getProfile();
  if (!profile) return res.status(404).json({ error: "no profile" });
  res.json(profile);
});

app.get("/api/skills", (_req, res) => {
  const profile = getProfile();
  if (!profile) return res.status(404).json({ error: "no profile" });
  res.json({
    role: profile.target_role,
    readiness: profile.readiness,
    nextBestSkill: profile.next_best_skill,
    skills: q.skills.listByProfile(profile.id),
  });
});

/* ---------------- Opportunities ---------------- */

app.get("/api/opportunities", (_req, res) => {
  const profile = getProfile();
  const all = q.opportunities.all();
  const saved = profile ? q.opportunities.saved(profile.id) : [];
  const savedMap = Object.fromEntries(saved.map((s) => [s.opportunity_id, s.applied]));
  res.json(
    all.map((o) => ({
      ...o,
      saved: !!savedMap[o.id],
      applied: savedMap[o.id] === 1,
    }))
  );
});

app.post("/api/opportunities/:id/save", (req, res) => {
  const profile = getProfile();
  const result = q.opportunities.toggleSave(profile.id, Number(req.params.id));
  res.json(result);
});

app.post("/api/opportunities/:id/apply", (req, res) => {
  const profile = getProfile();
  const applied = !!req.body?.applied;
  const result = q.opportunities.setApplied(profile.id, Number(req.params.id), applied);
  res.json(result);
});

/* ---------------- Roadmap ---------------- */

app.get("/api/roadmap", (_req, res) => {
  const profile = getProfile();
  if (!profile) return res.status(404).json({ error: "no profile" });
  const steps = q.roadmap.listByProfile(profile.id);
  const done = steps.filter((s) => s.status === "complete").length;
  res.json({ steps, done, total: steps.length });
});

app.post("/api/roadmap/:stepId", (req, res) => {
  const profile = getProfile();
  const complete = !!req.body?.complete;
  const done = q.roadmap.setComplete(profile.id, req.params.stepId, complete);
  if (done === null) return res.status(404).json({ error: "unknown step" });
  const steps = q.roadmap.listByProfile(profile.id);
  res.json({ steps, done, total: steps.length });
});

/* ---------------- Assessments ---------------- */

app.get("/api/assessments/next", (_req, res) => {
  const profile = getProfile();
  const a = q.assessments.firstForProfile(profile.id);
  if (!a) return res.status(404).json({ error: "no assessments" });
  res.json({
    id: a.id,
    skill: a.skill,
    question: a.question,
    options: a.options,
    attempts: q.assessments.attemptCount(profile.id),
  });
});

app.post("/api/assessments/:id/attempt", (req, res) => {
  const profile = getProfile();
  const selectedIndex = req.body?.selectedIndex;
  if (typeof selectedIndex !== "number") {
    return res.status(400).json({ error: "selectedIndex required" });
  }
  const { correct } = q.assessments.recordAttempt(
    Number(req.params.id),
    profile.id,
    selectedIndex
  );
  res.json({
    correct,
    feedback: correct
      ? "Correct. Your Docker signal is ready to move."
      : "Not quite — the useful distinction is portability.",
    detail: correct
      ? "This confirms the concept behind your next-best project."
      : "Review the difference between a container, a cloud provider, and a runtime, then try again.",
  });
});

/* ---------------- AI chat (persisted) ---------------- */

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "message is required" });
    }
    const profile = getProfile();
    const history = q.chat.history(profile.id, 10);

    const reply = await askAI(String(message), history);

    q.chat.add(profile.id, "user", String(message));
    q.chat.add(profile.id, "ai", reply);

    res.json({ reply, provider: getProviderStatus() });
  } catch (err) {
    console.error("[ai] error:", err.message);
    res.status(502).json({ error: err.message || "AI request failed" });
  }
});

app.get("/api/ai/chat/history", (_req, res) => {
  const profile = getProfile();
  res.json(q.chat.history(profile.id, 100));
});

/* ---------------- Academia aggregates ---------------- */

app.get("/api/academia", (_req, res) => {
  res.json({
    pulses: q.academia.pulses(),
    interventions: q.academia.interventions(),
    stats: {
      activeLearners: 1284,
      mappedSkills: 96,
      evidenceCreated: 3412,
      pathwayLift: 14,
    },
  });
});

/* ---------------- Static frontend (production) ---------------- */

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
