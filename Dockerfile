# ---------- Stage 1: build the frontend ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Stage 2: runtime (API server + static frontend) ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY --from=build /app/dist ./dist

# Render / Railway inject PORT; defaults to 3001 locally
EXPOSE 3001

CMD ["node", "server/index.js"]
