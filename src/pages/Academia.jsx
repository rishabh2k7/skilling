import { useState } from "react";
import { FileText, Lightbulb, Radar, TrendingUp, Users } from "lucide-react";
import { Button, PageHeader, PageTransition, MetricCard, ProgressBar } from "@/components/ui";
import { useAcademia } from "@/lib/api";

export default function Academia({ navigate }) {
  const { data } = useAcademia();
  const [statusMsg, setStatusMsg] = useState("");

  const pulses = data?.pulses ?? [];
  const interventions = data?.interventions ?? [];
  const stats = data?.stats;

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Academia workspace / Demo cohort"
        title="Make learning outcomes visible."
        copy="Connect curriculum, learner progress, and industry language without reducing students to a single score. Data is served by the backend."
        action={
          <Button
            onClick={() => setStatusMsg("Cohort report prepared locally.")}
            variant="accent"
            testId="button-generate-report"
          >
            <FileText size={15} /> Generate cohort report
          </Button>
        }
      />

      {statusMsg && (
        <p
          data-testid="status-report"
          className="mb-5 rounded-lg bg-[hsl(var(--secondary))] px-4 py-3 text-xs font-bold text-[hsl(var(--secondary-foreground))]"
        >
          {statusMsg}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Active learners" value={String(stats?.activeLearners ?? 1284)} detail="across 6 pathways" icon={Users} />
        <MetricCard label="Mapped skills" value={String(stats?.mappedSkills ?? 96)} detail="role-aligned signals" icon={Radar} />
        <MetricCard label="Evidence created" value={String(stats?.evidenceCreated ?? 3412)} detail="projects + reflections" icon={FileText} />
        <MetricCard label="Pathway lift" value={`+${stats?.pathwayLift ?? 14}`} detail="readiness points" icon={TrendingUp} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Curriculum pulse
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold">Where learners are getting stuck</h2>
          <div className="mt-7 space-y-5">
            {pulses.map((p) => (
              <div key={p.label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-bold">{p.label}</span>
                  <span className="font-mono text-xs">{p.percent}%</span>
                </div>
                <ProgressBar value={p.percent} accent={p.percent < 60} />
                <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{p.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Recommended interventions
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">
                Turn a gap into a teaching move
              </h2>
            </div>
            <Lightbulb size={21} className="text-[hsl(var(--secondary-foreground))]" />
          </div>
          <div className="mt-6 divide-y divide-[hsl(var(--border))]">
            {interventions.map((item, i) => (
              <div key={item.title} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[hsl(var(--muted))] font-mono text-xs">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{item.detail}</p>
                </div>
                <button
                  onClick={() => navigate("/help")}
                  data-testid={`button-intervention-${i}`}
                  className="shrink-0 text-xs font-bold text-[hsl(var(--secondary-foreground))]"
                >
                  {item.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
