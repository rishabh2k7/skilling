import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, CheckCircle2, Clock, FileText, PlayCircle, Target, TrendingUp } from "lucide-react";
import { Badge, Button, PageHeader, PageTransition, AnimatedNumber, EASE } from "@/components/ui";
import { useLocalState } from "@/hooks/useLocalState";
import { MOMENTUM } from "@/data/skillingData";

function ReadinessCard({ readiness = 64 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative overflow-hidden rounded-2xl bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-card)]"
    >
      <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full border border-[hsl(var(--accent))]/25 animate-breathe" />
      <div className="relative flex items-start justify-between">
        <div>
          <Badge tone="accent">Role target</Badge>
          <h2 className="mt-4 font-display text-2xl font-bold">Full Stack Developer</h2>
          <p className="mt-1 text-xs text-white/55">Readiness snapshot · demo data</p>
        </div>
        <div
          className="metric-ring grid h-[92px] w-[92px] place-items-center rounded-full"
          style={{ "--progress": `${readiness}%` }}
        >
          <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-[hsl(var(--primary))]">
            <span data-testid="value-readiness" className="font-display text-3xl font-bold">
              <AnimatedNumber value={readiness} />
            </span>
            <span className="-mt-1 font-mono text-[9px] text-white/45">/ 100</span>
          </div>
        </div>
      </div>
      <div className="mt-7 flex items-end justify-between border-t border-white/10 pt-4">
        <div>
          <p className="text-xs text-white/50">Next best skill</p>
          <motion.p
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55, duration: 0.35 }}
            data-testid="value-next-skill"
            className="mt-1 flex items-center gap-1.5 text-sm font-bold"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
            Docker
          </motion.p>
        </div>
        <span className="font-mono text-xs text-[hsl(var(--accent))]">+8 pts possible</span>
      </div>
    </motion.div>
  );
}

export default function StudentOverview({ navigate }) {
  const [completed, setCompleted] = useLocalState("skilling-roadmap-completed", []);
  const [statusMsg, setStatusMsg] = useState("");
  const started = completed.includes("docker");

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Monday, 14 October · Demo profile"
        title="Good morning, Aarav."
        copy="Your path to Full Stack Developer is taking shape. Here is the one move with the most leverage today."
        action={
          <Button onClick={() => navigate("/student/roadmap")} variant="accent" testId="button-open-roadmap">
            Open roadmap <ArrowRight size={15} />
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <ReadinessCard />
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <div>
              <Badge tone="teal">Recommended project</Badge>
              <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">
                Containerized REST API
              </h2>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
              <BookOpen size={19} />
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            A compact proof point for Docker and Node.js — the fastest way to turn your next gap into
            evidence.
          </p>
          <div className="mt-6 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
              <Clock size={14} /> 4–6 hours
            </span>
            <Button
              onClick={() => {
                setCompleted(
                  started ? completed.filter((id) => id !== "docker") : [...completed, "docker"]
                );
                setStatusMsg(
                  started
                    ? "Project moved back to your roadmap."
                    : "Containerized REST API started."
                );
              }}
              variant={started ? "outline" : "primary"}
              testId="button-start-project"
            >
              {started ? (
                <>
                  <CheckCircle2 size={15} /> In progress
                </>
              ) : (
                <>
                  <PlayCircle size={15} /> Start project
                </>
              )}
            </Button>
          </div>
          {statusMsg && (
            <p data-testid="status-project" className="mt-3 text-xs font-bold text-[hsl(var(--secondary-foreground))]">
              {statusMsg}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <div className="flex justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">
                Momentum
              </p>
              <h2 className="mt-2 font-display text-xl font-bold">Your signal is moving</h2>
            </div>
            <TrendingUp className="text-[hsl(var(--secondary-foreground))]" size={21} />
          </div>
          <div className="mt-7 flex items-end gap-2">
            <span className="font-display text-5xl font-bold">+12</span>
            <span className="mb-2 text-sm text-[hsl(var(--muted-foreground))]">
              readiness points
              <br />
              this month
            </span>
          </div>
          <div className="mt-6 flex h-20 items-end gap-2">
            {MOMENTUM.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-sm ${
                  i === 6 ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--secondary-foreground))]/30"
                }`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[9px] text-[hsl(var(--muted-foreground))]">
            <span>SEP 02</span>
            <span>OCT 14</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">
                Next three moves
              </p>
              <h2 className="mt-2 font-display text-xl font-bold">Keep the chain going</h2>
            </div>
            <button
              onClick={() => navigate("/student/roadmap")}
              data-testid="button-view-all-moves"
              className="text-xs font-bold text-[hsl(var(--secondary-foreground))]"
            >
              View all
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["docker", "Build", "Containerized REST API","4–6 hrs", BookOpen, "/student/roadmap"],
  ["assessment", "Validate", "Take the Docker checkpoint", "8 min", Target, "/student/assessment"],
  ["evidence", "Show", "Add a project reflection", "10 min", FileText, "/student/roadmap"],
            ].map(([id, kind, title, time, Icon, path]) => (
              <button
                key={id}
                onClick={() => navigate(path)}
                data-testid={`move-${id}`}
                className="group flex w-full items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-3 text-left transition hover:border-[hsl(var(--secondary-foreground))]/40 hover:bg-[hsl(var(--secondary))]"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--secondary-foreground))]">
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    {kind}
                  </p>
                  <p className="truncate text-sm font-bold">{title}</p>
                </div>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{time}</span>
                <ArrowRight
                  size={15}
                  className="text-[hsl(var(--muted-foreground))] transition group-hover:translate-x-1"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

