import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge, Button, PageHeader, PageTransition, ProgressBar } from "@/components/ui";
import { useNextAssessment, useSubmitAssessment } from "@/lib/api";

export default function Assessment() {
  const { data: assessment, isLoading } = useNextAssessment();
  const submitMutation = useSubmitAssessment();
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState(null);

  const submit = () => {
    if (selected === null) {
      setNotice("Choose an answer before submitting.");
      return;
    }
    setNotice("");
    submitMutation.mutate(
      { id: assessment.id, selectedIndex: selected },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => setNotice(err.message),
      }
    );
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Skill intelligence / 02"
        title="Checkpoint: Docker"
        copy="One focused question can sharpen a signal. This demo assessment is designed to help you validate what you know before you build."
      />

      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
          <span className="font-mono">QUESTION 01 / 05</span>
          <span>{assessment ? `${assessment.attempts} attempts saved` : "8 min estimated"}</span>
        </div>
        <ProgressBar value={20} accent />

        <div className="mt-7 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-card)] md:p-10">
          {isLoading ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading checkpoint…</p>
          ) : !assessment ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No assessment available.</p>
          ) : (
            <>
              <Badge tone="teal">{assessment.skill} fundamentals</Badge>
              <h2 className="mt-7 max-w-2xl font-display text-3xl font-bold leading-tight tracking-[-.04em]">
                {assessment.question}
              </h2>

              <div className="mt-8 space-y-3">
                {assessment.options.map((option, i) => (
                  <button
                    key={option}
                    onClick={() => {
                      setSelected(i);
                      setResult(null);
                      setNotice("");
                    }}
                    data-testid={`answer-option-${i}`}
                    className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition ${
                      selected === i
                        ? "border-[hsl(var(--secondary-foreground))] bg-[hsl(var(--secondary))]"
                        : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                    }`}
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border font-mono text-xs ${
                        selected === i
                          ? "border-[hsl(var(--secondary-foreground))] bg-[hsl(var(--secondary-foreground))] text-white"
                          : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="pt-1 text-sm font-semibold">{option}</span>
                    {selected === i && (
                      <CheckCircle2
                        size={17}
                        className="ml-auto mt-1 text-[hsl(var(--secondary-foreground))]"
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-[hsl(var(--border))] pt-6 sm:flex-row sm:items-center">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Your selection updates your Skill DNA on the server after submission.
                </p>
                <Button
                  onClick={submit}
                  testId="button-submit-assessment"
                  className="w-full sm:w-auto"
                >
                  {submitMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="thinking-dots" /> Submitting...
                    </span>
                  ) : (
                    "Submit answer"
                  )}
                </Button>
              </div>

              {notice && (
                <p
                  data-testid="status-assessment-notice"
                  className="mt-4 text-xs font-bold text-[hsl(var(--destructive))]"
                >
                  {notice}
                </p>
              )}

              {result && (
                <div
                  data-testid="status-assessment"
                  className={`mt-5 flex items-start gap-3 rounded-xl p-4 ${
                    result.correct ? "bg-[hsl(var(--secondary))]" : "bg-[hsl(var(--accent))]"
                  }`}
                >
                  {result.correct ? (
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
                  ) : (
                    <XCircle size={20} className="mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-bold">{result.feedback}</p>
                    <p className="mt-1 text-xs leading-5 opacity-75">{result.detail}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
