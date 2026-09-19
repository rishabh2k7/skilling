import { motion } from "framer-motion";
import {
  CheckCircle2,
  Code,
  ExternalLink,
  FileText,
  Lightbulb,
  Sparkles,
  Target,
} from "lucide-react";
import {
  Badge,
  Button,
  PageHeader,
  PageTransition,
  Reveal,
  ProgressBar,
  EASE,
} from "@/components/ui";
import { useRoadmap, useSkills, useToggleRoadmapStep, useResources } from "@/lib/api";
import { openAuthModal } from "@/components/AuthGate";

const STEP_ICONS = {
  intent: Target,
  foundations: Code,
  build: Sparkles,
  checkpoint: Target,
  evidence: FileText,
};

export default function Roadmap({ user }) {
  const { data, isLoading } = useRoadmap();
  const { data: skillsData } = useSkills();
  const { data: resourcesData } = useResources();
  const toggleMutation = useToggleRoadmapStep();

  const steps = data?.steps ?? [];
  const done = data?.done ?? 0;
  const total = data?.total ?? 0;

  const gapSkill = skillsData?.nextBestSkill ?? "your next skill";
  const role = skillsData?.role ?? "your target role";
  const readiness = skillsData?.readiness ?? 0;

  /* Suggest up to 3 real resources that teach the current gap skill */
  const gapResources = (resourcesData?.resources ?? [])
    .filter((r) => r.skills.includes(gapSkill))
    .slice(0, 3);

  const toggle = (stepId, isDone) => {
    if (!user) return openAuthModal("register");
    toggleMutation.mutate({ stepId, complete: !isDone });
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Skill intelligence / roadmap"
        title="Your next-best-skill roadmap"
        copy={`A focused sequence from gap to proof, generated from your own Skill DNA. Right now the highest-leverage move for ${role} is ${gapSkill}.`}
        action={
          <Badge tone="accent">
            {done} / {total} complete
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_.72fr]">
        <Reveal className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-card)] md:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Sequence 01
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">From gap to proof</h2>
            </div>
            <div className="w-28">
              <ProgressBar value={(done / Math.max(total, 1)) * 100} accent />
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading roadmap…</p>
          ) : steps.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Sign in to generate your personal roadmap.
            </p>
          ) : (
            <div className="relative space-y-3">
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE }}
                className="absolute bottom-7 left-[19px] top-7 w-px origin-top bg-gradient-to-b from-[hsl(var(--secondary-foreground))] via-[hsl(var(--accent))] to-[hsl(var(--border))]"
              />
              {steps.map((step, i) => {
                const isDone = step.status === "complete";
                const isNext = !isDone && step.status === "next";
                const Icon = STEP_ICONS[step.id] || Sparkles;
                const toggleable = ["foundations", "build", "checkpoint", "evidence"].includes(step.id);
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -14 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.45, ease: EASE }}
                    className="relative flex items-center gap-4 rounded-xl p-3 transition hover:bg-[hsl(var(--muted))]"
                  >
                    <motion.div
                      animate={
                        isNext
                          ? {
                              boxShadow: [
                                "0 0 0 0 hsl(var(--accent) / 0)",
                                "0 0 0 7px hsl(var(--accent) / .12)",
                                "0 0 0 0 hsl(var(--accent) / 0)",
                              ],
                            }
                          : { scale: isDone ? [1, 1.08, 1] : 1 }
                      }
                      transition={isNext ? { repeat: Infinity, duration: 2.2 } : { duration: 0.4 }}
                      className={`z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        isDone
                          ? "bg-[hsl(var(--secondary-foreground))] text-white"
                          : isNext
                            ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                            : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      }`}
                    >
                      {isDone ? <CheckCircle2 size={18} /> : <Icon size={17} />}
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        {step.label}
                      </p>
                      <p className="mt-1 text-sm font-bold">{step.title}</p>
                    </div>
                    {toggleable ? (
                      <button
                        onClick={() => toggle(step.id, isDone)}
                        data-testid={`button-toggle-${step.id}`}
                        className={`rounded-lg px-3 py-2 text-xs font-bold ${
                          isDone
                            ? "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
                            : "border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                        }`}
                      >
                        {isDone ? "Complete" : isNext ? "Start" : "Mark done"}
                      </button>
                    ) : (
                      <motion.span
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + i * 0.08 }}
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isDone
                            ? "text-[hsl(var(--secondary-foreground))]"
                            : "text-[hsl(var(--muted-foreground))]"
                        }`}
                      >
                        {isDone ? "Complete" : step.status}
                      </motion.span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </Reveal>

        <div className="space-y-5">
          <Reveal
            delay={0.15}
            className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--primary))] p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <Badge tone="accent">Build brief</Badge>
              <Sparkles size={18} className="text-[hsl(var(--accent))]" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-bold">
              {gapSkill} in practice
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Learn {gapSkill} from a real resource in the library, then prove it: build something
              small and real, and push it to GitHub. That artifact becomes evidence recruiters can
              read — worth more than any score alone.
            </p>
            <Button
              onClick={() => (window.location.href = "/student/resources")}
              variant="accent"
              className="mt-6 w-full"
              testId="button-open-resources"
            >
              Learn {gapSkill} from real lectures <ExternalLink size={15} />
            </Button>
          </Reveal>

          {gapResources.length > 0 && (
            <Reveal
              delay={0.22}
              className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">
                  Real resources for {gapSkill}
                </h3>
                <Lightbulb size={17} className="text-[hsl(var(--secondary-foreground))]" />
              </div>
              <div className="mt-4 space-y-2">
                {gapResources.map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`roadmap-resource-${r.id}`}
                    className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-3 transition hover:border-[hsl(var(--secondary-foreground))]/40 hover:bg-[hsl(var(--muted))]"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
                      <ExternalLink size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{r.title}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {r.provider} · {r.duration}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </Reveal>
          )}

          <Reveal
            delay={0.3}
            className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"
          >
            <h3 className="font-display text-lg font-bold">Why this, now?</h3>
            <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              {gapSkill} is currently your lowest-scored skill (readiness {readiness}/100 overall).
              It was chosen by the same engine that ranks your opportunities — closing it lifts
              every match you see.
            </p>
          </Reveal>
        </div>
      </div>
    </PageTransition>
  );
}
