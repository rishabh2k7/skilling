import { useState } from "react";
import { motion } from "framer-motion";
import { Link2, Lock, Sparkles, Trophy, Upload, Zap } from "lucide-react";
import {
  Badge,
  Button,
  PageHeader,
  PageTransition,
  Reveal,
  AnimatedNumber,
  EASE,
} from "@/components/ui";
import { PixelBadgeFrame, LockedBadge, XpBar, useGamify } from "@/components/Gamify";
import { useAchievements, useProjects, useUploadProject } from "@/lib/api";
import { openAuthModal } from "@/components/AuthGate";

/* Mirror of server LEVELS (kept tiny — display only) */
const LEVELS = [
  { level: 1, xp: 0, title: "First Step", color: "#39d5f0" },
  { level: 2, xp: 100, title: "Explorer", color: "#39d5f0" },
  { level: 3, xp: 250, title: "Skill Seeker", color: "#e34fd0" },
  { level: 4, xp: 450, title: "Builder", color: "#e34fd0" },
  { level: 5, xp: 700, title: "Knowledge Core", color: "#a3e635" },
  { level: 6, xp: 1000, title: "Craftsperson", color: "#a3e635" },
  { level: 7, xp: 1400, title: "Specialist", color: "#f59e0b" },
  { level: 8, xp: 1900, title: "Expert", color: "#f59e0b" },
  { level: 9, xp: 2500, title: "Career Ready", color: "#39d5f0" },
  { level: 10, xp: 3200, title: "Career Champion", color: "#e34fd0" },
];

export default function Achievements({ user }) {
  const { data, isLoading } = useAchievements(!!user);
  const { data: projectsData } = useProjects(!!user);
  const uploadProject = useUploadProject();
  const [showUpload, setShowUpload] = useState(false);

  if (!user) {
    return (
      <PageTransition>
        <PageHeader
          eyebrow="Skill intelligence / achievements"
          title="Earn it, don't claim it."
          copy="Levels, XP and pixel badges are awarded by the server for real work — completed lectures, finished tasks, shipped projects and applications sent."
        />
        <div className="mx-auto max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center">
          <Trophy size={36} className="mx-auto text-[hsl(var(--muted-foreground))]" />
          <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
            Sign in to start earning XP and collecting badges.
          </p>
          <Button className="mt-4" testId="button-achievements-signin" onClick={() => openAuthModal("register")}>
            Create an account
          </Button>
        </div>
      </PageTransition>
    );
  }

  const level = data?.level;
  const unlocked = new Set((data?.badges ?? []).map((b) => b.id));
  const all = data?.allBadges ?? [];
  const projects = projectsData?.projects ?? [];
  const recent = data?.recent ?? [];

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Skill intelligence / achievements"
        title="Your trophy shelf."
        copy="Every XP point comes from something real you finished — no participation trophies."
        action={
          <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--accent))] px-3 py-2 text-xs font-bold text-[hsl(var(--accent-foreground))]" data-testid="xp-total-chip">
            <Zap size={14} /> <AnimatedNumber value={data?.xpTotal ?? 0} /> XP total
          </div>
        }
      />

      {/* Level card */}
      <Reveal className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          {isLoading || !level ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading your progress…</p>
          ) : (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              {/* Animated level ring */}
              <div className="relative grid h-28 w-28 shrink-0 place-items-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--border))" strokeWidth="7" />
                  <motion.circle
                    cx="50" cy="50" r="44" fill="none"
                    stroke={level.color}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 44}
                    initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - level.progress / 100) }}
                    transition={{ duration: 1.2, ease: EASE }}
                    style={{ filter: `drop-shadow(0 0 6px ${level.color}88)` }}
                    data-testid="level-ring"
                  />
                </svg>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">Level</p>
                  <p className="font-display text-3xl font-black" style={{ color: level.color }} data-testid="level-number">
                    {level.level}
                  </p>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-bold" data-testid="level-title">{level.title}</p>
                <p className="mt-0.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                  {level.nextTitle
                    ? `${level.xpToNext} XP to ${level.nextTitle}`
                    : "Max level — you are a Career Champion."}
                </p>
                <div className="mt-3">
                  <XpBar level={level} xpTotal={data?.xpTotal ?? 0} compact />
                </div>
                {/* XP ladder */}
                <div className="mt-4 flex flex-wrap gap-1.5" data-testid="xp-ladder">
                  {LEVELS.map((l) => {
                    const reached = (data?.xpTotal ?? 0) >= l.xp;
                    return (
                      <span
                        key={l.level}
                        title={`Lv ${l.level} · ${l.title} (${l.xp} XP)`}
                        className="rounded-md px-2 py-1 text-[10px] font-black"
                        style={
                          reached
                            ? { background: `${l.color}22`, color: l.color, border: `1px solid ${l.color}55` }
                            : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", opacity: 0.55 }
                        }
                      >
                        {l.level}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* Badge gallery */}
      <Reveal className="mx-auto mt-8 max-w-4xl" delay={0.05}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Badges</h3>
          <Badge tone="accent">{unlocked.size}/{all.length} unlocked</Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5" data-testid="badge-grid">
          {all.map((b, i) => {
            const isUnlocked = unlocked.has(b.id);
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: EASE }}
                className="flex flex-col items-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center"
                data-testid={`badge-${b.id}`}
              >
                <motion.div
                  whileHover={isUnlocked ? { scale: 1.08, rotate: -2 } : { scale: 1.02 }}
                  animate={isUnlocked ? { y: [0, -3, 0] } : undefined}
                  transition={isUnlocked ? { repeat: Infinity, duration: 3.2, ease: "easeInOut" } : undefined}
                >
                  {isUnlocked ? (
                    <PixelBadgeFrame icon={b.icon} color={b.color} size={58} />
                  ) : (
                    <LockedBadge icon={b.icon} color={b.color} size={58} />
                  )}
                </motion.div>
                <p className="text-xs font-bold leading-tight">{b.name}</p>
                <p className="text-[10px] leading-snug text-[hsl(var(--muted-foreground))]">{b.description}</p>
              </motion.div>
            );
          })}
        </div>
      </Reveal>

      {/* Projects */}
      <Reveal className="mx-auto mt-8 max-w-4xl" delay={0.1}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Shipped projects</h3>
          <Button variant="outline" testId="button-show-upload" onClick={() => setShowUpload((s) => !s)}>
            <Upload size={15} /> {showUpload ? "Close" : "Upload project"}
          </Button>
        </div>

        {showUpload && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-4 overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const title = f.title.value.trim();
              if (!title || uploadProject.isPending) return;
              uploadProject.mutate(
                {
                  title,
                  url: f.url.value.trim() || undefined,
                  skill: f.skill.value || undefined,
                  description: f.description.value.trim() || undefined,
                  sharedLinkedin: f.linkedin.checked,
                },
                { onSuccess: () => f.reset() }
              );
            }}
            data-testid="project-upload-form"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="title" required placeholder="Project title — e.g. SQL dashboard" data-testid="project-title"
                className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[hsl(var(--secondary-foreground))]" />
              <input name="url" type="url" placeholder="Link (GitHub repo, live demo…)" data-testid="project-url"
                className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[hsl(var(--secondary-foreground))]" />
              <input name="skill" list="achievement-skills" placeholder="Skill practiced (optional)" data-testid="project-skill"
                className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[hsl(var(--secondary-foreground))]" />
              <label className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--muted-foreground))]">
                <input type="checkbox" name="linkedin" className="h-4 w-4 accent-[hsl(var(--accent))]" data-testid="project-linkedin" />
                Also shared on LinkedIn (+25 XP)
              </label>
            </div>
            <textarea name="description" rows={2} placeholder="What does it do? (optional)"
              className="mt-3 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[hsl(var(--secondary-foreground))]" />
            <div className="mt-3 flex items-center gap-3">
              <Button type="submit" testId="project-submit" disabled={uploadProject.isPending}>
                <Sparkles size={15} /> {uploadProject.isPending ? "Shipping…" : "Ship it (+100 XP)"}
              </Button>
              {uploadProject.isError && (
                <p className="text-xs font-bold text-[hsl(var(--destructive))]">{uploadProject.error.message}</p>
              )}
            </div>
          </motion.form>
        )}

        {projects.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No projects yet — ship your first one above and forge the Project Forge badge.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <div key={p.id} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4" data-testid={`project-${p.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold">{p.title}</p>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 text-[hsl(var(--secondary-foreground))] hover:underline"
                      title="Open project link">
                      <Link2 size={15} />
                    </a>
                  )}
                </div>
                {p.description && <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{p.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {p.skill && <Badge tone="teal">{p.skill}</Badge>}
                  {p.sharedLinkedin && <Badge tone="accent">On LinkedIn</Badge>}
                  <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Reveal>

      {/* XP history */}
      {recent.length > 0 && (
        <Reveal className="mx-auto mt-8 max-w-4xl" delay={0.15}>
          <h3 className="mb-3 font-display text-lg font-bold">XP history</h3>
          <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]" data-testid="xp-history">
            {recent.slice(0, 8).map((e, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-4 py-2.5 last:border-0">
                <Zap size={13} className="shrink-0 text-[hsl(var(--secondary-foreground))]" />
                <p className="min-w-0 flex-1 truncate text-xs font-semibold">{e.label}</p>
                <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                  {new Date(e.createdAt).toLocaleDateString()}
                </p>
                <p className="text-xs font-black text-[hsl(var(--secondary-foreground))]">+{e.xp}</p>
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </PageTransition>
  );
}
