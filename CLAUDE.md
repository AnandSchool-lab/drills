# Daily Drills — notes for whoever works on this next

A daily practice app for Andrila and Alvina, twin 4th-graders. Their father
Anand runs it. README.md is written for him; this file is for the agent.

**What it is actually for.** Not scores. He has said it many times: he wants to
see *how they approach a problem* — their working, where they got stuck, what
they tried. Every design argument resolves against that. A feature that shows a
number but hides the method is the wrong feature.

## The three places it lives

| Part | Where | Deployed by |
|---|---|---|
| Kids' app + parent page | GitHub Pages, `anandschool-lab/drills` | push to `main` |
| API | Cloudflare Worker `drills-api` | Workers Builds, on push |
| Data | Cloudflare D1 database `drills` (binding `DB`) | **by hand — see below** |

- Kids: `https://anandschool-lab.github.io/drills/`
- Parent: `https://anandschool-lab.github.io/drills/parent/`
- API: `https://drills-api.anandm401-amazon.workers.dev`

`PARENT_KEY` exists in **two** places and must match: a Cloudflare Worker secret
(so the Worker can check the passphrase) and a GitHub Actions repository secret
(so the nightly jobs can authenticate). Never put it in a file, a commit, or a
chat message.

## Rules that were learned expensively

**Adding a table to `schema.sql` is half the job.** `CREATE TABLE IF NOT EXISTS`
does nothing to a database that already exists. The `stuck` and `review` tables
sat in the schema for days without existing in D1; `/live` read `stuck` on every
load, so the entire parent dashboard returned 500 and the only clue was "Could
not reach the server." Run new DDL against the live database in the same
sitting, and record it in the MIGRATIONS header at the top of `schema.sql`.

**One failing query must not sink a whole response.** Worker reads go through
`safeAll()`, which catches per-query, returns an empty list and appends the
reason to `notes`. The parent page prints `notes` in an amber strip. Keep that
property when adding queries.

**Test against their real data, not your fixtures.** Two genuine bugs were
invisible until the first nightly archive was read: a time question that
demanded "minutes past 2:15" after asking "what time does it end?" (Andrila
answered `6:00 pm`, was correct, and was marked wrong), and a missed remainder
logged with the question text `remainder`. Fresh-fixture tests passed both.
`archive/<month>/<day>/` holds real days — read them.

**Bumping the version is a three-line ritual.** `APP_VERSION` in `app.js`,
`CACHE` in `sw.js`, and the file list in `app.js` (~line 2116) that the Update
button fetches. Currently 26 / `drills-v26`. A new file that is not in that list
never reaches the iPads — `ink.js` was missing once and the handwriting fixes
silently did not ship.

**`node verify.js` must pass before every push.** It regenerates every problem
for every level across many days and checks each answer independently. Expect
`{"mul":2880,"div":2880,"frac":1440,"dec":1800,"think":1920}` and `ALL PASS`.
It lives outside the repo in the working sandbox; port it in if it is missing.

**`git fetch origin` and confirm `0 0` before pushing.** Nightly jobs commit to
this repo, so a stale clone is normal.

## Gotchas in the code

- **Pointer events.** Use `e.offsetX/offsetY`, never `getBoundingClientRect()`
  per point — that was a 17× slowdown and made ink land away from the nib.
  `getCoalescedEvents()` can return an **empty array**, which is truthy; guard
  with `(co && co.length)` or only the first point of each stroke survives.
- **`display:grid` beats the UA `[hidden]{display:none}`.** Cost a day: the
  writing pad showed 4 lines instead of 21. Hence `.pad [hidden]{display:none!important}`.
- **Dates are local, never `toISOString()`.** UTC rolls over at 4pm Pacific and
  the dashboard went blank every afternoon.
- **iPadOS Scribble silently repairs spelling** in text inputs, which destroys
  the thing the spelling test measures. Spelling answers are canvases for that
  reason. Do not turn them back into inputs.
- **`.sheetbody > div { flex:1 }`** is for the writing pad, which wants one
  stretched child. It is scoped away from `.soln`; unscoping it spreads four
  solution steps over the whole screen.

## Layout decisions he has pushed back on — do not undo

- Every problem gets both buttons (*Show your working*, *I don't know how*).
  An earlier version gave them only to problems judged hard enough; it read as
  broken, and a child stuck on `7 × 4` had no way to say so.
- Maths sections are **two problems to a row**. One per row wasted the iPad's
  width and made the sheet feel endless.
- The parent dashboard shows **the whole sheet**, not just mistakes, with
  headed columns (QUESTION / SHE WROTE / ANSWER), one line per problem, and her
  handwriting opening under the row it belongs to. It was rebuilt three times
  because it kept showing unlabelled numbers.
- No "saved… saving… saved" chatter. Silent unless something fails.
- Few confirmation steps. "Clear everything" arms for 10s; smaller clears are
  one tap.

## Open

- Nightly review: a cloud Claude routine runs `REVIEW.md` at 11:00 pm Pacific
  (first review written for 2026-11-05). The kids' feedback panel does not
  show the `math` field yet — only the parent page does.
- Deferred by him: worked examples at the start of each section; weekly and
  monthly tests; topic trends on the dashboard; push notifications.
- Offered, never answered: an instant hint alongside *I don't know how*, to
  cover the gap when a child is stuck at 4:15 and he is in a meeting.

## How he wants to be worked with

- **Ask first whether he wants clarifying questions and a short spec before any
  code.** If yes, write the spec and wait for approval. If no, give the code.
- **Ask permission before deleting anything, and wait.**
- Concise and practical. Tables and visuals over prose.
- His work machine is his "office laptop" (Windows).
- Show him a clickable preview before pushing to the iPads where that is
  possible — he reviews on his own screen, not theirs.
