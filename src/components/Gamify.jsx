import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Zap } from "lucide-react";
import { EASE } from "@/components/ui";

/* ============================================================
   Pixel-art badges — drawn as SVG pixel grids (crispEdges), in
   the style of the Skilling achievement set. Each icon is a
   12×12 grid; palette chars map to colors per badge.
   ============================================================ */

const PIXEL_ICONS = {
  boot: {
    palette: { "1": "#39d5f0", "2": "#0e7490", "3": "#e8f8fd" },
    grid: [
      "............",
      "...11.......",
      "...11.......",
      "...11.......",
      "...11.......",
      "...111......",
      "...1111113..",
      "...1111113..",
      "...11111133.",
      "..111111113.",
      "..222222222.",
      "............",
    ],
  },
  magnifier: {
    palette: { "1": "#e34fd0", "2": "#e34fd0", "3": "#86198f" },
    grid: [
      "..111111....",
      ".1......1...",
      "1........1..",
      "1...33...1..",
      "1...33...1..",
      "1........1.2",
      ".1......1..2",
      "..111111...2",
      "..........22",
      ".........22.",
      "............",
      "............",
    ],
  },
  brain: {
    palette: { "1": "#a3e635", "2": "#4d7c0f", "3": "#ecfccb" },
    grid: [
      "....1111....",
      "..11....11..",
      ".1...33...1.",
      "1...3333...1",
      "1..33..33..1",
      "1..3.22.3..1",
      "1..33..33..1",
      "1...3333...1",
      ".1...33...1.",
      "..11....11..",
      "....1111....",
      "............",
    ],
  },
  trophy: {
    palette: { "1": "#f59e0b", "2": "#b45309", "3": "#fde68a" },
    grid: [
      "............",
      "11......11..",
      "1111111111..",
      "1113111131..",
      ".11111111...",
      ".21111112...",
      "..111111....",
      "...1111.....",
      "....11......",
      "..111111....",
      "..222222....",
      "............",
    ],
  },
  hammer: {
    palette: { "1": "#39d5f0", "2": "#0e7490" },
    grid: [
      ".....11111..",
      "....1111111.",
      "....1111111.",
      ".....11111..",
      "....11......",
      "....11......",
      "...11.......",
      "...11.......",
      "..11........",
      "..11........",
      ".22.........",
      "............",
    ],
  },
  anvil: {
    palette: { "1": "#e34fd0", "2": "#86198f", "3": "#fbcfe8" },
    grid: [
      "............",
      ".1111111111.",
      "..11111111..",
      "...31..13...",
      "....1111....",
      ".....11.....",
      ".....11.....",
      "....1111....",
      "...111111...",
      "..11111111..",
      ".2222222222.",
      "............",
    ],
  },
  arrow: {
    palette: { "1": "#a3e635", "2": "#4d7c0f" },
    grid: [
      ".....11.....",
      "....1111....",
      "...111111...",
      "..11111111..",
      ".1111111111.",
      "111111111111",
      "..11111111..",
      "....1111....",
      ".....11.....",
      ".....11.....",
      "....2222....",
      "............",
    ],
  },
  shield: {
    palette: { "1": "#f59e0b", "2": "#fbbf24", "3": "#78350f" },
    grid: [
      "............",
      "111111111111",
      "111111111111",
      "111322231111",
      "113222223111",
      "113222223111",
      "111322231111",
      ".1111331111.",
      "..11111111..",
      "...111111...",
      "....1111....",
      "............",
    ],
  },
  telescope: {
    palette: { "1": "#39d5f0", "2": "#e8f8fd", "3": "#0e7490" },
    grid: [
      "..........2.",
      "........2...",
      ".......111..",
      "......1111..",
      ".....1111...",
      "....1111....",
      "...111......",
      "..3333......",
      ".33..33.....",
      "33....33....",
      "2...........",
      ".....33.....",
    ],
  },
  crown: {
    palette: { "1": "#e34fd0", "2": "#86198f", "3": "#fbcfe8" },
    grid: [
      "............",
      "............",
      "1....3....1.",
      "1...333...1.",
      "11..333..11.",
      "111.333.111.",
      "111111111111",
      "113111111311",
      "111111111111",
      "222222222222",
      "............",
      "............",
    ],
  },
};

/** Pixel-art icon rendered from its grid (crisp SVG rects). */
export function PixelIcon({ icon, color = "#39d5f0", size = 36, className = "" }) {
  const def = PIXEL_ICONS[icon] ?? PIXEL_ICONS.trophy;
  const cells = useMemo(() => {
    const out = [];
    def.grid.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (ch !== ".") out.push({ x, y, c: def.palette[ch] ?? color });
      });
    });
    return out;
  }, [def, color]);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width="1.02" height="1.02" fill={c.c} />
      ))}
    </svg>
  );
}

/** The framed neon tile — one achievement badge. */
export function PixelBadgeFrame({ icon, color, size = 64, glow = true, dimmed = false, className = "", children }) {
  return (
    <div
      className={`relative grid shrink-0 place-items-center rounded-xl border-2 bg-[#17181c] ${className ?? ""}`}
      style={{
        borderColor: color,
        width: size,
        height: size,
        boxShadow: glow && !dimmed ? `0 0 14px ${color}66, inset 0 0 8px ${color}33` : "none",
        opacity: dimmed ? 0.45 : 1,
        filter: dimmed ? "grayscale(1)" : "none",
      }}
    >
      <PixelIcon icon={icon} color={color} size={Math.round(size * 0.62)} />
      {children}
    </div>
  );
}

/* ============================================================
   Celebration engine — XP toasts, badge unlocks, level-up overlay
   ============================================================ */

const GamifyCtx = createContext(null);
export const useGamify = () => useContext(GamifyCtx);

let toastSeq = 0;

export function GamifyProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [badgePop, setBadgePop] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pushToast = (t) => {
    const id = ++toastSeq;
    setToasts((cur) => [...cur.slice(-3), { id, ...t }]);
    timers.current.push(setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 4600));
  };

  /* Main entry: pages call celebrate(response.gamification) */
  const celebrate = (g) => {
    if (!g || g.awarded === false) return;
    if (g.leveledUp) {
      setLevelUp({ level: g.level, from: g.levelBefore });
      timers.current.push(setTimeout(() => setLevelUp(null), 4200));
    }
    if (g.xp) {
      pushToast({ xp: g.xp, xpTotal: g.xpTotal, level: g.level, label: g.label });
    }
    (g.newBadges ?? []).forEach((badge, i) => {
      timers.current.push(
        setTimeout(
          () => setBadgePop({ badge, seq: ++toastSeq }),
          (g.leveledUp ? 2200 : 600) + i * 1600
        )
      );
      timers.current.push(setTimeout(() => setBadgePop(null), (g.leveledUp ? 2200 : 600) + i * 1600 + 4200));
    });
  };

  return (
    <GamifyCtx.Provider value={{ celebrate, pushToast }}>
      {children}
      {/* XP toast stack */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-72 flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.4, ease: EASE }}
              data-testid="xp-toast"
              className="pointer-events-auto overflow-hidden rounded-xl border-2 bg-[#17181c] p-3.5 shadow-2xl"
              style={{ borderColor: t.level?.color ?? "#a3e635" }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 16 }}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
                  style={{ background: `${t.level?.color ?? "#a3e635"}22` }}
                >
                  <Zap size={20} style={{ color: t.level?.color ?? "#a3e635" }} fill="currentColor" />
                </motion.div>
                <div className="min-w-0">
                  <motion.p
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg font-black leading-none text-white"
                    data-testid="xp-toast-amount"
                  >
                    +{t.xp} XP
                  </motion.p>
                  {t.label && (
                    <p className="mt-1 truncate text-[11px] font-semibold text-white/60">{t.label}</p>
                  )}
                </div>
                {t.level && (
                  <div className="ml-auto text-right">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Level</p>
                    <p className="text-sm font-black" style={{ color: t.level.color }}>
                      {t.level.level}
                    </p>
                  </div>
                )}
              </div>
              {/* mini level progress */}
              {t.level?.xpForNext ? (
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${t.level.progress}%` }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ background: t.level.color }}
                  />
                </div>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Badge unlock popup */}
      <AnimatePresence>
        {badgePop && (
          <motion.div
            key={badgePop.seq}
            initial={{ opacity: 0, y: 80, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            data-testid="badge-unlock-popup"
            className="fixed bottom-5 left-1/2 z-[95] -translate-x-1/2"
            onClick={() => setBadgePop(null)}
          >
            <div
              className="flex items-center gap-4 rounded-2xl border-2 bg-[#17181c] py-4 pl-4 pr-6 shadow-2xl"
              style={{ borderColor: badgePop.badge.color }}
            >
              <motion.div
                animate={{ rotate: [0, -8, 8, -4, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 0.9, times: [0, 0.3, 0.6, 0.8, 1] }}
              >
                <PixelBadgeFrame icon={badgePop.badge.icon} color={badgePop.badge.color} size={56} />
              </motion.div>
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-[.25em]"
                  style={{ color: badgePop.badge.color }}
                >
                  Badge unlocked!
                </p>
                <p className="font-display text-lg font-bold text-white">{badgePop.badge.name}</p>
                <p className="text-[11px] text-white/55">{badgePop.badge.description}</p>
              </div>
              {/* shine sweep */}
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-2xl"
                initial={{ x: "-100%" }}
                animate={{ x: "160%" }}
                transition={{ duration: 1.1, delay: 0.35, ease: EASE }}
                style={{
                  background:
                    "linear-gradient(105deg, transparent 40%, rgba(255,255,255,.14) 50%, transparent 60%)",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level-up overlay */}
      <AnimatePresence>
        {levelUp && (
          <motion.div
            key={`lvl-${levelUp.level}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            data-testid="levelup-overlay"
            className="fixed inset-0 z-[99] grid place-items-center bg-black/70 backdrop-blur-sm"
            onClick={() => setLevelUp(null)}
          >
            {/* radial burst particles */}
            {[...Array(18)].map((_, i) => {
              const angle = (i / 18) * Math.PI * 2;
              const color = levelUp.level.color;
              return (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2 h-2 w-2"
                  style={{ background: color }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(angle) * (140 + (i % 4) * 55),
                    y: Math.sin(angle) * (140 + (i % 4) * 55),
                    opacity: 0,
                    scale: 0.4,
                    rotate: 90,
                  }}
                  transition={{ duration: 1.4, ease: EASE, delay: 0.25 }}
                />
              );
            })}
            <motion.div
              initial={{ scale: 0.4, y: 60 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="relative flex flex-col items-center px-8 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                className="grid h-28 w-28 place-items-center rounded-2xl border-[3px] bg-[#17181c]"
                style={{
                  borderColor: levelUp.level.color,
                  boxShadow: `0 0 40px ${levelUp.level.color}88, inset 0 0 18px ${levelUp.level.color}44`,
                }}
              >
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.3em] text-white/50">Level</p>
                  <p className="font-display text-5xl font-black" style={{ color: levelUp.level.color }}>
                    {levelUp.level.level}
                  </p>
                </div>
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 font-display text-3xl font-black text-white"
              >
                Level up!
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-1 text-lg font-bold"
                style={{ color: levelUp.level.color }}
              >
                You are now a {levelUp.level.title}
              </motion.p>
              {levelUp.level.nextTitle && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.65 }}
                  className="mt-2 text-xs font-semibold text-white/55"
                >
                  {levelUp.level.xpToNext} XP to {levelUp.level.nextTitle}
                </motion.p>
              )}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-4 text-[10px] font-bold uppercase tracking-[.25em] text-white/35"
              >
                Click anywhere to continue
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GamifyCtx.Provider>
  );
}

/* ============================================================
   Shared XP widgets
   ============================================================ */

/** Animated level progress bar with XP numbers. */
export function XpBar({ level, xpTotal, compact = false }) {
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!level) return null;
  return (
    <div className={compact ? "" : "rounded-xl border border-white/10 bg-white/5 p-3"} data-testid="xp-bar">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: level.color }}>
          Lv {level.level} · {level.title}
        </p>
        {!compact && (
          <p className="text-[10px] font-bold text-white/45">
            {xpTotal} XP{level.nextTitle ? ` · ${level.xpToNext} to ${level.nextTitle}` : ""}
          </p>
        )}
      </div>
      <div className={`mt-1.5 overflow-hidden rounded-full bg-white/10 ${compact ? "h-1" : "h-2"}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${level.progress}%` }}
          transition={{ duration: reduced ? 0 : 1, ease: EASE }}
          className="h-full rounded-full"
          style={{ background: level.color, boxShadow: `0 0 8px ${level.color}66` }}
          data-testid="xp-bar-fill"
        />
      </div>
    </div>
  );
}

/** Locked-overlay helper for the achievements grid. */
export function LockedBadge({ icon, color, size = 56 }) {
  return (
    <PixelBadgeFrame icon={icon} color={color} size={size} glow={false} dimmed>
      <div className="absolute inset-0 grid place-items-center rounded-xl bg-black/45">
        <Lock size={16} className="text-white/70" />
      </div>
    </PixelBadgeFrame>
  );
}

/** Tiny hook: fires celebrate() exactly once per gamification payload object. */
export function useCelebrator() {
  const { celebrate } = useGamify();
  const seen = useRef(new WeakSet());
  return (g) => {
    if (!g || seen.current.has(g)) return;
    seen.current.add(g);
    celebrate(g);
  };
}
