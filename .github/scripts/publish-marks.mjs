/* Carry paper marking from archive/.../paper-<Kid>-<block>/marks.json up
 * to the Worker (POST /marks), which turns it into the ordinary results,
 * answers and misses rows the parent page and Recap already read.
 * Only the last 7 days, so a re-run does not resend history. */
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const API = process.env.API, KEY = process.env.PARENT_KEY;
if (!API || !KEY) { console.error("API and PARENT_KEY must be set."); process.exit(1); }
const root = "archive";
if (!existsSync(root)) process.exit(0);
const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
let sent = 0, failed = 0;

for (const month of (await readdir(root, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)) {
  for (const day of (await readdir(path.join(root, month), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)) {
    if (day < cutoff) continue;
    for (const dir of (await readdir(path.join(root, month, day), { withFileTypes: true }))
                        .filter((d) => d.isDirectory() && /^paper-.+-.+$/.test(d.name)).map((d) => d.name)) {
      const f = path.join(root, month, day, dir, "marks.json");
      if (!existsSync(f)) continue;
      let body;
      try { body = JSON.parse(await readFile(f, "utf8")); }
      catch (e) { console.error(`${f}: not valid JSON - ${e.message}`); failed++; continue; }
      const m = /^paper-([^-]+)-(.+)$/.exec(dir);
      const res = await fetch(API + "/marks", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, key: KEY, kid: m[1], date: day, block: m[2] }) });
      if (res.ok) { console.log(`sent ${dir} ${day}`); sent++; }
      else { console.error(`${dir} ${day} -> ${res.status} ${await res.text()}`); failed++; }
    }
  }
}
console.log(`${sent} sent, ${failed} failed.`);
if (failed) process.exit(1);
