/* MongoDB Atlas storage backend — selected automatically when MONGODB_URI is set
   (see storage/index.js). Exposes the exact same async `q` interface as the SQLite
   store, so the rest of the app is storage-agnostic.

   Production schema: no demo data. Collections:
     users, sessions, profiles, skills, saved_openings, resource_status,
     roadmap_steps, checkpoint_attempts, readiness_history, chat_messages, counters */
import { MongoClient } from "mongodb";
import { ROLE_LIBRARY, DEFAULT_ROLE, RESOURCES, buildRoadmapTasks } from "../catalog.js";

const nowIso = () => new Date().toISOString();

export async function init() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || uri.split("/").pop()?.split("?")[0] || "skilling";

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const dbo = client.db(dbName);

  const users = dbo.collection("users");
  const sessions = dbo.collection("sessions");
  const profiles = dbo.collection("profiles");
  const skills = dbo.collection("skills");
  const savedOpenings = dbo.collection("saved_openings");
  const resourceStatus = dbo.collection("resource_status");
  const roadmapSteps = dbo.collection("roadmap_steps");
  const roadmapTasks = dbo.collection("roadmap_tasks");
  const checkpointAttempts = dbo.collection("checkpoint_attempts");
  const readinessHistory = dbo.collection("readiness_history");
  const chatMessages = dbo.collection("chat_messages");
  const counters = dbo.collection("counters");

  async function nextId(name) {
    const r = await counters.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    return r.seq;
  }

  /* ---------------- Indexes ---------------- */

  await users.createIndex({ email: 1 }, { unique: true });
  await sessions.createIndex({ token: 1 }, { unique: true });
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL: auto-purge
  await skills.createIndex({ profileId: 1, name: 1 }, { unique: true });
  await roadmapSteps.createIndex({ profileId: 1, id: 1 }, { unique: true });
  await roadmapTasks.createIndex({ profileId: 1, sort_order: 1 });
  await savedOpenings.createIndex({ profileId: 1, slug: 1 }, { unique: true });
  await resourceStatus.createIndex({ profileId: 1, id: 1 }, { unique: true });
  await chatMessages.createIndex({ profileId: 1, _id: -1 });
  await checkpointAttempts.createIndex({ profileId: 1 });
  await readinessHistory.createIndex({ profileId: 1, _id: -1 });

  /* Legacy demo-era collections from older versions are removed. */
  for (const legacy of [
    "opportunities",
    "saved_opportunities",
    "assessments",
    "assessment_attempts",
    "curriculum_pulses",
    "interventions",
    "meta",
  ]) {
    try {
      await dbo.collection(legacy).drop();
    } catch {
      /* already gone */
    }
  }

  /* Remove demo profiles (no owning user) left by older versions */
  const demoGone = await profiles.deleteMany({ userId: null });
  if (demoGone.deletedCount) {
    console.log(`[db] removed ${demoGone.deletedCount} demo profile(s)`);
  }

  /* ---------------- Shared helpers ---------------- */

  const toneFor = (v) => (v >= 75 ? "strong" : v >= 45 ? "steady" : "gap");
  const noteFor = (v, isNextBest) =>
    isNextBest ? "Next best skill" : v >= 75 ? "Ready to apply" : v >= 45 ? "Build depth" : "Early signal";

  async function seedSkills(profileId, targetRole) {
    const spec = ROLE_LIBRARY[targetRole] ?? ROLE_LIBRARY[DEFAULT_ROLE];
    const weakest = [...spec].sort((a, b) => a[1] - b[1])[0][0];
    await skills.insertMany(
      spec.map(([name, value], i) => ({
        profileId,
        name,
        value,
        tone: toneFor(value),
        note: noteFor(value, name === weakest),
        sort_order: i,
      }))
    );
    return weakest;
  }

  async function seedRoadmap(profileId, targetRole, gapSkill) {
    const steps = [
      ["intent", "Career goal", targetRole, "complete"],
      ["foundations", "Learn", "Study the role's core skills", "next"],
      ["checkpoint", "Validate", "Pass graded checkpoints", "up next"],
      ["build", "Build", "Ship a small real project", "up next"],
      ["evidence", "Prove", "Link your work from your profile", "up next"],
    ];
    await roadmapSteps.insertMany(
      steps.map(([id, label, title, status], i) => ({
        id,
        profileId,
        label,
        title,
        status,
        sort_order: i,
        completed_at: status === "complete" ? nowIso() : null,
      }))
    );

    /* Ordered default tasks carrying real data (resources/checkpoint/project) */
    const spec = ROLE_LIBRARY[targetRole] ?? ROLE_LIBRARY[DEFAULT_ROLE];
    const foundationSkill = [...spec].sort((a, b) => b[1] - a[1])[0][0]; // strongest = start here
    await seedRoadmapTasksOnly(profileId, targetRole, foundationSkill, gapSkill);
  }

  /* Seed ONLY tasks (used by seedRoadmap and by the backfill) */
  async function seedRoadmapTasksOnly(profileId, targetRole, foundationSkill, gapSkill) {
    const tasks = buildRoadmapTasks(targetRole ?? DEFAULT_ROLE, foundationSkill, gapSkill).map((t, i) => ({
      ...t,
      stepId: ["foundations", "foundations", "checkpoint", "build"][i] ?? "evidence",
    }));
    if (!tasks.length) return;
    await Promise.all(
      tasks.map(async (t, i) =>
        roadmapTasks.insertOne({
          _id: await nextId("roadmap_tasks"),
          profileId,
          stepId: t.stepId,
          kind: t.kind,
          title: t.title,
          data: t.data ?? {},
          estimate: t.estimate ?? null,
          done: false,
          sort_order: (i + 1) * 10,
          completed_at: null,
          created_at: nowIso(),
        })
      )
    );
  }

  /* Backfill default tasks for profiles created before tasks existed */
  async function backfillTasks() {
    const withTasks = new Set((await roadmapTasks.distinct("profileId")).map(Number));
    const allProfiles = await profiles
      .find({}, { projection: { _id: 1, target_role: 1, next_best_skill: 1 } })
      .toArray();
    const missing = allProfiles.filter((p) => !withTasks.has(Number(p._id)));
    for (const p of missing) {
      const spec = ROLE_LIBRARY[p.target_role] ?? ROLE_LIBRARY[DEFAULT_ROLE];
      const foundationSkill = [...spec].sort((a, b) => b[1] - a[1])[0][0];
      await seedRoadmapTasksOnly(Number(p._id), p.target_role, foundationSkill, p.next_best_skill);
    }
    if (missing.length) console.log("[db] backfilled roadmap tasks for " + missing.length + " profile(s)");
  }
  await backfillTasks();

  const recordReadiness = (profileId, readiness) =>
    readinessHistory.insertOne({
      profileId,
      readiness: Math.max(0, Math.min(100, Math.round(readiness))),
      recorded_at: nowIso(),
    });

  /* ---------------- Interface (identical shapes to the SQLite store) ---------------- */

  const q = {
    driver: "mongodb",
    client: { close: () => client.close() },

    users: {
      byEmail: (email) => users.findOne({ email: String(email).toLowerCase().trim() }),
      byId: (id) =>
        users.findOne({ _id: id }, { projection: { password_hash: 0 } }),
      register: async (email, name, passwordHash, targetRole) => {
        const role = targetRole && ROLE_LIBRARY[targetRole] ? targetRole : DEFAULT_ROLE;
        const userId = await nextId("users");
        await users.insertOne({
          _id: userId,
          email: String(email).toLowerCase().trim(),
          name: String(name).trim(),
          password_hash: passwordHash,
          created_at: nowIso(),
        });
        try {
          const profile = await q.profile.createForUser(userId, name, role);
          return { userId, profile };
        } catch (err) {
          await users.deleteOne({ _id: userId });
          throw err;
        }
      },
      rename: (id, name) =>
        users.updateOne({ _id: id }, { $set: { name: String(name).trim() } }),
    },

    sessions: {
      create: (userId, token, expiresAt) =>
        sessions.insertOne({
          token,
          userId,
          expiresAt: new Date(expiresAt),
          created_at: nowIso(),
        }),
      get: async (token) => {
        const s = await sessions.findOne({ token });
        if (!s) return null;
        const u = await users.findOne({ _id: s.userId });
        if (!u) return null;
        return {
          token: s.token,
          expires_at: s.expiresAt?.toISOString?.() ?? s.expiresAt,
          user_id: u._id,
          email: u.email,
          name: u.name,
        };
      },
      delete: (token) => sessions.deleteOne({ token }),
      purgeExpired: () => sessions.deleteMany({ expiresAt: { $lt: new Date() } }),
    },

    profile: {
      get: (id) => profiles.findOne({ _id: id }),
      getByUserId: (userId) => profiles.findOne({ userId }, { sort: { _id: 1 } }),
      /* No demo profile exists — guests simply have none. */
      getDefault: () => Promise.resolve(null),
      createForUser: async (userId, name, targetRole) => {
        const existing = await profiles.findOne({ userId });
        if (existing) return existing;
        const role = targetRole && ROLE_LIBRARY[targetRole] ? targetRole : DEFAULT_ROLE;
        const id = await nextId("profiles");
        await profiles.insertOne({
          _id: id,
          userId,
          name: String(name).trim(),
          role: "student",
          target_role: role,
          readiness: 0,
          next_best_skill: null,
          linkedin_url: null,
          created_at: nowIso(),
        });
        const weakest = await seedSkills(id, role);
        await seedRoadmap(id, role, weakest);
        const rows = await skills.find({ profileId: id }).toArray();
        const avg = Math.round(rows.reduce((a, s) => a + s.value, 0) / Math.max(1, rows.length));
        await profiles.updateOne(
          { _id: id },
          { $set: { readiness: avg, next_best_skill: weakest } }
        );
        await recordReadiness(id, avg);
        return profiles.findOne({ _id: id });
      },
      update: async (id, fields) => {
        const set = {};
        if (fields.name !== undefined) set.name = String(fields.name).trim();
        if (fields.targetRole !== undefined) set.target_role = String(fields.targetRole).trim();
        if (fields.linkedinUrl !== undefined)
          set.linkedin_url = String(fields.linkedinUrl).trim().slice(0, 300);
        if (fields.readiness !== undefined)
          set.readiness = Math.max(0, Math.min(100, Math.round(Number(fields.readiness))));
        if (fields.nextBestSkill !== undefined) set.next_best_skill = fields.nextBestSkill;
        if (Object.keys(set).length) await profiles.updateOne({ _id: id }, { $set: set });
        return profiles.findOne({ _id: id });
      },
    },

    skills: {
      listByProfile: (profileId) =>
        skills
          .find({ profileId }, { projection: { _id: 0, name: 1, value: 1, tone: 1, note: 1 } })
          .sort({ sort_order: 1 })
          .toArray(),
      setMultiple: async (profileId, items) => {
        for (const s of items) {
          const v = Math.round(Number(s.value));
          if (!Number.isFinite(v)) continue;
          const clamped = Math.max(0, Math.min(100, v));
          await skills.updateOne(
            { profileId, name: s.name },
            { $set: { value: clamped, tone: toneFor(clamped), note: noteFor(clamped, false) } }
          );
        }
        return skills
          .find({ profileId }, { projection: { _id: 0, name: 1, value: 1, tone: 1, note: 1 } })
          .sort({ sort_order: 1 })
          .toArray();
      },
      bump: async (profileId, skillName, delta) => {
        const row = await skills.findOne({ profileId, name: skillName });
        if (!row) return null;
        const v = Math.max(0, Math.min(100, row.value + delta));
        await skills.updateOne(
          { profileId, name: skillName },
          { $set: { value: v, tone: toneFor(v) } }
        );
        return v;
      },
    },

    openings: {
      saved: async (profileId) => {
        const rows = await savedOpenings
          .find({ profileId }, { projection: { _id: 0, slug: 1, applied: 1 } })
          .toArray();
        return rows.map((r) => ({ slug: r.slug, applied: r.applied }));
      },
      toggleSave: async (profileId, slug) => {
        const existing = await savedOpenings.findOne({ profileId, slug });
        if (existing) {
          await savedOpenings.deleteOne({ profileId, slug });
          return { saved: false };
        }
        await savedOpenings.insertOne({ profileId, slug, applied: 0, saved_at: nowIso() });
        return { saved: true };
      },
      setApplied: async (profileId, slug, applied) => {
        await savedOpenings.updateOne(
          { profileId, slug },
          { $set: { applied: applied ? 1 : 0 }, $setOnInsert: { saved_at: nowIso() } },
          { upsert: true }
        );
        return { applied };
      },
      appliedCount: (profileId) =>
        savedOpenings.countDocuments({ profileId, applied: 1 }),
    },

    resources: {
      list: () => Promise.resolve(RESOURCES),
      statusFor: async (profileId) => {
        const rows = await resourceStatus
          .find({ profileId }, { projection: { _id: 0, id: 1, status: 1 } })
          .toArray();
        return rows.map((r) => ({ id: r.id, status: r.status }));
      },
      setStatus: async (profileId, id, status) => {
        if (status === "none") {
          await resourceStatus.deleteOne({ profileId, id });
          return { status: "none" };
        }
        await resourceStatus.updateOne(
          { profileId, id },
          { $set: { status, updated_at: nowIso() } },
          { upsert: true }
        );
        return { status };
      },
      completedCount: (profileId) =>
        resourceStatus.countDocuments({ profileId, status: "completed" }),
    },

    roadmap: {
      listByProfile: (profileId) =>
        roadmapSteps
          .find({ profileId }, { projection: { _id: 0, id: 1, label: 1, title: 1, status: 1, sort_order: 1 } })
          .sort({ sort_order: 1 })
          .toArray()
          .then((rows) => rows.map((r) => ({ ...r, sortOrder: r.sort_order }))),

      listTasks: async (profileId) => {
        const rows = await roadmapTasks
          .find({ profileId }, { projection: { _id: 1, stepId: 1, kind: 1, title: 1, data: 1, estimate: 1, done: 1, sort_order: 1, completed_at: 1 } })
          .sort({ sort_order: 1 })
          .toArray();
        return rows.map((r) => ({
          id: r._id,
          stepId: r.stepId,
          kind: r.kind,
          title: r.title,
          data: r.data ?? {},
          estimate: r.estimate,
          done: !!r.done,
          sortOrder: r.sort_order,
          completedAt: r.completed_at,
        }));
      },

      /* Strictly ordered completion: only the first incomplete task may be
         checked. Syncs the owning steps' statuses afterwards. */
      setTaskDone: async (profileId, taskId, done) => {
        const tasks = await roadmapTasks
          .find({ profileId })
          .sort({ sort_order: 1 })
          .toArray();
        const target = tasks.find((t) => String(t._id) === String(taskId));
        if (!target) return { error: "unknown task" };
        const firstOpen = tasks.find((t) => !t.done);
        if (done && firstOpen && String(firstOpen._id) !== String(target._id)) {
          return { error: "out_of_order", blockedBy: firstOpen._id };
        }
        await roadmapTasks.updateOne(
          { _id: target._id, profileId },
          { $set: { done: !!done, completed_at: done ? nowIso() : null } }
        );

        /* Sync owning step statuses: complete when all its tasks are done,
           the first step with open tasks becomes 'next', the rest 'up next'. */
        const after = await roadmapTasks
          .find({ profileId }, { projection: { _id: 0, stepId: 1, done: 1 } })
          .toArray();
        const stepIds = (
          await roadmapSteps
            .find({ profileId, id: { $ne: "intent" } }, { projection: { _id: 0, id: 1 } })
            .sort({ sort_order: 1 })
            .toArray()
        ).map((r) => r.id);
        const allDoneFor = (stepId) => {
          const rows = after.filter((t) => t.stepId === stepId);
          return rows.length > 0 && rows.every((t) => t.done);
        };
        let nextSet = false;
        for (const sid of stepIds) {
          const step = await roadmapSteps.findOne({ id: sid, profileId }, { projection: { _id: 0, status: 1 } });
          if (!step || step.status === "complete") continue;
          if (allDoneFor(sid)) {
            await roadmapSteps.updateOne(
              { id: sid, profileId },
              { $set: { status: "complete", completed_at: nowIso() } }
            );
          } else if (!nextSet) {
            await roadmapSteps.updateOne({ id: sid, profileId }, { $set: { status: "next" } });
            nextSet = true;
          } else {
            await roadmapSteps.updateOne({ id: sid, profileId }, { $set: { status: "up next" } });
          }
        }

        const doneCount = await roadmapTasks.countDocuments({ profileId, done: true });
        const totalCount = await roadmapTasks.countDocuments({ profileId });
        return { done: doneCount, total: totalCount };
      },

      /* Add a custom task to the end of the ordered list */
      addTask: async (profileId, stepId, title, data, estimate) => {
        const max = await roadmapTasks
          .find({ profileId }, { projection: { _id: 0, sort_order: 1 } })
          .sort({ sort_order: -1 })
          .limit(1)
          .toArray();
        const nextOrder = (max[0]?.sort_order ?? 0) + 10;
        const _id = await nextId("roadmap_tasks");
        await roadmapTasks.insertOne({
          _id,
          profileId,
          stepId,
          kind: "custom",
          title: String(title).trim(),
          data: data ?? {},
          estimate: estimate ?? null,
          done: false,
          sort_order: nextOrder,
          completed_at: null,
          created_at: nowIso(),
        });
        return {
          id: _id,
          stepId,
          kind: "custom",
          title: String(title).trim(),
          data: data ?? {},
          estimate: estimate ?? null,
          done: false,
          sortOrder: nextOrder,
          completedAt: null,
        };
      },

      deleteTask: async (profileId, taskId) => {
        const r = await roadmapTasks.deleteOne({ _id: Number(taskId), profileId, kind: "custom" });
        return { deleted: r.deletedCount > 0 };
      },

      /* Tasks are the source of truth: recompute every step's status from its
         tasks. Fixes states left over from the old direct-step toggle flow. */
      reconcileSteps: async (profileId) => {
        const tasks = await roadmapTasks
          .find({ profileId }, { projection: { _id: 0, stepId: 1, done: 1 } })
          .toArray();
        const stepIds = (
          await roadmapSteps
            .find({ profileId, id: { $ne: "intent" } }, { projection: { _id: 0, id: 1 } })
            .sort({ sort_order: 1 })
            .toArray()
        ).map((r) => r.id);
        let nextSet = false;
        for (const sid of stepIds) {
          const rows = tasks.filter((t) => t.stepId === sid);
          const allDone = rows.length > 0 && rows.every((t) => t.done);
          if (allDone) {
            await roadmapSteps.updateOne(
              { id: sid, profileId },
              { $set: { status: "complete" }, $setOnInsert: { completed_at: nowIso() } }
            );
          } else if (!nextSet) {
            await roadmapSteps.updateOne({ id: sid, profileId }, { $set: { status: "next" } });
            nextSet = true;
          } else {
            await roadmapSteps.updateOne({ id: sid, profileId }, { $set: { status: "up next" } });
          }
        }
      },
    },

    checkpoints: {
      history: async (profileId) => {
        const rows = await checkpointAttempts
          .find({ profileId }, { projection: { _id: 0, skill: 1, questionId: 1, correct: 1, attemptedAt: 1 } })
          .sort({ _id: -1 })
          .limit(100)
          .toArray();
        return rows.map((r) => ({
          skill: r.skill,
          questionId: r.questionId,
          correct: r.correct,
          attemptedAt: r.attempted_at ?? r.attemptedAt,
        }));
      },
      record: (profileId, skill, questionId, selectedIndex, correct) =>
        checkpointAttempts.insertOne({
          profileId,
          skill,
          questionId,
          selected_index: selectedIndex,
          correct: correct ? 1 : 0,
          attempted_at: nowIso(),
        }),
      stats: async (profileId) => {
        const rows = await checkpointAttempts
          .find({ profileId }, { projection: { _id: 0, correct: 1 } })
          .toArray();
        return { taken: rows.length, correct: rows.filter((r) => r.correct).length };
      },
    },

    readiness: {
      history: async (profileId, limit = 14) => {
        const rows = await readinessHistory
          .find({ profileId }, { projection: { _id: 0, readiness: 1, recorded_at: 1 } })
          .sort({ _id: -1 })
          .limit(limit)
          .toArray();
        return rows
          .reverse()
          .map((r) => ({ readiness: r.readiness, recordedAt: r.recorded_at }));
      },
      record: recordReadiness,
    },

    chat: {
      history: async (profileId, limit = 30) => {
        const rows = await chatMessages
          .find({ profileId }, { projection: { _id: 0, from: 1, text: 1, created_at: 1 } })
          .sort({ _id: -1 })
          .limit(limit)
          .toArray();
        return rows.reverse();
      },
      add: (profileId, from, text) =>
        chatMessages.insertOne({ profileId, from, text, created_at: nowIso() }),
    },

    stats: {
      overall: async () => {
        const learners = await users.countDocuments();
        const profilesAgg = await profiles
          .aggregate([{ $group: { _id: null, avg: { $avg: "$readiness" }, n: { $sum: 1 } } }])
          .toArray();
        const attempts = await checkpointAttempts
          .find({}, { projection: { _id: 0, correct: 1 } })
          .toArray();
        const completions = await resourceStatus.countDocuments({ status: "completed" });
        return {
          learners,
          avgReadiness: profilesAgg.length ? Math.round(profilesAgg[0].avg || 0) : 0,
          checkpointsTaken: attempts.length,
          checkpointAccuracy: attempts.length
            ? Math.round((attempts.filter((a) => a.correct).length / attempts.length) * 100)
            : 0,
          resourcesCompleted: completions,
          resourceCount: RESOURCES.length,
        };
      },
      academia: async () => {
        const learners = await users.countDocuments();
        const profilesAgg = await profiles
          .aggregate([{ $group: { _id: null, avg: { $avg: "$readiness" } } }])
          .toArray();
        const attempts = await checkpointAttempts
          .find({}, { projection: { _id: 0, correct: 1 } })
          .toArray();
        const roles = await profiles
          .aggregate([
            { $group: { _id: { $ifNull: [{ $cond: [{ $gt: ["$target_role", ""] }, "$target_role", null] }, "Undecided"] }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 6 },
            { $project: { _id: 0, role: "$_id", count: 1 } },
          ])
          .toArray();
        const recentDocs = await profiles
          .find({}, { sort: { _id: -1 }, limit: 8 })
          .toArray();
        const recent = recentDocs.map((p) => {
          const parts = (p.name || "").split(" ");
          const masked =
            parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0] || "Learner";
          return {
            name: masked,
            role: p.target_role || "Undecided",
            readiness: p.readiness,
            createdAt: p.created_at,
          };
        });
        const topSkills = await skills
          .aggregate([
            { $group: { _id: "$name", avgValue: { $avg: "$value" }, learners: { $sum: 1 } } },
            { $sort: { avgValue: 1 } },
            { $limit: 6 },
            { $project: { _id: 0, name: "$_id", avgValue: { $round: ["$avgValue", 0] }, learners: 1 } },
          ])
          .toArray();
        return {
          learners,
          avgReadiness: profilesAgg.length ? Math.round(profilesAgg[0].avg || 0) : 0,
          checkpointsTaken: attempts.length,
          checkpointAccuracy: attempts.length
            ? Math.round((attempts.filter((a) => a.correct).length / attempts.length) * 100)
            : 0,
          roles,
          recent,
          topSkills,
        };
      },
    },
  };

  return q;
}
