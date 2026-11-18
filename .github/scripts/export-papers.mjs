/* File newly submitted paper sheets into archive/.
 *
 *   archive/<YYYY-MM>/<date>/paper-<Kid>-<block>/
 *       page-1.jpg, page-2.jpg ...   her photos, exactly as sent
 *       sheet.json                   { kid, date, block, pages, submitted, sheet:[{sec,n,q,want}] }
 *
 * MARKING.md tells the marking routine to mark every folder whose
 * marks.json is missing or older than its sheet.json.
 *
 * node export-papers.mjs        export, and list what was exported in $OUT
 * node export-papers.mjs --ack  tell the Worker those are filed
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const API = process.env.API, KEY = process.env.PARENT_KEY, OUT = process.env.OUT || "exported.json";
if (!API || !KEY) { console.error("API and PARENT_KEY must be set."); process.exit(1); }

if (process.argv.includes("--ack")) {
  let list = [];
  try { list = JSON.parse(await readFile(OUT, "utf8")); } catch { }
  for (const p of list) {
    const r = await fetch(API + "/paper-state", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: KEY, kid: p.kid, date: p.date, block: p.block, state: "exported" }) });
    console.log(`ack ${p.kid} ${p.date} ${p.block}: ${r.status}`);
  }
  process.exit(0);
}

const res = await fetch(`${API}/papers?state=new&key=${encodeURIComponent(KEY)}`);
if (!res.ok) { console.error("papers ->", res.status); process.exit(1); }
const { papers = [] } = await res.json();
const done = [];

for (const p of papers) {
  const ink = await fetch(`${API}/ink?key=${encodeURIComponent(KEY)}&kid=${encodeURIComponent(p.kid)}&date=${p.date}`);
  if (!ink.ok) { console.error(`${p.kid} ${p.date}: ink -> ${ink.status}`); continue; }
  const { pads = [] } = await ink.json();
  const dir = path.join("archive", p.date.slice(0, 7), p.date, `paper-${p.kid}-${p.block}`);
  await mkdir(dir, { recursive: true });
  let wrote = 0;
  for (const pad of pads) {
    const m = /^paper-(\d+)$/.exec(pad.pad || "");
    if (pad.block !== p.block || !m || +m[1] > p.pages) continue;
    let data = {}; try { data = JSON.parse(pad.data || "{}"); } catch { }
    const src = (data.imgs || [])[0] || "";
    const b64 = src.split(",")[1];
    if (!b64) continue;
    await writeFile(path.join(dir, `page-${m[1]}.jpg`), Buffer.from(b64, "base64"));
    wrote++;
  }
  if (!wrote) { console.error(`${p.kid} ${p.date} ${p.block}: no pages found yet`); continue; }
  await writeFile(path.join(dir, "sheet.json"), JSON.stringify({
    kid: p.kid, date: p.date, block: p.block, pages: p.pages, submitted: p.submitted, sheet: p.sheet || []
  }, null, 1));
  console.log(`filed ${dir} (${wrote} pages)`);
  done.push({ kid: p.kid, date: p.date, block: p.block });
}
await writeFile(OUT, JSON.stringify(done));
console.log(`${done.length} sheet(s) filed.`);
