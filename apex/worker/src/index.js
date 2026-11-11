/* ============================================================
   APEX Expert Drills - sync API (Worker "apex-api").

   Anand's own study app. Completely separate from the girls' Daily
   Drills: its own Worker, its own D1 database ("apex"), its own
   passphrase (secret APEX_KEY). Nothing here reads or writes theirs.

   Routes
     GET  /health   is this thing on                      (open)
     POST /read     every saved answer, day and quiz pick  (needs APEX_KEY)
     POST /save     save a batch of them                   (needs APEX_KEY)

   Saving rules
     - The newer copy (by the page's own timestamp) always wins.
     - Every accepted save is also appended to apex_history, so an edit
       never erases the version before it.
   ============================================================ */

const ALLOWED_ORIGINS = [
  "https://anandschool-lab.github.io",
  "http://localhost:8099",
  "http://127.0.0.1:8099"
];
const KINDS = ["answers", "days", "quiz"];
const MAX_BODY = 2 * 1024 * 1024;
const MAX_DOC = 64 * 1024;
const MAX_DOCS = 300;

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json;charset=utf-8", ...cors(origin) }
  });
}

const bad = (msg, origin, status) => json({ ok: false, error: msg }, status || 400, origin);

class BadRequest extends Error {
  constructor(msg, status) { super(msg); this.status = status || 400; }
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) throw new BadRequest("too big", 413);
  try { return JSON.parse(text); } catch { throw new BadRequest("not json"); }
}

/* Constant-time compare, so a wrong key cannot be found by timing. */
function keyOk(given, expected) {
  if (!expected) return false;
  const a = String(given || ""), b = String(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* schema.sql is the record; this makes sure a forgotten run can't break saving. */
let ready = false;
async function ensureTables(env) {
  if (ready) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS apex_work (
      kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
      at INTEGER NOT NULL, saved TEXT NOT NULL, PRIMARY KEY (kind, id))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS apex_history (
      n INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, id TEXT NOT NULL,
      data TEXT NOT NULL, at INTEGER NOT NULL, saved TEXT NOT NULL)`)
  ]);
  ready = true;
}

async function read(env) {
  await ensureTables(env);
  const rows = await env.DB.prepare(`SELECT kind, id, data FROM apex_work`).all();
  const out = { answers: {}, days: {}, quiz: {} };
  for (const r of rows.results || []) {
    if (!out[r.kind]) continue;
    try { out[r.kind][r.id] = JSON.parse(r.data); } catch { /* skip one bad row, keep the rest */ }
  }
  return { ok: true, ...out };
}

async function save(body, env) {
  const docs = Array.isArray(body.docs) ? body.docs : null;
  if (!docs || !docs.length || docs.length > MAX_DOCS) return `docs must be 1-${MAX_DOCS} items`;
  const t = new Date().toISOString();
  const stmts = [];
  for (const d of docs) {
    if (!d || !KINDS.includes(d.kind)) return "bad kind";
    if (typeof d.id !== "string" || !/^[a-z0-9-]{1,60}$/.test(d.id)) return "bad id";
    const at = Number(d.data && d.data.at);
    if (!Number.isFinite(at) || at <= 0) return "data.at missing";
    const data = JSON.stringify(d.data);
    if (data.length > MAX_DOC) return "doc too big";
    stmts.push(env.DB.prepare(
      `INSERT INTO apex_work (kind, id, data, at, saved) VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT (kind, id) DO UPDATE SET data = excluded.data, at = excluded.at, saved = excluded.saved
       WHERE excluded.at >= apex_work.at`
    ).bind(d.kind, d.id, data, at, t));
    stmts.push(env.DB.prepare(
      `INSERT INTO apex_history (kind, id, data, at, saved) VALUES (?1, ?2, ?3, ?4, ?5)`
    ).bind(d.kind, d.id, data, at, t));
  }
  await ensureTables(env);
  await env.DB.batch(stmts);
  return null;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (path === "/health") return json({ ok: true, app: "apex", time: new Date().toISOString() }, 200, origin);

    try {
      if (request.method === "POST" && (path === "/read" || path === "/save")) {
        const body = await readJson(request);
        if (!keyOk(body.key, env.APEX_KEY)) return bad("wrong key", origin, 401);
        if (path === "/read") return json(await read(env), 200, origin);
        const err = await save(body, env);
        return err ? bad(err, origin) : json({ ok: true }, 200, origin);
      }
      return bad("no such route", origin, 404);
    } catch (e) {
      const status = e instanceof BadRequest ? e.status : 500;
      return json({ ok: false, error: String((e && e.message) || e) }, status, origin);
    }
  }
};
