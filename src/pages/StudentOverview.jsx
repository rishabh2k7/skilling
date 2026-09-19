import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Linkedin,
  PlayCircle,
  Share2,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  Button,
  PageHeader,
  PageTransition,
  AnimatedNumber,
  EASE,
} from "@/components/ui";
import {
  useSkills,
  useProfile,
  useReadinessHistory,
  useOpenings,
  useResources,
} from "@/lib/api";
import { openAuthModal } from "@/components/AuthGate";

function ReadinessCard({ readiness, nextBest, targetRole, delta }) {
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
          <h2 className="mt-4 font-display text-2xl font-bold">{targetRole}</h2>
          <p className="mt-1 text-xs text-white/55">Computed from your skill scores</p>
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
            {nextBest ?? "—"}
          </motion.p>
        </div>
        {delta !== null && (
          <span
            className={`font-mono text-xs ${
              delta > 0 ? "text-[hsl(var(--accent))]" : "text-white/60"
            }`}
            data-testid="value-momentum"
          >
            {delta > 0 ? `+${delta}` : delta} pts recently
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function StudentOverview({ navigate, user }) {
  const { data: skillsData } = useSkills();
  const { data: profile } = useProfile();
  const { data: historyData } = useReadinessHistory();
  const { data: openingsData } = useOpenings();
  const { data: resourcesData } = useResources();

  const readiness = skillsData?.readiness ?? 0;
  const nextBest = skillsData?.nextBestSkill;
  const targetRole = skillsData?.role ?? "your target role";

  /* Real momentum: change between the two most recent readiness records */
  const history = historyData ?? [];
  const momentum =
    history.length >= 2 ? readiness - history[history.length - 2].readiness : null;

  const firstName = (profile?.user?.name || "there").split(" ")[0];

  /* Top matched opening + a recommended next resource for the gap skill */
  const topOpening = openingsData?.openings?.[0];
  const nextResource = (resourcesData?.resources ?? []).find((r) =>
    nextBest ? r.skills.includes(nextBest) : false
  );

  const shareToLinkedIn = () => {
    const text = `I'm building my ${targetRole} readiness on Skilling — currently ${readiness}/100, next move: ${nextBest ?? "picking my first skill"}.`;
    window.open(
      `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (!user) {
    return (
      <PageTransition>
        <PageHeader
          eyebrow="Student workspace"
          title={`Welcome, ${firstName}.`}
          copy="Your workspace turns real lectures, graded checkpoints, and shipped projects into a readiness signal that employers can read."
        />
        <ReadinessCard
          readiness={readiness}
          nextBest={nextBest}
          targetRole={targetRole}
          delta={momentum}
        />
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <Badge tone="teal">Real resources</Badge>
            <h2 className="mt-4 font-display text-2xl font-bold">
              {resourcesData?.resources?.length ?? 20} real lectures & courses
            </h2>
            <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              freeCodeCamp, Harvard's CS50, Docker tutorials from TechWorld with Nana, SQLBolt and
              more — every one free, every one real. Track what you finish and it counts toward
              your evidence.
            </p>
            <Button
              onClick={() => navigate("/student/resources")}
              variant="primary"
              className="mt-6"
              testId="button-browse-resources"
            >
              <BookOpen size={15} /> Browse the library
            </Button>
          </div>
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <Badge tone="teal">Opportunities</Badge>
            <h2 className="mt-4 font-display text-2xl font-bold">
              Roles matched to your skill DNA
            </h2>
            <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Internship and junior briefs scored live against your scores — apply in one click
              through LinkedIn Jobs.
            </p>
            <Button
              onClick={() => navigate("/student/opportunities")}
              variant="outline"
              className="mt-6"
              testId="button-browse-opportunities"
            >
              See matched roles <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Your workspace · real data"
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${firstName}.`}
        copy={`Your path to ${targetRole} is live. Here is the one move with the most leverage today.`}
        action={
          <Button onClick={() => navigate("/student/roadmap")} variant="accent" testId="button-open-roadmap">
            Open roadmap <ArrowRight size={15} />
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <ReadinessCard
          readiness={readiness}
          nextBest={nextBest}
          targetRole={targetRole}
          delta={momentum}
        />
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <div>
              <Badge tone="teal">Recommended now</Badge>
              <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">
                {nextResource ? nextResource.title : `Build something with ${nextBest ?? "your gap skill"}`}
              </h2>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
              <BookOpen size={19} />
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            {nextResource
              ? `${nextResource.blurb}`
              : "Pick a resource from the library, finish it, and mark it complete to build evidence."}
          </p>
          <div className="mt-6 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
              {nextResource?.provider ?? "From the library"}
            </span>
            {nextResource ? (
              <a
                href={nextResource.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="button-start-resource"
              >
                <Button variant="primary">
                  <PlayCircle size={15} /> Start learning
                </Button>
              </a>
            ) : (
              <Button
                onClick={() => navigate("/student/resources")}
                variant="primary"
                testId="button-start-resource"
              >
                <BookOpen size={15} /> Find a resource
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <div className="flex justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">
                Momentum
              </p>
              <h2 className="mt-2 font-display text-xl font-bold">Your readiness trail</h2>
            </div>
            <TrendingUp className="text-[hsl(var(--secondary-foreground))]" size={21} />
          </div>
          <div className="mt-7 flex items-end gap-2">
            <span className="font-display text-5xl font-bold" data-testid="value-momentum-big">
              {momentum === null ? "—" : momentum >= 0 ? `+${momentum}` : momentum}
            </span>
            <span className="mb-2 text-sm text-[hsl(var(--muted-foreground))]">
              points
              <br />
              recent change
            </span>
          </div>
          <div className="mt-6 flex h-20 items-end gap-2">
            {(history.length ? history.map((h) => h.readiness) : [readiness]).map((v, i, arr) => (
              <div
                key={i}
                title={history[i]?.recordedAt ?? ""}
                className={`flex-1 rounded-t-sm transition-all ${
                  i === arr.length - 1
                    ? "bg-[hsl(var(--accent))]"
                    : "bg-[hsl(var(--secondary-foreground))]/30"
                }`}
                style={{ height: `${Math.max(8, v)}%` }}
              />
            ))}
          </div>
          <p className="mt-2 font-mono text-[9px] text-[hsl(var(--muted-foreground))]">
            Each bar is a recorded readiness change — checkpoints, edits, and completions all add entries.
          </p>
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
              [
                "learn",
                "Learn",
                nextResource ? nextResource.title : "Pick a resource from the library",
                nextResource ? nextResource.duration : "10 min",
                BookOpen,
                "/student/resources",
              ],
              ["checkpoint", "Validate", `Take the ${nextBest ?? "skill"} checkpoint`, "5 questions", Target, "/student/assessment"],
              ["apply", "Apply", topOpening ? `${topOpening.title} (${topOpening.match}%)` : "See matched roles", "on LinkedIn", ArrowRight, "/student/opportunities"],
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

          <div className="mt-6 border-t border-[hsl(var(--border))] pt-5">
            <button
              onClick={shareToLinkedIn}
              data-testid="button-share-progress"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2.5 text-xs font-bold transition hover:border-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))]"
            >
              <Linkedin size={15} /> Share your readiness on LinkedIn
              <Share2 size={13} className="opacity-50" />
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
