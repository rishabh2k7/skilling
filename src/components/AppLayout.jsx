import { createContext, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BookOpen,
  ChevronDown,
  Compass,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MessageCircle,
  Moon,
  Route,
  Radar,
  Sun,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Brand, Badge, EASE } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useProfile, useAchievements } from "@/lib/api";
import AuthModal from "@/components/AuthModal";
import ProfileModal from "@/components/ProfileModal";
import { XpBar } from "@/components/Gamify";

/* Role + theme context (shared with pages via useApp) */
const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export const STUDENT_NAV = [
  { label: "Overview", path: "/student", icon: Home },
  { label: "Skill DNA", path: "/student/skills", icon: Radar },
  { label: "Roadmap", path: "/student/roadmap", icon: Route },
  { label: "Resources", path: "/student/resources", icon: BookOpen },
  { label: "Opportunities", path: "/student/opportunities", icon: Trophy },
  { label: "Checkpoint", path: "/student/assessment", icon: Target },
  { label: "Achievements", path: "/student/achievements", icon: Award },
];

const ROLE_NAVS = {
  industry: [
    { label: "Talent command", path: "/industry", icon: Users },
    { label: "Skill signals", path: "/student/skills", icon: Radar },
    { label: "Support", path: "/help", icon: MessageCircle },
  ],
  academia: [
    { label: "Cohort view", path: "/academia", icon: GraduationCap },
    { label: "Skill signals", path: "/student/skills", icon: Radar },
    { label: "Support", path: "/help", icon: MessageCircle },
  ],
};

export function AppProvider({ children }) {
  const [role, setRole] = useState("student");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("skilling-theme")?.replace(/"/g, "") || "dark"
  );

  /* Keep <html> in sync — the early-paint script in index.html sets the class
     there too (before React loads), and body's background resolves against it. */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      localStorage.setItem("skilling-theme", JSON.stringify(next));
      return next;
    });

  return (
    <AppContext.Provider value={{ role, setRole, theme, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function AppLayout({ children, navigate, role, theme, toggleTheme }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { data: profileData } = useProfile();
  const { data: achievements } = useAchievements(!!user && role === "student");
  const nav = role === "student" ? STUDENT_NAV : ROLE_NAVS[role];

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  /* Any page can request the auth modal (e.g. AuthGate after a 401) */
  useEffect(() => {
    const handler = (e) => openAuth(e.detail || "register");
    window.addEventListener("open-auth", handler);
    return () => window.removeEventListener("open-auth", handler);
  }, []);

  /* Opportunities page opens the profile modal to add a LinkedIn URL */
  useEffect(() => {
    const handler = () => {
      if (!user) return;
      setProfileOpen(true);
    };
    window.addEventListener("open-profile-edit", handler);
    return () => window.removeEventListener("open-profile-edit", handler);
  }, [user]);

  const initials = user
    ? user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : null;

  return (
    <div className="app-shell flex bg-[hsl(var(--background))]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <Brand light />
          <button
            onClick={() => setSidebarOpen(false)}
            data-testid="button-close-sidebar"
            className="rounded-lg p-2 text-white/50 hover:bg-white/10 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-10 flex-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">
            Workspace
          </p>
          <nav className="mt-3 space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.path}
                  whileHover={{ x: 3 }}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  data-testid={`nav-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white"
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                  {item.label === "Overview" && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
                  )}
                </motion.button>
              );
            })}
          </nav>
          <div className="my-7 h-px bg-white/10" />
          <p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">More</p>
          <button
            onClick={() => {
              navigate("/help");
              setSidebarOpen(false);
            }}
            data-testid="nav-help"
            className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white"
          >
            <MessageCircle size={17} />
            Support desk
          </button>
        </div>

        {/* Level + XP — animated, driven by real server XP */}
        {user && role === "student" && achievements?.level && (
          <div className="mb-3">
            <XpBar level={achievements.level} xpTotal={achievements.xpTotal} />
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setProfileOpen(true)}
                data-testid="button-open-profile"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-left transition hover:bg-white/10"
                title="Edit profile"
              >
                <div className="relative grid h-11 w-11 shrink-0 place-items-center">
                  {/* Level progress ring around the avatar */}
                  {achievements?.level ? (
                    <svg viewBox="0 0 44 44" className="absolute inset-0 h-full w-full -rotate-90">
                      <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="2.5" />
                      <motion.circle
                        cx="22" cy="22" r="20" fill="none"
                        stroke={achievements.level.color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 20}
                        animate={{
                          strokeDashoffset:
                            2 * Math.PI * 20 * (1 - (achievements.level.progress ?? 0) / 100),
                        }}
                        transition={{ duration: 0.8, ease: EASE }}
                        style={{ filter: `drop-shadow(0 0 3px ${achievements.level.color}99)` }}
                      />
                    </svg>
                  ) : null}
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--primary))] ${
                      achievements?.level ? "rounded-full" : ""
                    }`}
                    data-testid="user-avatar"
                  >
                    {initials}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold" data-testid="user-name">{user.name}</p>
                  {achievements?.level ? (
                    <p
                      className="truncate text-[10px] font-bold"
                      style={{ color: achievements.level.color }}
                      data-testid="user-level-title"
                    >
                      Lv {achievements.level.level} · {achievements.level.title}
                    </p>
                  ) : (
                    <p className="truncate text-[10px] text-white/45">{user.email}</p>
                  )}
                </div>
              </button>
              <button
                onClick={logout}
                data-testid="button-logout"
                className="ml-auto shrink-0 rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                Browsing as guest
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => openAuth("login")}
                  data-testid="button-login-sidebar"
                  className="flex-1 rounded-lg bg-[hsl(var(--accent))] px-2 py-2 text-xs font-bold text-[hsl(var(--accent-foreground))] transition hover:-translate-y-0.5"
                >
                  Sign in
                </button>
                <button
                  onClick={() => openAuth("register")}
                  data-testid="button-register-sidebar"
                  className="flex-1 rounded-lg border border-white/15 px-2 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10"
                >
                  Sign up
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        targetRole={profileData?.role}
      />

      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          data-testid="button-sidebar-overlay"
          className="fixed inset-0 z-30 bg-[hsl(var(--primary))]/35 lg:hidden"
        />
      )}

      {/* Main column */}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 px-5 backdrop-blur lg:px-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              data-testid="button-open-sidebar"
              className="rounded-lg p-2 hover:bg-[hsl(var(--muted))] lg:hidden"
            >
              <LayoutDashboard size={20} />
            </button>
            <div className="hidden text-sm font-semibold text-[hsl(var(--muted-foreground))] sm:block">
              {role === "student"
                ? "Student workspace"
                : role === "industry"
                  ? "Industry workspace"
                  : "Academia workspace"}{" "}
              <span className="mx-2 text-[hsl(var(--border))]">/</span>{" "}
              <span className="text-[hsl(var(--foreground))]">
                {user ? "Your data" : "Sign in for your data"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              data-testid="button-home-header"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] sm:flex"
            >
              <Home size={15} /> Home
            </button>
            <button
              onClick={toggleTheme}
              data-testid="button-toggle-theme"
              className="rounded-lg p-2.5 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              aria-label={`Switch to ${theme === "light" ? "black and grey" : "signal"} theme`}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            {/* Role switcher */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                data-testid="button-role-switcher"
                className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold"
              >
                <span className="hidden text-[hsl(var(--muted-foreground))] sm:inline">
                  Viewing as
                </span>
                <span className="capitalize">{role}</span>
                <ChevronDown size={14} />
              </button>
              {roleMenuOpen && (
                <div className="absolute right-0 top-12 z-30 w-44 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1.5 shadow-xl">
                  {["student", "industry", "academia"].map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        navigate(r === "student" ? "/student" : `/${r}`);
                        setRoleMenuOpen(false);
                      }}
                      data-testid={`switch-role-${r}`}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold capitalize hover:bg-[hsl(var(--muted))]"
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          r === role ? "bg-[hsl(var(--secondary-foreground))]" : "bg-[hsl(var(--border))]"
                        }`}
                      />
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate("/help")}
              data-testid="button-open-support"
              className="rounded-lg p-2.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
            >
              <MessageCircle size={19} />
            </button>
            {user ? (
              /* Gamer-style level avatar: hexagon frame, neon level ring, pulsing glow, XP chip */
              <motion.button
                onClick={() => navigate(role === "student" ? "/student/achievements" : "/student")}
                data-testid="header-avatar"
                title={`${user.name} — Level ${achievements?.level?.level ?? 1} ${achievements?.level?.title ?? ""} · ${achievements?.xpTotal ?? 0} XP`}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="relative grid h-11 w-11 place-items-center"
              >
                {/* pulsing neon glow */}
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-2xl"
                  animate={
                    achievements?.level
                      ? {
                          boxShadow: [
                            `0 0 6px ${achievements.level.color}44`,
                            `0 0 16px ${achievements.level.color}88`,
                            `0 0 6px ${achievements.level.color}44`,
                          ],
                        }
                      : undefined
                  }
                  transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                />
                {/* level progress ring */}
                {achievements?.level ? (
                  <svg viewBox="0 0 44 44" className="absolute inset-0 h-full w-full -rotate-90">
                    <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3" />
                    <motion.circle
                      cx="22" cy="22" r="19" fill="none"
                      stroke={achievements.level.color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 19}
                      animate={{
                        strokeDashoffset:
                          2 * Math.PI * 19 * (1 - (achievements.level.progress ?? 0) / 100),
                      }}
                      transition={{ duration: 0.8, ease: EASE }}
                      style={{ filter: `drop-shadow(0 0 4px ${achievements.level.color})` }}
                    />
                  </svg>
                ) : null}
                {/* hexagon tile with initials */}
                <div
                  className="grid h-8 w-8 place-items-center text-[11px] font-black text-white"
                  style={{
                    background: achievements?.level
                      ? `linear-gradient(145deg, ${achievements.level.color}55, #17181c 70%)`
                      : "hsl(var(--primary))",
                    clipPath:
                      "polygon(25% 3%, 75% 3%, 98% 50%, 75% 97%, 25% 97%, 2% 50%)",
                  }}
                  data-testid="user-avatar"
                >
                  {initials}
                </div>
                {/* level badge chip */}
                {achievements?.level ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 16, delay: 0.2 }}
                    className="absolute -bottom-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[hsl(var(--background))] px-1 text-[9px] font-black text-white"
                    style={{
                      background: achievements.level.color,
                      boxShadow: `0 0 8px ${achievements.level.color}aa`,
                    }}
                    data-testid="header-avatar-level"
                  >
                    {achievements.level.level}
                  </motion.span>
                ) : null}
              </motion.button>
            ) : (
              <button
                onClick={() => openAuth("register")}
                data-testid="button-signup-header"
                className="rounded-lg bg-[hsl(var(--accent))] px-3.5 py-2 text-xs font-bold text-[hsl(var(--accent-foreground))] transition hover:-translate-y-0.5"
              >
                Sign up
              </button>
            )}
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] p-5 lg:p-10">{children}</div>
      </main>
    </div>
  );
}

export { BookOpen, Compass, FileText, Lightbulb, ArrowRight, X, Badge };
