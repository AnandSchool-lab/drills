# Notes for Anand — 2026-11-16

First day either of them has recorded anything since the 12th. The scheduled
exports for the 13th, 14th and 15th all ran and all found nothing, so those
days are genuinely empty rather than lost.

Both girls have a file tonight. Everything in their notes comes from the pad
text, not from the scores — see below for why.

## Nobody wrote anything by hand, and there is no maths working at all

Every pad from both girls is `mode: "type"`. Eleven pads each: the ten spelling
words and the essay. **No `math-*` pad exists for either child.**

The strokes that did come through are not writing:

| Pad | Strokes | Points per stroke |
|---|---|---|
| Andrila `eng-sp7` | 8 | 1, 1, 1, 1, 1, 1, 1, 1 |
| Andrila `eng-sp6` | 5 | 1, 1, 1, 1, 1 |
| the other six pads | 1 | 1 |

A one-point stroke is a tap, not a stroke. There is no ink on any pad today, so
there was nothing to render and nothing to read about method. That is why
**neither note has a `math` field** — I have no evidence of how either of them
went about the maths, and a sentence about approach written from a score would
be invented.

Worth knowing: this is the opposite of the 12th, when Andrila produced two
numbered bar models on a maths pad. Whatever made her reach for the Pencil that
night did not happen tonight.

## The scores cannot carry any weight tonight

```
Alvina   recap 4/4 (77s)   math 42/42 (9s)   think 10/10 (6s)   eng 14/14 (7s)
Andrila  recap 4/4 (120s)  math 42/42 (4s)   think 10/10 (14s)  eng 14/14 (1102s)
```

`misses` is empty for both. Two different children at 100% on every block, with
42 maths problems answered in 4 and 9 seconds, is not a record of work.

`secs` is `elapsed()`, which is `timer.target − timer.secs` — seconds since the
block's timer *last started*. So a sheet that was filled in earlier, reopened
and then sent reports a few seconds honestly enough. Combined with the v28
refill (`GET /mywork` fills empty boxes from the newest draft), a resubmitted
sheet would look exactly like this: full marks, no misses, almost no time.

Alvina's four blocks all landed inside 58 seconds of each other
(23:09:53 → 23:10:51), which fits a queue flushing rather than four sheets
being worked. Andrila's `eng` at 1102 s and her two genuine spelling mistakes
are the only numbers tonight that behave like a child sitting and working.

I have not told either of them anything about a score, and I would not read
these as a result. **Worth asking them directly whether they did the maths
tonight at all** — the honest answer may be that only the English block
happened, and nothing in the data contradicts that.

One thing this does confirm: spelling is correctly outside the score. `eng` is
14/14 for Andrila *while* two of her ten words are misspelled, because the
spelling pads go up with `want: ""`. That is working as designed — it just
means the English score says nothing about the spelling test.

## Andrila's spelling — the two misses are both precise

Six targets are recorded in her pad data (`sp0` quiet, `sp1` minute,
`sp2` special, `sp6` imagine, `sp7` journey, `sp9` stomach). For the other four
I did not rely on elimination: replaying the app's own selection for the date
(`seedFor("eng")` = `mulberry(hash("2026-11-16|eng"))`, then
`shuffle(pick(atLevel(CONTENT.spelling, L)).words)`) reproduces the full slot
order, and it agrees with all six recorded `word` fields:

```
sp0 quiet   sp1 minute  sp2 special  sp3 writing  sp4 believe
sp5 island  sp6 imagine sp7 journey  sp8 usually  sp9 stomach
```

Same result at level 1 and level 2, so **no slot's target is uncertain** —
`sp8` is *usually*. Elimination gave the same answer, and Alvina independently
typed "Usually" there.

| Target | She typed | What went wrong |
|---|---|---|
| quiet | `qiuet` | u and i swapped — she has every letter, in the wrong order |
| usually | `usally` | dropped the second **u**; both l's are there |

Both are worth a mention precisely because they are not random: she has the
letters and loses the order in one, and loses one letter out of a word she has
otherwise built correctly in the other. The other eight were right, including
*journey*, *stomach* and *island*.

## Alvina's ten

`Quiet Minute Special Writing Believe Island Imagine Journey Usually Stomach`
— all ten correct, every one capitalised. Her spelling pads were not exported
(no ink, so no file), so I only have her text, not her `word` fields; I checked
each one against the `content.js` list by hand.

I am treating these as hers, but I want to be straight that it is an inference,
not a proof: a prefill would match the target exactly and lowercase, the pad
textarea sets `autocapitalize="off"` (`ink.js:353`) so the capitals are a human
choice, and Andrila's pads show her own misspellings sitting in that same field.

What the record cannot tell you is whether she *recalled* the words or read
them. The sheet carries the list itself — `<details>` "Word list (for the adult
reading them out)" (`app.js` ~1964) — and the spelling note above it says "Do
not look at the clue first", which only exists because looking is possible.
With no ink and a 7-second block, recall and copying are indistinguishable
here. So her note praises the words she produced and claims nothing about how
she produced them.

Her essay is one fragment — eight words, no subject. I gave her two fixes and a
next step and kept it warm; she has chosen good details and needs sentences
around them, which is a fair thing to tell a nine-year-old.

## Two things I had to correct in my own drafts

Worth recording, because both were the same mistake — praising something the
data did not actually show.

- Andrila's first draft praised her for *not naming* the person and for
  holding the answer back "until the end", as if the riddle shape were her
  invention. It was the assignment: today's prompt (reproduced from the same
  seed) is **"Describe a person in your family without saying their name. Make
  the description clear enough that someone could guess."** Praising a child
  for following the instruction, and telling her it was her own idea, is worse
  than saying nothing. Her note now leads on the one thing that *was* her
  choice — the detail about her bed, which is the only clue in the paragraph
  that narrows it to one person.
- Alvina's first draft said "not one of them was a lucky guess". See the
  word-list point above: nothing in tonight's record supports that. Removed.

## `focus[]` is written every night and read by nothing

`focus` appears nowhere in `app.js` and nowhere in `parent/index.html` — the
kids' panel renders praise, spelling, essay and math, and the parent page the
same. So the three teaching lines the routine writes into `focus` each night,
which are meant to steer the next Recap, currently reach nobody. Either wire
them into the Recap generator or drop the field; right now it is costing a
nightly decision that has no effect.

## The export race, fourth night running

Fired 06:49 UTC. `nightly-export.yml` is `cron: "10 6 * * *"` but GitHub has
started the recent runs anywhere from 06:50 to 08:45, so today's folder did not
exist when this routine looked for it. I dispatched the workflow by hand with
`date: 2026-11-16` and worked from the real export.

Note the export also only ever pulls *UTC yesterday* when the date input is
blank, so a run that fires at 06:49 UTC and a review that reads "today" are
reaching for two different days. Two fixes, and the second is still the better
one:

- move the review to ~08:00 UTC, **or**
- fire the review from the archive commit, so it runs *because* the data
  arrived instead of hoping GitHub is on time.

This is the fourth night it has cost a manual dispatch.
