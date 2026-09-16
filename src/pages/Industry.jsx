import { useState } from "react";
import { ArrowRight, CalendarDays, Eye, MessageCircle, Radar, TrendingUp, Users } from "lucide-react";
import { Button, PageHeader, PageTransition, MetricCard } from "@/components/ui";
import { CANDIDATES } from "@/data/skillingData";

export default function Industry({ navigate }) {
  const [filter, setFilter] = useState("All talent");

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Industry workspace / Demo cohort"
        title="See the signal behind the resume."
        copy="A focused view of talent readiness, capability gaps, and the evidence that can close them. All records below are synthetic demo data."
        action={
          <Button onClick={() => navigate("/help")} variant="outline" testId="button-industry-support">
            <MessageCircle size={15} /> Talk to support
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Talent profiles" value="248" detail="+18 this term" icon={Users} />
        <MetricCard label="Role coverage" value="42" detail="skill patterns mapped" icon={Radar} />
        <MetricCard label="Median readiness" value="61" detail="+7 vs last cohort" icon={TrendingUp} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Candidate radar
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">Talent, translated</h2>
            </div>
            <div className="flex gap-1 rounded-lg bg-[hsl(var(--muted))] p-1">
              {["All talent", "Shortlist", "In review"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  data-testid={`filter-${f.toLowerCase().replace(" ", "-")}`}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                    filter === f
                      ? "bg-[hsl(var(--card))] shadow-sm"
                      : "text-[hsl(var(--muted-foreground))]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <th className="pb-3 font-bold">Candidate</th>
                  <th className="pb-3 font-bold">Target role</th>
                  <th className="pb-3 font-bold">Match</th>
                  <th className="pb-3 font-bold">Signal to close</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {CANDIDATES.map(([name, role, match, signal], i) => (
                  <tr
                    key={name}
                    data-testid={`candidate-row-${i}`}
                    className="border-b border-[hsl(var(--border))] last:border-0"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-xs font-bold text-[hsl(var(--secondary-foreground))]">
                          {name.split(" ").map((p) => p[0]).join("")}
                        </div>
                        <span className="text-sm font-bold">{name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-sm text-[hsl(var(--muted-foreground))]">{role}</td>
                    <td className="py-4">
                      <span className="rounded-full bg-[hsl(var(--accent))] px-2 py-1 font-mono text-xs font-bold">
                        {match}
                      </span>
                    </td>
                    <td className="py-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                      {signal}
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => navigate("/student/skills")}
                        data-testid={`button-view-candidate-${i}`}
                        className="text-xs font-bold text-[hsl(var(--secondary-foreground))]"
                      >
                        Inspect <ArrowRight className="ml-1 inline" size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              Replace “seems promising” with the exact strength, gap, and evidence needed for a confident
              next conversation.
            </p>
            <button
              onClick={() => navigate("/help")}
              data-testid="button-learn-hiring-lens"
              className="mt-6 flex items-center gap-2 text-sm font-bold text-[hsl(var(--accent))]"
            >
              Learn the model <ArrowRight size={15} />
            </button>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-[hsl(var(--secondary-foreground))]" />
              <h3 className="font-display text-lg font-bold">Upcoming signal review</h3>
            </div>
            <p className="mt-4 text-sm font-bold">Campus product engineering cohort</p>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Thursday, 24 October · 10:30 AM
            </p>
            <Button
              onClick={() => setFilter("Shortlist")}
              variant="outline"
              className="mt-5 w-full"
              testId="button-review-shortlist"
            >
              Review shortlist
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
