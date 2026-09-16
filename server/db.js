import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
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
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',                 -- student | industry | academia
  target_role TEXT,
  readiness INTEGER DEFAULT 0,
  next_best_skill TEXT,
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

CREATE TABLE IF NOT EXISTS opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  match INTEGER NOT NULL,             -- 0-100
  tags TEXT NOT NULL,                 -- JSON array
  why TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_opportunities (
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  saved_at TEXT DEFAULT (datetime('now')),
  applied INTEGER DEFAULT 0,
  PRIMARY KEY (profile_id, opportunity_id)
);

CREATE TABLE IF NOT EXISTS roadmap_steps (
  id TEXT PRIMARY KEY,                -- intent | foundations | docker | assessment | evidence
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,               -- complete | next | up next
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,              -- JSON array
  correct_index INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  selected_index INTEGER,
  correct INTEGER NOT NULL,
  attempted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_party TEXT NOT NULL,           -- 'user' | 'ai'
  text TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS curriculum_pulses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  percent INTEGER NOT NULL,
  detail TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS interventions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  action TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);
`);

/* ---------------- Migrations (for databases created before a column existed) ----------------
   CREATE TABLE IF NOT EXISTS never alters an existing table, so old databases miss new columns.
   ALTER TABLE ... ADD COLUMN only when the column is absent. */

function addColumnIfMissing(table, column, ddl) {
  const exists = db
    .prepare(`SELECT 1 FROM pragma_table_info('${table}') WHERE name = ?`)
    .get(column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

addColumnIfMissing("profiles", "user_id", "user_id INTEGER REFERENCES users(id) ON DELETE CASCADE");

/* roadmap_steps originally had a global PRIMARY KEY (id), which made it impossible for
   two users to both have an "intent" step. Rebuild with a composite key if needed. */
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
        icon TEXT,
        sort_order INTEGER DEFAULT 0,
        completed_at TEXT,
        PRIMARY KEY (id, profile_id)
      );
      INSERT INTO roadmap_steps_new (id, profile_id, label, title, status, icon, sort_order, completed_at)
        SELECT id, profile_id, label, title, status, icon, sort_order, completed_at FROM roadmap_steps;
      DROP TABLE roadmap_steps;
      ALTER TABLE roadmap_steps_new RENAME TO roadmap_steps;
    `);
    console.log("[db] rebuilt roadmap_steps with composite key (id, profile_id)");
  }
}
rebuildRoadmapStepsIfNeeded();

/* ---------------- Seed (only when empty) ---------------- */

function seed() {
  const profileCount = db.prepare("SELECT COUNT(*) AS n FROM profiles").get().n;
  if (profileCount > 0) return;

  const insProfile = db.prepare(
    "INSERT INTO profiles (user_id, name, role, target_role, readiness, next_best_skill) VALUES (NULL, ?, 'student', ?, ?, ?)"
  );
  const profile = db
    .prepare("SELECT id FROM profiles WHERE name = ?")
    .get("Aarav Mehta") ||
    (() => {
      const info = insProfile.run("Aarav Mehta (demo)", "Full Stack Developer", 64, "Docker");
      return { id: info.lastInsertRowid };
    })();

  const insSkill = db.prepare(
    "INSERT INTO skills (profile_id, name, value, tone, note, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
  );
  [
    ["JavaScript", 90, "strong", "Ready to apply"],
    ["React", 82, "strong", "Role-ready"],
    ["SQL", 70, "steady", "Build depth"],
    ["Node.js", 65, "steady", "Close to target"],
    ["Docker", 40, "gap", "Next best skill"],
    ["AWS", 30, "gap", "Future signal"],
  ].forEach(([name, value, tone, note], i) =>
    insSkill.run(profile.id, name, value, tone, note, i)
  );

  const insOp = db.prepare(
    "INSERT INTO opportunities (title, company, location, match, tags, why) VALUES (?, ?, ?, ?, ?, ?)"
  );
  [
    ["Frontend / Full Stack Intern", "Northstar Labs", "Remote · 12 weeks", 86,
      JSON.stringify(["React", "Node.js", "TypeScript"]),
      "Your React strength and growing Node.js signal map directly to the team’s internship brief."],
    ["Platform Engineering Co-op", "Radian Systems", "Austin · Hybrid", 72,
      JSON.stringify(["Docker", "AWS", "SQL"]),
      "A strong stretch match: your SQL foundation is solid, while Docker is the shortest path to eligibility."],
    ["Product Engineering Scholar", "Fieldnote", "New York · Hybrid", 68,
      JSON.stringify(["JavaScript", "React", "APIs"]),
      "Your JavaScript and React evidence meet the core bar; add one shipped API project to stand out."],
  ].forEach((o) => insOp.run(...o));

  const insStep = db.prepare(
    "INSERT INTO roadmap_steps (id, profile_id, label, title, status, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  [
    ["intent", "Career goal", "Full Stack Developer", "complete"],
    ["foundations", "Foundation", "JavaScript + React baseline", "complete"],
    ["docker", "Skill gap", "Containerized REST API", "next"],
    ["assessment", "Validate", "Docker checkpoint", "up next"],
    ["evidence", "Prove", "Project reflection + README", "up next"],
  ].forEach(([id, label, title, status], i) =>
    insStep.run(id, profile.id, label, title, status, null, i)
  );

  const insAssessment = db.prepare(
    "INSERT INTO assessments (profile_id, skill, question, options, correct_index) VALUES (?, ?, ?, ?, ?)"
  );
  insAssessment.run(
    profile.id,
    "Docker",
    "What problem does a Docker container primarily solve?",
    JSON.stringify([
      "A process that packages an app and its dependencies",
      "A cloud provider for hosting containers",
      "A JavaScript runtime for the browser",
      "A database migration tool",
    ]),
    0
  );

  const insPulse = db.prepare(
    "INSERT INTO curriculum_pulses (label, percent, detail, sort_order) VALUES (?, ?, ?, ?)"
  );
  [
    ["Cloud deployment", 42, "Docker, AWS"],
    ["Data fluency", 57, "SQL, analytics"],
    ["Product evidence", 68, "README, reflection"],
    ["Core programming", 83, "JavaScript, Python"],
  ].forEach(([label, pct, detail], i) => insPulse.run(label, pct, detail, i));

  const insIntervention = db.prepare(
    "INSERT INTO interventions (title, detail, action, sort_order) VALUES (?, ?, ?, ?)"
  );
  [
    ["Embed a Docker lab", "68 learners show the same deployment gap", "Create lab"],
    ["Add evidence rubric", "Students ship work but cannot explain it", "View rubric"],
    ["Pair with industry mentor", "Cloud signal is the current bottleneck", "Explore"],
  ].forEach(([title, detail, action], i) => insIntervention.run(title, detail, action, i));

  console.log("[db] seeded demo data");
}

seed();

/* ---------------- Helpers ---------------- */

export const q = {
  users: {
    byEmail: (email) =>
      db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).toLowerCase().trim()),
    byId: (id) => db.prepare("SELECT id, email, name, created_at FROM users WHERE id = ?").get(id),
    create: (email, name, passwordHash) =>
      db
        .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
        .run(String(email).toLowerCase().trim(), name, passwordHash),
    /* atomic sign-up: create the account AND its profile in one transaction,
       so a partial failure never leaves an orphaned user without a profile */
    register: (email, name, passwordHash, targetRole) => {
      const tx = db.transaction(() => {
        const info = q.users.create(email, name, passwordHash);
        const profile = q.profile.createForUser(info.lastInsertRowid, name, targetRole);
        return { userId: info.lastInsertRowid, profile };
      });
      return tx();
    },
  },
  sessions: {
    create: (userId, token, expiresAt) =>
      db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expiresAt),
    get: (token) =>
      db
        .prepare(
          "SELECT s.token, s.expires_at, u.id AS user_id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?"
        )
        .get(token),
    delete: (token) => db.prepare("DELETE FROM sessions WHERE token = ?").run(token),
    purgeExpired: () => db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run(),
  },
  profile: {
    get: (id) => db.prepare("SELECT * FROM profiles WHERE id = ?").get(id),
    getByUserId: (userId) =>
      db.prepare("SELECT * FROM profiles WHERE user_id = ? ORDER BY id LIMIT 1").get(userId),
    getDefault: () =>
      db.prepare("SELECT * FROM profiles WHERE user_id IS NULL ORDER BY id LIMIT 1").get(),
    createForUser: (userId, name, targetRole) => {
      const existing = db.prepare("SELECT id FROM profiles WHERE user_id = ?").get(userId);
      if (existing) return db.prepare("SELECT * FROM profiles WHERE id = ?").get(existing.id);
      const info = db
        .prepare(
          "INSERT INTO profiles (user_id, name, role, target_role, readiness, next_best_skill) VALUES (?, ?, 'student', ?, 20, 'Docker')"
        )
        .run(userId, name, targetRole || "Full Stack Developer");
      const profileId = info.lastInsertRowid;
      // starter Skill DNA — every new user begins with a baseline to grow from
      const insSkill = db.prepare(
        "INSERT INTO skills (profile_id, name, value, tone, note, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
      );
      [
        ["JavaScript", 30, "steady", "Baseline — keep building"],
        ["React", 20, "gap", "Early signal"],
        ["SQL", 20, "gap", "Early signal"],
        ["Node.js", 15, "gap", "Not started"],
        ["Docker", 10, "gap", "Next best skill"],
        ["AWS", 10, "gap", "Future signal"],
      ].forEach(([sName, value, tone, note], i) =>
        insSkill.run(profileId, sName, value, tone, note, i)
      );
      // seed the new user's roadmap with the standard sequence
      const insStep = db.prepare(
        "INSERT INTO roadmap_steps (id, profile_id, label, title, status, icon, sort_order) VALUES (?, ?, ?, ?, ?, NULL, ?)"
      );
      [
        ["intent", "Career goal", targetRole || "Full Stack Developer", "complete"],
        ["foundations", "Foundation", "JavaScript + React baseline", "next"],
        ["docker", "Skill gap", "Containerized REST API", "up next"],
        ["assessment", "Validate", "Docker checkpoint", "up next"],
        ["evidence", "Prove", "Project reflection + README", "up next"],
      ].forEach(([id, label, title, status], i) =>
        insStep.run(id, profileId, label, title, status, i)
      );
      return db.prepare("SELECT * FROM profiles WHERE id = ?").get(profileId);
    },
  },
  skills: {
    listByProfile: (profileId) =>
      db
        .prepare(
          "SELECT name, value, tone, note FROM skills WHERE profile_id = ? ORDER BY sort_order"
        )
        .all(profileId),
  },
  opportunities: {
    all: () =>
      db
        .prepare("SELECT id, title, company, location, match, tags, why FROM opportunities ORDER BY match DESC")
        .all()
        .map((o) => ({ ...o, tags: JSON.parse(o.tags) })),
    saved: (profileId) =>
      db
        .prepare("SELECT opportunity_id, applied FROM saved_opportunities WHERE profile_id = ?")
        .all(profileId),
    toggleSave: (profileId, opportunityId) => {
      const existing = db
        .prepare(
          "SELECT 1 FROM saved_opportunities WHERE profile_id = ? AND opportunity_id = ?"
        )
        .get(profileId, opportunityId);
      if (existing) {
        db.prepare(
          "DELETE FROM saved_opportunities WHERE profile_id = ? AND opportunity_id = ?"
        ).run(profileId, opportunityId);
        return { saved: false };
      }
      db.prepare(
        "INSERT INTO saved_opportunities (profile_id, opportunity_id) VALUES (?, ?)"
      ).run(profileId, opportunityId);
      return { saved: true };
    },
    setApplied: (profileId, opportunityId, applied) => {
      db.prepare(
        "INSERT INTO saved_opportunities (profile_id, opportunity_id, applied) VALUES (?, ?, ?) ON CONFLICT(profile_id, opportunity_id) DO UPDATE SET applied = excluded.applied"
      ).run(profileId, opportunityId, applied ? 1 : 0);
      return { applied };
    },
  },
  roadmap: {
    listByProfile: (profileId) =>
      db
        .prepare(
          "SELECT id, label, title, status, sort_order AS sortOrder FROM roadmap_steps WHERE profile_id = ? ORDER BY sort_order"
        )
        .all(profileId),
    setComplete: (profileId, stepId, complete) => {
      const step = db
        .prepare("SELECT status FROM roadmap_steps WHERE id = ? AND profile_id = ?")
        .get(stepId, profileId);
      if (!step) return null;
      const isLocked = step.status === "complete";
      if (!isLocked) {
        db.prepare(
          "UPDATE roadmap_steps SET status = ? WHERE id = ? AND profile_id = ?"
        ).run(complete ? "complete" : "up next", stepId, profileId);
      }
      return db
        .prepare(
          "SELECT COUNT(*) AS done FROM roadmap_steps WHERE profile_id = ? AND status = 'complete'"
        )
        .get(profileId).done;
    },
  },
  assessments: {
    firstForProfile: (profileId) => {
      let a = db
        .prepare("SELECT * FROM assessments WHERE profile_id = ? ORDER BY id LIMIT 1")
        .get(profileId);
      if (!a) {
        // fall back to (and copy from) the demo assessment so new users get a checkpoint too
        const demo = db
          .prepare(
            "SELECT a.* FROM assessments a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id IS NULL ORDER BY a.id LIMIT 1"
          )
          .get();
        if (demo) {
          db.prepare(
            "INSERT INTO assessments (profile_id, skill, question, options, correct_index) VALUES (?, ?, ?, ?, ?)"
          ).run(profileId, demo.skill, demo.question, demo.options, demo.correct_index);
          a = db
            .prepare("SELECT * FROM assessments WHERE profile_id = ? ORDER BY id LIMIT 1")
            .get(profileId);
        }
      }
      if (!a) return null;
      return { ...a, options: JSON.parse(a.options) };
    },
    recordAttempt: (assessmentId, profileId, selectedIndex) => {
      const a = db
        .prepare("SELECT correct_index FROM assessments WHERE id = ?")
        .get(assessmentId);
      const correct = a && selectedIndex === a.correct_index;
      db.prepare(
        "INSERT INTO assessment_attempts (assessment_id, profile_id, selected_index, correct) VALUES (?, ?, ?, ?)"
      ).run(assessmentId, profileId, selectedIndex, correct ? 1 : 0);
      return { correct };
    },
    attemptCount: (profileId) =>
      db
        .prepare("SELECT COUNT(*) AS n FROM assessment_attempts WHERE profile_id = ?")
        .get(profileId).n,
  },
  chat: {
    history: (profileId, limit = 30) =>
      db
        .prepare(
          "SELECT from_party AS 'from', text, created_at FROM chat_messages WHERE profile_id = ? ORDER BY id DESC LIMIT ?"
        )
        .all(profileId, limit)
        .reverse(),
    add: (profileId, from, text) =>
      db
        .prepare("INSERT INTO chat_messages (profile_id, from_party, text) VALUES (?, ?, ?)")
        .run(profileId, from, text),
  },
  academia: {
    pulses: () =>
      db.prepare("SELECT label, percent, detail FROM curriculum_pulses ORDER BY sort_order").all(),
    interventions: () =>
      db.prepare("SELECT title, detail, action FROM interventions ORDER BY sort_order").all(),
  },
};

export default db;
