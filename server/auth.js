import crypto from "crypto";
import bcrypt from "bcryptjs";
import { q } from "./db.js";

const SESSION_DAYS = 30;
const COOKIE_NAME = "skilling_session";

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function verifyPassword(plain, hash) {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

function expiryDate() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

export function sessionMiddleware(req, _res, next) {
  q.sessions.purgeExpired();
  const cookie = req.headers.cookie || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  req.user = null;
  if (match) {
    const session = q.sessions.get(match[1]);
    if (session) {
      req.user = { id: session.user_id, email: session.email, name: session.name };
    }
  }
  next();
}

export function authRoutes(app) {
  /* Register */
  app.post("/api/auth/register", (req, res) => {
    const { email, password, name, targetRole } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "A valid email is required." });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Your name is required." });
    }
    if (q.users.byEmail(email)) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const { userId, profile } = q.users.register(
      String(email).toLowerCase().trim(),
      String(name).trim(),
      hashPassword(String(password)),
      targetRole
    );

    const token = newToken();
    q.sessions.create(userId, token, expiryDate());
    setSessionCookie(res, token);

    res.status(201).json({
      user: { id: userId, email: String(email).toLowerCase().trim(), name: String(name).trim() },
      profile: { readiness: profile.readiness, targetRole: profile.target_role },
    });
  });

  /* Login */
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const user = q.users.byEmail(email);
    if (!user || !verifyPassword(String(password), user.password_hash)) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    const token = newToken();
    q.sessions.create(user.id, token, expiryDate());
    setSessionCookie(res, token);

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  });

  /* Logout */
  app.post("/api/auth/logout", (req, res) => {
    const cookie = req.headers.cookie || "";
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
    if (match) q.sessions.delete(match[1]);
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  /* Current user */
  app.get("/api/auth/me", (req, res) => {
    if (!req.user) return res.json({ user: null });
    res.json({ user: req.user });
  });
}
