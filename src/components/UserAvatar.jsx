import { motion } from "framer-motion";
import { EASE } from "@/components/ui";

/**
 * UserAvatar — an illustrated "portrait" avatar (in the style of the
 * orbit-card-stack characters: soft head shape, hair arc, dot eyes)
 * tinted with the user's level color, framed by a gamer-UI level ring.
 *
 * Props:
 *  - name:       display name (initials used as fallback seed)
 *  - level:      { level, title, color, progress } from /api/achievements
 *  - size:       pixel size of the whole framed avatar
 *  - hex:        use the hexagonal clip tile (header) vs round (sidebar)
 *  - testId:     applied to the inner portrait tile
 */
export function UserAvatar({ name = "User", level, size = 44, hex = false, testId }) {
  const color = level?.color ?? "#a3e635";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  /* Deterministic little variations per user so avatars feel personal */
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hairShift = (seed % 3) - 1; // -1, 0, 1 → slightly different hair width
  const skinTones = ["#f5d3b3", "#eab894", "#d9a066", "#b97a50", "#8d5a3a"];
  const skin = skinTones[seed % skinTones.length];
  const hairColors = ["#2b2320", "#4a3428", "#6b4a2f", "#1f2937", "#7c3f2d"];
  const hair = hairColors[seed % hairColors.length];

  const clip = hex
    ? { clipPath: "polygon(25% 3%, 75% 3%, 98% 50%, 75% 97%, 25% 97%, 2% 50%)" }
    : { borderRadius: "9999px" };

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      {/* portrait tile, tinted with the level color */}
      <div
        data-testid={testId}
        className="relative overflow-hidden"
        style={{
          width: size * 0.82,
          height: size * 0.82,
          ...clip,
          background: `linear-gradient(150deg, ${color}66 0%, #17181c 78%)`,
          boxShadow: `inset 0 0 0 1.5px ${color}55`,
        }}
      >
        {/* backdrop glow */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 25% 18%, ${color}55, transparent 55%)`,
          }}
        />
        {/* shoulders */}
        <div
          className="absolute border-2 border-black/70"
          style={{
            left: "10%",
            right: "10%",
            bottom: "-8%",
            height: "48%",
            borderRadius: "999px 999px 0 0",
            background: skin,
          }}
        />
        {/* head */}
        <div
          className="absolute border-2 border-black/70"
          style={{
            left: "50%",
            top: "20%",
            width: "58%",
            height: "56%",
            transform: "translateX(-50%)",
            borderRadius: "46% 54% 48% 52%",
            background: skin,
          }}
        >
          {/* eyes */}
          <span
            className="absolute rounded-full bg-black"
            style={{ left: "20%", top: "40%", width: "16%", height: "12%" }}
          />
          <span
            className="absolute rounded-full bg-black"
            style={{ right: "20%", top: "40%", width: "16%", height: "12%" }}
          />
          {/* smile */}
          <span
            className="absolute border-b-2 border-black/80"
            style={{
              left: "34%",
              top: "62%",
              width: "32%",
              height: "22%",
              borderRadius: "0 0 999px 999px",
            }}
          />
          {/* hair */}
          <span
            className="absolute border-2 border-b-0 border-black/70"
            style={{
              left: "50%",
              top: "-24%",
              width: `${72 + hairShift * 8}%`,
              height: "60%",
              transform: "translateX(-50%)",
              borderRadius: "999px 999px 0 0",
              background: hair,
            }}
          />
        </div>
        {/* initials chip, corner */}
        <span
          className="absolute bottom-0 right-0 rounded-tl-md px-1 text-[7px] font-black leading-[1.4] text-black/80"
          style={{ background: color }}
        >
          {initials}
        </span>
      </div>
    </div>
  );
}

/**
 * LevelRing — the gamer frame that wraps a UserAvatar.
 * Renders an SVG progress ring + optional pulsing glow + level chip.
 * Children are expected to be the avatar visuals.
 */
export function LevelRing({ level, size = 44, strokeWidth = 3, pulse = true, children }) {
  const color = level?.color ?? "#a3e635";
  const r = (size - strokeWidth * 2) / 2;
  const c = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(100, level?.progress ?? 0));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {pulse && level ? (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl"
          animate={{
            boxShadow: [
              `0 0 6px ${color}44`,
              `0 0 16px ${color}88`,
              `0 0 6px ${color}44`,
            ],
          }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
        />
      ) : null}
      {level ? (
        <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,.12)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={c}
            animate={{ strokeDashoffset: c * (1 - progress / 100) }}
            transition={{ duration: 0.8, ease: EASE }}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
      ) : null}
      {children}
    </div>
  );
}
