# ---------- Stage 1: build the frontend ----------
# Debian slim (glibc) + Node 22: better-sqlite3 v13 requires Node >= 22, and its
# prebuilt binaries download cleanly here — no compile toolchain needed.
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
