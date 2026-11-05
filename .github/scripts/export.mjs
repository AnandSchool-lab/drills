/* Pull one day out of the Worker and write it into archive/.
 *
 * The shape on disk is deliberately boring:
 *
 *   archive/2026-11/2026-11-05/day.json
 *   archive/2026-11/2026-11-05/Alvina/math-m2-1-1.jpg
 *   archive/2026-11/2026-11-05/Alvina/working.md
 *
 * Plain JSON and plain JPEGs in dated folders. Openable in twenty years
 * with no database, no account and no app - which is the whole reason
 * this exists rather than leaving everything in Cloudflare.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const API = process.env.API;
const KEY = process.env.PARENT_KEY;
if (!API || !KEY) {
  console.error("API and PARENT_KEY must both be set.");
  process.exit(1);
}

const wanted = (process.env.WANTED || "").trim();
const day = /^\d{4}-\d{2}-\d{2}$/.test(wanted)
  ? wanted
  : new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const KIDS = ["Andrila", "Alvina"];
const root = path.join("archive", day.slice(0, 7), day);

async function get(route) {
  const res = await fetch(API + route);
  if (!res.ok) throw new Error(`${route} -> ${res.status}`);
  return res.json();
}

/* Keep a filename safe without inventing one: a pad id is already
   constrained to letters, digits, dash and underscore by the Worker. */
const safe = (s) => String(s).replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 60);

function dataUrlToBuffer(src) {
  const comma = src.indexOf(",");
  if (comma < 0 || !/^data:image\//.test(src)) return null;
  return Buffer.from(src.slice(comma + 1), "base64");
}

const summary = { date: day, pulledAt: new Date().toISOString(), kids: {} };
let wrote = 0;

/* scores, wrong answers and the week's context, in one call */
const live = await get(`/live?key=${encodeURIComponent(KEY)}&date=${day}`);
summary.results = (live.today || []).filter((r) => r.date === day);
summary.misses = (live.misses || []).filter((m) => m.date === day);

for (const kid of KIDS) {
  const ink = await get(
    `/ink?key=${encodeURIComponent(KEY)}&kid=${encodeURIComponent(kid)}&date=${day}`
  );
  const pads = ink.pads || [];
  if (!pads.length) continue;

  const dir = path.join(root, kid);
  await mkdir(dir, { recursive: true });

  const notes = [`# ${kid} — ${day}`, ""];
  let shots = 0;

  for (const pad of pads) {
    let data = {};
    try { data = JSON.parse(pad.data || "{}"); } catch { /* keep going */ }

    notes.push(`## ${pad.block} · ${pad.pad}`);

    const imgs = data.imgs || [];
    for (let i = 0; i < imgs.length; i++) {
      const buf = dataUrlToBuffer(imgs[i]);
      if (!buf) continue;
      const name = `${safe(pad.block)}-${safe(pad.pad)}-${i + 1}.jpg`;
      await writeFile(path.join(dir, name), buf);
      notes.push(`![page ${i + 1}](./${name})`);
      shots++; wrote++;
    }

    /* older pads were drawn on screen; keep the strokes rather than lose them */
    if (!imgs.length && Array.isArray(data.s) && data.s.length) {
      const name = `${safe(pad.block)}-${safe(pad.pad)}-strokes.json`;
      await writeFile(path.join(dir, name), JSON.stringify(data));
      notes.push(`_${data.s.length} pen strokes — see ${name}_`);
      wrote++;
    }

    if (data.text && data.text.trim()) {
      notes.push("", "```", data.text.trim(), "```");
    }
    notes.push("");
  }

  await writeFile(path.join(dir, "working.md"), notes.join("\n"));
  summary.kids[kid] = { pads: pads.length, photos: shots };
  console.log(`${kid}: ${pads.length} pads, ${shots} photos`);
}

if (!wrote && !summary.results.length) {
  console.log(`Nothing recorded for ${day}. Writing no files.`);
  process.exit(0);
}

await mkdir(root, { recursive: true });
await writeFile(path.join(root, "day.json"), JSON.stringify(summary, null, 2));

/* A running index, so the archive is browsable without clicking into
   every folder - and so it is obvious at a glance which days are empty. */
const indexPath = path.join("archive", "README.md");
const line = `| ${day} | ${summary.results.length} blocks | ${
  Object.entries(summary.kids).map(([k, v]) => `${k} ${v.photos}p`).join(", ") || "—"
} | [open](./${day.slice(0, 7)}/${day}/) |`;

let index = existsSync(indexPath)
  ? await readFile(indexPath, "utf8")
  : "# Archive\n\nEvery day they worked, oldest at the bottom.\n\n| Day | Finished | Photos | |\n|---|---|---|---|\n";
if (!index.includes(`| ${day} |`)) {
  index = index.replace(/(\|---\|---\|---\|---\|\n)/, `$1${line}\n`);
  await writeFile(indexPath, index);
}

console.log(`Archived ${day}: ${summary.results.length} results, ${wrote} files.`);
