/* Carry overnight reviews from this repository up to the Worker.
 *
 * A review file looks like archive/2026-11/2026-11-05/review-Alvina.json
 * and holds exactly what the child and the parent will read:
 *
 *   { "praise":  "one honest line about what went well",
 *     "spelling":[{ "word":"important","wrote":"importent","right":"important" }],
 *     "essay":   { "summary":"...", "fixes":[{ "was":"dosent","should":"doesn't","why":"..." }],
 *                  "next":"one thing to try today" },
 *     "math":    { "approach":"how she went about it", "note":"..." },
 *     "focus":   ["what tomorrow's Recap should lean on"],
 *     "tips":    [{ "q":"the question, exactly as missed", "note":"for Show me how" }] }
 *
 * Everything is optional. A day with nothing worth saying should have no
 * file at all rather than a file full of filler.
 */
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const API = process.env.API, KEY = process.env.PARENT_KEY;
if (!API || !KEY) { console.error("API and PARENT_KEY must be set."); process.exit(1); }

const root = "archive";
if (!existsSync(root)) { console.log("No archive yet."); process.exit(0); }

/* Only the last few days, so a re-run does not re-send a year of reviews. */
const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
let sent = 0, failed = 0;

for (const month of (await readdir(root, { withFileTypes: true }))
                      .filter((d) => d.isDirectory()).map((d) => d.name)) {
  for (const day of (await readdir(path.join(root, month), { withFileTypes: true }))
                      .filter((d) => d.isDirectory()).map((d) => d.name)) {
    if (day < cutoff) continue;
    for (const f of (await readdir(path.join(root, month, day)))
                      .filter((n) => /^review-.+\.json$/.test(n))) {
      const kid = f.replace(/^review-|\.json$/g, "");
      let body;
      try {
        body = JSON.parse(await readFile(path.join(root, month, day, f), "utf8"));
      } catch (e) {
        console.error(`${day}/${f}: not valid JSON — ${e.message}`);
        failed++; continue;
      }
      const res = await fetch(API + "/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, key: KEY, kid, date: day })
      });
      if (res.ok) { console.log(`sent ${kid} ${day}`); sent++; }
      else { console.error(`${kid} ${day} -> ${res.status} ${await res.text()}`); failed++; }
    }
  }
}

console.log(`${sent} sent, ${failed} failed.`);
if (failed) process.exit(1);
