import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { askAI, getProviderStatus } from "./ai.js";
import { qReady } from "./storage/index.js";
import { sessionMiddleware, authRoutes } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(sessionMiddleware);
authRoutes(app);

/* A missed async error must never take the whole API down (log instead of crash) */
process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandled rejection:", reason?.stack || reason);
});

/* Resolve the active storage driver (MongoDB Atlas when MONGODB_URI is set, else SQLite).
   Initialization is awaited once; every request just does `const q = await qReady()`. */
let qPromise = null;
function store() {
  if (!qPromise) qPromise = qReady();
  return qPromise;
}

async function getProfile(req) {
  const q = await store();
  if (req.user) {
    let profile = await q.profile.getByUserId(req.user.id);
    if (!profile) {
      profile = await q.profile.createForUser(req.user.id, req.user.name, "Full Stack Developer");
    }
    return profile;
  }
  return q.profile.getDefault();
}

/* ---------------- Health ---------------- */

app.get("/api/health", async (_req, res) => {
  const q = await store();
  const profileCount = await q.profile.countAll?.();
  res.json({
    ok: true,
    storage: q.driver === "mongodb" ? "mongodb-atlas" : "sqlite",
    profiles: typeof profileCount === "number" ? profileCount : undefined,
    provider: getProviderStatus(),
  });
});

/* ---------------- Profile + Skill DNA ---------------- */

app.get("/api/profile", async (req, res) => {
  const q = await store();
  const profile = await getProfile(req);
  if (!profile) return res.status(404).json({ error: "no profile" });
  res.json({
    ...profile,
    isDemo: !req.user,
    user: req.user ? { id: req.user.id, name: req.user.name, email: req.user.email } : null,
  });
});

app.get("/api/skills", async (req, res) => {
  const q = await store();
  const profile = await getProfile(req);
  if (!profile) return res.status(404).json({ error: "no profile" });
  res.json({
    role: profile.target_role,
    readiness: profile.readiness,
    nextBestSkill: profile.next_best_skill,
    isDemo: !req.user,
    skills: await q.skills.listByProfile(profile._id ?? profile.id),
  });
});

/* ---------------- Opportunities ---------------- */

app.get("/api/opportunities", async (req, res) => {
  const q = await store();
  const profile = await getProfile(req);
  const all = await q.opportunities.all();
  const saved = profile ? await q.opportunities.saved(profile._id ?? profile.id) : [];
  const savedMap = Object.fromEntries(saved.map((s) => [s.opportunity_id, s.applied]));
  res.json(
    all.map((o) => ({
      ...o,
      id: o.id ?? o._id,
      saved: o.id in savedMap || o._id in savedMap,
      applied: savedMap[o.id ?? o._id] === 1,
    }))
  );
});

app.post("/api/opportunities/:id/save", async (req, res) => {
  const q = await store();
  const profile = await getProfile(req);
  const result = await q.opportunities.toggleSave(profile._id ?? profile.id, Number(req.params.id));
  res.json(result);
});

app.post("/api/opportunities/:id/apply", async (req, res) => {
  const q = await store();
  const profile = await getProfile(req);
  const applied = !!req.body?.applied;
  const result = await q.opportunities.setApplied(profile._id ?? profile.id, Number(req.params.id), applied);
  res.json(result);
});

/* ---------------- Roadmap ---------------- */

app.get("/api/roadmap", async (req, res) => {
  const q = await store();
  const profile = await getProfile(req);
  if (!profile) return res.status(404).json({ error: "no profile" });
  const steps = await q.roadmap.listByProfile(profile._id ?? profile.id);
  const done = steps.filter((s) => s.status === "complete").length;
  res.json({ steps, done, total: steps.length });
});

app.post("/api/roadmap/:stepId", async (req, res) => {
  const q = await store();
  const profile = await getProfile(req);
  const complete = !!req.body?.complete;
  const done = await q.roadmap.setComplete(profile._id ?? profile.id, req.params.stepId, complete);
  if (done === null) return res.status(404).json({ error: "unknown step" });
  const steps = await q.roadmap.listByProfile(profile._id ?? profile.id);
  res.json({ steps, done, total: steps.length });
});

/* ---------------- Assessments ---------------- */

app.get("/api/assessments/next", async (req, res) => {
  const q = await store();
  const profile = await getProfile(req);
  const a = await q.assessments.firstForProfile(profile._id ?? profile.id);
  if (!a) return res.status(404).json({ error: "no assessments" });
  res.json({
    id: a.id ?? a._id,
    skill: a.skill,
    question: a.question,
    options: a.options,
    attempts: await q.assessments.attemptCount(profile._id ?? profile.id),
  });
});

app.post("/api/assessments/:id/attempt", async (req, res) => {
  const q = await store();
  const profile = await getProfile(req);
  const selectedIndex = req.body?.selectedIndex;
  if (typeof selectedIndex !== "number") {
    return res.status(400).json({ error: "selectedIndex required" });
  }
  const { correct } = await q.assessments.recordAttempt(
    Number(req.params.id),
    profile._id ?? profile.id,
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

/* ---------------- AI chat (persisted per user) ---------------- */

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "message is required" });
    }
    const q = await store();
    const profile = await getProfile(req);
    const history = await q.chat.history(profile._id ?? profile.id, 10);

    const reply = await askAI(String(message), history, { profile });

    await q.chat.add(profile._id ?? profile.id, "user", String(message));
    await q.chat.add(profile._id ?? profile.id, "ai", reply);

    res.json({ reply, provider: getProviderStatus() });
  } catch (err) {
    console.error("[ai] error:", err.message);
    res.status(err.kind === "not_configured" ? 503 : 502).json({
      error: err.message || "AI request failed",
      kind: err.kind || "provider_error",
    });
  }
});

app.get("/api/ai/chat/history", async (req, res) => {
  const q = await store();
  const profile = await getProfile(req);
  res.json(await q.chat.history(profile._id ?? profile.id, 100));
});

/* ---------------- Academia aggregates ---------------- */

app.get("/api/academia", async (_req, res) => {
  const q = await store();
  res.json({
    pulses: await q.academia.pulses(),
    interventions: await q.academia.interventions(),
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

/* Boot: initialize storage BEFORE accepting traffic, so a bad MONGODB_URI
   fails fast at startup instead of failing every request. */
async function main() {
  try {
    const q = await qReady();
    console.log(
      q.driver === "mongodb"
        ? "[db] MongoDB Atlas connected"
        : "[db] SQLite ready"
    );
  } catch (err) {
    console.error("[db] storage init failed:", err.message);
    if (process.env.MONGODB_URI) {
      console.error(
        "[db] Check your MONGODB_URI (Atlas → Connect → Drivers) and that 0.0.0.0/0 is in Network Access."
      );
    }
    process.exit(1);
  }

  app.listen(PORT, () => {
    const status = getProviderStatus();
    console.log(`API server ready on http://localhost:${PORT}`);
    console.log(
      status.configured
        ? `AI provider: ${status.provider} (${status.model})`
        : "AI provider: none configured — add an API key to .env (see README)"
    );
  });
}

main();
