import { useEffect } from "react";
import { Route, Switch, useLocation, useRoute } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Landing from "@/pages/Landing";
import StudentOverview from "@/pages/StudentOverview";
import SkillDNA from "@/pages/SkillDNA";
import Assessment from "@/pages/Assessment";
import Roadmap from "@/pages/Roadmap";
import Opportunities from "@/pages/Opportunities";
import Industry from "@/pages/Industry";
import Academia from "@/pages/Academia";
import Help from "@/pages/Help";
import NotFound from "@/pages/NotFound";
import { AppLayout, AppProvider, useApp } from "@/components/AppLayout";
import { AuthProvider } from "@/lib/auth";
import { PageTransition } from "@/components/ui";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <Routes />
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function Routes() {
  const [location, navigate] = useLocation();
  const [landing] = useRoute("/");
  const [isStudent] = useRoute("/student/:sub*");
  const [isIndustry] = useRoute("/industry");
  const [isAcademia] = useRoute("/academia");

  const { role, setRole, theme, toggleTheme } = useApp();

  useEffect(() => {
    if (location.startsWith("/industry")) setRole("industry");
    else if (location.startsWith("/academia")) setRole("academia");
    else if (location.startsWith("/student")) setRole("student");
  }, [location, setRole]);

  const go = (path) => navigate(path);

  if (landing) {
    return (
      <div className={theme === "dark" ? "dark" : ""}>
        <Landing navigate={go} theme={theme} toggleTheme={toggleTheme} />
      </div>
    );
  }

  let page = null;
  if (location === "/student") page = <StudentOverview navigate={go} />;
  else if (location === "/student/skills") page = <SkillDNA navigate={go} />;
  else if (location === "/student/assessment") page = <Assessment />;
  else if (location === "/student/roadmap") page = <Roadmap />;
  else if (location === "/student/opportunities") page = <Opportunities />;
  else if (location === "/industry") page = <Industry navigate={go} />;
  else if (location === "/academia") page = <Academia navigate={go} />;
  else if (location === "/help") page = <Help />;
  else
    return (
      <div className={theme === "dark" ? "dark" : ""}>
        <NotFound go={go} />
      </div>
    );

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <AppLayout navigate={go} role={role} theme={theme} toggleTheme={toggleTheme}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location}>
            <PageTransition>{page}</PageTransition>
          </motion.div>
        </AnimatePresence>
      </AppLayout>
    </div>
  );
}
