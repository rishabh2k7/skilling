import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  Lightbulb,
  Lock,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  PageHeader,
  PageTransition,
  Reveal,
  ProgressBar,
  EASE,
} from "@/components/ui";
import {
  useRoadmap,
  useSkills,
  useToggleRoadmapTask,
  useAddRoadmapTask,
  useDeleteRoadmapTask,
} from "@/lib/api";
import { openAuthModal } from "@/components/AuthGate";
import { useCelebrator } from "@/components/Gamify";

const STEP_META = {
  intent: { icon: Target },
  foundations: { icon: BookOpen },
  checkpoint: { icon: Target },
  build: { icon: Sparkles },
  evidence: { icon: FileText },
};

const KIND_BADGE = {
  resource: { label: "Real resource", tone: "teal" },
  project: { label: "Project", tone: "accent" },
  checkpoint: { label: "Checkpoint", tone: "accent" },
  custom: { label: "Your task", tone: "muted" },
};

/* XP preview per task kind (mirrors server XP_RULES) — shown as a hint chip */
const TASK_XP = { resource: 40, checkpoint: 50, project: 75, custom: 20 };
const taskXpHint = (task) => TASK_XP[task?.kind] ?? TASK_XP.custom;

function TaskRow({ task, isNext, anyPending, onToggle, onDelete, xpHint }) {
  const data = task.data ?? {};
  const badge = KIND_BADGE[task.kind] ?? KIND_BADGE.custom;
  const done = task.done;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      data-testid={`roadmap-task-${task.id}`}
      className={`group relative flex items-start gap-3 rounded-xl border p-3.5 transition ${
        done
          ? "border-[hsl(var(--border))] bg-[hsl(var(--muted))]"
          : isNext
            ? "border-[hsl(var(--accent))]/60 bg-[hsl(var(--card))] shadow-[0_0_0_3px_hsl(var(--accent)/.08)]"
            : "border-[hsl(var(--border))] bg-[hsl(var(--card))] opacity-80"
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task, !done)}
        disabled={done && false}
        data-testid={`task-check-${task.id}`}
        title={
          done
            ? "Completed — click to undo"
            : isNext
              ? "Mark this task done"
              : "Finish the tasks above first"
        }
        className={`mt-0.5 shrink-0 transition ${
          done || isNext ? "" : "cursor-not-allowed opacity-45"
        }`}
      >
        {done ? (
          <CheckCircle2 size={21} className="text-[hsl(var(--secondary-foreground))]" />
        ) : isNext ? (
          <Circle size={21} className="text-[hsl(var(--accent))]" />
        ) : (
          <Lock size={19} className="text-[hsl(var(--muted-foreground))]" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm font-bold ${done ? "line-through opacity-60" : ""}`}
            data-testid={`task-title-${task.id}`}
          >
            {task.title}
          </span>
          <Badge tone={badge.tone}>{badge.label}</Badge>
          {isNext && !done && <Badge tone="accent">Up next</Badge>}
          {!done && xpHint ? (
            <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-black text-[hsl(var(--secondary-foreground))]" title="XP you'll earn for finishing this task">
              +{xpHint} XP
            </span>
          ) : null}
        </div>

        {/* Real data attached to the task */}
        {data.resourceId && data.url && (
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`task-link-${task.id}`}
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--secondary-foreground))] hover:underline"
          >
            Open {data.provider} {data.duration ? `· ${data.duration}` : ""} <ExternalLink size={12} />
          </a>
        )}
        {data.skill && (
          <a
            href="/student/assessment"
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--secondary-foreground))] hover:underline"
          >
            Take the {data.skill} checkpoint <ExternalLink size={12} />
          </a>
        )}
        {data.detail && (
          <p className="mt-1.5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{data.detail}</p>
        )}
        {task.estimate && (
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            {task.estimate}
          </p>
        )}
      </div>

      {task.kind === "custom" && (
        <button
          onClick={() => onDelete(task)}
          data-testid={`task-delete-${task.id}`}
          className="shrink-0 rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] opacity-0 transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--destructive))] group-hover:opacity-100"
          title="Delete this task"
        >
          <Trash2 size={15} />
        </button>
      )}
    </motion.div>
  );
}

export default function Roadmap({ user }) {
  const { data, isLoading } = useRoadmap();
  const { data: skillsData } = useSkills();
  const toggleMutation = useToggleRoadmapTask();
  const addMutation = useAddRoadmapTask();
  const deleteMutation = useDeleteRoadmapTask();
  const celebrate = useCelebrator();
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [notice, setNotice] = useState("");

  const steps = data?.steps ?? [];
  const tasks = data?.tasks ?? [];
  const done = data?.done ?? 0;
  const total = data?.total ?? 0;
  const nextTaskId = data?.nextTaskId ?? null;

  const gapSkill = skillsData?.nextBestSkill ?? "your next skill";
  const role = skillsData?.role ?? "your target role";

  /* Group tasks under their step, in order */
  const stepsWithTasks = steps
    .filter((s) => s.id !== "intent" || true)
    .map((step) => ({
      ...step,
      tasks: tasks.filter((t) => t.stepId === step.id),
    }));

  const onToggle = (task, nextDone) => {
    if (!user) return openAuthModal("register");
    setNotice("");
    toggleMutation.mutate(
      { taskId: task.id, done: nextDone },
      {
        onSuccess: (res) => celebrate(res?.gamification),
        onError: (err) => {
          if (err.code === "out_of_order") setNotice(err.message);
          else setNotice(err.message);
        },
      }
    );
  };

  const onDelete = (task) => {
    setNotice("");
    deleteMutation.mutate(task.id, {
      onError: (err) => setNotice(err.message),
    });
  };

  const submitNewTask = (e) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    addMutation.mutate(
      { title, stepId: "build", estimate: "custom" },
      {
        onSuccess: () => {
          setNewTitle("");
          setAdding(false);
        },
        onError: (err) => setNotice(err.message),
      }
    );
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Skill intelligence / roadmap"
        title="Your next-best-skill roadmap"
        copy={`Ordered tasks with real data — each one links the actual lecture, checkpoint, or project that moves you toward ${role}. Check them off in order; the server keeps the sequence honest.`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone="accent">
              {done} / {total} tasks done
            </Badge>
            <Button variant="outline" onClick={() => setAdding(!adding)} testId="button-add-task">
              {adding ? <X size={14} /> : <Plus size={14} />} Add task
            </Button>
          </div>
        }
      />

      {adding && (
        <form
          onSubmit={submitNewTask}
          className="mb-5 flex flex-col gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 sm:flex-row"
          data-testid="form-add-task"
        >
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Finish the Docker compose lab"
            data-testid="input-new-task"
            className="flex-1 rounded-lg bg-[hsl(var(--muted))] px-3 py-2.5 text-sm outline-none"
            autoFocus
          />
          <Button type="submit" disabled={addMutation.isPending || !newTitle.trim()} testId="button-save-new-task">
            Add to roadmap
          </Button>
        </form>
      )}

      {notice && (
        <p
          data-testid="roadmap-notice"
          className="mb-5 rounded-lg bg-[hsl(var(--accent))]/15 px-4 py-3 text-xs font-bold text-[hsl(var(--accent-foreground))]"
        >
          {notice}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_.68fr]">
        <Reveal className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-card)] md:p-8">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Ordered plan
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">From learn to proof</h2>
            </div>
            <div className="w-28">
              <ProgressBar value={(done / Math.max(total, 1)) * 100} accent />
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading roadmap…</p>
          ) : stepsWithTasks.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Sign in to generate your ordered roadmap.
            </p>
          ) : (
            <div className="space-y-7">
              {stepsWithTasks.map((step, si) => {
                const Meta = STEP_META[step.id] ?? { icon: Sparkles };
                const Icon = Meta.icon;
                const stepDone = step.status === "complete";
                const stepTasks = step.tasks;
                if (step.id === "intent") {
                  /* Goal row — already decided at signup */
                  return (
                    <div key={step.id} className="flex items-center gap-3" data-testid={`roadmap-step-${step.id}`}>
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary-foreground))] text-white">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                          {step.label}
                        </p>
                        <p className="text-sm font-bold">{step.title}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--secondary-foreground))]">
                        Goal set
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={step.id} data-testid={`roadmap-step-${step.id}`}>
                    <div className="mb-3 flex items-center gap-3">
                      <div
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                          stepDone
                            ? "bg-[hsl(var(--secondary-foreground))] text-white"
                            : "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                        }`}
                      >
                        {stepDone ? <CheckCircle2 size={16} /> : <Icon size={15} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                          {step.label} · step {si}
                        </p>
                        <p className="text-sm font-bold">{step.title}</p>
                      </div>
                    </div>
                    <div className="ml-4 space-y-2 border-l border-[hsl(var(--border))] pl-4">
                      {stepTasks.length === 0 ? (
                        <p className="py-1 text-xs text-[hsl(var(--muted-foreground))]">
                          No tasks here yet — add one with “Add task”.
                        </p>
                      ) : (
                        stepTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            isNext={task.id === nextTaskId}
                            onToggle={onToggle}
                            onDelete={onDelete}
                            xpHint={task.done ? null : taskXpHint(task)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Reveal>

        <div className="space-y-5">
          <Reveal
            delay={0.15}
            className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--primary))] p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <Badge tone="accent">How it works</Badge>
              <Lightbulb size={18} className="text-[hsl(var(--accent))]" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-bold">Order creates momentum</h2>
            <ul className="mt-4 space-y-2.5 text-sm leading-6 text-white/65">
              <li>· Tasks come with real data — actual lectures, a graded checkpoint, a shippable project.</li>
              <li>· Only the first incomplete task can be checked off; the server enforces it.</li>
              <li>· Finish a step's tasks and the step completes itself.</li>
              <li>· {gapSkill} is your current gap — completing tasks here is what lifts it.</li>
            </ul>
          </Reveal>

          <Reveal
            delay={0.3}
            className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"
          >
            <h3 className="font-display text-lg font-bold">Why this order?</h3>
            <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Learn first (real lectures), validate next (graded checkpoint — your scores move
              automatically), then build something small and public. Evidence beats hours. Your
              current readiness is {skillsData?.readiness ?? 0}/100.
            </p>
          </Reveal>
        </div>
      </div>
    </PageTransition>
  );
}
