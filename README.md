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
| `server/index.js` | Express app: `/api/health`, `/api/skills`, `POST /api/ai/chat`, serves `dist/` in production |
| `server/ai.js` | Provider layer + system prompt. Add new providers to the `PROVIDERS` array |

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
  ai.js               AI providers
```

## Production build

```bash
npm run build     # outputs dist/
npm start         # serves API + built frontend on http://localhost:3001
```

## Notes

- All content on the pages is demo data in `src/data/skillingData.js` — edit it there.
- The Support Desk conversation is stored in localStorage (same as the original app).
- Framer-motion animations, dark mode, and the hero skill network are all preserved.
