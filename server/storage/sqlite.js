/* SQLite storage backend (better-sqlite3) — production schema.
   Async wrapper so it is interchangeable with the Mongo Atlas store.

   No demo data: every profile belongs to a real registered user.
   Demo-era tables (opportunities, assessments, curriculum_pulses,
   interventions) are dropped if present from older databases. */
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ROLE_LIBRARY, DEFAULT_ROLE, RESOURCES, buildRoadmapTasks, TASK_KINDS } from "../catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "skilling.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/* ---------------- Schema ---------------- */

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  target_role TEXT,
  readiness INTEGER DEFAULT 0,
  next_best_skill TEXT,
  linkedin_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value INTEGER NOT NULL,             -- 0-100
  tone TEXT NOT NULL,                 -- strong | steady | gap
  note TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(profile_id, name)
);

CREATE TABLE IF NOT EXISTS saved_openings (
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opening_slug TEXT NOT NULL,
  saved_at TEXT DEFAULT (datetime('now')),
  applied INTEGER DEFAULT 0,
  PRIMARY KEY (profile_id, opening_slug)
);

CREATE TABLE IF NOT EXISTS resource_status (
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'saved',   -- saved | in_progress | completed
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (profile_id, resource_id)
);

CREATE TABLE IF NOT EXISTS roadmap_steps (
  id TEXT NOT NULL,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,               -- complete | next | up next
  sort_order INTEGER DEFAULT 0,
  completed_at TEXT,
  PRIMARY KEY (id, profile_id)
);

CREATE TABLE IF NOT EXISTS roadmap_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,              -- owning roadmap step: foundations | build | checkpoint | evidence
  kind TEXT NOT NULL,                 -- resource | project | checkpoint | custom
  title TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',    -- JSON payload (resourceId/url/detail/skill...)
  estimate TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checkpoint_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  question_id TEXT NOT NULL,
  selected_index INTEGER,
  correct INTEGER NOT NULL,
  attempted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS readiness_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  readiness INTEGER NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_party TEXT NOT NULL,           -- 'user' | 'ai'
  text TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS xp_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,               -- resource | task | checkpoint | project | application
  ref TEXT,                           -- resource id / task id / slug / etc.
  xp INTEGER NOT NULL,
  label TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS unlocked_badges (
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL,
  PRIMARY KEY (profile_id, badge_id)
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  skill TEXT,
  url TEXT,
  description TEXT,
  shared_linkedin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_attempts_profile ON checkpoint_attempts(profile_id);
CREATE INDEX IF NOT EXISTS idx_history_profile ON readiness_history(profile_id, id);
CREATE INDEX IF NOT EXISTS idx_tasks_profile ON roadmap_tasks(profile_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_xp_profile ON xp_events(profile_id, id);
CREATE INDEX IF NOT EXISTS idx_projects_profile ON projects(profile_id, id);
`);

/* ------------- Migrations from the demo-era schema ------------- */

function dropLegacyTables() {
  const legacy = [
    "saved_opportunities",
    "opportunities",
    "assessment_attempts",
    "assessments",
    "curriculum_pulses",
    "interventions",
  ];
  for (const t of legacy) {
    try {
      db.exec(`DROP TABLE IF EXISTS ${t}`);
    } catch {
      /* already gone */
    }
  }
}

dropLegacyTables();

/* Remove demo profiles (no owning user) left by older versions */
function purgeDemoProfiles() {
  const demo = db.prepare("SELECT id FROM profiles WHERE user_id IS NULL").all();
  if (demo.length) {
    db.prepare("DELETE FROM profiles WHERE user_id IS NULL").run();
    console.log(`[db] removed ${demo.length} demo profile(s)`);
  }
}
purgeDemoProfiles();

function addColumnIfMissing(table, column, ddl) {
  const exists = db
    .prepare(`SELECT 1 FROM pragma_table_info('${table}') WHERE name = ?`)
    .get(column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}
addColumnIfMissing("profiles", "linkedin_url", "linkedin_url TEXT");

/* roadmap_steps primary key: ensure composite (id, profile_id) */
function rebuildRoadmapStepsIfNeeded() {
  const pkCols = db
    .prepare("SELECT name FROM pragma_table_info('roadmap_steps') WHERE pk > 0 ORDER BY pk")
    .all()
    .map((r) => r.name);
  if (pkCols.length === 1 && pkCols[0] === "id") {
    db.exec(`
      CREATE TABLE roadmap_steps_new (
        id TEXT NOT NULL,
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        completed_at TEXT,
        PRIMARY KEY (id, profile_id)
      );
      INSERT INTO roadmap_steps_new (id, profile_id, label, title, status, sort_order, completed_at)
        SELECT id, profile_id, label, title, status, sort_order, completed_at FROM roadmap_steps;
      DROP TABLE roadmap_steps;
      ALTER TABLE roadmap_steps_new RENAME TO roadmap_steps;
    `);
    console.log("[db] rebuilt roadmap_steps with composite key (id, profile_id)");
  }
}
rebuildRoadmapStepsIfNeeded();

/* ---------------- Shared helpers ---------------- */

const toneFor = (v) => (v >= 75 ? "strong" : v >= 45 ? "steady" : "gap");
const noteFor = (v, isNextBest) =>
  isNextBest ? "Next best skill" : v >= 75 ? "Ready to apply" : v >= 45 ? "Build depth" : "Early signal";

function seedSkills(profileId, targetRole) {
  const spec = ROLE_LIBRARY[targetRole] ?? ROLE_LIBRARY[DEFAULT_ROLE];
  const weakest = [...spec].sort((a, b) => a[1] - b[1])[0][0];
  const ins = db.prepare(
    "INSERT INTO skills (profile_id, name, value, tone, note, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
  );
  spec.forEach(([name, value], i) =>
    ins.run(profileId, name, value, toneFor(value), noteFor(value, name === weakest), i)
  );
  return weakest;
}

function seedRoadmap(profileId, targetRole, gapSkill) {
  const ins = db.prepare(
    "INSERT INTO roadmap_steps (id, profile_id, label, title, status, sort_order, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const steps = [
    ["intent", "Career goal", targetRole, "complete"],
    ["foundations", "Learn", "Study the role's core skills", "next"],
    ["checkpoint", "Validate", "Pass graded checkpoints", "up next"],
    ["build", "Build", "Ship a small real project", "up next"],
    ["evidence", "Prove", "Link your work from your profile", "up next"],
  ];
  steps.forEach(([id, label, title, status], i) =>
    ins.run(id, profileId, label, title, status, i, status === "complete" ? new Date().toISOString() : null)
  );

  /* Ordered default tasks carrying real data (resources/checkpoint/project) */
  const spec = ROLE_LIBRARY[targetRole] ?? ROLE_LIBRARY[DEFAULT_ROLE];
  const foundationSkill = [...spec].sort((a, b) => b[1] - a[1])[0][0]; // strongest = start here
  const tasks = buildRoadmapTasks(targetRole, foundationSkill, gapSkill).map((t, i) => ({
    ...t,
    stepId: ["foundations", "foundations", "checkpoint", "build"][i] ?? "evidence",
  }));
  const insTask = db.prepare(
    "INSERT INTO roadmap_tasks (profile_id, step_id, kind, title, data, estimate, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  tasks.forEach((t, i) =>
    insTask.run(profileId, t.stepId, t.kind, t.title, JSON.stringify(t.data ?? {}), t.estimate ?? null, (i + 1) * 10)
  );
}



/* Older profiles (created before tasks existed) get the default plan once. */
function backfillTasksForExistingProfiles() {
  const missing = db
    .prepare(
      "SELECT p.id AS pid, p.target_role AS role, p.next_best_skill AS gap FROM profiles p LEFT JOIN roadmap_tasks t ON t.profile_id = p.id GROUP BY p.id HAVING COUNT(t.id) = 0"
    )
    .all();
  if (!missing.length) return;
  const insTask = db.prepare(
    "INSERT INTO roadmap_tasks (profile_id, step_id, kind, title, data, estimate, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  for (const p of missing) {
    const spec = ROLE_LIBRARY[p.role] ?? ROLE_LIBRARY[DEFAULT_ROLE];
    const foundationSkill = [...spec].sort((a, b) => b[1] - a[1])[0][0];
    const tasks = buildRoadmapTasks(p.role ?? DEFAULT_ROLE, foundationSkill, p.gap).map((t, i) => ({
      ...t,
      stepId: ["foundations", "foundations", "checkpoint", "build"][i] ?? "evidence",
    }));
    tasks.forEach((t, i) =>
      insTask.run(p.pid, t.stepId, t.kind, t.title, JSON.stringify(t.data ?? {}), t.estimate ?? null, (i + 1) * 10)
    );
  }
  console.log("[db] backfilled roadmap tasks for " + missing.length + " profile(s)");
}
backfillTasksForExistingProfiles();

function recordReadiness(profileId, readiness) {
  db.prepare("INSERT INTO readiness_history (profile_id, readiness) VALUES (?, ?)").run(
    profileId,
    Math.max(0, Math.min(100, Math.round(readiness)))
  );
}

/* ---------------- Gamification helpers (SQLite) ---------------- */

/* Append an XP event and return the new totals. Idempotent per (profile, action, ref). */
function addXpEvent(profileId, action, ref, xp, label) {
  if (ref !== null && ref !== undefined) {
    const dup = db
      .prepare("SELECT 1 FROM xp_events WHERE profile_id = ? AND action = ? AND ref = ?")
      .get(profileId, action, String(ref));
    if (dup) return null; // already awarded for this exact action+target
  }
  db.prepare(
    "INSERT INTO xp_events (profile_id, action, ref, xp, label) VALUES (?, ?, ?, ?, ?)"
  ).run(profileId, action, ref === undefined ? null : ref, xp, label);
  const total = db
    .prepare("SELECT COALESCE(SUM(xp), 0) AS total FROM xp_events WHERE profile_id = ?")
    .get(profileId).total;
  return { xpTotal: total, awarded: xp };
}

function xpTotalFor(profileId) {
  return db
    .prepare("SELECT COALESCE(SUM(xp), 0) AS total FROM xp_events WHERE profile_id = ?")
    .get(profileId).total;
}

function recentXpEvents(profileId, limit = 20) {
  return db
    .prepare(
      "SELECT id, action, ref, xp, label, created_at AS createdAt FROM xp_events WHERE profile_id = ? ORDER BY id DESC LIMIT ?"
    )
    .all(profileId, limit);
}

/* Aggregate the real stats badge checks run against */
function gamificationStats(profileId, level) {
  const skills = db
    .prepare("SELECT name, value FROM skills WHERE profile_id = ?")
    .all(profileId);
  const profile = db.prepare("SELECT readiness FROM profiles WHERE id = ?").get(profileId);
  const completed = db
    .prepare("SELECT COUNT(*) AS n FROM resource_status WHERE profile_id = ? AND status = 'completed'")
    .get(profileId).n;
  const checkpoint = db
    .prepare("SELECT COUNT(*) AS n, COALESCE(SUM(correct), 0) AS right FROM checkpoint_attempts WHERE profile_id = ?")
    .get(profileId);
  const tasksDone = db
    .prepare("SELECT COUNT(*) AS n FROM roadmap_tasks WHERE profile_id = ? AND done = 1")
    .get(profileId).n;
  const projects = db
    .prepare("SELECT COUNT(*) AS n FROM projects WHERE profile_id = ?")
    .get(profileId).n;
  const applications = db
    .prepare("SELECT COUNT(*) AS n FROM saved_openings WHERE profile_id = ? AND applied = 1")
    .get(profileId).n;
  /* Skill Up: biggest rise over each skill's starting value for the role */
  const starts = new Map();
  for (const s of skills) {
    const start = ROLE_LIBRARY_STARTS.get(s.name);
    if (start !== undefined) starts.set(s.name, start);
  }
  const maxGain = skills.reduce(
    (max, s) => Math.max(max, s.value - (starts.get(s.name) ?? s.value)),
    0
  );
  return {
    xpTotal: xpTotalFor(profileId),
    level,
    readiness: profile?.readiness ?? 0,
    resourcesCompleted: completed,
    checkpointCorrect: checkpoint.right,
    checkpointsTaken: checkpoint.n,
    tasksDone,
    projectsUploaded: projects,
    applicationsSent: applications,
    maxSkillGain: maxGain,
  };
}

/* Starting values from the role library, used for the Skill Up badge */
const ROLE_LIBRARY_STARTS = new Map(
  Object.values(ROLE_LIBRARY)
    .flat()
    .map(([name, value]) => [name, value])
);

export const q = {
  driver: "sqlite",

  users: {
    byEmail: async (email) =>
      db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).toLowerCase().trim()),
    byId: async (id) =>
      db.prepare("SELECT id, email, name, created_at FROM users WHERE id = ?").get(id),
    register: async (email, name, passwordHash, targetRole) => {
      const role = targetRole && ROLE_LIBRARY[targetRole] ? targetRole : DEFAULT_ROLE;
      const info = db
        .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
        .run(String(email).toLowerCase().trim(), String(name).trim(), passwordHash);
      const userId = info.lastInsertRowid;
      try {
        const profile = await q.profile.createForUser(userId, name, role);
        return { userId, profile };
      } catch (err) {
        // compensating delete keeps sign-up atomic (no user without a profile)
        db.prepare("DELETE FROM users WHERE id = ?").run(userId);
        throw err;
      }
    },
    rename: (id, name) =>
      Promise.resolve(
        db.prepare("UPDATE users SET name = ? WHERE id = ?").run(String(name).trim(), id)
      ),
  },

  sessions: {
    create: (userId, token, expiresAt) =>
      Promise.resolve(
        db
          .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
          .run(token, userId, expiresAt)
      ),
    get: (token) =>
      Promise.resolve(
        db
          .prepare(
            `SELECT s.token, s.expires_at, u.id AS user_id, u.email, u.name
             FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`
          )
          .get(token)
      ),
    delete: (token) =>
      Promise.resolve(db.prepare("DELETE FROM sessions WHERE token = ?").run(token)),
    purgeExpired: () =>
      Promise.resolve(db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run()),
  },

  profile: {
    get: (id) => Promise.resolve(db.prepare("SELECT * FROM profiles WHERE id = ?").get(id)),
    getByUserId: (userId) =>
      Promise.resolve(db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId)),
    /* No demo profile exists — guests simply have none. */
    getDefault: () => Promise.resolve(null),
    createForUser: (userId, name, targetRole) => {
      const existing = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId);
      if (existing) return Promise.resolve(existing);
      const role = targetRole && ROLE_LIBRARY[targetRole] ? targetRole : DEFAULT_ROLE;
      const info = db
        .prepare(
          "INSERT INTO profiles (user_id, name, role, target_role, readiness, next_best_skill) VALUES (?, ?, 'student', ?, 0, NULL)"
        )
        .run(userId, String(name).trim(), role);
      const profileId = info.lastInsertRowid;
      const weakest = seedSkills(profileId, role);
      seedRoadmap(profileId, role, weakest);
      const avg = Math.round(
        db
          .prepare("SELECT AVG(value) AS avg FROM skills WHERE profile_id = ?")
          .get(profileId).avg
      );
      db.prepare("UPDATE profiles SET readiness = ?, next_best_skill = ? WHERE id = ?").run(
        avg,
        weakest,
        profileId
      );
      recordReadiness(profileId, avg);
      return Promise.resolve(db.prepare("SELECT * FROM profiles WHERE id = ?").get(profileId));
    },
    update: (id, fields) => {
      const sets = [];
      const vals = [];
      const push = (col, v) => {
        sets.push(`${col} = ?`);
        vals.push(v);
      };
      if (fields.name !== undefined) push("name", String(fields.name).trim());
      if (fields.targetRole !== undefined) push("target_role", String(fields.targetRole).trim());
      if (fields.linkedinUrl !== undefined)
        push("linkedin_url", String(fields.linkedinUrl).trim().slice(0, 300));
      if (fields.readiness !== undefined)
        push("readiness", Math.max(0, Math.min(100, Math.round(Number(fields.readiness)))));
      if (fields.nextBestSkill !== undefined) push("next_best_skill", fields.nextBestSkill);
      if (sets.length)
        db.prepare(`UPDATE profiles SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
      return Promise.resolve(db.prepare("SELECT * FROM profiles WHERE id = ?").get(id));
    },
  },

  skills: {
    listByProfile: (profileId) =>
      Promise.resolve(
        db
          .prepare(
            "SELECT name, value, tone, note FROM skills WHERE profile_id = ? ORDER BY sort_order"
          )
          .all(profileId)
      ),
    setMultiple: (profileId, skills) => {
      const upd = db.prepare(
        "UPDATE skills SET value = ?, tone = ?, note = ? WHERE profile_id = ? AND name = ?"
      );
      const tx = db.transaction((items) => {
        for (const s of items) {
          const v = Math.round(Number(s.value));
          if (!Number.isFinite(v)) continue;
          const clamped = Math.max(0, Math.min(100, v));
          upd.run(clamped, toneFor(clamped), noteFor(clamped, false), profileId, s.name);
        }
      });
      tx(skills);
      return Promise.resolve(
        db
          .prepare(
            "SELECT name, value, tone, note FROM skills WHERE profile_id = ? ORDER BY sort_order"
          )
          .all(profileId)
      );
    },
    bump: (profileId, skillName, delta) => {
      const row = db
        .prepare("SELECT value FROM skills WHERE profile_id = ? AND name = ?")
        .get(profileId, skillName);
      if (!row) return Promise.resolve(null);
      const v = Math.max(0, Math.min(100, row.value + delta));
      db.prepare("UPDATE skills SET value = ?, tone = ? WHERE profile_id = ? AND name = ?").run(
        v,
        toneFor(v),
        profileId,
        skillName
      );
      return Promise.resolve(v);
    },
  },

  /* Role briefs matched per user — real openings live in server/catalog.js */
  openings: {
    saved: (profileId) =>
      Promise.resolve(
        db
          .prepare(
            "SELECT opening_slug AS slug, applied FROM saved_openings WHERE profile_id = ?"
          )
          .all(profileId)
      ),
    toggleSave: (profileId, slug) => {
      const existing = db
        .prepare("SELECT 1 FROM saved_openings WHERE profile_id = ? AND opening_slug = ?")
        .get(profileId, slug);
      if (existing) {
        db.prepare(
          "DELETE FROM saved_openings WHERE profile_id = ? AND opening_slug = ?"
        ).run(profileId, slug);
        return Promise.resolve({ saved: false });
      }
      db.prepare(
        "INSERT INTO saved_openings (profile_id, opening_slug) VALUES (?, ?)"
      ).run(profileId, slug);
      return Promise.resolve({ saved: true });
    },
    setApplied: (profileId, slug, applied) => {
      db.prepare(
        `INSERT INTO saved_openings (profile_id, opening_slug, applied) VALUES (?, ?, ?)
         ON CONFLICT(profile_id, opening_slug) DO UPDATE SET applied = excluded.applied`
      ).run(profileId, slug, applied ? 1 : 0);
      return Promise.resolve({ applied });
    },
    appliedCount: (profileId) =>
      Promise.resolve(
        db
          .prepare("SELECT COUNT(*) AS n FROM saved_openings WHERE profile_id = ? AND applied = 1")
          .get(profileId).n
      ),
  },

  resources: {
    list: () => Promise.resolve(RESOURCES),
    statusFor: (profileId) =>
      Promise.resolve(
        db
          .prepare(
            "SELECT resource_id AS id, status FROM resource_status WHERE profile_id = ?"
          )
          .all(profileId)
      ),
    setStatus: (profileId, resourceId, status) => {
      if (status === "none") {
        db.prepare(
          "DELETE FROM resource_status WHERE profile_id = ? AND resource_id = ?"
        ).run(profileId, resourceId);
        return Promise.resolve({ status: "none" });
      }
      db.prepare(
        `INSERT INTO resource_status (profile_id, resource_id, status, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(profile_id, resource_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`
      ).run(profileId, resourceId, status);
      return Promise.resolve({ status });
    },
    completedCount: (profileId) =>
      Promise.resolve(
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM resource_status WHERE profile_id = ? AND status = 'completed'"
          )
          .get(profileId).n
      ),
  },

  roadmap: {
    listByProfile: (profileId) =>
      Promise.resolve(
        db
          .prepare(
            "SELECT id, label, title, status, sort_order AS sortOrder FROM roadmap_steps WHERE profile_id = ? ORDER BY sort_order"
          )
          .all(profileId)
      ),
    /* Ordered tasks for the whole roadmap, grouped client-side by step_id */
    listTasks: (profileId) =>
      Promise.resolve(
        db
          .prepare(
            "SELECT id, step_id AS stepId, kind, title, data, estimate, done, sort_order AS sortOrder, completed_at AS completedAt FROM roadmap_tasks WHERE profile_id = ? ORDER BY sort_order"
          )
          .all(profileId)
          .map((t) => ({ ...t, data: JSON.parse(t.data || "{}"), done: !!t.done }))
      ),
    /* Tasks are completed strictly in order: only the first incomplete task
       may be toggled. Completing/uncompleting also syncs the owning step's
       status and recomputes the step's 'next' pointer. */
    setTaskDone: (profileId, taskId, done) => {
      const tasks = db
        .prepare("SELECT id, step_id, done FROM roadmap_tasks WHERE profile_id = ? ORDER BY sort_order")
        .all(profileId);
      const target = tasks.find((t) => t.id === Number(taskId));
      if (!target) return { error: "unknown task" };
      const firstOpen = tasks.find((t) => !t.done);
      if (done && firstOpen && firstOpen.id !== target.id) {
        return { error: "out_of_order", blockedBy: firstOpen.id };
      }
      db.prepare(
        "UPDATE roadmap_tasks SET done = ?, completed_at = ? WHERE id = ? AND profile_id = ?"
      ).run(done ? 1 : 0, done ? new Date().toISOString() : null, target.id, profileId);

      /* Sync owning step status: complete when all its tasks are done,
         'next' if it is the first step with incomplete tasks, else 'up next'. */
      const after = db
        .prepare("SELECT step_id, done FROM roadmap_tasks WHERE profile_id = ? ORDER BY sort_order")
        .all(profileId);
      const stepIds = db
        .prepare("SELECT id FROM roadmap_steps WHERE profile_id = ? AND id != 'intent' ORDER BY sort_order")
        .all(profileId)
        .map((r) => r.id);
      const allDoneFor = (stepId) => {
        const rows = after.filter((t) => t.step_id === stepId);
        return rows.length > 0 && rows.every((t) => t.done);
      };
      let nextSet = false;
      for (const sid of stepIds) {
        const step = db.prepare("SELECT status FROM roadmap_steps WHERE id = ? AND profile_id = ?").get(sid, profileId);
        if (!step || step.status === "complete") continue;
        if (allDoneFor(sid)) {
          db.prepare("UPDATE roadmap_steps SET status = 'complete', completed_at = ? WHERE id = ? AND profile_id = ?").run(
            new Date().toISOString(), sid, profileId
          );
        } else if (!nextSet) {
          db.prepare("UPDATE roadmap_steps SET status = 'next' WHERE id = ? AND profile_id = ?").run(sid, profileId);
          nextSet = true;
        } else {
          db.prepare("UPDATE roadmap_steps SET status = 'up next' WHERE id = ? AND profile_id = ?").run(sid, profileId);
        }
      }

      const doneCount = db
        .prepare("SELECT COUNT(*) AS done FROM roadmap_tasks WHERE profile_id = ? AND done = 1")
        .get(profileId).done;
      const totalCount = db
        .prepare("SELECT COUNT(*) AS n FROM roadmap_tasks WHERE profile_id = ?")
        .get(profileId).n;
      return { done: doneCount, total: totalCount };
    },
    /* Add a custom task to the end of a step's task list */
    addTask: (profileId, stepId, title, data, estimate) => {
      const maxOrder = db
        .prepare("SELECT COALESCE(MAX(sort_order), 0) AS m FROM roadmap_tasks WHERE profile_id = ?")
        .get(profileId).m;
      const info = db
        .prepare(
          "INSERT INTO roadmap_tasks (profile_id, step_id, kind, title, data, estimate, sort_order) VALUES (?, ?, 'custom', ?, ?, ?, ?)"
        )
        .run(profileId, stepId, String(title).trim(), JSON.stringify(data ?? {}), estimate ?? null, maxOrder + 10);
      const t = db
        .prepare(
          "SELECT id, step_id AS stepId, kind, title, data, estimate, done, sort_order AS sortOrder, completed_at AS completedAt FROM roadmap_tasks WHERE id = ?"
        )
        .get(info.lastInsertRowid);
      return { ...t, data: JSON.parse(t.data || "{}"), done: !!t.done };
    },
    deleteTask: (profileId, taskId) => {
      const info = db
        .prepare("DELETE FROM roadmap_tasks WHERE id = ? AND profile_id = ? AND kind = 'custom'")
        .run(Number(taskId), profileId);
      return { deleted: info.changes > 0 };
    },
    /* Tasks are the source of truth: recompute every step's status from its
       tasks. Fixes states left over from the old direct-step toggle flow. */
    reconcileSteps: (profileId) => {
      const tasks = db
        .prepare("SELECT step_id, done FROM roadmap_tasks WHERE profile_id = ?")
        .all(profileId);
      const stepIds = db
        .prepare("SELECT id, status FROM roadmap_steps WHERE profile_id = ? AND id != 'intent' ORDER BY sort_order")
        .all(profileId);
      let nextSet = false;
      for (const { id } of stepIds) {
        const rows = tasks.filter((t) => t.step_id === id);
        const allDone = rows.length > 0 && rows.every((t) => t.done);
        if (allDone) {
          db.prepare(
            "UPDATE roadmap_steps SET status = 'complete', completed_at = COALESCE(completed_at, ?) WHERE id = ? AND profile_id = ?"
          ).run(new Date().toISOString(), id, profileId);
        } else if (!nextSet) {
          db.prepare("UPDATE roadmap_steps SET status = 'next' WHERE id = ? AND profile_id = ?").run(id, profileId);
          nextSet = true;
        } else {
          db.prepare("UPDATE roadmap_steps SET status = 'up next' WHERE id = ? AND profile_id = ?").run(id, profileId);
        }
      }
      return Promise.resolve();
    },
  },

  checkpoints: {
    /* attempt history for the current profile */
    history: (profileId) =>
      Promise.resolve(
        db
          .prepare(
            "SELECT skill, question_id AS questionId, correct, attempted_at AS attemptedAt FROM checkpoint_attempts WHERE profile_id = ? ORDER BY id DESC LIMIT 100"
          )
          .all(profileId)
      ),
    record: (profileId, skill, questionId, selectedIndex, correct) =>
      Promise.resolve(
        db
          .prepare(
            "INSERT INTO checkpoint_attempts (profile_id, skill, question_id, selected_index, correct) VALUES (?, ?, ?, ?, ?)"
          )
          .run(profileId, skill, questionId, selectedIndex, correct ? 1 : 0)
      ),
    stats: (profileId) => {
      const row = db
        .prepare(
          "SELECT COUNT(*) AS taken, SUM(correct) AS right FROM checkpoint_attempts WHERE profile_id = ?"
        )
        .get(profileId);
      return Promise.resolve({ taken: row.taken, correct: row.right ?? 0 });
    },
  },

  readiness: {
    history: (profileId, limit = 14) =>
      Promise.resolve(
        db
          .prepare(
            "SELECT readiness, recorded_at AS recordedAt FROM readiness_history WHERE profile_id = ? ORDER BY id DESC LIMIT ?"
          )
          .all(profileId, limit)
          .reverse()
      ),
    record: recordReadiness,
  },

  chat: {
    history: (profileId, limit = 30) =>
      Promise.resolve(
        db
          .prepare(
            "SELECT from_party AS 'from', text, created_at FROM chat_messages WHERE profile_id = ? ORDER BY id DESC LIMIT ?"
          )
          .all(profileId, limit)
          .reverse()
      ),
    add: (profileId, from, text) =>
      Promise.resolve(
        db
          .prepare("INSERT INTO chat_messages (profile_id, from_party, text) VALUES (?, ?, ?)")
          .run(profileId, from, text)
      ),
  },

  /* ---------------- Gamification (XP, levels, badges, projects) ---------------- */
  gamification: {
    /* Record XP for an action. Returns { xpTotal, awarded } or null if this
       exact action+ref was already rewarded (idempotent). */
    addXp: (profileId, action, ref, xp, label) =>
      Promise.resolve(addXpEvent(profileId, action, ref ?? null, xp, label)),
    xpTotal: (profileId) => Promise.resolve(xpTotalFor(profileId)),
    recent: (profileId, limit = 20) => Promise.resolve(recentXpEvents(profileId, limit)),
    stats: (profileId, level) => Promise.resolve(gamificationStats(profileId, level)),
    /* Persist any newly-earned badges; return the full unlocked list with isNew flags */
    syncBadges: (profileId, earnedIds) => {
      const ins = db.prepare(
        "INSERT OR IGNORE INTO unlocked_badges (profile_id, badge_id, unlocked_at) VALUES (?, ?, ?)"
      );
      const newly = [];
      for (const id of earnedIds) {
        const info = ins.run(profileId, id, new Date().toISOString());
        if (info.changes > 0) newly.push(id);
      }
      const rows = db
        .prepare("SELECT badge_id AS id, unlocked_at AS unlockedAt FROM unlocked_badges WHERE profile_id = ? ORDER BY unlocked_at")
        .all(profileId);
      return Promise.resolve({ badges: rows, newly });
    },
    badges: (profileId) =>
      Promise.resolve(
        db
          .prepare("SELECT badge_id AS id, unlocked_at AS unlockedAt FROM unlocked_badges WHERE profile_id = ? ORDER BY unlocked_at")
          .all(profileId)
      ),
    /* Projects uploaded by the user */
    listProjects: (profileId) =>
      Promise.resolve(
        db
          .prepare(
            "SELECT id, title, skill, url, description, shared_linkedin AS sharedLinkedin, created_at AS createdAt FROM projects WHERE profile_id = ? ORDER BY id DESC"
          )
          .all(profileId)
          .map((p) => ({ ...p, sharedLinkedin: !!p.sharedLinkedin }))
      ),
    addProject: (profileId, { title, skill, url, description, sharedLinkedin }) => {
      const info = db
        .prepare(
          "INSERT INTO projects (profile_id, title, skill, url, description, shared_linkedin) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run(
          profileId,
          String(title).trim(),
          skill ?? null,
          url ?? null,
          description ?? null,
          sharedLinkedin ? 1 : 0
        );
      return Promise.resolve(
        db.prepare("SELECT id, title, skill, url, description, shared_linkedin AS sharedLinkedin, created_at AS createdAt FROM projects WHERE id = ?").get(info.lastInsertRowid)
      );
    },
  },

  /* Real platform aggregates (no synthetic numbers anywhere) */
  stats: {
    overall: async () => {
      const learners = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
      const profiles = db
        .prepare("SELECT AVG(readiness) AS avg, COUNT(*) AS n FROM profiles")
        .get();
      const checkpoints = db
        .prepare("SELECT COUNT(*) AS n, SUM(correct) AS right FROM checkpoint_attempts")
        .get();
      const completions = db
        .prepare("SELECT COUNT(*) AS n FROM resource_status WHERE status = 'completed'")
        .get().n;
      return {
        learners,
        avgReadiness: profiles.n ? Math.round(profiles.avg) : 0,
        checkpointsTaken: checkpoints.n,
        checkpointAccuracy: checkpoints.n ? Math.round((checkpoints.right / checkpoints.n) * 100) : 0,
        resourcesCompleted: completions,
        resourceCount: RESOURCES.length,
      };
    },
    academia: async () => {
      const learners = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
      const profiles = db.prepare("SELECT AVG(readiness) AS avg FROM profiles").get();
      const checkpoints = db
        .prepare("SELECT COUNT(*) AS n, SUM(correct) AS right FROM checkpoint_attempts")
        .get();
      const roles = db
        .prepare(
          "SELECT COALESCE(NULLIF(target_role, ''), 'Undecided') AS role, COUNT(*) AS count FROM profiles GROUP BY role ORDER BY count DESC LIMIT 6"
        )
        .all();
      const recent = db
        .prepare(
          `SELECT CASE WHEN instr(name, ' ') > 0
                  THEN substr(name, 1, instr(name, ' ')) || substr(name, instr(name, ' ') + 1, 1) || '.'
                  ELSE name END AS name,
             COALESCE(NULLIF(target_role, ''), 'Undecided') AS role,
             readiness, created_at AS createdAt
           FROM profiles ORDER BY id DESC LIMIT 8`
        )
        .all();
      const topSkills = db
        .prepare(
          "SELECT name, ROUND(AVG(value)) AS avgValue, COUNT(*) AS learners FROM skills GROUP BY name ORDER BY avgValue ASC LIMIT 6"
        )
        .all();
      return {
        learners,
        avgReadiness: profiles.avg ? Math.round(profiles.avg) : 0,
        checkpointsTaken: checkpoints.n,
        checkpointAccuracy: checkpoints.n ? Math.round((checkpoints.right / checkpoints.n) * 100) : 0,
        roles,
        recent,
        topSkills,
      };
    },
  },
};

export default db;
