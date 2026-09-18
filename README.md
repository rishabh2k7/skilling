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
| `server/index.js` | Express app: profile, skills, opportunities, roadmap, assessments, AI chat, academia — serves `dist/` in production |
| `server/storage/index.js` | Storage selector: MongoDB Atlas when `MONGODB_URI` is set, otherwise SQLite |
| `server/storage/sqlite.js` | SQLite backend (better-sqlite3): schema, migrations, seed, query helpers |
| `server/storage/mongo.js` | MongoDB Atlas backend: identical interface, indexes, TTL sessions, seed |
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

5. Restart the server. Demo data is seeded automatically on first connect; the DB upgrades
   itself with indexes and a TTL index that purges expired sessions. Log out / log in state,
   saved opportunities, roadmap progress, assessments, and chat history are all stored in Atlas.
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

- Local file at `data/skilling.db` (change folder with `DATA_DIR`); created and seeded on boot.
- **Delete `data/skilling.db`** to reset to fresh demo state.
- In Docker the app writes to `/app/data`; attach a volume there (Railway: configured in
  `railway.json`; Render: attach a disk and set `DATA_DIR=/var/data`).

`/api/health` reports which driver is active: `"storage":"mongodb-atlas"` or `"storage":"sqlite"`.

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health + AI provider status |
| GET | `/api/profile` | Demo learner profile |
| GET | `/api/skills` | Skill DNA (role, readiness, skills) |
| GET | `/api/opportunities` | Opportunities + saved/applied state |
| POST | `/api/opportunities/:id/save` | Toggle saved |
| POST | `/api/opportunities/:id/apply` | Set applied true/false |
| GET | `/api/roadmap` | Roadmap steps + progress |
| POST | `/api/roadmap/:stepId` | Mark step complete/incomplete |
| GET | `/api/assessments/next` | Next checkpoint question |
| POST | `/api/assessments/:id/attempt` | Submit answer (server-graded) |
| POST | `/api/ai/chat` | AI chat (persisted to DB) |
| GET | `/api/ai/chat/history` | Chat history |
| GET | `/api/academia` | Curriculum pulses, interventions, stats |

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
  App.jsx             routes: /, /student(+4 subpages), /industry, /academia, /help
  index.css           design tokens + signature effects (extracted from your site)
  components/         AppLayout (sidebar/shell), ui.jsx (Button, Badge, cards…)
  pages/              one file per page — this is where you edit screens
  data/skillingData.js  all demo content (skills, opportunities, candidates…)
server/
  index.js            Express API
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

- All content on the pages is demo data in `src/data/skillingData.js` — edit it there.
- The Support Desk conversation is stored in localStorage (same as the original app).
- Framer-motion animations, dark mode, and the hero skill network are all preserved.
