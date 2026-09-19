# Skilling — editable full-stack version

Your Replit app ("Skilling"), extracted into an editable **Vite + React** frontend with an
**Express backend** and a **multi-provider AI integration**.

## Run it

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173 (hot-reloads as you edit `src/`)
- Backend API: http://localhost:3001 (restarts are manual; `npm run dev` runs both)

## Add your AI API key

1. Copy the template: `cp .env.example .env`
2. Open `.env` and un-comment **one** provider key, e.g. `GROQ_API_KEY=gsk_...` (free tier)
   or `OPENAI_API_KEY=sk-...`.
3. Restart the server. The Support Desk chat (`/help`) now answers with your model.

Supported out of the box: **OpenAI, Anthropic, Gemini, Groq, OpenRouter, Ollama (local)**.
The server auto-detects whichever key exists; set `AI_PROVIDER=groq` to force one when
several keys are present. Model names are overridable with `OPENAI_MODEL`, `GROQ_MODEL`, etc.

The key stays on the server — the browser only ever talks to `/api/ai/chat`, so nothing
sensitive ships to clients.

## Backend

| File | Purpose |
| --- | --- |
| `server/index.js` | Express app: auth-gated profile, skills, openings, resources, checkpoints, roadmap, AI chat, stats — serves `dist/` in production |
| `server/catalog.js` | Production catalog: real learning resources (lectures/courses/docs/books), role library, LinkedIn-linked role briefs, checkpoint question bank |
| `server/storage/index.js` | Storage selector: MongoDB Atlas when `MONGODB_URI` is set, otherwise SQLite |
| `server/storage/sqlite.js` | SQLite backend (better-sqlite3): production schema, migrations, query helpers |
| `server/storage/mongo.js` | MongoDB Atlas backend: identical interface, indexes, TTL sessions |
| `server/auth.js` | Register / login / logout / session cookie handling |
| `server/ai.js` | Provider layer + system prompt. Add new providers to the `PROVIDERS` array |

## Data storage — SQLite or MongoDB Atlas

The backend has two interchangeable storage drivers behind one interface (`server/storage/`).
Both expose the same async helpers, so the rest of the app never changes.

### Option A — MongoDB Atlas (cloud, recommended for production)

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. **Database Access** → add a user (username + password).
3. **Network Access** → add your server IP, or `0.0.0.0/0` for hosts like Render/Railway.
4. **Connect → Drivers** → copy the connection string, then set it in `.env`:

```bash
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=skilling   # optional — defaults to the db name in the URI, or "skilling"
```

5. Restart the server. The DB upgrades itself with indexes and a TTL index that purges expired
   sessions. Accounts, Skill DNA, saved openings, resource progress, checkpoint history,
   readiness history, and chat are all stored in Atlas.
6. To deploy with Atlas: add `MONGODB_URI` in your host's **Environment** settings
   (Render: Environment; Railway: Variables). No disk attachment is needed — data lives in Atlas.

Shortcut — one command (keeps your site safe if the connection fails):

```bash
node scripts/atlas.mjs on      # enable Atlas, verify, auto-revert to SQLite on failure
node scripts/atlas.mjs off     # switch back to SQLite
node scripts/atlas.mjs status  # what's active right now
```

Note: some campus/office/ISP networks block MongoDB's port (27017) — if `on` reports a TLS
or timeout error, that's the network, not your credentials. A phone hotspot will connect,
and production hosts (Render/Railway) are unaffected.

The app **fails fast at startup** if the URI is wrong or Atlas is unreachable, with a hint
about checking the URI and Network Access.

### Option B — SQLite (default, zero setup)

- Local file at `data/skilling.db` (change folder with `DATA_DIR`); created empty on boot —
  the first sign-up becomes learner #1.
- In Docker the app writes to `/app/data`; attach a volume there (Railway: configured in
  `railway.json`; Render: attach a disk and set `DATA_DIR=/var/data`).

`/api/health` reports which driver is active: `"storage":"mongodb-atlas"` or `"storage":"sqlite"`.

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health, storage driver, AI provider, real platform stats |
| POST | `/api/auth/register` | Create account (seeds Skill DNA for target role) |
| GET | `/api/profile` | Your profile (401 for guests — no demo persona) |
| PATCH | `/api/profile` | Edit name, target role, LinkedIn URL |
| GET | `/api/skills` | Skill DNA (role, readiness, skills) |
| PATCH | `/api/skills` | Edit scores (readiness recomputes server-side) |
| GET | `/api/openings` | Role briefs scored live against your Skill DNA, with LinkedIn apply URLs |
| POST | `/api/openings/:slug/save` | Toggle saved |
| POST | `/api/openings/:slug/applied` | Mark applied (the apply click opens LinkedIn Jobs) |
| GET | `/api/resources` | Real lectures/courses/docs/books + your progress |
| POST | `/api/resources/:id/status` | Track saved / in-progress / completed |
| GET | `/api/checkpoints/next` | Personalized 5-question checkpoint (answers never leave the server) |
| POST | `/api/checkpoints/:skill/submit` | Server-graded; correct answers bump your Skill DNA |
| GET | `/api/readiness/history` | Momentum trail (recorded readiness changes) |
| GET | `/api/roadmap` | Roadmap steps + progress |
| POST | `/api/roadmap/:stepId` | Mark step complete/incomplete |
| POST | `/api/ai/chat` | AI chat (persisted to DB) |
| GET | `/api/ai/chat/history` | Chat history |
| GET | `/api/stats` | Real platform aggregates |
| GET | `/api/academia` | Real, privacy-masked cohort aggregates |

Add your own endpoint in three lines:

```js
app.get("/api/my-endpoint", (_req, res) => res.json({ hello: "world" }));
```

In development, Vite proxies `/api/*` to the backend (see `vite.config.ts`), so the frontend
just calls `fetch("/api/...")` with no CORS setup.

## Project layout

```
src/
  main.jsx            entry
  App.jsx             routes: /, /student(+5 subpages), /industry, /academia, /help
  index.css           design tokens + signature effects (extracted from your site)
  components/         AppLayout (sidebar/shell), AuthGate, ui.jsx (Button, Badge, cards…)
  pages/              one file per page — this is where you edit screens
server/
  index.js            Express API
  catalog.js          real resources, roles, openings, question bank
  auth.js             register / login / sessions
  storage/            SQLite + MongoDB Atlas drivers behind one interface
  ai.js               AI providers
```

## Production build

```bash
npm run build     # outputs dist/
npm start         # serves API + built frontend on http://localhost:3001
```

## Deploy (Render / Railway — one click)

The repo ships with everything both platforms need: a multi-stage `Dockerfile`, a Render
Blueprint (`render.yaml`), and Railway config (`railway.json`). The container builds the
frontend, installs production dependencies only, and serves the API + static app on one port.

**Render** (free tier works):
1. Push this repo to GitHub (already done).
2. On dashboard.render.com: **New + → Blueprint**, pick `rishabh2k7/skilling`, **Apply**.
3. After it deploys, go to **Environment** and add one AI key, e.g. `GROQ_API_KEY` — the service
   redeploys automatically and the Support Desk chat goes live.

**Railway**:
1. On railway.app: **New Project → Deploy from GitHub repo**, pick `skilling`.
2. Railway reads `railway.json` (Dockerfile + `/api/health` healthcheck) — no other setup.
3. In the service → **Variables**, add your AI key, e.g. `GROQ_API_KEY`.

Both platforms inject `PORT` automatically; the server honors it. Docker run locally:

```bash
docker build -t skilling .
docker run -p 3001:3001 --env-file .env skilling
```

## Notes

- The platform is production-oriented: no demo personas, no synthetic stats. Guests browse
  the resource library; every personal feature requires a free account.
- Individual learner data is private. Industry/Academia pages show only real, privacy-masked
  aggregates computed from actual accounts.
- Framer-motion animations, dark mode, and the hero skill network are all preserved.
