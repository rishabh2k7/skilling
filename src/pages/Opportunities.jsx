import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  CheckCircle2,
  FileText,
  Mail,
  Search,
  X,
} from "lucide-react";
import { Badge, Button, PageHeader, PageTransition, AnimatedNumber, EASE } from "@/components/ui";
import { useLocalState } from "@/hooks/useLocalState";
import { OPPORTUNITIES } from "@/data/skillingData";

function buildDraft(op) {
  return [
    `Subject: Interested in the ${op.title} opportunity`,
    "",
    `Hi ${op.company} team,`,
    "",
    "I’m building a Containerized REST API to deepen my Docker signal, and I’d love to learn more about how your team approaches product engineering.",
    "",
    "Best,",
    "Aarav",
  ].join("\n");
}

export default function Opportunities() {
  const [saved, setSaved] = useLocalState("skilling-saved-opportunities", []);
  const [applied, setApplied] = useLocalState("skilling-applied-opportunities", []);
  const [emailOpenId, setEmailOpenId] = useState(null);
  const [appliedStatusId, setAppliedStatusId] = useState(null);
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);

  const toggleSave = (id) =>
    setSaved(saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id]);

  const visible = OPPORTUNITIES.filter(
    (op) =>
      `${op.title} ${op.company} ${op.location} ${op.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()) && (!savedOnly || saved.includes(op.id))
  );

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Opportunity matching / Demo feed"
        title="Find your next proving ground."
        copy="Matches are explainable demo recommendations based on your Skill DNA. They are not live openings."
        action={
          <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--accent))] px-3 py-2 text-xs font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />{" "}
            <AnimatedNumber value={visible.length} /> demo matches
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
            placeholder="Search by role, skill, or company"
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

      {visible.length === 0 ? (
        <div
          data-testid="empty-opportunities"
          className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center"
        >
          <Search className="mx-auto text-[hsl(var(--muted-foreground))]" size={22} />
          <p className="mt-3 text-sm font-bold">No matching demo opportunities</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Try a different role, company, or skill.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((op, i) => {
            const isSaved = saved.includes(op.id);
            const isApplied = applied.includes(op.id);
            return (
              <motion.div
                key={op.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.45, ease: EASE }}
                data-testid={`opportunity-card-${op.id}`}
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
                        </div>
                        <p className="mt-1 text-sm font-semibold text-[hsl(var(--muted-foreground))]">
                          {op.company} <span className="mx-1">·</span> {op.location}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleSave(op.id)}
                        data-testid={`button-save-${op.id}`}
                        className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                      >
                        {isSaved ? (
                          <Bookmark size={19} className="text-[hsl(var(--secondary-foreground))]" fill="currentColor" />
                        ) : (
                          <Bookmark size={19} />
                        )}
                      </button>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {op.tags.map((tag, ti) => (
                        <motion.span
                          key={tag}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 + ti * 0.08, duration: 0.3 }}
                        >
                          <Badge tone="muted">{tag}</Badge>
                        </motion.span>
                      ))}
                    </div>

                    <div className="mt-5 flex items-start gap-2 rounded-lg bg-[hsl(var(--secondary))] p-3 text-xs leading-5 text-[hsl(var(--secondary-foreground))]">
                      <FileText size={15} className="mt-0.5 shrink-0" />
                      <span>
                        <strong>Why this match:</strong> {op.why}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button
                        onClick={() => {
                          setApplied(
                            applied.includes(op.id)
                              ? applied.filter((x) => x !== op.id)
                              : [...applied, op.id]
                          );
                          setAppliedStatusId(op.id);
                        }}
                        variant={isApplied ? "outline" : "primary"}
                        testId={`button-apply-${op.id}`}
                      >
                        {isApplied ? (
                          <>
                            <CheckCircle2 size={15} /> Applied in demo
                          </>
                        ) : (
                          <>
                            Express interest <ArrowRight size={15} />
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setEmailOpenId(op.id)}
                        variant="outline"
                        testId={`button-email-${op.id}`}
                      >
                        <Mail size={15} /> Draft email
                      </Button>
                    </div>

                    {appliedStatusId === op.id && isApplied && (
                      <p
                        data-testid={`status-applied-${op.id}`}
                        className="mt-3 text-xs font-bold text-[hsl(var(--secondary-foreground))]"
                      >
                        Saved locally. No application was sent.
                      </p>
                    )}

                    {emailOpenId === op.id && (
                      <div className="mt-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold">Draft to {op.company}</p>
                          <button
                            onClick={() => setEmailOpenId(null)}
                            data-testid={`button-close-email-${op.id}`}
                          >
                            <X size={15} />
                          </button>
                        </div>
                        <p
                          data-testid={`draft-email-${op.id}`}
                          className="mt-3 whitespace-pre-line text-xs leading-6 text-[hsl(var(--muted-foreground))]"
                        >
                          {buildDraft(op)}
                        </p>
                        <Button
                          onClick={() => setEmailOpenId(null)}
                          variant="accent"
                          className="mt-3"
                          testId={`button-save-email-${op.id}`}
                        >
                          <CheckCircle2 size={14} /> Save draft
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageTransition>
  );
}
