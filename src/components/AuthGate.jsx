import { motion } from "framer-motion";
import { Radar, LogIn, UserPlus } from "lucide-react";
import { Button, EASE } from "@/components/ui";

/* Fires a global event that AppLayout listens for to open the auth modal */
export function openAuthModal(mode = "register") {
  window.dispatchEvent(new CustomEvent("open-auth", { detail: mode }));
}

/* Rendered by every personal-data page when the visitor is not signed in.
   Replaces the old demo profile experience: there is no demo persona anymore. */
export default function AuthGate({ title = "Your data lives here.", copy }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="mx-auto mt-6 max-w-xl rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-center shadow-[var(--shadow-card)]"
      data-testid="auth-gate"
    >
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))] shadow-[4px_4px_0_hsl(var(--primary))]">
        <Radar size={22} strokeWidth={2.5} />
      </div>
      <h2 className="mt-6 font-display text-3xl font-bold tracking-[-.04em]">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
        {copy ??
          "Create a free account to build your Skill DNA, follow a roadmap, track real lectures and courses, and apply to roles matched to your evidence. Everything you see is your own data — no demo personas."}
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button
          onClick={() => openAuthModal("register")}
          variant="accent"
          testId="button-gate-signup"
        >
          <UserPlus size={15} /> Create free account
        </Button>
        <Button
          onClick={() => openAuthModal("login")}
          variant="outline"
          testId="button-gate-login"
        >
          <LogIn size={15} /> Sign in
        </Button>
      </div>
    </motion.div>
  );
}
