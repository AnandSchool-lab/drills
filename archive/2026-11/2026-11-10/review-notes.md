# Notes for Anand — 2026-11-10

Kept out of the girls' notes.

## Still no working on the page — second day, different cause

| | Pads | What came back |
|---|---|---|
| Andrila | 1 (`math · m1-0`) | `mode:"ink"`, **one stroke of one point** — a dot |
| Alvina | 12 (10 spelling, essay, `math · m1-2`) | spelling + essay typed; math pad one dot |

Both maths pads are in `ink` mode now, not `type` — so the Pencil default is
working. But each holds `s:[{t,p:[x,y]}]`: a single point. Rendered, both crop to
24×24 px. There is no method on the page for either girl, which is the one thing
you actually want to see.

Worth checking on the iPad before writing it off as "they just didn't use it":
they worked 15:43–16:58 Pacific, and **v30 landed 17:08, v31 17:26** — so they
were on v29 the whole session. v31's own notes record a spelling strip that was
**0 px tall in Pencil mode**. If the maths pad's canvas had the same near-zero
drawable height under v29, a tap registering one point and nothing else is
exactly what you would get. A pad that is opened and tapped once, twice in two
days, looks more like a pad that cannot be drawn in than two children who both
chose not to.

## Marked wrong, but the thinking was right

- **Alvina, math, `2 1/4  +  3 1/4 =`** — recorded as `52/4`. Her digits are 5
  and 2/4, the correct answer; both went into the numerator with the whole box
  empty. Her note tells her she was right.

That is the **third** review running for this merge: `6 9/12` → `69/12` (11-05),
` 43/6` ` 21/2` ` 7/3` (11-09), `52/4` today. One thing has changed: the recorded
string is now trimmed, so the old give-away leading space is gone. The signature
to look for from here is **no space before the fraction** — `52/4` means the front
box was empty, `5 2/4` means it was filled.

It is now the single most expensive thing in the app. Three sessions, a focus
line in her note two days running, and it still happens. A front box that
auto-advances, or one that simply refuses a second digit, would end it.

## Spelling was typed again, so neither girl is marked on it

All ten of Alvina's words came back as text, every one capitalised
(`Stomach`, `Believe`, `Usually`…). Two things in play:

1. **v31 restores handwritten spelling — but shipped 28 minutes after she
   finished.** Tonight should be the first handwritten set.
2. **v29's `autocapitalize="off"` is in `ink.js` and did not take.** It was
   committed 08:14 Pacific, well before her 16:58 session, yet every word still
   arrived capitalised. Either the service worker served a stale `ink.js`, or she
   typed the capitals herself. If it is the cache, that is worth knowing
   independently of spelling.

All ten words are spelled correctly, but typed — with autocorrect's status
unproven — so I have claimed nothing for them, same as 11-09.

## Andrila did only the Recap

`recap` 8/10, 1365 s. No `eng`, `math` or `think` block recorded at all.

The Recap itself is the good news, and it is about method rather than score:

| Day | Recap | Time |
|---|---|---|
| 11-05 | 2/9 | **6 s** |
| 11-09 | 4/4 | 286 s |
| 11-10 | 8/10 | 1365 s |

On 11-05 she clicked through nine retakes in six seconds. Yesterday and today she
sat with them. Eight of ten previously-wrong questions went in correctly. Whatever
changed between 11-05 and now, it is the thing worth protecting.

## Repeats worth your eye

- **`★ sum of 3 numbers in a row … is 108`** — Andrila answered **100** on 11-09
  and **100** again today. Identical, with an empty working pad both times. Her
  note gives her the middle-number trick.
- **Missing-number division** — Alvina gave `4` for `___ ÷ 8 = 32` (i.e. 32 ÷ 8),
  having given `5` for `___ ÷ 4 = 20` yesterday. Same inversion, second day.
- **"Read to the end"** was her focus line yesterday. Today both age questions
  came back as the *older child's age* rather than the difference: Leo `18`
  (wants 12), Zoe `24` (wants 16). Her multiplication was right both times. This
  is the clearest single habit in her day and her note leads on it.

## Not diagnosable — flagging rather than guessing

- **Alvina, `5 5/12 − 2 2/12 (simplify)` → `11/12`.** Not a merge of the right
  answer (`3 1/4` would merge to `31/4`, `3 3/12` to `33/12`), so something real
  went wrong — but with the front box empty and no working, there is no way to
  see what. Her note says only that the front box was left empty, which is all
  that is actually visible.
- **`Estimate: about how many groups of 7 fit into 611?` → `24`.** 611 ÷ 7 ≈ 87
  → 90. I cannot reconstruct 24 from anything plausible, and there is no working.
  Left out of her note rather than guessed at.

## Smaller things

- Alvina left `72 ÷ 4` and `77 ÷ 4 (remainder)` **blank** — the only two blanks in
  a 37/42 maths block, both plain two-digit division. In her focus list.
- Both ★ `think` puzzles blank again (chickens/cows, fence posts). Third session
  where the ★ questions go unattempted by Alvina.
- The reworded Sara question produced no miss for either girl today, but I cannot
  confirm it was asked, so v29's fix is untested rather than proven.
- Timers healthy: Alvina eng 1351 s, math 893 s, think 384 s.

## The export race caught me again

The routine fired at 06:49 UTC. `nightly-export.yml` is `cron: "10 6 * * *"` but
GitHub actually starts it at 06:50–07:28, so `archive/2026-11/2026-11-10/` did not
exist when I looked — same as 11-09. I dispatched the export by hand (with
`date: 2026-11-10`) and worked from the real data.

This is now twice in two nights and it will keep happening. Two fixes, either one
enough:

- move the review to **~08:00 UTC** (midnight Pacific), or
- **trigger the review from the archive commit** rather than the clock, which also
  removes the guesswork about how late GitHub is feeling.

The second is better: the review then runs *because* the data arrived.
