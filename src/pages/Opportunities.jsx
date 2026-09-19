import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Linkedin,
  Search,
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
  useOpenings,
  useSaveOpening,
  useMarkApplied,
  useProfile,
} from "@/lib/api";
import { openAuthModal } from "@/components/AuthGate";

function linkedinShareUrl(op, readiness) {
  const text = `I'm building toward ${op.title}-level skills and just found this brief on Skilling — my Skill DNA match: ${op.match}%. Tracking my readiness (${readiness}/100) as I close the gap.`;
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
}

export default function Opportunities({ user }) {
  const { data, isLoading, error } = useOpenings();
  const { data: profile } = useProfile();
  const saveMutation = useSaveOpening();
  const applyMutation = useMarkApplied();
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [appliedFlash, setAppliedFlash] = useState(null);

  const openings = data?.openings ?? [];
  const linkedinUrl = data?.profile?.linkedinUrl;
  const readiness = data?.profile?.readiness ?? 0;

  const visible = useMemo(
    () =>
      openings.filter((op) => {
        const haystack = `${op.title} ${op.level} ${op.location} ${Object.keys(op.skills).join(" ")}`.toLowerCase();
        if (query && !haystack.includes(query.toLowerCase())) return false;
        if (savedOnly && !op.saved) return false;
        return true;
      }),
    [openings, query, savedOnly]
  );

  const onApply = (op) => {
    if (!user) {
      openAuthModal("register");
      return;
    }
    /* Mark applied server-side, then open the real LinkedIn Jobs search */
    if (!op.applied) applyMutation.mutate({ slug: op.slug, applied: true });
    setAppliedFlash(op.slug);
    window.open(op.applyUrl, "_blank", "noopener,noreferrer");
  };

  const onShare = (op) => {
    window.open(linkedinShareUrl(op, readiness), "_blank", "noopener,noreferrer");
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Opportunity matching / LinkedIn apply"
        title="Roles matched to your real skills."
        copy="Each brief is scored live against your Skill DNA on the server. Applying opens the matching LinkedIn Jobs search — your progress is tracked here."
        action={
          <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--accent))] px-3 py-2 text-xs font-bold text-[hsl(var(--accent-foreground))]">
            <AnimatedNumber value={visible.length} /> matches
          </div>
        }
      />

      {/* Search + filter */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-[hsl(var(--muted))] px-3">
          <Search size={16} className="text-[hsl(var(--muted-foreground))]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="input-search-opportunities"
            className="w-full bg-transparent py-2 text-sm outline-none"
            placeholder="Search by role, level, or skill"
          />
        </div>
        <button
          onClick={() => setSavedOnly(!savedOnly)}
          data-testid="button-filter-opportunities"
          className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold ${
            savedOnly
              ? "border-[hsl(var(--secondary-foreground))] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
              : "border-[hsl(var(--border))]"
          }`}
        >
          <Bookmark size={14} /> {savedOnly ? "Saved only" : "All matches"}
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Matching roles to your Skill DNA…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--destructive))] bg-[hsl(var(--card))] p-12 text-center text-sm text-[hsl(var(--destructive))]">
          Could not load openings: {error.message}
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((op, i) => (
            <motion.div
              key={op.slug}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.07, 0.3), duration: 0.45, ease: EASE }}
              data-testid={`opportunity-card-${op.slug}`}
              className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 md:p-6"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
                  <Briefcase size={21} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl font-bold">{op.title}</h2>
                        <Badge tone="accent">
                          <AnimatedNumber value={op.match} suffix="% match" />
                        </Badge>
                        <Badge tone="muted">{op.level}</Badge>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[hsl(var(--muted-foreground))]">
                        {op.location}
                        {op.location === "Remote" ? " · work from anywhere" : ""} · via LinkedIn Jobs
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        user
                          ? saveMutation.mutate(op.slug)
                          : openAuthModal("register")
                      }
                      data-testid={`button-save-${op.slug}`}
                      className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                      title={op.saved ? "Remove from saved" : "Save this brief"}
                    >
                      <Bookmark
                        size={19}
                        fill={op.saved ? "currentColor" : "none"}
                        className={op.saved ? "text-[hsl(var(--secondary-foreground))]" : ""}
                      />
                    </button>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{op.blurb}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(op.skills).map(([skill]) => (
                      <Badge key={skill} tone="muted">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-[hsl(var(--secondary))] p-3 text-xs leading-5 text-[hsl(var(--secondary-foreground))]">
                    <span>
                      <strong>Match detail:</strong> {op.topGap}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      onClick={() => onApply(op)}
                      variant={op.applied ? "outline" : "primary"}
                      testId={`button-apply-${op.slug}`}
                    >
                      {op.applied ? (
                        <>
                          <CheckCircle2 size={15} /> Applied — open again
                        </>
                      ) : (
                        <>
                          <Linkedin size={15} /> Apply on LinkedIn <ArrowRight size={15} />
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => onShare(op)}
                      variant="outline"
                      testId={`button-share-${op.slug}`}
                    >
                      <ExternalLink size={15} /> Share to feed
                    </Button>
                  </div>

                  {appliedFlash === op.slug && (
                    <p
                      data-testid={`status-applied-${op.slug}`}
                      className="mt-3 text-xs font-bold text-[hsl(var(--secondary-foreground))]"
                    >
                      Opened LinkedIn Jobs in a new tab — marked as applied here.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
            <Linkedin size={19} />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold">Your LinkedIn profile link</h3>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              {linkedinUrl
                ? `Connected: ${linkedinUrl}`
                : "Add your LinkedIn profile URL so your applications and shares stay consistent."}
            </p>
          </div>
          <Button
            variant="outline"
            testId="button-add-linkedin"
            onClick={() => {
              if (!user) return openAuthModal("register");
              window.dispatchEvent(new CustomEvent("open-profile-edit"));
            }}
          >
            {linkedinUrl ? "Edit link" : "Add link"}
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
