# Overnight review — instructions for Claude

Run every night at 11:00 pm Pacific, after the 10:10 pm export has committed
the day into `archive/`. You read each girl's work and write a short note
that she sees on her home screen the next morning and that her father,
Anand, sees on the parent page. Read `CLAUDE.md` first for what this app is for.

**The point is her method, not her score.** Look at *how* she went about a
problem — her working, where it went wrong, what she was thinking — and say
something a teacher who actually looked would say.

## Steps

1. `git pull` so you have the latest archive.
2. Find the days to review: each folder `archive/<YYYY-MM>/<YYYY-MM-DD>/` from
   the **last 3 days** that has a `day.json` and is missing a
   `review-<Kid>.json` for a girl who did work that day. Usually that is just
   last night's folder. Never review a day older than 3 days.
3. For each girl (`Andrila`, `Alvina`) with at least one entry in that day's
   `results`:
   - Read `day.json`: `results` (blocks, scores, seconds) and `misses`
     (question, what she gave, the expected answer).
   - Read `<Kid>/working.md`: one heading per pad she used (`block · pad`),
     with any typed text inline.
   - Look at every pad. Photos of paper (`*.jpg`) you can open directly.
     Pen strokes (`*-strokes.json`) need rendering to a picture first:
     ```
     mkdir -p /tmp/ink
     node .github/scripts/render-ink.mjs <strokes.json> /tmp/ink/<name>.png
     ```
     Pad names: `write` is her essay, `sp0`, `sp1`… are spelling words,
     anything else in `math` / `think` is her working for one problem.
     Put the PNGs in `/tmp`, never in the repo. The archive does not store
     which question a working pad belongs to, so match it by what she wrote
     (her working for `6 9/12 − 3 1/12` will show those numbers) and by the
     `misses` list.
   - Write `review-<Kid>.json` into that day's folder (format below).
4. Check every file you wrote parses:
   `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" <file>`
5. Commit only the new files in `archive/`, with the message
   `Review <YYYY-MM-DD>`, then `git pull --rebase` and `git push` to `main`.
   The **Publish review** GitHub Action picks the files up and sends them to
   the app. You never need the parent key, so don't look for it.

If neither girl did any work, write nothing and commit nothing.

## The file

```json
{
  "praise":   "one honest, specific line about what went well",
  "spelling": [{ "word": "where", "wrote": "wear", "right": "where" }],
  "essay":    { "summary": "two or three sentences on her writing",
                "fixes":   [{ "was": "wear I live", "should": "where I live", "why": "short reason" }],
                "next":    "one thing to try today" },
  "math":     { "approach": "how she went about it, from her working",
                "note":     "the one idea to fix or keep doing" },
  "focus":    ["short topic names to practise next, e.g. mixed numbers to fractions"]
}
```

Every field is optional; leave out what you have nothing true to say about.
The app shows at most 8 spelling items and 5 essay fixes, so pick the ones
that matter most.

## How to write it

- **Speak to her.** "You…", warm, plain words a 9-year-old reads alone.
  Short sentences. No exclamation-mark gushing, no "Great job!" filler.
- **Praise only what is true and specific.** "You set out the subtraction
  in columns and kept the twelfths lined up" beats "Nice maths!". If
  nothing went well, say what she tried, not that it was good.
- **Find the cause, not the miss.** `6 9/12 − 3 1/12`, she wrote `69/12`:
  the mistake is turning `6 9/12` into twelfths (6 × 12 = 72, plus 9 = 81),
  not the subtraction. Say that.
- **Essay:** two or three things at most — spelling, a missing capital or
  full stop, a repeated sentence — and one idea for next time (a detail, a
  "because", a stronger ending). Quote her own words in `was`.
- **Spelling** comes only from what she actually handwrote. If you cannot
  read a word, leave it out rather than guess.
- Keep the whole note short enough to read in a minute.

## When the app was wrong, not her

The answer checker is strict, and sometimes marks a right answer wrong:
`$47` for `47`, `A is 19` for `19`, `6:00 pm` for a question that wanted
minutes. **Never tell her she got these wrong.** Leave them out of her note,
and list each one for Anand in `review-notes.md` in the same day folder:

```
- Andrila, recap: "A film starts at 2:15 pm…" — she wrote 6:00 pm, which is right; checker wanted 225.
```

Write `review-notes.md` only when there is something to put in it. It is for
Anand, not the girls; nothing publishes it. Don't change the app's code to
fix the checker yourself.

## Don't

- Don't edit anything outside `archive/`.
- Don't invent work she didn't do, or read handwriting you can't make out.
- Don't rewrite a review that already exists.
