import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Linkedin, X } from "lucide-react";
import { Button, EASE } from "@/components/ui";
import { useUpdateProfile, useProfile } from "@/lib/api";

const ROLES = [
  "Full Stack Developer",
  "Frontend Engineer",
  "Backend Engineer",
  "Data Analyst",
  "ML Engineer",
  "Cloud/DevOps Engineer",
  "Product Manager",
];

export default function ProfileModal({ open, onClose, user, targetRole }) {
  const update = useUpdateProfile();
  const { data: profile } = useProfile();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user?.name || "");
      setRole(targetRole || "");
      setLinkedinUrl(profile?.linkedin_url || "");
      setError("");
      setSaved(false);
    }
  }, [open, user, targetRole, profile?.linkedin_url]);

  /* Opportunities page can open this modal directly */
  useEffect(() => {
    const handler = () => {
      window.dispatchEvent(new CustomEvent("open-profile-modal"));
    };
    /* AppLayout wires open-profile-modal; nothing needed here beyond noop safety */
    return () => window.removeEventListener("open-profile-edit", handler);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    if (!name.trim()) return setError("Your name cannot be empty.");
    const cleanUrl = linkedinUrl.trim();
    if (cleanUrl && !/^https?:\/\/(www\.)?linkedin\.com\/in\//i.test(cleanUrl)) {
      return setError("Use a full LinkedIn profile URL, e.g. https://linkedin.com/in/your-handle");
    }
    try {
      await update.mutateAsync({
        name: name.trim(),
        ...(role ? { targetRole: role } : {}),
        linkedinUrl: cleanUrl,
      });
      setSaved(true);
      setTimeout(onClose, 700);
    } catch (err) {
      setError(err.message || "Could not save.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
          data-testid="modal-profile"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Your account
                </p>
                <h2 className="mt-1 font-display text-xl font-bold">Edit profile</h2>
              </div>
              <button
                onClick={onClose}
                data-testid="button-close-profile"
                className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-profile-name"
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--secondary-foreground))]"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Target role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  data-testid="input-profile-role"
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--secondary-foreground))]"
                >
                  <option value="">Keep current</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">
                  Changing roles reseeds your opportunity matches — your scores stay put.
                </p>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <Linkedin size={12} /> LinkedIn profile URL
                </label>
                <input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  data-testid="input-profile-linkedin"
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--secondary-foreground))]"
                  placeholder="https://linkedin.com/in/your-handle"
                  type="url"
                />
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Signed in as {user?.email}
              </p>

              {error && (
                <p className="rounded-lg bg-[hsl(var(--destructive))]/10 px-3 py-2 text-xs font-semibold text-[hsl(var(--destructive))]" data-testid="profile-error">
                  {error}
                </p>
              )}
              {saved && (
                <p className="rounded-lg bg-[hsl(var(--accent))]/15 px-3 py-2 text-xs font-semibold text-[hsl(var(--accent-foreground))]" data-testid="profile-saved">
                  Saved ✓
                </p>
              )}

              <Button
                type="submit"
                disabled={update.isPending || saved}
                testId="button-save-profile"
                className="w-full"
              >
                {update.isPending ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
