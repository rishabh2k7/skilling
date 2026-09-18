/* Storage selector — one import point for the whole app.
   - MONGODB_URI set  → MongoDB Atlas (server/storage/mongo.js)
   - otherwise        → local SQLite file (server/storage/sqlite.js)
   All methods are async in both drivers, so the rest of the code
   never needs to know which one is active. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotEnv() {
  // dotenv is normally loaded by server/index.js ("import dotenv/config") before
  // this module runs; this is just a belt-and-braces fallback for direct usage.
  const envPath = path.join(__dirname, "..", "..", ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env) && !m[2].startsWith("#")) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
      }
    }
  }
}
loadDotEnv();

let qPromise = null;

export function getQ() {
  if (!qPromise) {
    if (process.env.MONGODB_URI) {
      console.log("[db] storage driver: MongoDB Atlas");
      qPromise = import("./mongo.js").then((m) => m.init());
    } else {
      console.log("[db] storage driver: SQLite (local file)");
      qPromise = import("./sqlite.js").then((m) => m.q);
    }
  }
  return qPromise;
}

export async function qReady() {
  return getQ();
}

export default { getQ, qReady };
