import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Radar } from "lucide-react";
import { Button, EASE } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function AuthModal({ open, onClose, initialMode = "login" }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const ROLES = ["Full Stack Developer", "Data Analyst", "Frontend Engineer", "Backend Engineer", "ML Engineer", "Product Manager"];

  /* re-sync when opened so "Sign up" buttons open the register view,
     and each open starts with clean fields */
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError("");
      setName("");
      setEmail("");
      setPassword("");
      setTargetRole("");
    }
  }, [open, initialMode]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      if (mode === "register") {
        await register({ name, email, password, targetRole: targetRole || undefined });
      } else {
        await login({ email, password });
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] grid place-items-center bg-[hsl(var(--primary))]/45 p-4"
          onClick={onClose}
          data-testid="auth-overlay"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="auth-modal"
          >
            <div className="flex items-start justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))] shadow-[4px_4px_0_hsl(var(--primary))]">
                <Radar size={20} strokeWidth={2.5} />
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <h2 className="mt-5 font-display text-2xl font-bold">
              {mode === "register" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
              {mode === "register"
                ? "Start your own Skill DNA, roadmap, and saved opportunities."
                : "Pick up where you left off — your progress is saved."}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "register" && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-auth-name"
                    className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--secondary-foreground))]"
                    placeholder="Aarav Mehta"
                    autoComplete="name"
                  />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-auth-email"
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--secondary-foreground))]"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-auth-password"
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--secondary-foreground))]"
                  placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                />
              </div>
              {mode === "register" && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Target role <span className="font-normal normal-case opacity-60">(optional)</span>
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    data-testid="input-auth-role"
                    className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--secondary-foreground))]"
                  >
                    <option value="">Decide later</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <p data-testid="auth-error" className="text-xs font-bold text-[hsl(var(--destructive))]">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant={mode === "register" ? "accent" : "primary"}
                className="w-full"
                testId="button-auth-submit"
              >
                {pending ? (
                  <span className="flex items-center gap-2">
                    <span className="thinking-dots" />
                    {mode === "register" ? "Creating account..." : "Signing in..."}
                  </span>
                ) : mode === "register" ? (
                  "Create account"
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs text-[hsl(var(--muted-foreground))]">
              {mode === "register" ? "Already have an account?" : "New to Skilling?"}{" "}
              <button
                onClick={() => switchMode(mode === "register" ? "login" : "register")}
                data-testid="button-auth-switch"
                className="font-bold text-[hsl(var(--secondary-foreground))] hover:underline"
              >
                {mode === "register" ? "Sign in" : "Create one"}
              </button>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
