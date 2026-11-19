# Marking a paper sheet

The girls (Andrila and Alvina, 4th grade) now work on paper. For each block
they photograph their pages and press Submit; `paper-export.yml` files them as

    archive/<YYYY-MM>/<date>/paper-<Kid>-<block>/
        page-1.jpg, page-2.jpg, ...
        sheet.json   { kid, date, block, pages, submitted,
                       sheet: [ { sec, n, q, want } ] }

`sheet` is the answer key for exactly what her screen showed: each question
with its section heading (`sec`) and its number in that section (`n`).
`want` is the right answer; `""` means a written answer with no single right
answer (writing, vocabulary sentences, the reading open question).

## What to do

1. Find every `paper-*` folder whose `marks.json` is missing, or whose
   `marks.json` has a `submitted` different from `sheet.json`'s (she
   resubmitted). Do all of them, oldest first.
2. Look at every page image. She was asked to write the date, the block
   name, each section heading, and the question number beside each answer.
   Match each answer to its question by heading + number. If she numbered
   oddly or skipped headings, use the order and the working to decide - and
   say so in `notes`.
3. For each question in `sheet`, in the same order, decide:
   - `gave`: what she wrote as her final answer, copied exactly (her
     spelling, her fraction, "19 R1", "don't know", a letter like "c").
   - `ok`: `true` if right, `false` if wrong or "don't know" or missing,
     `null` only if it is on the page but you genuinely cannot read it
     (then `gave` says where, e.g. "page 2, line 5"). Never guess.
   - Maths equivalence: `17/6` = `2 5/6`, `19 r 1` = `19 R1`. But if the
     question says *simplify* or *simplest form*, an unsimplified answer is
     wrong; `= ?/8` needs eighths. A remainder answer must have both parts.
   - Choice questions: right if she gave the right letter or wrote the
     right option out.
   - Spelling: `want` is the word; compare letter by letter, ignore capitals.
   - For `want: ""` items: `ok: true` if she wrote a real attempt, `false`
     if missing; copy the first sentence or so into `gave`.
   - `note` (optional, short): what her working shows about a wrong one,
     e.g. "subtracted right, did not simplify".
4. Write `notes`: 3-5 sentences **for her father**, like a tutor: what she
   did well (specific), the one or two patterns in her mistakes, what her
   working shows about her approach, and one thing to go over tonight.
5. Write `marks.json` in the same folder:

```json
{ "submitted": "<copied from sheet.json>",
  "marks": [ { "sec": "Division", "n": 1, "q": "77 ÷ 4", "want": "19 R1",
               "gave": "19 R1", "ok": true, "note": "" } ],
  "notes": "..." }
```

   One entry per `sheet` item, same order. Check it parses:
   `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" <file>`
6. Only add or change `marks.json` (and `school.json`, below) files. Commit as `Marks <date> <Kid> <block>`
   and push to `main`. Pushing is what sends the marks to the parent page.

## School pages (`paper-<Kid>-school/`)

These are photos of her **school** work or homework for that date - not
our sheets, so `sheet` is empty and there is nothing to mark against.
Instead, look at every page and write `school.json` in the same folder:

```json
{ "submitted": "<copied from sheet.json>",
  "summary":  "3-5 sentences for her father: what the work was (subject, topic, worksheet or test), how she did - right and wrong where you can tell, the teacher's marks if any - and what her working shows about her approach.",
  "topics":   ["short topic names, e.g. 'adding fractions with unlike denominators'"],
  "progress": "1-2 sentences comparing with her earlier school.json files and our marks.json in archive/ from the last two weeks: what is improving, what keeps coming back.",
  "practice": [ { "q": "a question in the app's plain style", "want": "the exact answer" } ] }
```

- `practice`: 4-8 questions aimed squarely at what she found hard (or
  the next step after what she did well), at the same level. Plain text
  as in our sheets (`3 1/4 + 2 2/4`, `567 ÷ 7`, a grammar question with the
  choices written in). `want` must be exactly right - work each one out
  twice. These appear in her Recap the next day, on paper, and are
  marked like everything else.
- Don't invent what you cannot read; say so in `summary`.
- Do the same "missing or different `submitted`" check as for marks.

If there is nothing to mark, change nothing and commit nothing.
