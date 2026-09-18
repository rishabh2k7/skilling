# ---------- Stage 1: build the frontend ----------
# Debian slim (glibc) + Node 22: better-sqlite3 prebuilt binaries download cleanly
# here — no compile toolchain needed. (With MongoDB Atlas, better-sqlite3 is the
# unused fallback driver and never loads.)
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Stage 2: runtime (API server + static frontend) ----------
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Fail the image build immediately if the native module is broken
# (only relevant when SQLite is the active driver — MONGODB_URI skips it at runtime)
RUN node -e "require('better-sqlite3'); console.log('better-sqlite3 loads OK')"

COPY server ./server
COPY --from=build /app/dist ./dist

# SQLite database lives here (persist via a disk in production)
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data
VOLUME ["/app/data"]

# Render / Railway inject PORT; defaults to 3001 locally
EXPOSE 3001

CMD ["node", "server/index.js"]
