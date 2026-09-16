import { createContext, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Compass,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  Lightbulb,
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
import { Brand, Badge } from "@/components/ui";

/* Role + theme context (shared with pages via useApp) */
const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export const STUDENT_NAV = [
  { label: "Overview", path: "/student", icon: Home },
  { label: "Skill DNA", path: "/student/skills", icon: Radar },
  { label: "Assessment", path: "/student/assessment", icon: Target },
  { label: "Roadmap", path: "/student/roadmap", icon: Route },
  { label: "Opportunities", path: "/student/opportunities", icon: Trophy },
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
    () => localStorage.getItem("skilling-theme")?.replace(/"/g, "") || "light"
  );
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
  const nav = role === "student" ? STUDENT_NAV : ROLE_NAVS[role];

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
              navigate("/");
              setSidebarOpen(false);
            }}
            data-testid="button-go-home"
            className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white"
          >
            <Home size={17} />
            Home screen
          </button>
          <button
            onClick={() => {
              navigate("/help");
              setSidebarOpen(false);
            }}
            data-testid="nav-help"
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white"
          >
            <MessageCircle size={17} />
            Support desk
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--primary))]">
              AM
            </div>
            <div>
              <p className="text-xs font-bold">Aarav Mehta</p>
              <p className="text-[10px] text-white/45">Demo learner</p>
            </div>
            <ChevronDown size={14} className="ml-auto text-white/35" />
          </div>
        </div>
      </aside>

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
              <span className="text-[hsl(var(--foreground))]">Demo data</span>
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
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--primary))] text-xs font-bold text-[hsl(var(--primary-foreground))]">
              AM
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] p-5 lg:p-10">{children}</div>
      </main>
    </div>
  );
}

export { BookOpen, Compass, FileText, Lightbulb, ArrowRight, X, Badge };
