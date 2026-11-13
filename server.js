import express from "express";
import helmet from "helmet";
import Database from "better-sqlite3";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const db = new Database(process.env.DB_PATH || "keys.sqlite");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN || ADMIN_TOKEN.length < 24) {
  throw new Error("Set ADMIN_TOKEN to a random secret of at least 24 characters.");
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "16kb" }));
app.use(express.static(path.join(__dirname, "public")));

db.exec(`
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  duration_days INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  activated_at INTEGER,
  expires_at INTEGER,
  device_id TEXT,
  revoked INTEGER NOT NULL DEFAULT 0
);
`);

const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const makeKey = () => {
  const raw = crypto.randomBytes(16).toString("hex").toUpperCase();
  return raw.match(/.{1,4}/g).join("-");
};
const adminOnly = (req, res, next) => {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: "Unauthorized" });
  next();
};

app.post("/api/admin/keys", adminOnly, (req, res) => {
  const days = Number(req.body.durationDays);
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    return res.status(400).json({ error: "durationDays must be an integer from 1 to 3650." });
  }
  const key = makeKey();
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO licenses (id,key_hash,duration_days,created_at)
              VALUES (?,?,?,?)`).run(id, hash(key), days, Date.now());
  // The plaintext key is returned only once; only its hash is stored.
  res.json({ id, key, durationDays: days, status: "unused" });
});

app.get("/api/admin/keys", adminOnly, (_req, res) => {
  const rows = db.prepare(`SELECT id,duration_days,created_at,activated_at,expires_at,device_id,revoked
                           FROM licenses ORDER BY created_at DESC LIMIT 500`).all();
  res.json(rows);
});

app.post("/api/admin/keys/:id/revoke", adminOnly, (req, res) => {
  const result = db.prepare("UPDATE licenses SET revoked=1 WHERE id=?").run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Key not found." });
  res.json({ success: true });
});

app.post("/api/verify", (req, res) => {
  const key = String(req.body.key || "").trim().toUpperCase();
  const deviceId = String(req.body.deviceId || "").trim();
  if (!key || deviceId.length < 8 || deviceId.length > 200) {
    return res.status(400).json({ valid: false, error: "Key and valid deviceId are required." });
  }

  const row = db.prepare("SELECT * FROM licenses WHERE key_hash=?").get(hash(key));
  if (!row || row.revoked) return res.status(200).json({ valid: false, error: "Invalid or revoked key." });

  const now = Date.now();
  if (!row.activated_at) {
    const expiresAt = now + row.duration_days * 24 * 60 * 60 * 1000;
    db.prepare("UPDATE licenses SET activated_at=?, expires_at=?, device_id=? WHERE id=?")
      .run(now, expiresAt, deviceId, row.id);
    return res.json({ valid: true, expiresAt });
  }

  if (row.device_id !== deviceId) {
    return res.status(200).json({ valid: false, error: "This key is already activated on another device." });
  }
  if (now >= row.expires_at) return res.status(200).json({ valid: false, error: "Key expired." });

  res.json({ valid: true, expiresAt: row.expires_at });
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Activation server listening on ${port}`));
