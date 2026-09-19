/* Production catalog — curated real-world content, no demo data.
   Everything here ships with the product and is served through the API.

   Sections:
     ROLE_LIBRARY  — canonical target roles + the Skill DNA seeded at signup
     OPENINGS      — role briefs matched to the user's Skill DNA, each with a
                     real LinkedIn Jobs deep link for one-click apply
     RESOURCES     — real lectures, courses, docs and books (stable public URLs)
     QUESTION_BANK — checkpoint questions that are actually graded server-side
                     and move the user's Skill DNA
*/

/* ---------------- Target roles ---------------- */

export const ROLE_LIBRARY = {
  "Full Stack Developer": [
    ["JavaScript", 30], ["React", 25], ["Node.js", 20], ["SQL", 20], ["Docker", 10], ["Git & GitHub", 25],
  ],
  "Frontend Engineer": [
    ["JavaScript", 35], ["React", 30], ["CSS & HTML", 30], ["TypeScript", 15], ["Git & GitHub", 25], ["Testing", 10],
  ],
  "Backend Engineer": [
    ["Node.js", 30], ["SQL", 25], ["APIs", 25], ["Docker", 15], ["Git & GitHub", 25], ["Security", 10],
  ],
  "Data Analyst": [
    ["SQL", 30], ["Spreadsheets", 30], ["Python", 25], ["Data Analysis", 25], ["Statistics", 20], ["Data Visualization", 15],
  ],
  "ML Engineer": [
    ["Python", 30], ["Machine Learning", 20], ["Data Analysis", 20], ["Math for ML", 15], ["SQL", 15], ["Docker", 10],
  ],
  "Cloud/DevOps Engineer": [
    ["Linux", 25], ["Docker", 25], ["Git & GitHub", 25], ["AWS", 20], ["CI/CD", 15], ["Networking", 15],
  ],
  "Product Manager": [
    ["Product Discovery", 30], ["Communication", 30], ["Data Analysis", 20], ["UX Design", 20], ["SQL", 15], ["Roadmapping", 25],
  ],
};

export const DEFAULT_ROLE = "Full Stack Developer";

/* ---------------- Openings (role briefs → LinkedIn Jobs) ----------------
   Each opening carries a real LinkedIn Jobs search link built from `keywords`.
   `skills` weights drive server-side match scoring against the user's Skill DNA. */

function linkedinJobsUrl(keywords, location) {
  const base = "https://www.linkedin.com/jobs/search/?keywords=" + encodeURIComponent(keywords);
  return location && location !== "Remote"
    ? `${base}&location=${encodeURIComponent(location)}`
    : `${base}&location=${encodeURIComponent("Worldwide")}&f_WT=2`;
}

const OPENING_DEFS = [
  ["fs-intern", "Full Stack Intern", "Internship", "Full Stack Intern", "Remote",
    [["JavaScript", .3], ["React", .3], ["Node.js", .2], ["SQL", .2]],
    "Ship user-facing features across the stack in a mentored team."],
  ["fs-junior", "Junior Full Stack Developer", "Junior", "Full Stack Developer", "Hybrid",
    [["JavaScript", .3], ["React", .3], ["Node.js", .2], ["SQL", .2]],
    "Build and maintain production web apps end to end."],
  ["fe-intern", "Frontend Developer Intern", "Internship", "Frontend Developer Intern", "Remote",
    [["JavaScript", .35], ["React", .35], ["CSS & HTML", .2], ["TypeScript", .1]],
    "Turn designs into fast, accessible interfaces."],
  ["fe-junior", "Junior Frontend Engineer", "Junior", "Frontend Developer", "Hybrid",
    [["JavaScript", .35], ["React", .35], ["CSS & HTML", .2], ["TypeScript", .1]],
    "Own UI components, performance, and accessibility in a product team."],
  ["be-intern", "Backend Engineering Intern", "Internship", "Backend Developer Intern", "Remote",
    [["Node.js", .3], ["SQL", .3], ["APIs", .2], ["Docker", .2]],
    "Design APIs and data models behind real products."],
  ["be-junior", "Junior Backend Developer", "Junior", "Backend Developer", "On-site",
    [["Node.js", .3], ["SQL", .3], ["APIs", .2], ["Docker", .2]],
    "Build services, queries, and integrations that scale."],
  ["da-intern", "Data Analyst Intern", "Internship", "Data Analyst Intern", "Remote",
    [["SQL", .35], ["Spreadsheets", .2], ["Python", .2], ["Data Analysis", .25]],
    "Turn raw data into dashboards and decisions."],
  ["da-junior", "Junior Data Analyst", "Junior", "Data Analyst", "Hybrid",
    [["SQL", .35], ["Spreadsheets", .15], ["Python", .2], ["Data Analysis", .3]],
    "Own reporting, experiments, and insight delivery."],
  ["ml-intern", "Machine Learning Intern", "Internship", "Machine Learning Intern", "Remote",
    [["Python", .35], ["Machine Learning", .35], ["Math for ML", .15], ["SQL", .15]],
    "Train and evaluate models on real product data."],
  ["ml-junior", "Junior ML Engineer", "Junior", "Machine Learning Engineer", "Hybrid",
    [["Python", .35], ["Machine Learning", .35], ["Math for ML", .15], ["SQL", .15]],
    "Put models into production with monitoring and evals."],
  ["cld-intern", "DevOps Intern", "Internship", "DevOps Intern", "Remote",
    [["Docker", .3], ["AWS", .3], ["Linux", .2], ["CI/CD", .2]],
    "Automate builds, deployments, and cloud infrastructure."],
  ["cld-junior", "Junior DevOps Engineer", "Junior", "DevOps Engineer", "On-site",
    [["Docker", .3], ["AWS", .3], ["Linux", .2], ["CI/CD", .2]],
    "Own pipelines, containers, and cloud reliability."],
  ["pm-assoc", "Associate Product Manager", "Junior", "Associate Product Manager", "Hybrid",
    [["Product Discovery", .3], ["Communication", .3], ["Data Analysis", .2], ["UX Design", .2]],
    "Drive discovery, prioritization, and delivery for a product line."],
  ["pm-intern", "Product Management Intern", "Internship", "Product Management Intern", "Remote",
    [["Product Discovery", .3], ["Communication", .3], ["Data Analysis", .2], ["UX Design", .2]],
    "Work with engineering and design from problem to shipped feature."],
];

export const OPENINGS = OPENING_DEFS.map(([slug, title, level, keywords, location, skills, blurb]) => ({
  slug, title, level, keywords, location, skills: Object.fromEntries(skills), blurb,
  applyUrl: linkedinJobsUrl(keywords, location),
}));

/* ---------------- Real learning resources ---------------- */

export const RESOURCES = [
  {
    id: "fullstackopen", title: "Full Stack Open", provider: "University of Helsinki", kind: "course",
    url: "https://fullstackopen.com/en/", duration: "~100 hours", level: "Intermediate",
    skills: ["React", "Node.js", "APIs", "Testing", "Git & GitHub"],
    blurb: "University-grade path from modern React to databases, deployment, and testing — free certificate available.",
  },
  {
    id: "cs50x", title: "CS50x: Introduction to Computer Science", provider: "Harvard University", kind: "course",
    url: "https://cs50.harvard.edu/x/", duration: "~100 hours", level: "Beginner",
    skills: ["Python", "SQL", "Math for ML"],
    blurb: "Harvard's flagship CS course — real lectures, problem sets, and a certificate on completion.",
  },
  {
    id: "freecodecamp", title: "freeCodeCamp Core Curriculum", provider: "freeCodeCamp", kind: "interactive",
    url: "https://www.freecodecamp.org/learn", duration: "300+ hours", level: "Beginner → Intermediate",
    skills: ["JavaScript", "CSS & HTML", "Data Analysis", "APIs", "Machine Learning"],
    blurb: "Hands-on certification tracks with thousands of auto-graded challenges and capstone projects.",
  },
  {
    id: "odinproject", title: "The Odin Project", provider: "The Odin Project", kind: "course",
    url: "https://www.theodinproject.com/", duration: "Self-paced", level: "Beginner → Job-ready",
    skills: ["JavaScript", "CSS & HTML", "Node.js", "Git & GitHub", "React"],
    blurb: "A complete, opinionated full-stack curriculum that ends with real portfolio projects.",
  },
  {
    id: "traversy-react", title: "React JS Crash Course", provider: "Traversy Media (YouTube)", kind: "lecture",
    url: "https://www.youtube.com/watch?v=w7ejDZ8SWv8", duration: "~2.5 hours", level: "Beginner",
    skills: ["React", "JavaScript"],
    blurb: "The classic single-video React walkthrough: components, hooks, state, and a full task tracker project.",
  },
  {
    id: "traversy-node", title: "Node.js Crash Course", provider: "Traversy Media (YouTube)", kind: "lecture",
    url: "https://www.youtube.com/watch?v=fBNz5xF-Kx8", duration: "~1.5 hours", level: "Beginner",
    skills: ["Node.js", "APIs"],
    blurb: "Core Node concepts and a practical API build — the fastest way to get hands-on.",
  },
  {
    id: "nana-docker", title: "Docker Tutorial for Beginners", provider: "TechWorld with Nana (YouTube)", kind: "lecture",
    url: "https://www.youtube.com/watch?v=3c-iBn73dDE", duration: "~3 hours", level: "Beginner",
    skills: ["Docker", "CI/CD"],
    blurb: "Full DevOps-style Docker course: images, containers, volumes, compose, and deployment demo.",
  },
  {
    id: "javascript-info", title: "The Modern JavaScript Tutorial", provider: "javascript.info", kind: "docs",
    url: "https://javascript.info/", duration: "Self-paced", level: "Beginner → Advanced",
    skills: ["JavaScript"],
    blurb: "The deepest free JavaScript reference, from basics to event loop and browser APIs, with exercises.",
  },
  {
    id: "react-dev", title: "React Official Docs — Learn", provider: "react.dev", kind: "docs",
    url: "https://react.dev/learn", duration: "Self-paced", level: "Beginner → Intermediate",
    skills: ["React"],
    blurb: "The canonical React guide, written by the team — start here over any outdated blog post.",
  },
  {
    id: "mdn-learn", title: "Learn Web Development", provider: "MDN Web Docs", kind: "docs",
    url: "https://developer.mozilla.org/en-US/docs/Learn", duration: "Self-paced", level: "Beginner",
    skills: ["CSS & HTML", "JavaScript", "Accessibility"],
    blurb: "Mozilla's structured path through HTML, CSS, and JS — the web platform's reference home.",
  },
  {
    id: "ms-webdev", title: "Web Development for Beginners", provider: "Microsoft (open curriculum)", kind: "course",
    url: "https://microsoft.github.io/Web-Dev-For-Beginners/", duration: "12 weeks", level: "Beginner",
    skills: ["CSS & HTML", "JavaScript"],
    blurb: "24 lessons with quizzes and projects from Microsoft's education team — completely open.",
  },
  {
    id: "nodejs-learn", title: "Node.js Official Guides", provider: "nodejs.org", kind: "docs",
    url: "https://nodejs.org/en/learn", duration: "Self-paced", level: "Beginner → Intermediate",
    skills: ["Node.js", "APIs", "Security"],
    blurb: "Straight-from-source guides on the runtime, modules, streams, and security basics.",
  },
  {
    id: "docker-started", title: "Docker Get Started", provider: "Docker Docs", kind: "docs",
    url: "https://docs.docker.com/get-started/", duration: "~4 hours", level: "Beginner",
    skills: ["Docker"],
    blurb: "Official hands-on workshop: containerize an app, persist data, and ship with compose.",
  },
  {
    id: "sqlbolt", title: "SQLBolt", provider: "SQLBolt", kind: "interactive",
    url: "https://sqlbolt.com/", duration: "~3 hours", level: "Beginner",
    skills: ["SQL"],
    blurb: "Learn SQL by writing it — every lesson is a live interactive exercise in the browser.",
  },
  {
    id: "mode-sql", title: "Mode SQL Tutorial", provider: "Mode Analytics", kind: "course",
    url: "https://mode.com/sql-tutorial/", duration: "~10 hours", level: "Intermediate",
    skills: ["SQL", "Data Analysis"],
    blurb: "Analyst-focused SQL from basics to window functions against a real query editor.",
  },
  {
    id: "kaggle-learn", title: "Kaggle Learn Micro-Courses", provider: "Kaggle", kind: "interactive",
    url: "https://www.kaggle.com/learn", duration: "3–5 hrs each", level: "Beginner → Intermediate",
    skills: ["Python", "Data Analysis", "Machine Learning", "Data Visualization", "Statistics"],
    blurb: "Short practical notebooks on pandas, ML, and visualization — run real code on real datasets.",
  },
  {
    id: "google-ml", title: "Machine Learning Crash Course", provider: "Google", kind: "course",
    url: "https://developers.google.com/machine-learning/crash-course", duration: "~15 hours", level: "Intermediate",
    skills: ["Machine Learning", "Math for ML"],
    blurb: "Google's fast, practical ML intro with interactive visualizations and TensorFlow exercises.",
  },
  {
    id: "automate-python", title: "Automate the Boring Stuff with Python", provider: "Al Sweigart", kind: "book",
    url: "https://automatetheboringstuff.com/", duration: "Self-paced", level: "Beginner",
    skills: ["Python", "Data Analysis"],
    blurb: "The famous free book that teaches Python through immediately useful automation projects.",
  },
  {
    id: "pro-git", title: "Pro Git (2nd Edition)", provider: "git-scm.com", kind: "book",
    url: "https://git-scm.com/book/en/v2", duration: "Self-paced", level: "Beginner → Advanced",
    skills: ["Git & GitHub"],
    blurb: "The official Git book, free in full — everything from first commit to rebasing workflows.",
  },
  {
    id: "github-skills", title: "GitHub Skills", provider: "GitHub", kind: "interactive",
    url: "https://skills.github.com/", duration: "~15 min each", level: "Beginner",
    skills: ["Git & GitHub", "CI/CD"],
    blurb: "Bite-sized repos that teach Git and GitHub Actions by doing, with instant feedback.",
  },
  {
    id: "aws-skillbuilder", title: "AWS Skill Builder (free tier)", provider: "AWS", kind: "course",
    url: "https://skillbuilder.aws/", duration: "Self-paced", level: "Beginner → Intermediate",
    skills: ["AWS", "Security", "Networking"],
    blurb: "Amazon's own learning platform — free digital courses across cloud fundamentals and services.",
  },
  {
    id: "mongodb-university", title: "MongoDB University Free Courses", provider: "MongoDB", kind: "course",
    url: "https://learn.mongodb.com/", duration: "~6 hrs each", level: "Beginner → Intermediate",
    skills: ["SQL", "Node.js", "APIs"],
    blurb: "Official free MongoDB courses with hands-on labs — great companion for Node backends.",
  },
];

/* ---------------- Checkpoint question bank ----------------
   Server-graded. Passing questions bumps the matching skill score for real. */

export const QUESTION_BANK = {
  JavaScript: [
    ["js-1", "Which keyword creates a binding that cannot be reassigned?", ["var", "let", "const", "static"], 2,
      "`const` declares a binding that can't be reassigned (object contents can still change)."],
    ["js-2", "What does `Array.prototype.map` return?", ["The same array, modified", "A new array with each element transformed", "The first matching element", "A boolean"], 1,
      "`map` builds a new array by calling your function on every element."],
    ["js-3", "What is a closure?", ["A closed-down server", "A function that remembers variables from its outer scope", "A loop that never ends", "A CSS layout system"], 1,
      "Closures let inner functions keep access to outer variables even after the outer call returns."],
    ["js-4", "`2 + \"2\"` evaluates to…", ["4", "\"22\"", "NaN", "TypeError"], 1,
      "The `+` operator with a string coerces the number and concatenates."],
    ["js-5", "What does `===` check that `==` does not?", ["Truthiness", "Both value and type", "References in memory", "Prototype chains"], 1,
      "`===` is strict equality — no type coercion happens."],
    ["js-6", "Which statement about `typeof null` is true?", ["It returns \"null\"", "It returns \"object\" (a historical quirk)", "It throws an error", "It returns \"undefined\""], 1,
      "A famous JS quirk: `typeof null` is \"object\" and has been since 1995."],
  ],
  React: [
    ["react-1", "Which hook adds local state to a function component?", ["useEffect", "useState", "useMemo", "useRef"], 1,
      "`useState` gives a component its own state slot and a setter."],
    ["react-2", "What does the dependency array in `useEffect` control?", ["The component's CSS", "When the effect re-runs", "How state is merged", "The render order of lists"], 1,
      "The effect re-runs when any dependency in the array changes."],
    ["react-3", "How should you render a list of items?", ["A for loop inside JSX", "`.map()` returning elements with a unique `key`", "innerHTML string building", "document.write"], 1,
      "Lists are rendered with `.map()`, and `key` helps React track each row."],
    ["react-4", "Props are…", ["Mutable component variables", "Read-only inputs passed from parent to child", "Global state", "CSS classes"], 1,
      "Props flow one way down the tree and must not be mutated by the child."],
    ["react-5", "Which hook lets many components read shared state without prop drilling?", ["useReducer", "useContext", "useLayoutEffect", "useId"], 1,
      "`useContext` reads a context value provided higher in the tree."],
    ["react-6", "What is the main job of `key` in a list?", ["Styling hooks", "Identifying which items changed, for efficient updates", "Sorting the list", "Naming the component"], 1,
      "Keys give list items a stable identity across renders."],
  ],
  "Node.js": [
    ["node-1", "Node.js is best described as…", ["A browser", "A JavaScript runtime built on V8 for server-side apps", "A CSS framework", "A database engine"], 1,
      "Node runs JS outside the browser using Chrome's V8 engine plus system APIs."],
    ["node-2", "`process.env` gives access to…", ["Installed packages", "Environment variables", "The DOM", "The file system"], 1,
      "`process.env` is the standard way to read configuration like `PORT`."],
    ["node-3", "Express middleware is…", ["A database driver", "A function with access to (req, res, next)", "An HTML template engine", "A build tool"], 1,
      "Middleware functions run in sequence and can end the request or call `next()`."],
    ["node-4", "Which HTTP status code means \"created\"?", ["200", "201", "301", "404"], 1,
      "201 Created is returned after a resource (like a new user) is created."],
    ["node-5", "What does the event loop let Node do?", ["Run on multiple machines", "Handle many async operations on a single thread", "Render HTML", "Guarantee zero downtime"], 1,
      "The event loop processes callbacks without blocking, so one thread serves many requests."],
    ["node-6", "Which HTTP verb is conventionally used to replace a resource at a URL idempotently?", ["POST", "PUT", "PATCH", "OPTIONS"], 1,
      "PUT represents the full replacement of a resource and is safe to repeat."],
  ],
  SQL: [
    ["sql-1", "Which clause filters rows BEFORE grouping?", ["HAVING", "WHERE", "ORDER BY", "LIMIT"], 1,
      "`WHERE` filters individual rows; `HAVING` filters aggregated groups."],
    ["sql-2", "`COUNT(*)` in a grouped query returns…", ["The number of columns", "The number of rows in each group", "The sum of a column", "A random sample"], 1,
      "COUNT(*) counts rows per group when GROUP BY is present."],
    ["sql-3", "Which JOIN keeps every row from the left table even without a match?", ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "CROSS JOIN"], 1,
      "LEFT JOIN preserves all left-table rows, filling missing right columns with NULL."],
    ["sql-4", "A primary key…", ["Allows duplicates", "Uniquely identifies each row and cannot be NULL", "Is always a UUID", "Must be a number"], 1,
      "Primary keys enforce row identity: unique + never null."],
    ["sql-5", "Which keyword removes duplicate rows from a result?", ["UNIQUE", "DISTINCT", "GROUP", "SINGLE"], 1,
      "`SELECT DISTINCT` collapses duplicate rows."],
    ["sql-6", "`ORDER BY name DESC` sorts…", ["Alphabetically A→Z", "Reverse alphabetical (Z→A)", "By row length", "Randomly"], 1,
      "DESC is descending; ASC (the default) is ascending."],
  ],
  Docker: [
    ["docker-1", "What is the difference between an image and a container?", ["They are the same thing", "An image is the blueprint; a container is a running instance of it", "Images run in the cloud, containers don't", "Containers are compressed images"], 1,
      "Images are immutable templates; containers are live processes built from them."],
    ["docker-2", "Which Dockerfile instruction copies files from your project into the image?", ["MOVE", "COPY", "INCLUDE", "UPLOAD"], 1,
      "`COPY` layers your local files into the image filesystem."],
    ["docker-3", "Which command builds an image from a Dockerfile?", ["docker create", "docker build", "docker init", "docker compile"], 1,
      "`docker build -t name .` reads the Dockerfile in the current directory."],
    ["docker-4", "What does `-p 8080:80` do when running a container?", ["Sets the CPU priority", "Publishes the container's port 80 to the host's 8080", "Creates two containers", "Prints debug logs"], 1,
      "The port map is host:container, so you browse localhost:8080."],
    ["docker-5", "Volumes are used for…", ["Faster CPUs", "Persistent storage that survives container removal", "Networking between clouds", "Image compression"], 1,
      "Volumes live outside the container's writable layer, so data outlives containers."],
    ["docker-6", "`docker compose` is primarily for…", ["Writing documentation", "Defining and running multi-container applications", "Building base images", "Managing cloud billing"], 1,
      "Compose files describe services, networks, and volumes that start together."],
  ],
  AWS: [
    ["aws-1", "Amazon S3 is a service for…", ["Object storage", "Virtual servers", "DNS only", "Sending emails"], 0,
      "S3 stores objects (files) in buckets, with 11-nines durability."],
    ["aws-2", "Amazon EC2 provides…", ["Resizable virtual machines in the cloud", "A browser IDE", "A CDN", "A database query language"], 0,
      "EC2 instances are VMs you can size and scale."],
    ["aws-3", "AWS IAM controls…", ["Who can do what to which resources", "Machine learning models", "Image resizing", "Domain registration"], 0,
      "IAM defines identities, policies, and permissions across AWS."],
    ["aws-4", "An AWS Region is…", ["A single data center", "A geographic area with multiple isolated Availability Zones", "A pricing tier", "A user account type"], 1,
      "Regions group AZs — physically separate data centers — for fault tolerance."],
    ["aws-5", "AWS Lambda lets you…", ["Rent dedicated servers", "Run code without managing servers", "Store unlimited video", "Register domain names"], 1,
      "Lambda runs functions on demand — you only pay per invocation."],
    ["aws-6", "Amazon CloudFront is…", ["A compute service", "A content delivery network (CDN)", "A CI/CD tool", "A message queue"], 1,
      "CloudFront caches content at edge locations worldwide."],
  ],
  Python: [
    ["py-1", "Which built-in structure is immutable?", ["list", "dict", "tuple", "set"], 2,
      "Tuples can't be modified after creation."],
    ["py-2", "`pip` is used to…", ["Run Python files", "Install packages from PyPI", "Format code", "Create virtual machines"], 1,
      "`pip install requests` pulls packages from the Python Package Index."],
    ["py-3", "`len(\"data\")` returns…", ["3", "4", "\"data\"", "None"], 1,
      "len() counts characters in a string: d-a-t-a = 4."],
    ["py-4", "`[x * 2 for x in range(3)]` evaluates to…", ["[0, 2, 4]", "[2, 4, 6]", "[0, 1, 2]", "[1, 2, 3]"], 0,
      "range(3) yields 0, 1, 2 — doubled gives 0, 2, 4."],
    ["py-5", "How do you read a dict value with a fallback when the key may be missing?", ["d[key]", "d.get(key, default)", "d.find(key)", "d(key)"], 1,
      "`.get(key, default)` returns the default instead of raising KeyError."],
    ["py-6", "Which symbol starts a comment in Python?", ["//", "#", "--", "/*"], 1,
      "# comments run to the end of the line."],
  ],
  "Data Analysis": [
    ["da-1", "The median differs from the mean because it…", ["Uses every value", "Is the middle value when data is sorted, so outliers matter less", "Is always larger", "Only works on even counts"], 1,
      "The median is robust to extreme values; the mean is not."],
    ["da-2", "A pandas DataFrame is…", ["A 2D labeled table of data", "A chart type", "A database server", "A Python web framework"], 0,
      "DataFrames are the standard tabular structure for data work in Python."],
    ["da-3", "Standard deviation measures…", ["The middle value", "How spread out values are around the mean", "The largest value", "Correlation strength"], 1,
      "Bigger standard deviation = wider spread."],
    ["da-4", "Correlation between two variables…", ["Proves one causes the other", "Does not imply causation", "Is always positive", "Requires a database"], 1,
      "Correlated variables can share a hidden cause — correlation alone never proves causation."],
    ["da-5", "`groupby` in pandas…", ["Deletes duplicate rows", "Splits data into groups so you can aggregate each", "Sorts a table", "Renames columns"], 1,
      "Split → apply → combine: the core aggregation pattern."],
    ["da-6", "A histogram shows…", ["A distribution of a numeric variable", "Trends over time only", "Category counts as bars for strings only", "The correlation matrix"], 0,
      "Histograms bucket a numeric variable to reveal its distribution."],
  ],
  "Git & GitHub": [
    ["git-1", "What does `git commit` do?", ["Uploads code to GitHub", "Records a snapshot of staged changes in local history", "Creates a branch", "Merges two branches"], 1,
      "Commits are local snapshots; `git push` sends them to the remote."],
    ["git-2", "Which command stages a file for the next commit?", ["git add", "git push", "git stage --now", "git save"], 0,
      "`git add` moves changes into the staging area."],
    ["git-3", "A pull request is…", ["A request to download the repo", "A proposal to merge your branch, opened for review", "A Git error", "A kind of commit"], 1,
      "PRs let teammates review and discuss changes before merging."],
    ["git-4", "`git clone` …", ["Copies a remote repository to your machine, with full history", "Renames a branch", "Squashes commits", "Deletes a remote"], 0,
      "Cloning creates a local copy linked to the remote."],
    ["git-5", "What is a branch used for?", ["Deleting history", "Isolating lines of work (features/fixes) from the main codebase", "Storing credentials", "Compressing the repo"], 1,
      "Branches let work happen in parallel and merge when ready."],
    ["git-6", "`.gitignore` …", ["Locks the repository", "Lists files Git should not track", "Hides files from your OS", "Removes files from history"], 1,
      "Ignored paths (like `node_modules` or `.env`) stay out of version control."],
  ],
};

/* Question ids must be unique across the whole bank */
const seen = new Set();
for (const qs of Object.values(QUESTION_BANK)) {
  for (const [id] of qs) {
    if (seen.has(id)) throw new Error(`duplicate question id: ${id}`);
    seen.add(id);
  }
}

export const CHECKPOINT_SIZE = 5;

/* The lowest-scored skill of the user that actually has a checkpoint bank.
   Falls back through the user's skill list so a checkpoint is always offered. */
export function pickCheckpointSkill(skills) {
  const ordered = [...skills].sort((a, b) => a.value - b.value);
  return ordered.find((s) => QUESTION_BANK[s.name])?.name ?? null;
}

/* ---------------- Ordered roadmap task templates ----------------
   A roadmap is an ORDERED list of tasks. Each task carries optional real
   data: a resource from the library, a checkpoint skill, or a custom
   description the user types. Users check tasks off in order; the server
   only allows completing the first incomplete task (strict sequence). */

const byId = Object.fromEntries(RESOURCES.map((r) => [r.id, r]));

export const TASK_KINDS = {
  resource: "resource",     // linked to a real library resource
  project: "project",       // a build task with a described deliverable
  checkpoint: "checkpoint", // a graded checkpoint for a skill
  custom: "custom",         // user-authored task
};

/* Resource picks per skill, in teaching order (first = primary). */
const RESOURCE_ORDER = {
  JavaScript: ["javascript-info", "freecodecamp", "ms-webdev"],
  React: ["react-dev", "traversy-react", "odinproject"],
  "CSS & HTML": ["mdn-learn", "ms-webdev"],
  TypeScript: ["odinproject", "javascript-info"],
  Testing: ["fullstackopen"],
  "Node.js": ["nodejs-learn", "traversy-node", "fullstackopen"],
  SQL: ["sqlbolt", "mode-sql", "mongodb-university"],
  APIs: ["traversy-node", "nodejs-learn", "fullstackopen"],
  Docker: ["nana-docker", "docker-started"],
  AWS: ["aws-skillbuilder"],
  Security: ["nodejs-learn", "aws-skillbuilder"],
  "Git & GitHub": ["github-skills", "pro-git"],
  "CI/CD": ["github-skills", "nana-docker"],
  Linux: ["aws-skillbuilder"],
  Networking: ["aws-skillbuilder"],
  Python: ["automate-python", "cs50x", "kaggle-learn"],
  "Data Analysis": ["kaggle-learn", "mode-sql"],
  "Data Visualization": ["kaggle-learn"],
  Statistics: ["kaggle-learn"],
  Spreadsheets: ["kaggle-learn"],
  "Machine Learning": ["google-ml", "kaggle-learn"],
  "Math for ML": ["google-ml", "cs50x"],
  "Product Discovery": ["freecodecamp"],
  Communication: ["freecodecamp"],
  "UX Design": ["mdn-learn"],
  Roadmapping: ["freecodecamp"],
};

function resourceTask(id, sortKey) {
  const r = byId[id];
  if (!r) return null;
  return {
    kind: "resource",
    title: `Study: ${r.title}`,
    data: { resourceId: r.id, url: r.url, provider: r.provider, duration: r.duration },
    estimate: r.duration,
    sortKey,
  };
}

function projectTask(gapSkill, targetRole, sortKey) {
  return {
    kind: "project",
    title: `Build: a small ${gapSkill} project`,
    data: {
      detail: `Apply ${gapSkill} in something real and public — a repo, dashboard, or demo. Keep it small enough to finish this week; ship it and link it from your profile.`,
      deliverable: "Public repo or live link added to your evidence",
    },
    estimate: "4–8 hours",
    sortKey,
  };
}

function checkpointTask(skill, sortKey) {
  return {
    kind: "checkpoint",
    title: `Pass: the ${skill} checkpoint`,
    data: { skill, detail: `Score at least 3/5 on the graded ${skill} checkpoint.` },
    estimate: "10 min",
    sortKey,
  };
}

/* Build the default ordered task plan for a profile.
   foundationSkill — the first skill the user should study (from their DNA)
   gapSkill        — the current weakest skill (usually the same at signup) */
export function buildRoadmapTasks(targetRole, foundationSkill, gapSkill) {
  const picks = RESOURCE_ORDER[foundationSkill] ?? RESOURCE_ORDER["JavaScript"];
  const tasks = [];

  const t1 = resourceTask(picks[0], 10);
  if (t1) tasks.push(t1);
  if (picks[1] && picks[1] !== picks[0]) {
    const t2 = resourceTask(picks[1], 20);
    if (t2) tasks.push(t2);
  }

  const cpSkill = QUESTION_BANK[foundationSkill] ? foundationSkill : foundationSkill;
  if (QUESTION_BANK[cpSkill]) tasks.push(checkpointTask(cpSkill, 30));

  tasks.push(projectTask(gapSkill || foundationSkill, targetRole, 40));

  return tasks;
}
