import { Users, Radar, TrendingUp, ArrowRight, CheckCircle2, Target } from "lucide-react";
import { Badge, Button, PageHeader, PageTransition, MetricCard, ProgressBar } from "@/components/ui";
import { useStats, useAcademia } from "@/lib/api";

/* Industry workspace — real platform aggregates only.
   Individual learners' data is never exposed here; hiring teams see
   anonymized cohort signals and can invite candidates to share their DNA. */
export default function Industry({ navigate }) {
  const { data: stats } = useStats();
  const { data: academia } = useAcademia();

  const learners = stats?.learners ?? 0;
  const avgReadiness = stats?.avgReadiness ?? 0;
  const accuracy = stats?.checkpointAccuracy ?? 0;
  const roles = academia?.roles ?? [];

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Industry workspace / cohort signal"
        title="See the signal behind the cohort."
        copy="Live, anonymized aggregates from the platform: how many learners are building which skills, and how strong the cohort signal is. Individual profiles are private until a learner chooses to share."
        action={
          <Button onClick={() => navigate("/help")} variant="outline" testId="button-industry-support">
            Talk to support
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Registered learners" value={String(learners)} detail="real accounts on this platform" icon={Users} />
        <MetricCard label="Average readiness" value={String(avgReadiness)} detail="mean across all learner Skill DNA" icon={Radar} />
        <MetricCard label="Checkpoint accuracy" value={`${accuracy}%`} detail={`${stats?.checkpointsTaken ?? 0} graded answers so far`} icon={TrendingUp} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Where the cohort is heading
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">Target roles, live</h2>
            </div>
            <Target size={20} className="text-[hsl(var(--secondary-foreground))]" />
          </div>

          {roles.length === 0 ? (
            <p className="mt-8 text-sm text-[hsl(var(--muted-foreground))]">
              No learner data yet — as people sign up and pick target roles, the distribution shows up here in real time.
            </p>
          ) : (
            <div className="mt-7 space-y-5">
              {roles.map((r) => (
                <div key={r.role}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-bold">{r.role}</span>
                    <span className="font-mono text-xs">
                      {r.count} learner{r.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ProgressBar
                    value={(r.count / Math.max(...roles.map((x) => x.count))) * 100}
                    accent={r.role === "Undecided"}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl bg-[hsl(var(--primary))] p-6 text-white">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--accent))]">
              Hiring lens
            </p>
            <h2 className="mt-4 font-display text-2xl font-bold">
              What changes when skills are explainable?
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Every learner here has a skill-by-skill DNA built from graded checkpoints and completed
              real courses — not self-reported resumes. Ask a candidate to share their Skill DNA and
              the conversation starts at evidence.
            </p>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <h3 className="font-display text-lg font-bold">What the cohort is learning</h3>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Lowest-average skills across all learners — the platform's collective frontier.
            </p>
            <div className="mt-4 space-y-2.5">
              {(academia?.topSkills ?? []).map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{s.name}</span>
                  <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                    avg {s.avgValue}/100
                  </span>
                </div>
              ))}
              {(academia?.topSkills ?? []).length === 0 && (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  No skill data yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
