import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Radar } from "lucide-react";

export const EASE = [0.22, 1, 0.36, 1];

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

/** Page enter/exit wrapper */
export function PageTransition({ children }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Scroll-into-view fade wrapper */
export function Reveal({ children, delay = 0, className = "" }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Count-up number */
export function AnimatedNumber({ value, suffix = "", prefix = "", format = false }) {
  const [display, setDisplay] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / 850, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return (
    <>
      {prefix}
      {format ? new Intl.NumberFormat("en-US").format(display) : display}
      {suffix}
    </>
  );
}

export function Logo({ small = false }) {
  return (
    <div className={`relative grid place-items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))] shadow-[4px_4px_0_hsl(var(--primary))] ${small ? "h-8 w-8" : "h-10 w-10"}`}>
      {/* logo mark */}
      <Radar size={small ? 17 : 20} strokeWidth={2.5} />
      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[hsl(var(--secondary-foreground))]" />
    </div>
  );
}

export function Brand({ light = false }) {
  return (
    <div className={`flex items-center gap-3 ${light ? "text-[hsl(var(--primary-foreground))]" : ""}`}>
      <Logo />
      <span className="font-display text-xl font-bold tracking-[-.05em]">
        skilling<span className="text-[hsl(var(--accent))]">.</span>
      </span>
    </div>
  );
}

const BADGE_TONES = {
  muted: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
  accent: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  teal: "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]",
  dark: "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
};

export function Badge({ children, tone = "muted" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

const BUTTON_VARIANTS = {
  primary:
    "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[3px_3px_0_hsl(var(--accent))] hover:-translate-y-0.5",
  outline:
    "border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))]",
  ghost:
    "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]",
  accent:
    "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:-translate-y-0.5",
};

export function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  testId,
  type = "button",
  disabled,
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
      data-testid={testId}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all duration-200 ${BUTTON_VARIANTS[variant]} ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function ProgressBar({ value, accent = false }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.85, ease: EASE }}
        className={`h-full rounded-full ${
          accent ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--secondary-foreground))]"
        }`}
      />
    </div>
  );
}

/** Standard page header block */
export function PageHeader({ eyebrow, title, copy, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"
    >
      <div>
        <p className="font-mono text-[10px] font-medium uppercase tracking-[.2em] text-[hsl(var(--secondary-foreground))]">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-[-.06em] md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{copy}</p>
      </div>
      {action}
    </motion.div>
  );
}

/** Stat metric card used on Industry / Academia pages */
export function MetricCard({ label, value, detail, icon: Icon }) {
  const numeric = Number(String(value).replace(/[^0-9]/g, ""));
  const prefix = String(value).startsWith("+") ? "+" : "";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.45, ease: EASE }}
      whileHover={{ y: -3 }}
      className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{label}</p>
        <motion.span whileHover={{ rotate: 8, scale: 1.1 }}>
          <Icon size={17} className="text-[hsl(var(--secondary-foreground))]" />
        </motion.span>
      </div>
      <p
        data-testid={`metric-${label.toLowerCase().replaceAll(" ", "-")}`}
        className="mt-4 font-display text-3xl font-bold"
      >
        <AnimatedNumber value={numeric} prefix={prefix} format />
      </p>
      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{detail}</p>
    </motion.div>
  );
}
