/* ============================================================
   Daily Drills - the API.

   Replaces the Apps Script bridge. The difference that matters is
   not speed: it is that this one answers. The old bridge was posted
   to blind, so a failed save looked exactly like a successful one.
   Everything here returns a real status and real CORS headers, so
   the app can tell the child when something did not save.

   Routes
     POST /ping     progress while they work      (open)
     POST /result   a finished block              (open)
     POST /ink      one pad of working            (open)
     POST /writing  their writing, when typed     (open)
     GET  /retake   has a parent asked for a redo (open)
     GET  /live     the dashboard                 (needs the parent key)
     POST /retake   ask for a redo                (needs the parent key)
     GET  /health   is this thing on              (open)

   The write routes are open on purpose. Locking them would mean a
   secret inside a public web page, which is not a secret. They accept
   only known names and bounded payloads, so the worst a stranger with
   the URL can do is add noise - not read a child's work. Everything
   that reads data is behind the parent key.
   ============================================================ */

const KIDS = ["Andrila", "Alvina"];
const BLOCKS = ["recap", "math", "think", "eng", "weekly", "monthly"];

const ALLOWED_ORIGINS = [
  "https://anandschool-lab.github.io",
  "http://localhost:8099",
  "http://127.0.0.1:8099"
];

const MAX_BODY = 4 * 1024 * 1024;   // any request
const MAX_PAD  = 3 * 1024 * 1024;   // one pad: up to a few shrunk photos of their paper

/* ---------- small helpers ---------- */

function cors(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": ok,
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

function bad(msg, origin, status) {
  return json({ ok: false, error: msg }, status || 400, origin);
}

const now = () => new Date().toISOString();

/* A date we will put in a primary key should look like one. */
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isKid = (s) => KIDS.includes(s);
const isBlock = (s) => BLOCKS.includes(s);

function clampInt(v, lo, hi) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function clampText(v, max) {
  if (v === null || v === undefined) return null;
  return String(v).slice(0, max);
}

/* Errors the caller caused are tagged, so the entry point can answer 4xx.
   The app's offline queue retries 5xx and drops 4xx - a payload that is
   too big will never fit, and retrying it forever would block the queue. */
class BadRequest extends Error {
  constructor(msg, status) { super(msg); this.status = status || 400; }
}

async function readJson(request) {
  const len = parseInt(request.headers.get("content-length") || "0", 10);
  if (len > MAX_BODY) throw new BadRequest("too big", 413);
  const text = await request.text();
  if (text.length > MAX_BODY) throw new BadRequest("too big", 413);
  try { return JSON.parse(text); }
  catch { throw new BadRequest("not json", 400); }
}

/* Constant-time-ish compare, so a wrong key cannot be found by timing.
   Overkill for a family dashboard, but it costs four lines. */
function keyOk(given, expected) {
  if (!expected) return false;
  const a = String(given || ""), b = String(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------- routes ---------- */

async function postPing(body, env) {
  if (!isKid(body.kid) || !isBlock(body.block) || !isDate(body.date)) return "bad fields";
  const total = clampInt(body.total, 0, 500);
  await env.DB.prepare(
    `INSERT INTO live (kid, block, date, answered, total, mins, stuck, seen_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
     ON CONFLICT (kid, block) DO UPDATE SET
       date = ?3, answered = ?4, total = ?5, mins = ?6, stuck = ?7, seen_at = ?8`
  ).bind(
    body.kid, body.block, body.date,
    clampInt(body.answered, 0, total || 500), total,
    clampInt(body.mins, 0, 600),
    clampText(JSON.stringify(body.stuck || []), 4000),
    now()
  ).run();
  return null;
}

async function postResult(body, env) {
  if (!isKid(body.kid) || !isBlock(body.block) || !isDate(body.date)) return "bad fields";
  const total = clampInt(body.total, 0, 500);
  const statements = [
    env.DB.prepare(
      `INSERT INTO results (kid, date, block, got, total, secs, at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT (kid, date, block) DO UPDATE SET
         got = ?4, total = ?5, secs = ?6, at = ?7`
    ).bind(body.kid, body.date, body.block,
           clampInt(body.got, 0, total || 500), total,
           clampInt(body.secs, 0, 86400), now()),
    /* a resubmission replaces the old misses rather than piling up */
    env.DB.prepare(`DELETE FROM misses WHERE kid = ?1 AND date = ?2 AND block = ?3`)
      .bind(body.kid, body.date, body.block)
  ];

  const misses = Array.isArray(body.misses) ? body.misses.slice(0, 60) : [];
  for (const m of misses) {
    if (!m || !m.q) continue;
    statements.push(
      env.DB.prepare(
        `INSERT INTO misses (kid, date, block, q, gave, want, kind)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
      ).bind(body.kid, body.date, body.block,
             clampText(m.q, 400), clampText(m.gave, 200),
             clampText(m.want, 200), m.kind === "word" ? "word" : "num")
    );
  }

  /* One batch: the result and its misses land together or not at all. */
  await env.DB.batch(statements);

  /* A finished block is no longer in progress. */
  await env.DB.prepare(`DELETE FROM live WHERE kid = ?1 AND block = ?2`)
    .bind(body.kid, body.block).run();
  return null;
}

async function postInk(body, env) {
  if (!isKid(body.kid) || !isBlock(body.block) || !isDate(body.date)) return "bad fields";
  const pad = clampText(body.pad, 40);
  if (!pad || !/^[A-Za-z0-9_-]+$/.test(pad)) return "bad pad";

  /* The strokes live in D1 rather than object storage. A page of working
     is a few KB and a year of it is about 40 MB, against D1's 5 GB - so
     object storage would be a second service solving a problem we do not
     have. If the ink ever outgrows this, only these few lines change:
     nothing else in the app knows where a pad is kept. */
  const payload = JSON.stringify(body.data || {});
  if (payload.length > MAX_PAD) return "too big";

  await env.DB.prepare(
    `INSERT INTO ink (kid, date, block, pad, data, bytes, mode, at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
     ON CONFLICT (kid, date, block, pad) DO UPDATE SET
       data = ?5, bytes = ?6, mode = ?7, at = ?8`
  ).bind(body.kid, body.date, body.block, pad, payload,
         payload.length, (body.data && body.data.mode) || "photo", now()
  ).run();
  return null;
}

async function postWriting(body, env) {
  if (!isKid(body.kid) || !isDate(body.date)) return "bad fields";
  await env.DB.prepare(
    `INSERT INTO writing (kid, date, prompt, text, at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT (kid, date) DO UPDATE SET prompt = ?3, text = ?4, at = ?5`
  ).bind(body.kid, body.date, clampText(body.prompt, 1000),
         clampText(body.text, 20000), now()).run();
  return null;
}

/* The app asks this on launch: has a parent cleared a day for me? */
async function getRetake(url, env) {
  const kid = url.searchParams.get("kid");
  if (!isKid(kid)) return { ok: false, error: "bad kid" };
  const rows = await env.DB.prepare(
    `SELECT date FROM retake WHERE kid = ?1 AND done = 0 ORDER BY date`
  ).bind(kid).all();
  return { ok: true, dates: (rows.results || []).map((r) => r.date) };
}

/* The app saying "I have cleared that day, you can stop asking". Open,
   because the app has no key and never can - it is a public web page.
   Safe to leave open: it only stops a prompt. The destructive half,
   wiping a day's results, is below and needs the parent key. */
async function postRetakeDone(body, env) {
  if (!isKid(body.kid) || !isDate(body.date)) return "bad fields";
  await env.DB.prepare(`UPDATE retake SET done = 1 WHERE kid = ?1 AND date = ?2`)
    .bind(body.kid, body.date).run();
  return null;
}

async function postRetake(body, env) {
  if (!isKid(body.kid) || !isDate(body.date)) return "bad fields";
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO retake (kid, date, asked, done) VALUES (?1, ?2, ?3, 0)
       ON CONFLICT (kid, date) DO UPDATE SET asked = ?3, done = 0`
    ).bind(body.kid, body.date, now()),
    env.DB.prepare(`DELETE FROM results WHERE kid = ?1 AND date = ?2`).bind(body.kid, body.date),
    env.DB.prepare(`DELETE FROM misses  WHERE kid = ?1 AND date = ?2`).bind(body.kid, body.date)
  ]);
  return null;
}

/* Everything the dashboard draws, in one request. */
async function getLive(url, env) {
  const date = isDate(url.searchParams.get("date") || "")
    ? url.searchParams.get("date")
    : new Date().toISOString().slice(0, 10);

  const [live, today, recentMisses, overdue, stuck] = await Promise.all([
    env.DB.prepare(`SELECT * FROM live ORDER BY kid, block`).all(),
    env.DB.prepare(`SELECT * FROM results WHERE date = ?1 ORDER BY kid, block`).bind(date).all(),
    env.DB.prepare(
      `SELECT kid, date, block, q, gave, want FROM misses
       WHERE date >= date(?1, '-7 day') ORDER BY date DESC LIMIT 120`
    ).bind(date).all(),
    env.DB.prepare(
      `SELECT kid, date, block, got, total FROM results
       WHERE block IN ('weekly','monthly') AND date >= date(?1, '-45 day')
       ORDER BY date DESC`
    ).bind(date).all(),
    env.DB.prepare(
      `SELECT kid, date, block, pad, q, asked,
              CASE WHEN solution IS NULL OR solution = '' THEN 0 ELSE 1 END AS answered
       FROM stuck WHERE date >= date(?1, '-14 day') ORDER BY asked DESC LIMIT 60`
    ).bind(date).all()
  ]);

  return {
    ok: true,
    date,
    serverTime: now(),
    live: live.results || [],
    today: today.results || [],
    misses: recentMisses.results || [],
    tests: overdue.results || [],
    stuck: stuck.results || []
  };
}

/* A child saying they do not know how to do one. Open, like the other
   things the app writes: the worst a stranger can do is add noise, and
   the alternative is a secret inside a public page. */
async function postStuck(body, env) {
  if (!isKid(body.kid) || !isBlock(body.block) || !isDate(body.date)) return "bad fields";
  const pad = clampText(body.pad, 40);
  if (!pad || !/^[A-Za-z0-9_-]+$/.test(pad)) return "bad pad";
  if (body.undo) {
    await env.DB.prepare(`DELETE FROM stuck WHERE kid=?1 AND date=?2 AND block=?3 AND pad=?4`)
      .bind(body.kid, body.date, body.block, pad).run();
    return null;
  }
  await env.DB.prepare(
    `INSERT INTO stuck (kid, date, block, pad, q, asked)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT (kid, date, block, pad) DO UPDATE SET q = ?5, asked = ?6`
  ).bind(body.kid, body.date, body.block, pad, clampText(body.q, 400), now()).run();
  return null;
}

/* What the app asks for on opening a sheet: which ones are flagged, and
   which of those have a worked solution waiting. */
async function getStuck(url, env) {
  const kid = url.searchParams.get("kid"), date = url.searchParams.get("date");
  if (!isKid(kid) || !isDate(date)) return { ok: false, error: "bad fields" };
  const rows = await env.DB.prepare(
    `SELECT block, pad, q, solution FROM stuck WHERE kid = ?1 AND date = ?2`
  ).bind(kid, date).all();
  return { ok: true, stuck: rows.results || [] };
}

/* The worked solution, written by a parent. Needs the key - a child
   cannot hand themselves the answer. */
async function postSolution(body, env) {
  if (!isKid(body.kid) || !isBlock(body.block) || !isDate(body.date)) return "bad fields";
  const pad = clampText(body.pad, 40);
  if (!pad) return "bad pad";
  await env.DB.prepare(
    `UPDATE stuck SET solution = ?5, solved = ?6
     WHERE kid=?1 AND date=?2 AND block=?3 AND pad=?4`
  ).bind(body.kid, body.date, body.block, pad,
         clampText(body.solution, 24000), now()).run();
  return null;
}

/* The overnight review of a day's work. Written by the nightly job with
   the parent key; read openly, because the child's own feedback card has
   to fetch it and a public web page cannot keep a secret. What it holds
   is a first name and remarks on their own schoolwork. */
async function postReview(body, env) {
  if (!isKid(body.kid) || !isDate(body.date)) return "bad fields";
  const j = (v) => (v == null ? null : clampText(JSON.stringify(v), 20000));
  await env.DB.prepare(
    `INSERT INTO review (kid, date, praise, spelling, essay, math, focus, at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
     ON CONFLICT (kid, date) DO UPDATE SET
       praise = ?3, spelling = ?4, essay = ?5, math = ?6, focus = ?7, at = ?8`
  ).bind(body.kid, body.date, clampText(body.praise, 600),
         j(body.spelling), j(body.essay), j(body.math), j(body.focus), now()).run();
  return null;
}

async function getReview(url, env) {
  const kid = url.searchParams.get("kid");
  if (!isKid(kid)) return { ok: false, error: "bad kid" };
  const date = url.searchParams.get("date");
  const row = isDate(date)
    ? await env.DB.prepare(`SELECT * FROM review WHERE kid = ?1 AND date = ?2`).bind(kid, date).first()
    : await env.DB.prepare(`SELECT * FROM review WHERE kid = ?1 ORDER BY date DESC LIMIT 1`).bind(kid).first();
  if (!row) return { ok: true, review: null };
  const p = (v) => { try { return v ? JSON.parse(v) : null; } catch { return null; } };
  return { ok: true, review: {
    kid: row.kid, date: row.date, praise: row.praise,
    spelling: p(row.spelling), essay: p(row.essay), math: p(row.math), focus: p(row.focus)
  } };
}

/* One day's pencil work, so the dashboard can replay it stroke by stroke.
   Behind the parent key: this is the child's actual work. */
async function getInk(url, env) {
  const kid = url.searchParams.get("kid");
  const date = url.searchParams.get("date");
  if (!isKid(kid) || !isDate(date)) return { ok: false, error: "bad fields" };
  const rows = await env.DB.prepare(
    `SELECT block, pad, data, mode, bytes, at FROM ink
     WHERE kid = ?1 AND date = ?2 ORDER BY block, pad`
  ).bind(kid, date).all();
  return { ok: true, kid, date, pads: rows.results || [] };
}

/* ---------- the entry point ---------- */

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (path === "/health") {
      return json({ ok: true, time: now(), kids: KIDS }, 200, origin);
    }

    try {
      /* --- reads that need the parent key --- */
      if (path === "/live" && request.method === "GET") {
        if (!keyOk(url.searchParams.get("key"), env.PARENT_KEY)) {
          return bad("wrong key", origin, 401);
        }
        return json(await getLive(url, env), 200, origin);
      }

      if (path === "/ink" && request.method === "GET") {
        if (!keyOk(url.searchParams.get("key"), env.PARENT_KEY)) {
          return bad("wrong key", origin, 401);
        }
        return json(await getInk(url, env), 200, origin);
      }

      if (path === "/retake" && request.method === "POST") {
        const body = await readJson(request);
        if (!keyOk(body.key, env.PARENT_KEY)) return bad("wrong key", origin, 401);
        const err = await postRetake(body, env);
        return err ? bad(err, origin) : json({ ok: true }, 200, origin);
      }

      if (path === "/solution" && request.method === "POST") {
        const body = await readJson(request);
        if (!keyOk(body.key, env.PARENT_KEY)) return bad("wrong key", origin, 401);
        const err = await postSolution(body, env);
        return err ? bad(err, origin) : json({ ok: true }, 200, origin);
      }

      if (path === "/review" && request.method === "POST") {
        const body = await readJson(request);
        if (!keyOk(body.key, env.PARENT_KEY)) return bad("wrong key", origin, 401);
        const err = await postReview(body, env);
        return err ? bad(err, origin) : json({ ok: true }, 200, origin);
      }

      /* --- the app's own calls --- */
      if (path === "/retake" && request.method === "GET") {
        return json(await getRetake(url, env), 200, origin);
      }

      if (path === "/review" && request.method === "GET") {
        return json(await getReview(url, env), 200, origin);
      }

      if (path === "/stuck" && request.method === "GET") {
        return json(await getStuck(url, env), 200, origin);
      }

      if (request.method === "POST") {
        const body = await readJson(request);
        let err = null;
        if (path === "/ping")              err = await postPing(body, env);
        else if (path === "/result")       err = await postResult(body, env);
        else if (path === "/ink")          err = await postInk(body, env);
        else if (path === "/writing")      err = await postWriting(body, env);
        else if (path === "/retake-done")  err = await postRetakeDone(body, env);
        else if (path === "/stuck")        err = await postStuck(body, env);
        else return bad("no such route", origin, 404);
        return err ? bad(err, origin) : json({ ok: true }, 200, origin);
      }

      return bad("no such route", origin, 404);

    } catch (e) {
      /* A 4xx means the request itself was wrong - the app drops it.
         A 5xx means our end faltered - the app keeps the work queued
         locally and tries again, so it is never silently lost. */
      const status = e instanceof BadRequest ? e.status : 500;
      return json({ ok: false, error: String((e && e.message) || e) }, status, origin);
    }
  }
};
