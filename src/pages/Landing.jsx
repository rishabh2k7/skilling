import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Compass, Lightbulb, Radar, Route, FileText, Sun, Moon } from "lucide-react";
import { Badge, Brand, Button, EASE, PageTransition, Reveal, AnimatedNumber } from "@/components/ui";

/* Illustrative sample profile for the landing-page visual only —
   the live app reads each user's real Skill DNA from the API. */
const SAMPLE_SKILLS = [
  { name: "JavaScript", value: 90 },
  { name: "React", value: 82 },
  { name: "SQL", value: 70 },
  { name: "Node.js", value: 65 },
];

const HERO_SKILLS = [
  ["Python", "8%", "18%", "delay-1"],
  ["React", "57%", "11%", "delay-3"],
  ["SQL", "78%", "28%", "delay-2"],
  ["Docker", "24%", "70%", "delay-4"],
  ["AI", "69%", "75%", "delay-2"],
  ["TypeScript", "42%", "86%", "delay-1"],
  ["AWS", "87%", "58%", "delay-3"],
  ["JavaScript", "28%", "34%", "delay-2"],
  ["Node.js", "52%", "42%", "delay-4"],
  ["Machine Learning", "68%", "20%", "delay-1"],
  ["Git", "16%", "55%", "delay-3"],
  ["PostgreSQL", "76%", "83%", "delay-2"],
  ["Cloud", "86%", "34%", "delay-4"],
  ["Cybersecurity", "7%", "78%", "delay-1"],
];

const METHOD = [
  ["01", "Map the destination", "Start with a role you can name, then see the capability pattern behind it.", Compass],
  ["02", "Measure the distance", "Your Skill DNA turns coursework, assessment, and evidence into a living signal.", Radar],
  ["03", "Move with intent", "The next-best-skill engine turns a gap into a focused project or learning sprint.", Route],
  ["04", "Show your work", "Translate progress into proof recruiters and faculty can actually understand.", FileText],
];

function SkillNetwork() {
  const [hovered, setHovered] = useState("");
  return (
    <div className="hero-network absolute -right-44 top-8 hidden h-[520px] w-[520px] md:block lg:h-[700px] lg:w-[700px]">
      <svg
        className="absolute inset-0 h-full w-full opacity-45"
        viewBox="0 0 700 700"
        fill="none"
        aria-hidden="true"
      >
        <path
          className={hovered ? "hero-network-lines-active" : ""}
          d="M80 130L400 350L220 500L480 110L610 410L295 600L400 350L610 410L220 500L80 130L480 110L295 600"
          stroke="hsl(var(--accent))"
          strokeOpacity=".38"
          strokeWidth="1"
        />
      </svg>
      <div className="absolute inset-0 rounded-full border border-[hsl(var(--accent))]/20">
        <div className="absolute inset-16 rounded-full border border-[hsl(var(--accent))]/15">
          <div className="absolute inset-16 rounded-full border border-[hsl(var(--accent))]/10" />
        </div>
      </div>
      {HERO_SKILLS.map(([name, left, top, delayClass], i) => {
        const highlight = hovered === name || (hovered === "Docker" && ["Node.js", "Cloud"].includes(name));
        return (
          <motion.span
            key={name}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: highlight ? 1 : [0.5, 1, 0.82, 1], scale: highlight ? 1.08 : [0, 1.15, 1] }}
            transition={{
              delay: i * 0.08,
              duration: highlight ? 0.2 : 0.75,
              ease: EASE,
              repeat: highlight ? 0 : Infinity,
              repeatDelay: highlight ? 0 : 5,
            }}
            onMouseEnter={() => setHovered(name)}
            onMouseLeave={() => setHovered("")}
            title={name === "Docker" ? "High-value skill for your target role" : `Explore ${name}`}
            className={`hero-network-node ${delayClass} absolute cursor-pointer rounded-full border px-3 py-1.5 font-mono text-[10px] backdrop-blur-sm transition-colors ${
              highlight
                ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-[0_0_24px_hsl(var(--accent)/.3)]"
                : "border-[hsl(var(--accent))]/40 bg-[hsl(var(--primary))]/75 text-[hsl(var(--primary-foreground))]/80"
            }`}
            style={{ left, top }}
            data-testid={`hero-skill-${name.toLowerCase().replaceAll(" ", "-")}`}
          >
            {name}
            {name === "Docker" && hovered === "Docker" && (
              <span className="hero-tooltip absolute left-1/2 top-full z-10 mt-2 w-40 -translate-x-1/2 rounded-lg bg-[hsl(var(--card))] px-2 py-1.5 text-center font-sans text-[10px] font-bold leading-4 text-[hsl(var(--foreground))] shadow-lg">
                High-value skill for your target role
              </span>
            )}
          </motion.span>
        );
      })}
      <div className="hero-network-center absolute left-1/2 top-1/2 grid h-36 w-36 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[hsl(var(--accent))]/55 bg-[hsl(var(--primary))]/90 text-center shadow-[0_0_60px_hsl(var(--accent)/.12)]">
        <div>
          <Radar className="mx-auto text-[hsl(var(--accent))]" size={22} />
          <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--primary-foreground))]/80">
            Skill DNA
          </p>
          <p className="mt-1 font-display text-xs font-bold text-[hsl(var(--accent))]">Next: Docker</p>
        </div>
      </div>
    </div>
  );
}

export default function Landing({ navigate, theme, toggleTheme }) {

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-10">
        <Brand light />
        <div className="hidden items-center gap-8 text-sm text-[hsl(var(--primary-foreground))]/70 md:flex">
          <a href="#method" data-testid="link-method" className="transition hover:text-[hsl(var(--accent))]">
            How it works
          </a>
          <a href="#signals" data-testid="link-signals" className="transition hover:text-[hsl(var(--accent))]">
            Skill signals
          </a>
          <button
            onClick={() => navigate("/student")}
            data-testid="button-open-app-nav"
            className="font-bold text-[hsl(var(--accent))]"
          >
            Open the app <ArrowRight className="ml-1 inline" size={14} />
          </button>
          <button
            onClick={toggleTheme}
            data-testid="button-toggle-theme-landing"
            className="rounded-lg border border-white/15 p-2 text-[hsl(var(--primary-foreground))]/75 transition hover:bg-white/10"
            aria-label={`Switch to ${theme === "light" ? "black and grey" : "signal"} theme`}
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            data-testid="button-toggle-theme-landing-mobile"
            className="rounded-lg border border-white/15 p-2"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <button
            onClick={() => navigate("/student")}
            data-testid="button-mobile-open"
            className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold"
          >
            Open app
          </button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-7xl px-5 pb-24 pt-16 lg:px-10 lg:pb-36 lg:pt-24">
          <SkillNetwork />
          <div className="relative max-w-3xl fade-up">
            <Badge tone="accent">Skill intelligence, not course noise</Badge>
            <h1 className="mt-7 max-w-4xl font-display text-[clamp(3.6rem,8vw,7.6rem)] font-bold leading-[.9] tracking-[-.075em]">
              Know what to learn <span className="text-[hsl(var(--accent))]">next.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[hsl(var(--primary-foreground))]/65">
              Skilling connects your ambition to the exact capabilities, proof, and opportunities that
              move you forward.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button onClick={() => navigate("/student")} variant="accent" testId="button-start-exploring">
                Start free — build your Skill DNA <ArrowRight size={16} />
              </Button>
              <Button
                onClick={() => navigate("/industry")}
                variant="ghost"
                className="border border-white/15 text-[hsl(var(--primary-foreground))]"
                testId="button-view-industry"
              >
                For industry teams
              </Button>
            </div>
          </div>
          <div className="relative mt-20 grid max-w-5xl grid-cols-2 border-y border-white/15 py-6 md:grid-cols-4 fade-up delay-2">
            {[
              ["01", "Career intent"],
              ["02", "Skill DNA"],
              ["03", "Evidence"],
              ["04", "Opportunity"],
            ].map(([num, label]) => (
              <div key={num} className="border-r border-white/10 px-4 last:border-0">
                <span className="font-mono text-xs text-[hsl(var(--accent))]">{num}</span>
                <p className="mt-2 text-sm text-[hsl(var(--primary-foreground))]/70">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Method */}
        <motion.section
          id="method"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7 }}
          className="bg-[hsl(var(--background))] px-5 py-24 text-[hsl(var(--foreground))] lg:px-10 lg:py-32"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
              <Reveal>
                <Badge tone="teal">The bridge</Badge>
                <h2 className="mt-5 max-w-md font-display text-4xl font-bold leading-tight tracking-[-.05em] md:text-5xl">
                  A clearer signal between classroom and career.
                </h2>
                <p className="mt-5 max-w-sm leading-7 text-[hsl(var(--muted-foreground))]">
                  Every recommendation is explainable. Every project has a reason. Every gap has a next
                  move.
                </p>
              </Reveal>
              <div className="grid gap-4 sm:grid-cols-2">
                {METHOD.map(([num, title, copy, Icon], i) => (
                  <motion.div
                    key={num}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ delay: i * 0.09, duration: 0.5, ease: EASE }}
                    whileHover={{ y: -4 }}
                    className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-[hsl(var(--secondary-foreground))]">{num}</span>
                      <Icon size={20} className="text-[hsl(var(--secondary-foreground))]" />
                    </div>
                    <h3 className="mt-9 font-display text-xl font-bold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{copy}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Signals */}
        <motion.section
          id="signals"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7 }}
          className="grid-paper bg-[hsl(var(--secondary))] px-5 py-24 text-[hsl(var(--foreground))] lg:px-10 lg:py-32"
        >
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
            <Reveal>
              <Badge tone="dark">A living profile</Badge>
              <h2 className="mt-5 font-display text-4xl font-bold tracking-[-.05em] md:text-6xl">
                Your readiness is more than a number.
              </h2>
              <p className="mt-6 max-w-lg leading-7 text-[hsl(var(--muted-foreground))]">
                See the strengths to lean on, the gaps that matter now, and the evidence that makes your
                story credible.
              </p>
              <button
                onClick={() => navigate("/student/skills")}
                data-testid="button-see-dna"
                className="mt-8 inline-flex items-center gap-2 font-bold text-[hsl(var(--secondary-foreground))] transition hover:gap-3"
              >
                Build your Skill DNA <ArrowRight size={16} />
              </button>
            </Reveal>
            <Reveal
              delay={0.12}
              className="relative rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                    YOUR PROFILE · SEEDED AT SIGNUP
                  </span>
                  <h3 className="mt-2 font-display text-2xl font-bold">Full Stack Developer</h3>
                </div>
                <div
                  className="metric-ring grid h-20 w-20 place-items-center rounded-full"
                  style={{ "--progress": "64%" }}
                >
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-[hsl(var(--card))]">
                    <span className="font-display text-2xl font-bold">
                      <AnimatedNumber value={64} />
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-8 space-y-4">
                {SAMPLE_SKILLS.map((s, i) => (
                  <motion.div
                    key={s.name}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.35 }}
                  >
                    <div className="mb-1 flex justify-between text-xs font-bold">
                      <span>{s.name}</span>
                      <span className="font-mono text-[hsl(var(--muted-foreground))]">
                        <AnimatedNumber value={s.value} />
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${s.value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.85, ease: EASE }}
                        className="h-full rounded-full bg-[hsl(var(--secondary-foreground))]"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </Reveal>
          </div>
        </motion.section>
      </main>

      <footer className="border-t border-white/10 bg-[hsl(var(--primary))] px-5 py-10 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-[hsl(var(--primary-foreground))]/55 md:flex-row">
          <Brand light />
          <span>Real skills. Real evidence. Built for clearer next steps.</span>
        </div>
      </footer>
    </div>
  );
}
