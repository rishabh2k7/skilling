import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lightbulb, Radar } from "lucide-react";
import { Badge, Button, PageHeader, PageTransition, Reveal, AnimatedNumber, ProgressBar, EASE } from "@/components/ui";
import { useSkills, useUpdateSkills } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import AuthGate from "@/components/AuthGate";

export default function SkillDNA({ navigate, user }) {
  const [view, setView] = useState("bars");
  const { data, isLoading } = useSkills();
  const updateSkills = useUpdateSkills();

  /* Guests have no personal data to show */
  if (!user) {
    return (
      <PageTransition>
        <PageHeader
          eyebrow="Skill intelligence / 01"
          title="Your Skill DNA"
          copy="A living view of the capabilities behind your target role — seeded at signup, sharpened by checkpoints and completed resources."
        />
        <AuthGate
          title="Skill DNA needs an account."
          copy="Sign up free and we seed your starting Skill DNA for your target role in one step. Every score after that is earned: checkpoints, completed lectures, and honest self-edits."
        />
      </PageTransition>
    );
  }

  const skills = data?.skills ?? [];
  const readiness = data?.readiness ?? 64;
  const role = data?.role ?? "Full Stack Developer";
  const canEdit = !!user;

  /* draft values while editing */
  const [draft, setDraft] = useState({});
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setDraft(Object.fromEntries(skills.map((s) => [s.name, s.value])));
  }, [skills, editing]);

  const startEdit = () => {
    setDraft(Object.fromEntries(skills.map((s) => [s.name, s.value])));
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const saveEdit = async () => {
    try {
      await updateSkills.mutateAsync(skills.map((s) => ({ name: s.name, value: draft[s.name] })));
      setEditing(false);
    } catch {
      /* error surfaces below via mutation state */
    }
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Skill intelligence / 01"
        title="Your Skill DNA"
        copy={`A living view of the capabilities behind your ${role} goal. Scores come from the server.`}
        action={
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button
                onClick={startEdit}
                data-testid="button-edit-skills"
                className="rounded-lg bg-[hsl(var(--accent))] px-3 py-2 text-xs font-bold text-[hsl(var(--accent-foreground))] transition hover:-translate-y-0.5"
              >
                Edit scores
              </button>
            )}
            <div className="flex rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1">
              <button
                onClick={() => setView("bars")}
                data-testid="button-view-bars"
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                  view === "bars" ? "bg-[hsl(var(--primary))] text-white" : ""
                }`}
              >
                Signals
              </button>
              <button
                onClick={() => setView("matrix")}
                data-testid="button-view-matrix"
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                  view === "matrix" ? "bg-[hsl(var(--primary))] text-white" : ""
                }`}
              >
                Matrix
              </button>
            </div>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Reveal className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Role alignment
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">{role}</h2>
            </div>
            <Badge tone="accent">{readiness} readiness</Badge>
          </div>

          {isLoading ? (
            <p className="mt-8 text-sm text-[hsl(var(--muted-foreground))]">Loading signals…</p>
          ) : view === "bars" && !editing ? (
            <div className="mt-8 space-y-6">
              {skills.map((skill, i) => (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: EASE }}
                  data-testid={`skill-row-${skill.name.toLowerCase().replace(".", "")}`}
                  className="relative"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold">{skill.name}</span>
                      <span
                        className={`ml-2 text-[10px] font-bold uppercase tracking-wider ${
                          skill.tone === "gap"
                            ? "text-[hsl(var(--destructive))]"
                            : "text-[hsl(var(--muted-foreground))]"
                        }`}
                      >
                        {skill.note}
                      </span>
                    </div>
                    <span
                      data-testid={`value-skill-${skill.name.toLowerCase().replace(".", "")}`}
                      className="font-mono text-sm font-bold"
                    >
                      <AnimatedNumber value={skill.value} />
                    </span>
                  </div>
                  <ProgressBar value={skill.value} accent={skill.tone === "gap"} />
                </motion.div>
              ))}
            </div>
          ) : view === "bars" && editing ? (
            <div className="mt-8 space-y-6" data-testid="skills-editor">
              {skills.map((skill) => (
                <div key={skill.name}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-bold">{skill.name}</span>
                    <span className="font-mono text-sm font-bold" data-testid={`draft-value-${skill.name.toLowerCase().replace(".", "")}`}>
                      {draft[skill.name] ?? skill.value}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={draft[skill.name] ?? skill.value}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [skill.name]: Number(e.target.value) }))
                    }
                    data-testid={`slider-${skill.name.toLowerCase().replace(".", "")}`}
                    className="w-full accent-[hsl(var(--accent))]"
                    aria-label={`${skill.name} score`}
                  />
                </div>
              ))}
              {updateSkills.isError && (
                <p className="rounded-lg bg-[hsl(var(--destructive))]/10 px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]">
                  {updateSkills.error?.message || "Could not save."}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button onClick={saveEdit} disabled={updateSkills.isPending} testId="button-save-skills">
                  {updateSkills.isPending ? "Saving…" : "Save scores"}
                </Button>
                <Button variant="outline" onClick={cancelEdit} testId="button-cancel-skills">
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Saving recalculates your readiness (average of all skills) and your next best
                skill (the lowest score) on the server.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {skills.map((skill, i) => (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.4, ease: EASE }}
                  className={`relative flex aspect-square flex-col justify-between rounded-xl p-4 ${
                    skill.value >= 80
                      ? "bg-[hsl(var(--primary))] text-white"
                      : skill.value >= 60
                        ? "bg-[hsl(var(--secondary))]"
                        : "bg-[hsl(var(--accent))]"
                  }`}
                >
                  <span className="text-xs font-bold">{skill.name}</span>
                  <span className="font-display text-4xl font-bold">
                    <AnimatedNumber value={skill.value} />
                  </span>
                  <span className="text-[10px] uppercase tracking-wider opacity-60">{skill.tone}</span>
                </motion.div>
              ))}
            </div>
          )}
        </Reveal>

        <div className="space-y-5">
          <Reveal className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--primary))] p-6 text-white">
            <div className="flex items-center gap-2 text-[hsl(var(--accent))]">
              <Lightbulb size={18} />
              <span className="font-mono text-[10px] uppercase tracking-wider">Explainable gap</span>
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold">
              {(data?.nextBestSkill ?? "Your weakest skill")} is your highest-leverage move.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              It has the lowest score in your DNA for this role, which means every point you add lifts
              your readiness fastest. Learn it from a real resource, validate it in a checkpoint, then
              ship something small.
            </p>
            <button
              className="mt-5 flex items-center gap-2 text-sm font-bold text-[hsl(var(--accent))]"
              onClick={() => navigate("/student/roadmap")}
              data-testid="button-act-on-gap"
            >
              Act on this gap <ArrowRight size={15} />
            </button>
          </Reveal>

          <Reveal
            delay={0.12}
            className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">How scores move</h3>
              <Radar size={18} className="text-[hsl(var(--muted-foreground))]" />
            </div>
            <div className="mt-5 space-y-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              <p>
                <strong className="text-[hsl(var(--foreground))]">Checkpoints:</strong> each correct
                answer in a graded checkpoint adds +2 to that skill — measured, not self-reported.
              </p>
              <p>
                <strong className="text-[hsl(var(--foreground))]">Manual edits:</strong> use the
                sliders to correct a score when reality drifts (you already knew this skill, or a
                resource moved it). Readiness and next-best-skill recompute server-side either way.
              </p>
              <p>
                <strong className="text-[hsl(var(--foreground))]">Readiness</strong> is the average
                of all your scores; <strong className="text-[hsl(var(--foreground))]">next best skill</strong>{" "}
                is always your current lowest.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </PageTransition>
  );
}
