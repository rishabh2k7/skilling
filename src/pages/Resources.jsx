import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ExternalLink,
  GraduationCap,
  PlayCircle,
  Search,
  Bookmark,
  FileText,
  MousePointerClick,
} from "lucide-react";
import {
  Badge,
  Button,
  PageHeader,
  PageTransition,
  Reveal,
  EASE,
} from "@/components/ui";
import { useResources, useSetResourceStatus } from "@/lib/api";
import { openAuthModal } from "@/components/AuthGate";

const KIND_META = {
  lecture: { label: "Lecture", icon: PlayCircle },
  course: { label: "Course", icon: GraduationCap },
  interactive: { label: "Interactive", icon: MousePointerClick },
  docs: { label: "Docs & guides", icon: FileText },
  book: { label: "Free book", icon: BookOpen },
};

const STATUS_ORDER = ["in_progress", "saved", "completed"];

function ResourceCard({ resource, status, onStatus, busy, index }) {
  const meta = KIND_META[resource.kind] ?? KIND_META.docs;
  const Icon = meta.icon;
  const completed = status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.45, ease: EASE }}
      whileHover={{ y: -3 }}
      data-testid={`resource-card-${resource.id}`}
      className={`flex flex-col rounded-2xl border p-5 transition ${
        completed
          ? "border-[hsl(var(--secondary-foreground))]/50 bg-[hsl(var(--secondary))]"
          : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--secondary-foreground))]/40"
      } shadow-[var(--shadow-card)]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
          <Icon size={18} />
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Badge tone="muted">{meta.label}</Badge>
          {status && (
            <Badge tone={completed ? "teal" : "accent"}>
              {completed ? "Completed" : status === "saved" ? "Saved" : "In progress"}
            </Badge>
          )}
        </div>
      </div>

      <h3 className="mt-4 font-display text-lg font-bold leading-snug">{resource.title}</h3>
      <p className="mt-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
        {resource.provider} · {resource.duration} · {resource.level}
      </p>
      <p className="mt-3 flex-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
        {resource.blurb}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {resource.skills.map((s) => (
          <span
            key={s}
            className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))]"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-[hsl(var(--border))] pt-4">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`resource-open-${resource.id}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] transition hover:-translate-y-0.5"
        >
          Open resource <ExternalLink size={13} />
        </a>
        {completed ? (
          <Button
            variant="outline"
            className="px-3 py-2 text-xs"
            testId={`resource-uncomplete-${resource.id}`}
            onClick={() => onStatus(resource.id, "none")}
          >
            <CheckCircle2 size={14} /> Done — undo
          </Button>
        ) : (
          <Button
            variant="accent"
            className="px-3 py-2 text-xs"
            testId={`resource-complete-${resource.id}`}
            disabled={busy}
            onClick={() => onStatus(resource.id, "completed")}
          >
            <CheckCircle2 size={14} /> Mark complete
          </Button>
        )}
        <button
          onClick={() => onStatus(resource.id, status === "saved" ? "none" : "saved")}
          data-testid={`resource-save-${resource.id}`}
          className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
          title={status === "saved" ? "Remove bookmark" : "Save for later"}
        >
          <Bookmark size={15} fill={status === "saved" ? "currentColor" : "none"} />
        </button>
      </div>
    </motion.div>
  );
}

export default function Resources({ user }) {
  const { data, isLoading } = useResources();
  const setStatus = useSetResourceStatus();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("All");
  const [mine, setMine] = useState(false);

  const resources = data?.resources ?? [];
  const statusMap = useMemo(
    () => Object.fromEntries((data?.statuses ?? []).map((s) => [s.id, s.status])),
    [data?.statuses]
  );

  const visible = resources.filter((r) => {
    const haystack = `${r.title} ${r.provider} ${r.skills.join(" ")} ${r.blurb}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (kind !== "All" && r.kind !== kind) return false;
    if (mine && !statusMap[r.id]) return false;
    return true;
  });

  const counts = useMemo(() => {
    const c = { saved: 0, in_progress: 0, completed: 0 };
    for (const s of Object.values(statusMap)) c[s] = (c[s] ?? 0) + 1;
    return c;
  }, [statusMap]);

  const onStatus = (id, status) => {
    if (!user) return openAuthModal("register");
    setStatus.mutate({ id, status });
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Learning library / Real lectures & courses"
        title="Learn from the real thing."
        copy="A curated catalog of actual lectures, courses, docs, and books — free, proven, and mapped to the skills on your Skill DNA. Marking a resource complete builds your evidence; no filler content."
        action={
          <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--accent))] px-3 py-2 text-xs font-bold text-[hsl(var(--accent-foreground))]">
            <BookOpen size={14} /> {resources.length} real resources
          </div>
        }
      />

      {/* Personal progress strip */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          ["In progress", counts.in_progress, Circle],
          ["Bookmarked", counts.saved, Bookmark],
          ["Completed", counts.completed, CheckCircle2],
        ].map(([label, value, Icon]) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3"
          >
            <Icon size={16} className="text-[hsl(var(--secondary-foreground))]" />
            <div>
              <p className="font-display text-xl font-bold" data-testid={`resources-${label.toLowerCase().replace(" ", "-")}-count`}>
                {value}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-[hsl(var(--muted))] px-3">
          <Search size={16} className="text-[hsl(var(--muted-foreground))]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="input-search-resources"
            className="w-full bg-transparent py-2 text-sm outline-none"
            placeholder="Search by skill, title, or provider — try “Docker” or “Python”"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-[hsl(var(--muted))] p-1">
          {["All", "lecture", "course", "interactive", "docs", "book"].map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              data-testid={`filter-kind-${k.toLowerCase()}`}
              className={`rounded-md px-3 py-1.5 text-xs font-bold capitalize ${
                kind === k
                  ? "bg-[hsl(var(--card))] shadow-sm"
                  : "text-[hsl(var(--muted-foreground))]"
              }`}
            >
              {k === "All" ? "All" : (KIND_META[k]?.label ?? k)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMine(!mine)}
          data-testid="button-filter-mine"
          className={`rounded-lg border px-4 py-2 text-xs font-bold ${
            mine
              ? "border-[hsl(var(--secondary-foreground))] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
              : "border-[hsl(var(--border))]"
          }`}
        >
          My list
        </button>
      </div>

      {!user && (
        <p className="mb-5 rounded-lg bg-[hsl(var(--secondary))] px-4 py-3 text-xs font-bold text-[hsl(var(--secondary-foreground))]" data-testid="resources-signin-hint">
          Browsing as a guest — you can open every resource, but{" "}
          <button onClick={() => openAuthModal("register")} className="underline">
            sign in
          </button>{" "}
          to track progress and build evidence.
        </p>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Loading the library…
        </div>
      ) : visible.length === 0 ? (
        <div
          data-testid="empty-resources"
          className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] p-12 text-center"
        >
          <Search className="mx-auto text-[hsl(var(--muted-foreground))]" size={22} />
          <p className="mt-3 text-sm font-bold">Nothing matches that filter</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Try a different skill or clear the filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((r, i) => (
            <ResourceCard
              key={r.id}
              resource={r}
              index={i}
              status={statusMap[r.id]}
              busy={setStatus.isPending}
              onStatus={onStatus}
            />
          ))}
        </div>
      )}

      <Reveal className="mt-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
        <strong className="text-[hsl(var(--foreground))]">How completions work:</strong>{" "}
        marking a resource complete is recorded on the server against your account and
        contributes to your skill evidence. Only mark what you actually finished — your
        Skill DNA is only as honest as its inputs.
      </Reveal>
    </PageTransition>
  );
}
