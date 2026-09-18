/* One-command storage switcher.
   Usage: node scripts/atlas.mjs <on|off|status>
     on     → enable MongoDB Atlas, restart the API, verify; auto-revert to
              SQLite if the connection fails (with a translated error message)
     off    → switch back to local SQLite
     status → print which storage is currently active */
import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const ENABLED = "MONGODB_URI=";
const DISABLED = "# MONGODB_URI=";

const cmd = process.argv[2] || "status";

function envLines() {
  return fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8").split(/\r?\n/) : [];
}
function saveEnv(lines) {
  fs.writeFileSync(envPath, lines.join("\n"), "utf8");
}
function uriLine(lines) {
  return lines.find((l) => l.startsWith(ENABLED) || l.startsWith(DISABLED));
}
function enabled(lines) {
  return lines.some((l) => l.startsWith(ENABLED) && !l.trim().endsWith("="));
}

function killApi() {
  try {
    const out = execSync('netstat -ano | findstr ":3001" | findstr "LISTENING"', { shell: "bash" }).toString();
    const pids = [...new Set(out.split("\n").map((l) => l.trim().split(/\s+/).pop()).filter((p) => /^\d+$/.test(p)))];
    for (const pid of pids) {
      try { execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" }); console.log(`[atlas] stopped old API (pid ${pid})`); } catch {}
    }
  } catch {}
}

function startApi() {
  const ps = `(Start-Process -FilePath 'node.exe' -ArgumentList 'server/index.js' -WorkingDirectory '${root}' -RedirectStandardOutput '${root}\\.freebuff\\api.log' -RedirectStandardError '${root}\\.freebuff\\api.err.log' -WindowStyle Hidden -PassThru).Id`;
  try {
    const pid = execSync(`powershell -NoProfile -Command "${ps}"`).toString().trim();
    console.log(`[atlas] API starting (pid ${pid})`);
  } catch (e) {
    console.log("[atlas] could not report pid — start the API manually with: npm run dev:server");
  }
}

async function probeApi() {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch("http://localhost:3001/api/health");
      if (res.ok) return await res.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 700));
  }
  return null;
}

function translate(errText) {
  const t = errText.toLowerCase();
  if (t.includes("authentication failed") || t.includes("authfailed") || t.includes("bad auth"))
    return "The password in MONGODB_URI is wrong for this database user (Atlas → Database Access → Edit → Edit Password).";
  if (t.includes("tlsv1 alert") || t.includes("ssl routines") || t.includes("tls"))
    return "Your current network is intercepting/blocking MongoDB connections (common on campus or office WiFi). Try a phone hotspot — production hosts like Render/Railway are unaffected.";
  if (t.includes("timed out") || t.includes("server selection") || t.includes("etimeout"))
    return "Could not reach Atlas at all — port 27017/443 is blocked on this network. Try a phone hotspot; production hosts are unaffected.";
  if (t.includes("enotfound") || t.includes("dns"))
    return "Cluster hostname not found — check the URI spelling, or the cluster was paused/deleted.";
  if (t.includes("whitelist") || t.includes("not authorized") || t.includes("ip") && t.includes("not"))
    return "Your IP is not in Atlas Network Access. Add 0.0.0.0/0 in Atlas → Network Access.";
  return errText.trim().slice(0, 240);
}

if (cmd === "status") {
  const lines = envLines();
  const on = enabled(lines);
  console.log(`[atlas] .env : ${on ? "Atlas ENABLED" : "Atlas commented out (SQLite active)"}`);
  console.log(`[atlas] line : ${(uriLine(lines) || "(no MONGODB_URI line found)").trim().slice(0, 100)}...`);
  try {
    const h = await fetch("http://localhost:3001/api/health").then((r) => r.json());
    console.log(`[atlas] live : storage=${h.storage}  ai=${h.provider?.provider || "none"}`);
  } catch {
    console.log("[atlas] live : API not running");
  }
  process.exit(0);
}

if (cmd === "off") {
  const lines = envLines().map((l) => (l.startsWith(ENABLED) ? DISABLED + l.slice(ENABLED.length) : l));
  saveEnv(lines);
  console.log("[atlas] disabled — switching back to SQLite");
  killApi();
  startApi();
  const h = await probeApi();
  console.log(h ? `[atlas] OK — storage=${h.storage}` : "[atlas] API did not come up; check .freebuff/api.err.log");
  process.exit(0);
}

if (cmd === "on") {
  let lines = envLines();
  const line = uriLine(lines);
  if (!line) {
    console.log('[atlas] no MONGODB_URI found in .env — add one first, e.g.\n  # MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/?appName=Cluster0');
    process.exit(1);
  }
  // enable
  lines = lines.map((l) => (l.startsWith(DISABLED) ? ENABLED + l.slice(DISABLED.length) : l));
  saveEnv(lines);
  console.log("[atlas] enabled in .env — restarting API to test the connection…");

  killApi();
  const errBefore = fs.existsSync(path.join(root, ".freebuff", "api.err.log"))
    ? fs.readFileSync(path.join(root, ".freebuff", "api.err.log"), "utf8").length : 0;
  startApi();
  const h = await probeApi();

  if (h && h.storage === "mongodb-atlas") {
    console.log("[atlas] ✅ CONNECTED — the site is now storing data in MongoDB Atlas.");
    console.log(`[atlas]    health: storage=${h.storage}`);
    process.exit(0);
  }

  // failed: capture the reason, revert, restart
  let errText = "";
  try {
    const errLog = fs.readFileSync(path.join(root, ".freebuff", "api.err.log"), "utf8");
    errText = errLog.slice(errBefore);
  } catch {}
  console.log("[atlas] ❌ Atlas connection FAILED:");
  console.log("[atlas]    → " + translate(errText || "API did not come up"));
  lines = lines.map((l) => (l.startsWith(ENABLED) ? DISABLED + l.slice(ENABLED.length) : l));
  saveEnv(lines);
  console.log("[atlas] reverted .env to SQLite — restarting API so your site keeps working");
  killApi();
  startApi();
  const h2 = await probeApi();
  console.log(h2 ? `[atlas] SQLite is back (storage=${h2.storage}) — nothing lost` : "[atlas] API did not come back; run: npm run dev:server");
  process.exit(2);
}

console.log("Usage: node scripts/atlas.mjs <on|off|status>");
process.exit(1);
