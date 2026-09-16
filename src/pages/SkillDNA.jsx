import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lightbulb, Radar } from "lucide-react";
import { Badge, PageHeader, PageTransition, Reveal, AnimatedNumber, ProgressBar, EASE } from "@/components/ui";
import { SKILLS } from "@/data/skillingData";

export default function SkillDNA({ navigate }) {
  const [view, setView] = useState("bars");

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Skill intelligence / 01"
        title="Your Skill DNA"
        copy="A living view of the capabilities behind your Full Stack Developer goal. Scores are demo signals from coursework, self-assessment, and evidence."
        action={
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
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Reveal className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Role alignment
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">Full Stack Developer</h2>
            </div>
            <Badge tone="accent">64 readiness</Badge>
          </div>

          {view === "bars" ? (
            <div className="mt-8 space-y-6">
              {SKILLS.map((skill, i) => (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: EASE }}
                  data-testid={`skill-row-${skill.name.toLowerCase().replace(".", "")}`}
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
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SKILLS.map((skill, i) => (
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
              Docker is your highest-leverage move.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              It unlocks the most adjacent opportunities while reinforcing your Node.js foundation. A
              small project here has an outsized signal.
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
              <h3 className="font-display text-lg font-bold">Signal sources</h3>
              <Radar size={18} className="text-[hsl(var(--muted-foreground))]" />
            </div>
            <div className="mt-5 space-y-4">
              {[
                ["Coursework", "React Foundations", "verified", 88],
                ["Assessment", "JavaScript checkpoint", "verified", 76],
                ["Evidence", "2 projects linked", "in progress", 54],
              ].map(([kind, detail, status, value]) => (
                <div key={kind}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">
                      {kind} <span className="text-[hsl(var(--muted-foreground))]">· {detail}</span>
                    </span>
                    <span className="font-mono text-[10px]">{status}</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={value} />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </PageTransition>
  );
}
