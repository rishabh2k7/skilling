import { useState } from "react";
import { motion } from "framer-motion";
import { Box, CheckCircle2, Code, FileText, Lightbulb, Sparkles, Target } from "lucide-react";
import { Badge, Button, PageHeader, PageTransition, Reveal, ProgressBar, EASE } from "@/components/ui";
import { useLocalState } from "@/hooks/useLocalState";
import { ROADMAP_STEPS } from "@/data/skillingData";

export default function Roadmap() {
  const [completed, setCompleted] = useLocalState("skilling-roadmap-completed", []);
  const [briefGenerated, setBriefGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const toggle = (id, title) => {
    const next = completed.includes(id)
      ? completed.filter((x) => x !== id)
      : [...completed, id];
    setCompleted(next);
    setStatusMsg(
      next.includes(id) ? `${title} marked complete.` : `${title} reopened.`
    );
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Skill intelligence / 03"
        title="Your next-best-skill roadmap"
        copy="A focused sequence from gap to evidence. Start with Docker because it creates the clearest bridge to your target role."
        action={<Badge tone="accent">{completed.length} / 5 complete</Badge>}
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
              <ProgressBar value={(completed.length / 5) * 100} accent />
            </div>
          </div>

          <div className="relative space-y-3">
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: EASE }}
              className="absolute bottom-7 left-[19px] top-7 w-px origin-top bg-gradient-to-b from-[hsl(var(--secondary-foreground))] via-[hsl(var(--accent))] to-[hsl(var(--border))]"
            />
            {ROADMAP_STEPS.map((step, i) => {
              const done = completed.includes(step.id) || step.status === "complete";
              const isNext = !done && step.id === "docker";
              const Icon = step.icon;
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
                        : { scale: done ? [1, 1.08, 1] : 1 }
                    }
                    transition={isNext ? { repeat: Infinity, duration: 2.2 } : { duration: 0.4 }}
                    className={`z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      done
                        ? "bg-[hsl(var(--secondary-foreground))] text-white"
                        : isNext
                          ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <StepIcon step={step} />
                    )}
                  </motion.div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      {step.label}
                    </p>
                    <p className="mt-1 text-sm font-bold">{step.title}</p>
                  </div>
                  {["docker", "assessment", "evidence"].includes(step.id) ? (
                    <button
                      onClick={() => toggle(step.id, step.title)}
                      data-testid={`button-toggle-${step.id}`}
                      className={`rounded-lg px-3 py-2 text-xs font-bold ${
                        done
                          ? "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
                          : "border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                      }`}
                    >
                      {done ? "Complete" : step.id === "docker" ? "Start" : "Mark done"}
                    </button>
                  ) : (
                    <motion.span
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.08 }}
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        done
                          ? "text-[hsl(var(--secondary-foreground))]"
                          : "text-[hsl(var(--muted-foreground))]"
                      }`}
                    >
                      {done ? "Complete" : step.status}
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {statusMsg && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid="status-roadmap"
              className="mt-5 rounded-lg bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-bold text-[hsl(var(--secondary-foreground))]"
            >
              {statusMsg}
            </motion.p>
          )}
        </Reveal>

        <div className="space-y-5">
          <Reveal
            delay={0.15}
            className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--primary))] p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <Badge tone="accent">Build brief</Badge>
              <FileText size={18} className="text-[hsl(var(--accent))]" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-bold">Containerized REST API</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Build a small Node.js service, package it with Docker, and document the path from local
              run to portable deployment.
            </p>
            <Button
              onClick={() => {
                if (briefGenerated || generating) return;
                setGenerating(true);
                window.setTimeout(() => {
                  setGenerating(false);
                  setBriefGenerated(true);
                }, 1100);
              }}
              variant="accent"
              className="mt-6 w-full"
              testId="button-generate-brief"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="thinking-dots" /> Analyzing your skill gap...
                </span>
              ) : briefGenerated ? (
                <>
                  <CheckCircle2 size={15} /> Brief generated
                </>
              ) : (
                <>
                  <FileText size={15} /> Generate project brief
                </>
              )}
            </Button>
            {briefGenerated && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                data-testid="project-brief"
                className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-6 text-white/70"
              >
                <p className="font-bold text-white">Definition of done</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>GET /health returns a useful status</li>
                  <li>One Dockerfile and one local run command</li>
                  <li>README explains the trade-off</li>
                </ul>
              </motion.div>
            )}
          </Reveal>

          <Reveal
            delay={0.3}
            className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"
          >
            <h3 className="font-display text-lg font-bold">Why this, now?</h3>
            <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Docker sits at the intersection of your Node.js progress and the platform skills asked for
              in 2 of 3 demo opportunities.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--accent))]">
                <Lightbulb size={16} />
              </div>
              <span className="text-xs font-bold">Highest leverage per hour invested</span>
            </div>
          </Reveal>
        </div>
      </div>
    </PageTransition>
  );
}

function StepIcon({ step }) {
  const icons = {
    intent: Target,
    foundations: Code,
    docker: Box,
    assessment: Target,
    evidence: FileText,
  };
  const Icon = icons[step.id] || Sparkles;
  return <Icon size={17} />;
}
