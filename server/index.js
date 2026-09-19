import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { askAI, getProviderStatus } from "./ai.js";
import { qReady } from "./storage/index.js";
import { sessionMiddleware, authRoutes } from "./auth.js";
import {
  OPENINGS,
  RESOURCES,
  QUESTION_BANK,
  CHECKPOINT_SIZE,
  pickCheckpointSkill,
  ROLE_LIBRARY,
} from "./catalog.js";

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
   Initialization is awaited once; every request just does `const q = await store()`. */
let qPromise = null;
function store() {
  if (!qPromise) qPromise = qReady();
  return qPromise;
}

/* Production rule: everything personal requires a signed-in user.
   Guests get 401s from data endpoints; the frontend shows the auth modal. */
async function requireProfile(req, res) {
  if (!req.user) {
    res.status(401).json({ error: "Sign in to access your data.", code: "auth_required" });
    return null;
  }
  const q = await store();
  let profile = await q.profile.getByUserId(req.user.id);
  if (!profile) {
    profile = await q.profile.createForUser(req.user.id, req.user.name, "Full Stack Developer");
  }
  return profile;
}

/* Recompute readiness + next-best-skill server-side and log to history */
async function recomputeProfile(q, profileId) {
  const skills = await q.skills.listByProfile(profileId);
  const avg = Math.round(skills.reduce((a, s) => a + s.value, 0) / Math.max(1, skills.length));
  const weakest = [...skills].sort((a, b) => a.value - b.value)[0];
  const current = await q.profile.get(profileId);
  const updated = await q.profile.update(profileId, {
    readiness: avg,
    nextBestSkill: weakest?.name ?? null,
  });
  /* Record a momentum point only when readiness actually moved */
  if (current && current.readiness !== updated.readiness) {
    await q.readiness.record(profileId, updated.readiness);
  }
  return updated;
}

/* Score the role briefs against the user's Skill DNA (server-side — never fakeable) */
async function matchedOpenings(q, profileId) {
  const [skills, savedRows] = await Promise.all([
    q.skills.listByProfile(profileId),
    q.openings.saved(profileId),
  ]);
  const savedMap = Object.fromEntries(savedRows.map((s) => [s.slug, s.applied]));
  const skillLevel = Object.fromEntries(skills.map((s) => [s.name, s.value]));

  const scored = OPENINGS.map((o) => {
    let match = 0;
    const gaps = [];
    for (const [skill, weight] of Object.entries(o.skills)) {
      const v = skillLevel[skill] ?? 0;
      match += v * weight;
      if (v < 50) gaps.push({ skill, value: v });
    }
    gaps.sort((a, b) => a.value - b.value);
    const topGap = gaps[0];
    return {
      ...o,
      match: Math.round(match),
      topGap: topGap
        ? `Closest gap: ${topGap.skill} (${topGap.value}/100) — the ${o.level.toLowerCase()}-level bar here is around 50.`
        : "You clear every skill bar for this brief — ready to apply.",
      gapSkill: topGap?.skill ?? null,
      saved: !!savedMap[o.slug],
      applied: savedMap[o.slug] === 1,
    };
  });

  return scored.sort((a, b) => b.match - a.match);
}

/* Build a personalized checkpoint: CHECKPOINT_SIZE unseen questions for the
   user's weakest banked skill, using the shared production question bank. */
async function buildCheckpoint(q, profileId) {
  const skills = await q.skills.listByProfile(profileId);
  const skillName = pickCheckpointSkill(skills);
  if (!skillName) return null;

  const history = await q.checkpoints.history(profileId);
  const asked = new Set(history.map((h) => h.questionId));
  let pool = QUESTION_BANK[skillName].filter((qu) => !asked.has(qu[0]));
  if (!pool.length) pool = QUESTION_BANK[skillName]; // recycle once the bank is exhausted

  const questions = pool
    .slice(0, CHECKPOINT_SIZE)
    .map(([id, question, options, , explanation]) => ({
      id,
      question,
      options,
      /* correct_index never leaves the server */
    }));

  return {
    skill: skillName,
    questions,
    total: Math.min(CHECKPOINT_SIZE, pool.length),
    history: { taken: history.length, correct: history.filter((h) => h.correct).length },
  };
}

/* ---------------- Health ---------------- */

app.get("/api/health", async (_req, res) => {
  const q = await store();
  const stats = await q.stats.overall();
  res.json({
    ok: true,
    storage: q.driver === "mongodb" ? "mongodb-atlas" : "sqlite",
    stats,
    provider: getProviderStatus(),
  });
});

/* ---------------- Auth (see auth.js) ---------------- */

/* ---------------- Profile + Skill DNA ---------------- */

app.get("/api/profile", async (req, res) => {
  const q = await store();
  if (!req.user) return res.json({ user: null });
  const profile = await requireProfile(req, res);
  if (!profile) return;
  res.json({
    ...profile,
    isDemo: false,
    user: { id: req.user.id, name: req.user.name, email: req.user.email },
  });
});

app.get("/api/skills", async (req, res) => {
  const q = await store();
  const profile = await requireProfile(req, res);
  if (!profile) return;
  res.json({
    role: profile.target_role,
    readiness: profile.readiness,
    nextBestSkill: profile.next_best_skill,
    isDemo: false,
    skills: await q.skills.listByProfile(profile._id ?? profile.id),
  });
});

/* Edit the signed-in user's profile (name, target role, LinkedIn URL). */
app.patch("/api/profile", async (req, res) => {
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();

  const { name, targetRole, linkedinUrl } = req.body || {};
  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ error: "Name cannot be empty." });
  }
  if (targetRole !== undefined) {
    const t = String(targetRole).trim();
    if (t.length > 80) return res.status(400).json({ error: "Target role is too long." });
    if (t && !ROLE_LIBRARY[t]) {
      return res.status(400).json({ error: "Unknown target role." });
    }
  }
  if (linkedinUrl !== undefined && String(linkedinUrl).trim()) {
    const u = String(linkedinUrl).trim();
    if (!/^https?:\/\/(www\.)?linkedin\.com\/in\//i.test(u)) {
      return res.status(400).json({
        error: "Enter a full LinkedIn profile URL like https://linkedin.com/in/your-handle",
      });
    }
  }

  if (name !== undefined && String(name).trim() !== req.user.name) {
    await q.users.rename(req.user.id, String(name));
  }
  const updated = await q.profile.update(profile._id ?? profile.id, {
    ...(name !== undefined ? { name } : {}),
    ...(targetRole !== undefined ? { targetRole } : {}),
    ...(linkedinUrl !== undefined ? { linkedinUrl } : {}),
  });

  res.json({
    ...updated,
    isDemo: false,
    user: { id: req.user.id, name: req.user.name, email: req.user.email },
  });
});

/* Edit the signed-in user's skill scores. Readiness recomputes server-side. */
app.patch("/api/skills", async (req, res) => {
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();

  const items = Array.isArray(req.body?.skills) ? req.body.skills : [];
  if (!items.length) return res.status(400).json({ error: "skills array required" });
  if (items.some((s) => !s?.name || !Number.isFinite(Number(s.value)))) {
    return res.status(400).json({ error: "Each skill needs a name and a numeric value." });
  }

  const skills = await q.skills.setMultiple(profile._id ?? profile.id, items);
  const updated = await recomputeProfile(q, profile._id ?? profile.id);

  res.json({
    role: updated.target_role,
    readiness: updated.readiness,
    nextBestSkill: updated.next_best_skill,
    isDemo: false,
    skills,
  });
});

/* ---------------- Openings (LinkedIn-apply) ---------------- */

app.get("/api/openings", async (req, res) => {
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();
  const openings = await matchedOpenings(q, profile._id ?? profile.id);
  res.json({
    openings,
    profile: {
      targetRole: profile.target_role,
      readiness: profile.readiness,
      linkedinUrl: profile.linkedin_url ?? null,
    },
  });
});

app.post("/api/openings/:slug/save", async (req, res) => {
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();
  if (!OPENINGS.some((o) => o.slug === req.params.slug)) {
    return res.status(404).json({ error: "Unknown opening." });
  }
  res.json(await q.openings.toggleSave(profile._id ?? profile.id, req.params.slug));
});

/* Marks "applied" — the apply click itself goes to LinkedIn in a new tab */
app.post("/api/openings/:slug/applied", async (req, res) => {
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();
  const applied = !!req.body?.applied;
  res.json(await q.openings.setApplied(profile._id ?? profile.id, req.params.slug, applied));
});

/* ---------------- Learning resources ---------------- */

app.get("/api/resources", async (req, res) => {
  const q = await store();
  let statuses = [];
  if (req.user) {
    const profile = await q.profile.getByUserId(req.user.id);
    if (profile) statuses = await q.resources.statusFor(profile._id ?? profile.id);
  }
  res.json({
    resources: RESOURCES,
    statuses,
    signedIn: !!req.user,
  });
});

app.post("/api/resources/:id/status", async (req, res) => {
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();
  const status = String(req.body?.status || "");
  if (!["saved", "in_progress", "completed", "none"].includes(status)) {
    return res.status(400).json({ error: "status must be saved | in_progress | completed | none" });
  }
  if (!RESOURCES.some((r) => r.id === req.params.id)) {
    return res.status(404).json({ error: "Unknown resource." });
  }
  const result = await q.resources.setStatus(profile._id ?? profile.id, req.params.id, status);
  if (status === "completed") {
    await recomputeProfile(q, profile._id ?? profile.id);
  }
  res.json(result);
});

/* ---------------- Roadmap (ordered tasks) ---------------- */

app.get("/api/roadmap", async (req, res) => {
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();
  const profileId = profile._id ?? profile.id;
  await q.roadmap.reconcileSteps(profileId); // tasks are the source of truth
  const [steps, tasks] = await Promise.all([
    q.roadmap.listByProfile(profileId),
    q.roadmap.listTasks(profileId),
  ]);
  const done = tasks.filter((t) => t.done).length;
  /* The single task the user may check off next (strict order) */
  const nextTaskId = tasks.find((t) => !t.done)?.id ?? null;
  res.json({ steps, tasks, done, total: tasks.length, nextTaskId });
});

/* Check/uncheck a task. The server enforces order: only the first
   incomplete task can be marked done. */
app.post("/api/roadmap/tasks/:taskId", async (req, res) => {
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();
  const profileId = profile._id ?? profile.id;
  const done = !!req.body?.done;
  const result = await q.roadmap.setTaskDone(profileId, req.params.taskId, done);
  if (result.error === "unknown task") return res.status(404).json({ error: "Unknown task." });
  if (result.error === "out_of_order") {
    return res.status(409).json({
      error: "Finish the current task first — the roadmap is ordered.",
      code: "out_of_order",
      blockedBy: result.blockedBy,
    });
  }
  const [steps, tasks] = await Promise.all([
    q.roadmap.listByProfile(profileId),
    q.roadmap.listTasks(profileId),
  ]);
  res.json({
    steps,
    tasks,
    done: tasks.filter((t) => t.done).length,
    total: tasks.length,
    nextTaskId: tasks.find((t) => !t.done)?.id ?? null,
  });
});

/* Add a custom task (goes to the end of the ordered list) */
app.post("/api/roadmap/tasks", async (req, res) => {
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();
  const title = String(req.body?.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "A task title is required." });
  if (title.length > 120) return res.status(400).json({ error: "Task title is too long." });
  const stepId = String(req.body?.stepId ?? "build");
  const allowed = ["foundations", "checkpoint", "build", "evidence"];
  if (!allowed.includes(stepId)) {
    return res.status(400).json({ error: "stepId must be one of " + allowed.join(", ") });
  }
  const detail = req.body?.detail ? String(req.body.detail).slice(0, 500) : undefined;
  const estimate = req.body?.estimate ? String(req.body.estimate).slice(0, 40) : undefined;
  const task = await q.roadmap.addTask(
    profile._id ?? profile.id,
    stepId,
    title,
    detail ? { detail } : {},
    estimate
  );
  res.status(201).json(task);
});

/* Remove a custom task */
app.delete("/api/roadmap/tasks/:taskId", async (req, res) => {
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();
  const result = await q.roadmap.deleteTask(profile._id ?? profile.id, req.params.taskId);
  if (!result.deleted) {
    return res.status(404).json({ error: "Task not found (only custom tasks can be deleted)." });
  }
  res.json({ ok: true });
});

/* Readiness trail for the momentum chart (real recorded changes only) */
app.get("/api/readiness/history", async (req, res) => {
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();
  res.json(await q.readiness.history(profile._id ?? profile.id, 14));
});

/* ---------------- Checkpoints (server-graded, moves Skill DNA) ---------------- */

app.get("/api/checkpoints/next", async (req, res) => {
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();
  const cp = await buildCheckpoint(q, profile._id ?? profile.id);
  if (!cp) return res.status(404).json({ error: "no checkpoint available" });
  res.json(cp);
});

/* Grade the whole checkpoint server-side; correct answers bump the skill. */
app.post("/api/checkpoints/:skill/submit", async (req, res) => {
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();
  const profileId = profile._id ?? profile.id;

  const answers = req.body?.answers;
  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: "answers array required" });
  }

  const bank = QUESTION_BANK[req.params.skill];
  if (!bank) return res.status(404).json({ error: "Unknown checkpoint skill." });

  const results = [];
  let correctCount = 0;
  for (const a of answers) {
    const def = bank.find(([id]) => id === a?.id);
    if (!def) continue;
    const [id, , , correctIndex, explanation] = def;
    const selected = Number(a.selectedIndex);
    const correct = selected === correctIndex;
    if (correct) correctCount += 1;
    await q.checkpoints.record(profileId, req.params.skill, id, selected, correct);
    results.push({ id, correct, explanation, correctIndex: correct ? correctIndex : undefined });
  }

  /* Every correct answer lifts the skill score — checkpoint results are real signals. */
  const bumpPerCorrect = 2;
  if (correctCount > 0) {
    await q.skills.bump(profileId, req.params.skill, correctCount * bumpPerCorrect);
  }
  const updated = await recomputeProfile(q, profileId);

  res.json({
    skill: req.params.skill,
    correct: correctCount,
    total: results.length,
    score: results.length ? Math.round((correctCount / results.length) * 100) : 0,
    bump: correctCount * bumpPerCorrect,
    readiness: updated.readiness,
    nextBestSkill: updated.next_best_skill,
    results,
  });
});

app.get("/api/checkpoints/stats", async (req, res) => {
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();
  res.json(await q.checkpoints.stats(profile._id ?? profile.id));
});

/* ---------------- AI chat (persisted per user) ---------------- */

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "message is required" });
    }
    if (!req.user) {
      return res.status(401).json({ error: "Sign in to chat with the assistant.", code: "auth_required" });
    }
    const q = await store();
    const profile = await requireProfile(req, res);
    if (!profile) return;
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
  const profile = await requireProfile(req, res);
  if (!profile) return;
  const q = await store();
  res.json(await q.chat.history(profile._id ?? profile.id, 100));
});

/* ---------------- Community stats (real aggregates) ---------------- */

app.get("/api/stats", async (_req, res) => {
  const q = await store();
  res.json(await q.stats.overall());
});

/* ---------------- Academia aggregates (real, privacy-masked) ---------------- */

app.get("/api/academia", async (_req, res) => {
  const q = await store();
  res.json(await q.stats.academia());
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
