import { FileText, Lightbulb, Radar, TrendingUp, Users } from "lucide-react";
import { Badge, Button, PageHeader, PageTransition, MetricCard, ProgressBar } from "@/components/ui";
import { useAcademia } from "@/lib/api";

/* Academia workspace — real, privacy-masked aggregates.
   Learner names are truncated to first name + initial in the store layer. */
export default function Academia({ navigate }) {
  const { data, isLoading } = useAcademia();

  const pulses = (data?.topSkills ?? []).map((s) => ({
    label: s.name,
    percent: s.avgValue,
    detail: `${s.learners} learner${s.learners === 1 ? "" : "s"} tracking this skill`,
  }));
  const roles = data?.roles ?? [];
  const recent = data?.recent ?? [];
  const maxRoleCount = Math.max(1, ...roles.map((r) => r.count));

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Academia workspace / live cohort"
        title="Make learning outcomes visible."
        copy="Real aggregates from your institution's learners on the platform — no synthetic numbers. Names are privacy-masked; individuals own their data and choose what to share."
        action={
          <Button
            onClick={() => navigate("/help")}
            variant="accent"
            testId="button-generate-report"
          >
            <FileText size={15} /> Ask the support desk
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Registered learners" value={String(data?.learners ?? 0)} detail="real accounts" icon={Users} />
        <MetricCard label="Average readiness" value={String(data?.avgReadiness ?? 0)} detail="across all Skill DNA" icon={Radar} />
        <MetricCard label="Checkpoints taken" value={String(data?.checkpointsTaken ?? 0)} detail={`${data?.checkpointAccuracy ?? 0}% answered correctly`} icon={TrendingUp} />
        <MetricCard label="Skills tracked" value={String(pulses.length)} detail="distinct skills in cohort DNA" icon={Lightbulb} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Cohort frontier
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold">Where learners are weakest</h2>
          {isLoading ? (
            <p className="mt-7 text-sm text-[hsl(var(--muted-foreground))]">Loading cohort data…</p>
          ) : pulses.length === 0 ? (
            <p className="mt-7 text-sm text-[hsl(var(--muted-foreground))]">
              No skill data yet. As learners sign up and take checkpoints, the weakest skills across
              the cohort surface here — that's where teaching time pays most.
            </p>
          ) : (
            <div className="mt-7 space-y-5">
              {pulses.map((p) => (
                <div key={p.label}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-bold">{p.label}</span>
                    <span className="font-mono text-xs">{p.percent}%</span>
                  </div>
                  <ProgressBar value={p.percent} accent={p.percent < 50} />
                  <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{p.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Role intent
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold">What learners aim for</h2>
              </div>
              <Badge tone="teal">live</Badge>
            </div>
            {roles.length === 0 ? (
              <p className="mt-6 text-sm text-[hsl(var(--muted-foreground))]">
                No role data yet.
              </p>
            ) : (
              <div className="mt-6 space-y-3">
                {roles.map((r) => (
                  <div key={r.role} className="flex items-center gap-3">
                    <div className="w-40 shrink-0 truncate text-sm font-bold">{r.role}</div>
                    <div className="flex-1">
                      <ProgressBar value={(r.count / maxRoleCount) * 100} />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-xs text-[hsl(var(--muted-foreground))]">
                      {r.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Newest learners · privacy-masked
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold">Recent joiners</h2>
              </div>
              <Lightbulb size={20} className="text-[hsl(var(--secondary-foreground))]" />
            </div>
            {recent.length === 0 ? (
              <p className="mt-6 text-sm text-[hsl(var(--muted-foreground))]">
                No learners have signed up yet.
              </p>
            ) : (
              <div className="mt-5 divide-y divide-[hsl(var(--border))]">
                {recent.map((r, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-xs font-bold text-[hsl(var(--secondary-foreground))]">
                      {r.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{r.name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{r.role}</p>
                    </div>
                    <span className="rounded-full bg-[hsl(var(--accent))] px-2 py-1 font-mono text-xs font-bold text-[hsl(var(--accent-foreground))]">
                      {r.readiness}/100
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
