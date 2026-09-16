// ===== Demo data extracted from the deployed Skilling app =====

export const SKILLS = [
  { name: "JavaScript", value: 90, tone: "strong", note: "Ready to apply" },
  { name: "React", value: 82, tone: "strong", note: "Role-ready" },
  { name: "SQL", value: 70, tone: "steady", note: "Build depth" },
  { name: "Node.js", value: 65, tone: "steady", note: "Close to target" },
  { name: "Docker", value: 40, tone: "gap", note: "Next best skill" },
  { name: "AWS", value: 30, tone: "gap", note: "Future signal" },
];

export const OPPORTUNITIES = [
  {
    id: "op-frontend",
    title: "Frontend / Full Stack Intern",
    company: "Northstar Labs",
    location: "Remote · 12 weeks",
    match: 86,
    tags: ["React", "Node.js", "TypeScript"],
    why: "Your React strength and growing Node.js signal map directly to the team’s internship brief.",
  },
  {
    id: "op-platform",
    title: "Platform Engineering Co-op",
    company: "Radian Systems",
    location: "Austin · Hybrid",
    match: 72,
    tags: ["Docker", "AWS", "SQL"],
    why: "A strong stretch match: your SQL foundation is solid, while Docker is the shortest path to eligibility.",
  },
  {
    id: "op-product",
    title: "Product Engineering Scholar",
    company: "Fieldnote",
    location: "New York · Hybrid",
    match: 68,
    tags: ["JavaScript", "React", "APIs"],
    why: "Your JavaScript and React evidence meet the core bar; add one shipped API project to stand out.",
  },
];

export const CANDIDATES = [
  ["Aarav Mehta", "Full Stack Intern", "86%", "Docker gap"],
  ["Mira Shah", "Frontend Intern", "81%", "TypeScript signal"],
  ["Leo Wong", "Platform Co-op", "74%", "AWS gap"],
  ["Nia Brooks", "Product Engineer", "69%", "Evidence needed"],
];

export const CURRICULUM_PULSE = [
  ["Cloud deployment", 42, "Docker, AWS"],
  ["Data fluency", 57, "SQL, analytics"],
  ["Product evidence", 68, "README, reflection"],
  ["Core programming", 83, "JavaScript, Python"],
];

export const INTERVENTIONS = [
  ["Embed a Docker lab", "68 learners show the same deployment gap", "Create lab"],
  ["Add evidence rubric", "Students ship work but cannot explain it", "View rubric"],
  ["Pair with industry mentor", "Cloud signal is the current bottleneck", "Explore"],
];

export const MOMENTUM = [35, 42, 40, 49, 53, 58, 64];

// Hero network skill constellation: [name, left, top, delayClass]
export const HERO_SKILLS = [
  ["Python", "8%", "18%", "delay-1"],
  ["React", "57%", "11%", "delay-3"],
  ["SQL", "78%", "28%", "delay-2"],
  ["Docker", "24%", "70%", "delay-4"],
  ["AI", "69%", "75%", "delay-2"],
  ["TypeScript", "42%", "86%", "delay-1"],
  ["AWS", "87%", "58%", "delay-3"],
  ["JavaScript", "28%", "34%", "delay-2"],
  ["Node.js", "52%", "42%", "delay-4"],
  ["Machine Learning", "68%", "20%", "delay-1"],
  ["Git", "16%", "55%", "delay-3"],
  ["PostgreSQL", "76%", "83%", "delay-2"],
  ["Cloud", "86%", "34%", "delay-4"],
  ["Cybersecurity", "7%", "78%", "delay-1"],
];

export const ASSESSMENT_OPTIONS = [
  "A process that packages an app and its dependencies",
  "A cloud provider for hosting containers",
  "A JavaScript runtime for the browser",
  "A database migration tool",
];

export const ROADMAP_STEPS = [
  { id: "intent", label: "Career goal", title: "Full Stack Developer", status: "complete", locked: true },
  { id: "foundations", label: "Foundation", title: "JavaScript + React baseline", status: "complete", locked: true },
  { id: "docker", label: "Skill gap", title: "Containerized REST API", status: "next", locked: false },
  { id: "assessment", label: "Validate", title: "Docker checkpoint", status: "up next", locked: false },
  { id: "evidence", label: "Prove", title: "Project reflection + README", status: "up next", locked: false },
];
