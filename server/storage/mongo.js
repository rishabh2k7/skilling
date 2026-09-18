/* MongoDB Atlas storage backend — selected automatically when MONGODB_URI is set
   (see storage/index.js). Exposes the exact same async `q` interface as the SQLite
   store, so the rest of the app is storage-agnostic.

   Collections used:
     users, sessions, profiles, skills, opportunities, saved_opportunities,
     roadmap_steps, assessments, assessment_attempts, chat_messages,
     curriculum_pulses, interventions, counters (numeric id generator) */
import { MongoClient } from "mongodb";

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
  const opportunities = dbo.collection("opportunities");
  const savedOpportunities = dbo.collection("saved_opportunities");
  const roadmapSteps = dbo.collection("roadmap_steps");
  const assessments = dbo.collection("assessments");
  const assessmentAttempts = dbo.collection("assessment_attempts");
  const chatMessages = dbo.collection("chat_messages");
  const curriculumPulses = dbo.collection("curriculum_pulses");
  const interventions = dbo.collection("interventions");
  const counters = dbo.collection("counters");
  const meta = dbo.collection("meta");

  /* Numeric id generator — keeps ids interchangeable with the SQLite store */
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
  await savedOpportunities.createIndex({ profileId: 1, opportunityId: 1 }, { unique: true });
  await chatMessages.createIndex({ profileId: 1, _id: -1 });
  await assessmentAttempts.createIndex({ profileId: 1 });

  /* ---------------- Seed demo data (only once, via meta flag) ---------------- */

  async function seed() {
    if (await meta.findOne({ key: "seeded" })) return;

    const profileId = await nextId("profiles");
    await profiles.insertOne({
      _id: profileId,
      userId: null,
      name: "Aarav Mehta (demo)",
      role: "student",
      target_role: "Full Stack Developer",
      readiness: 64,
      next_best_skill: "Docker",
      created_at: nowIso(),
    });

    await skills.insertMany(
      [
        ["JavaScript", 90, "strong", "Ready to apply"],
        ["React", 82, "strong", "Role-ready"],
        ["SQL", 70, "steady", "Build depth"],
        ["Node.js", 65, "steady", "Close to target"],
        ["Docker", 40, "gap", "Next best skill"],
        ["AWS", 30, "gap", "Future signal"],
      ].map(([name, value, tone, note], i) => ({
        profileId,
        name,
        value,
        tone,
        note,
        sort_order: i,
      }))
    );

    const ops = [
      ["Frontend / Full Stack Intern", "Northstar Labs", "Remote · 12 weeks", 86,
        ["React", "Node.js", "TypeScript"],
        "Your React strength and growing Node.js signal map directly to the team’s internship brief."],
      ["Platform Engineering Co-op", "Radian Systems", "Austin · Hybrid", 72,
        ["Docker", "AWS", "SQL"],
        "A strong stretch match: your SQL foundation is solid, while Docker is the shortest path to eligibility."],
      ["Product Engineering Scholar", "Fieldnote", "New York · Hybrid", 68,
        ["JavaScript", "React", "APIs"],
        "Your JavaScript and React evidence meet the core bar; add one shipped API project to stand out."],
    ];
    for (const [title, company, location, match, tags, why] of ops) {
      await opportunities.insertOne({
        _id: await nextId("opportunities"),
        title,
        company,
        location,
        match,
        tags,
        why,
      });
    }

    await roadmapSteps.insertMany(
      [
        ["intent", "Career goal", "Full Stack Developer", "complete"],
        ["foundations", "Foundation", "JavaScript + React baseline", "complete"],
        ["docker", "Skill gap", "Containerized REST API", "next"],
        ["assessment", "Validate", "Docker checkpoint", "up next"],
        ["evidence", "Prove", "Project reflection + README", "up next"],
      ].map(([id, label, title, status], i) => ({
        id,
        profileId,
        label,
        title,
        status,
        icon: null,
        sort_order: i,
        completed_at: status === "complete" ? nowIso() : null,
      }))
    );

    await assessments.insertOne({
      _id: await nextId("assessments"),
      profileId,
      skill: "Docker",
      question: "What problem does a Docker container primarily solve?",
      options: [
        "A process that packages an app and its dependencies",
        "A cloud provider for hosting containers",
        "A JavaScript runtime for the browser",
        "A database migration tool",
      ],
      correct_index: 0,
      created_at: nowIso(),
    });

    await curriculumPulses.insertMany(
      [
        ["Cloud deployment", 42, "Docker, AWS"],
        ["Data fluency", 57, "SQL, analytics"],
        ["Product evidence", 68, "README, reflection"],
        ["Core programming", 83, "JavaScript, Python"],
      ].map(([label, percent, detail], i) => ({ label, percent, detail, sort_order: i }))
    );

    await interventions.insertMany(
      [
        ["Embed a Docker lab", "68 learners show the same deployment gap", "Create lab"],
        ["Add evidence rubric", "Students ship work but cannot explain it", "View rubric"],
        ["Pair with industry mentor", "Cloud signal is the current bottleneck", "Explore"],
      ].map(([title, detail, action], i) => ({ title, detail, action, sort_order: i }))
    );

    await meta.insertOne({ key: "seeded", at: nowIso() });
    console.log(`[db] seeded demo data into MongoDB (${dbName})`);
  }

  await seed();

  /* ---------------- Interface (identical shapes to the SQLite store) ---------------- */

  const q = {
    driver: "mongodb",
    client: { close: () => client.close() },

    users: {
      byEmail: (email) => users.findOne({ email: String(email).toLowerCase().trim() }),
      byId: (id) =>
        users.findOne(
          { _id: id },
          { projection: { password_hash: 0 } }
        ),
      register: async (email, name, passwordHash, targetRole) => {
        const userId = await nextId("users");
        await users.insertOne({
          _id: userId,
          email: String(email).toLowerCase().trim(),
          name,
          password_hash: passwordHash,
          created_at: nowIso(),
        });
        try {
          const profile = await q.profile.createForUser(userId, name, targetRole);
          return { userId, profile };
        } catch (err) {
          // compensating delete keeps sign-up atomic (no user without a profile)
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
          expiresAt: new Date(expiresAt), // BSON Date so the TTL index can purge it
          created_at: nowIso(),
        }),
      get: async (token) => {
        const s = await sessions.findOne({ token });
        if (!s) return null;
        const u = await users.findOne({ _id: s.userId });
        if (!u) return null;
        return { token: s.token, expires_at: s.expiresAt?.toISOString?.() ?? s.expiresAt, user_id: u._id, email: u.email, name: u.name };
      },
      delete: (token) => sessions.deleteOne({ token }),
      purgeExpired: () => sessions.deleteMany({ expiresAt: { $lt: new Date() } }),
    },

    profile: {
      get: (id) => profiles.findOne({ _id: id }),
      getByUserId: (userId) => profiles.findOne({ userId }, { sort: { _id: 1 } }),
      getDefault: () => profiles.findOne({ userId: null }, { sort: { _id: 1 } }),
      createForUser: async (userId, name, targetRole) => {
        const existing = await profiles.findOne({ userId });
        if (existing) return existing;
        const id = await nextId("profiles");
        await profiles.insertOne({
          _id: id,
          userId,
          name,
          role: "student",
          target_role: targetRole || "Full Stack Developer",
          readiness: 20,
          next_best_skill: "Docker",
          created_at: nowIso(),
        });
        // starter Skill DNA
        await skills.insertMany(
          [
            ["JavaScript", 30, "steady", "Baseline — keep building"],
            ["React", 20, "gap", "Early signal"],
            ["SQL", 20, "gap", "Early signal"],
            ["Node.js", 15, "gap", "Not started"],
            ["Docker", 10, "gap", "Next best skill"],
            ["AWS", 10, "gap", "Future signal"],
          ].map(([sName, value, tone, note], i) => ({
            profileId: id,
            name: sName,
            value,
            tone,
            note,
            sort_order: i,
          }))
        );
        await roadmapSteps.insertMany(
          [
            ["intent", "Career goal", targetRole || "Full Stack Developer", "complete"],
            ["foundations", "Foundation", "JavaScript + React baseline", "next"],
            ["docker", "Skill gap", "Containerized REST API", "up next"],
            ["assessment", "Validate", "Docker checkpoint", "up next"],
            ["evidence", "Prove", "Project reflection + README", "up next"],
          ].map(([stepId, label, title, status], i) => ({
            id: stepId,
            profileId: id,
            label,
            title,
            status,
            icon: null,
            sort_order: i,
            completed_at: status === "complete" ? nowIso() : null,
          }))
        );
        return profiles.findOne({ _id: id });
      },
      update: async (id, fields) => {
        const set = {};
        if (fields.name !== undefined) set.name = String(fields.name).trim();
        if (fields.targetRole !== undefined) set.target_role = String(fields.targetRole).trim();
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
        const toneFor = (v) => (v >= 75 ? "strong" : v >= 45 ? "steady" : "gap");
        for (const s of items) {
          const v = Math.round(Number(s.value));
          if (!Number.isFinite(v)) continue;
          const clamped = Math.max(0, Math.min(100, v));
          await skills.updateOne(
            { profileId, name: s.name },
            { $set: { value: clamped, tone: toneFor(clamped) } }
          );
        }
        return skills
          .find({ profileId }, { projection: { _id: 0, name: 1, value: 1, tone: 1, note: 1 } })
          .sort({ sort_order: 1 })
          .toArray();
      },
    },

    opportunities: {
      all: () =>
        opportunities
          .find({}, { projection: { _id: 0, id: "$_id", title: 1, company: 1, location: 1, match: 1, tags: 1, why: 1 } })
          .sort({ match: -1 })
          .toArray(),
      saved: async (profileId) => {
        const rows = await savedOpportunities
          .find({ profileId }, { projection: { _id: 0, opportunityId: 1, applied: 1 } })
          .toArray();
        return rows.map((r) => ({ opportunity_id: r.opportunityId, applied: r.applied }));
      },
      toggleSave: async (profileId, opportunityId) => {
        const existing = await savedOpportunities.findOne({ profileId, opportunityId });
        if (existing) {
          await savedOpportunities.deleteOne({ profileId, opportunityId });
          return { saved: false };
        }
        await savedOpportunities.insertOne({ profileId, opportunityId, applied: 0, saved_at: nowIso() });
        return { saved: true };
      },
      setApplied: (profileId, opportunityId, applied) =>
        savedOpportunities.updateOne(
          { profileId, opportunityId },
          { $set: { applied: applied ? 1 : 0 }, $setOnInsert: { saved_at: nowIso() } },
          { upsert: true }
        ).then(() => ({ applied })),
    },

    roadmap: {
      listByProfile: (profileId) =>
        roadmapSteps
          .find({ profileId }, { projection: { _id: 0, id: 1, label: 1, title: 1, status: 1, sort_order: 1 } })
          .sort({ sort_order: 1 })
          .toArray()
          .then((rows) => rows.map((r) => ({ ...r, sortOrder: r.sort_order }))),
      setComplete: async (profileId, stepId, complete) => {
        const step = await roadmapSteps.findOne({ id: stepId, profileId });
        if (!step) return null;
        if (step.status !== "complete") {
          await roadmapSteps.updateOne(
            { id: stepId, profileId },
            { $set: { status: complete ? "complete" : "up next", completed_at: complete ? nowIso() : null } }
          );
        }
        return roadmapSteps.countDocuments({ profileId, status: "complete" });
      },
    },

    assessments: {
      firstForProfile: async (profileId) => {
        let a = await assessments.findOne({ profileId }, { sort: { _id: 1 } });
        if (!a) {
          // fall back to (and copy from) the demo assessment so new users get a checkpoint too
          const demoProfile = await profiles.findOne({ userId: null }, { sort: { _id: 1 } });
          const demo = demoProfile && (await assessments.findOne({ profileId: demoProfile._id }, { sort: { _id: 1 } }));
          if (demo) {
            const id = await nextId("assessments");
            a = {
              _id: id,
              profileId,
              skill: demo.skill,
              question: demo.question,
              options: [...demo.options],
              correct_index: demo.correct_index,
              created_at: nowIso(),
            };
            await assessments.insertOne(a);
          }
        }
        if (!a) return null;
        return { ...a, id: a._id, options: [...a.options] };
      },
      recordAttempt: async (assessmentId, profileId, selectedIndex) => {
        const a = await assessments.findOne({ _id: assessmentId });
        const correct = !!a && selectedIndex === a.correct_index;
        await assessmentAttempts.insertOne({
          assessmentId,
          profileId,
          selected_index: selectedIndex,
          correct: correct ? 1 : 0,
          attempted_at: nowIso(),
        });
        return { correct };
      },
      attemptCount: (profileId) => assessmentAttempts.countDocuments({ profileId }),
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

    academia: {
      pulses: () =>
        curriculumPulses
          .find({}, { projection: { _id: 0, label: 1, percent: 1, detail: 1 } })
          .sort({ sort_order: 1 })
          .toArray(),
      interventions: () =>
        interventions
          .find({}, { projection: { _id: 0, title: 1, detail: 1, action: 1 } })
          .sort({ sort_order: 1 })
          .toArray(),
    },
  };

  return q;
}
