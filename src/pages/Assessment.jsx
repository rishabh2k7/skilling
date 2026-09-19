import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, RotateCcw, Target, XCircle, Trophy } from "lucide-react";
import {
  Badge,
  Button,
  PageHeader,
  PageTransition,
  ProgressBar,
} from "@/components/ui";
import {
  useNextCheckpoint,
  useSubmitCheckpoint,
  useCheckpointStats,
} from "@/lib/api";
import AuthGate from "@/components/AuthGate";
import { useCelebrator } from "@/components/Gamify";

export default function Assessment({ user }) {
  const { data: checkpoint, isLoading, error, refetch } = useNextCheckpoint();
  const { data: stats } = useCheckpointStats();
  const submitMutation = useSubmitCheckpoint();
  const celebrate = useCelebrator();
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  /* Guests see the sign-in gate — checkpoints are personal, graded data */
  if (!user) {
    return (
      <PageTransition>
        <PageHeader
          eyebrow="Skill intelligence / checkpoints"
          title="Prove what you know."
          copy="Checkpoints are short, server-graded quizzes for your weakest skill. Correct answers lift your Skill DNA for real."
        />
        <AuthGate
          title="Checkpoints need an account."
          copy="Sign in to take a graded checkpoint. Every correct answer updates your skill scores on the server — that only makes sense with your own account."
        />
      </PageTransition>
    );
  }

  const questions = checkpoint?.questions ?? [];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const submit = () => {
    if (!allAnswered || submitMutation.isPending) return;
    submitMutation.mutate(
      {
        skill: checkpoint.skill,
        answers: questions.map((q) => ({ id: q.id, selectedIndex: answers[q.id] })),
      },
      {
        onSuccess: (data) => {
          setResult(data);
          celebrate(data?.gamification);
        },
      }
    );
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
    refetch();
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Skill intelligence / checkpoints"
        title={result ? `Checkpoint results: ${result.skill}` : `Checkpoint: ${checkpoint?.skill ?? "loading"}`}
        copy={
          result
            ? "Your answers were graded on the server and your Skill DNA has been updated."
            : "Five real questions on your weakest skill, graded on the server. Every correct answer lifts that skill's score — no self-reported fluff."
        }
        action={
          stats && (
            <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--accent))] px-3 py-2 text-xs font-bold text-[hsl(var(--accent-foreground))]">
              <Trophy size={14} /> {stats.correct}/{stats.taken} all-time correct
            </div>
          )
        }
      />

      <div className="mx-auto max-w-3xl">
        {isLoading ? (
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-sm text-[hsl(var(--muted-foreground))]">
            Loading checkpoint…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-sm text-[hsl(var(--muted-foreground))]">
            No checkpoint is available right now.{" "}
            <button onClick={() => refetch()} className="font-bold underline">
              Retry
            </button>
          </div>
        ) : result ? (
          /* ---------------- Results ---------------- */
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl bg-[hsl(var(--primary))] p-8 text-center text-[hsl(var(--primary-foreground))]"
              data-testid="checkpoint-result"
            >
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
                <Trophy size={26} />
              </div>
              <p className="mt-5 font-display text-5xl font-bold">
                {result.correct}/{result.total}
              </p>
              <p className="mt-2 text-sm text-white/60">
                {result.score}% · {result.bump > 0 ? `+${result.bump} points added to ${result.skill}` : "No points added this time"} ·
                readiness now {result.readiness}/100
              </p>
              {result.gamification?.xp ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-[hsl(var(--accent))]" data-testid="checkpoint-xp">
                  <Zap size={12} /> +{result.gamification.xp} XP earned
                  {result.gamification.leveledUp ? " · LEVEL UP!" : ""}
                </p>
              ) : null}
              <Button onClick={reset} variant="accent" className="mt-6" testId="button-next-checkpoint">
                <RotateCcw size={15} /> Next checkpoint
              </Button>
            </motion.div>

            <div className="space-y-3">
              {result.results.map((r, i) => {
                const q = questions.find((q) => q.id === r.id);
                return (
                  <div
                    key={r.id}
                    data-testid={`checkpoint-review-${i}`}
                    className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"
                  >
                    <div className="flex items-start gap-3">
                      {r.correct ? (
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[hsl(var(--secondary-foreground))]" />
                      ) : (
                        <XCircle size={18} className="mt-0.5 shrink-0 text-[hsl(var(--destructive))]" />
                      )}
                      <div>
                        <p className="text-sm font-bold">{q?.question}</p>
                        <p className="mt-1.5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                          {r.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ---------------- Questions ---------------- */
          <>
            <div className="mb-5 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
              <span className="font-mono">
                {answeredCount} / {checkpoint.total} answered
              </span>
              <span>
                {checkpoint.history.taken > 0
                  ? `${checkpoint.history.taken} checkpoints taken · ${checkpoint.history.correct} correct`
                  : "Your first checkpoint"}
              </span>
            </div>
            <ProgressBar value={(answeredCount / Math.max(checkpoint.total, 1)) * 100} accent />

            <div className="mt-7 space-y-4">
              {questions.map((q, qi) => (
                <div
                  key={q.id}
                  data-testid={`checkpoint-question-${qi}`}
                  className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--secondary))] font-mono text-xs font-bold text-[hsl(var(--secondary-foreground))]">
                      {qi + 1}
                    </span>
                    <h2 className="pt-0.5 font-display text-lg font-bold leading-snug">{q.question}</h2>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {q.options.map((option, oi) => {
                      const selected = answers[q.id] === oi;
                      return (
                        <button
                          key={oi}
                          onClick={() =>
                            setAnswers((a) => ({ ...a, [q.id]: oi }))
                          }
                          data-testid={`checkpoint-option-${qi}-${oi}`}
                          className={`flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm font-semibold transition ${
                            selected
                              ? "border-[hsl(var(--secondary-foreground))] bg-[hsl(var(--secondary))]"
                              : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                          }`}
                        >
                          <span
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[10px] ${
                              selected
                                ? "border-[hsl(var(--secondary-foreground))] bg-[hsl(var(--secondary-foreground))] text-white"
                                : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
                            }`}
                          >
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex flex-col items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:flex-row sm:justify-between">
                <Badge tone="teal">
                  <Target size={12} /> Server-graded · updates your Skill DNA
                </Badge>
                <Button
                  onClick={submit}
                  disabled={!allAnswered || submitMutation.isPending}
                  testId="button-submit-checkpoint"
                  className="w-full sm:w-auto"
                >
                  {submitMutation.isPending ? (
                    "Grading…"
                  ) : allAnswered ? (
                    "Submit checkpoint"
                  ) : (
                    `Answer all ${checkpoint.total - answeredCount} remaining`
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
