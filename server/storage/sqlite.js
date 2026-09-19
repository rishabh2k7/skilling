/* SQLite storage backend (better-sqlite3) — production schema.
   Async wrapper so it is interchangeable with the Mongo Atlas store.

   No demo data: every profile belongs to a real registered user.
   Demo-era tables (opportunities, assessments, curriculum_pulses,
   interventions) are dropped if present from older databases. */
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ROLE_LIBRARY, DEFAULT_ROLE, RESOURCES } from "../catalog.js";

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

CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_attempts_profile ON checkpoint_attempts(profile_id);
CREATE INDEX IF NOT EXISTS idx_history_profile ON readiness_history(profile_id, id);
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
    ["foundations", "Foundation", "Core skills for the role", "next"],
    ["build", "Skill gap", `${gapSkill} project`, "up next"],
    ["checkpoint", "Validate", `${gapSkill} checkpoint`, "up next"],
    ["evidence", "Prove", "Ship it and add it to your profile", "up next"],
  ];
  steps.forEach(([id, label, title, status], i) =>
    ins.run(id, profileId, label, title, status, i, status === "complete" ? new Date().toISOString() : null)
  );
}

function recordReadiness(profileId, readiness) {
  db.prepare("INSERT INTO readiness_history (profile_id, readiness) VALUES (?, ?)").run(
    profileId,
    Math.max(0, Math.min(100, Math.round(readiness)))
  );
}

/* ---------------- Interface (async signatures for store parity) ---------------- */

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
    setComplete: (profileId, stepId, complete) => {
      const step = db
        .prepare("SELECT status FROM roadmap_steps WHERE id = ? AND profile_id = ?")
        .get(stepId, profileId);
      if (!step) return Promise.resolve(null);
      const isLocked = step.status === "complete";
      if (!isLocked) {
        db.prepare(
          "UPDATE roadmap_steps SET status = ?, completed_at = ? WHERE id = ? AND profile_id = ?"
        ).run(
          complete ? "complete" : "up next",
          complete ? new Date().toISOString() : null,
          stepId,
          profileId
        );
      }
      const done = db
        .prepare(
          "SELECT COUNT(*) AS done FROM roadmap_steps WHERE profile_id = ? AND status = 'complete'"
        )
        .get(profileId).done;
      return Promise.resolve(done);
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
