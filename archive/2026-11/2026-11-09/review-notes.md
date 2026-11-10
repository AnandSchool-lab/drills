# Notes for Anand — 2026-11-09

Kept out of the girls' notes.

## Nothing was handwritten today

Every pad from both girls came back in `type` mode. The ten spelling pads hold
typed text and no strokes at all; Andrila's essay pad is `mode: "type"` with one
stray single-point dot. So today's spelling test measured typing, which is the
one thing the canvas was built to avoid — and every word came back capitalised
(`Exercise`, `Through`, `Beautiful`…), which is what a keyboard does to the start
of a textarea.

`.pad-text` in `ink.js` sets `spellcheck="false"` but not `autocorrect="off"` or
`autocapitalize="off"`. If they were typing on the iPads, autocorrect could have
quietly repaired a word before it ever reached us. I have not claimed Andrila's
ten-out-of-ten in her note for that reason — her praise is about the essay, which
is unambiguously hers.

Worth knowing which device they were on: `prefersTyping()` defaults the pad to
Type when `maxTouchPoints` is 0, i.e. on a laptop.

## This review ran before the export did

The routine fired at 06:47 UTC. `nightly-export.yml` is `cron: "10 6 * * *"`, but
GitHub has actually been starting it at 06:50–07:28, so `archive/2026-11/2026-11-09/`
did not exist when I looked. I dispatched the export by hand (run 9, 06:51 UTC) and
worked from that. Two ways to stop it recurring: move the review to ~08:00 UTC
(midnight Pacific), or trigger it from the archive commit rather than the clock.

Also, for the record: the scheduled exports on 7, 8 and 9 Nov each logged
"Nothing recorded for" that day. Nov 9 is their first day of work since Nov 5.

## Marked wrong, but the thinking was right

- **Alvina, math, `3 2/6 + 1 1/6`** — recorded as ` 43/6`. Her digits are 4 and 3/6,
  which is the correct answer; the whole number went into the numerator box and the
  box in front was left empty. Same merge as `6 9/12` → `69/12` on 11-05. Three of
  her four maths misses carry that empty-whole-box signature: ` 43/6`, ` 21/2`, ` 7/3`.
- **Both girls, think, "Which is larger: (1) 2/4 or (2) 1/5? Type 1, 2, or 3"** —
  Alvina typed `2/4`, the correct fraction rather than its option number, and was
  marked wrong. It is a plain numeric input graded by `sameNum`, so `2/4` parses as
  2 and lands on the wrong option. Andrila typed `2 1/5`. This one would be safer as
  a real `.opts` multiple choice than as a typed number.
- **`1/4 = ?/8`** — Andrila `4/8`, Alvina `8/8`. Second review running where the
  equivalent-fraction box catches both of them (`1/2 = ?/4` on 11-05).
- **Andrila, math** — one miss is still logged with the question text `remainder`
  (gave 2, want 3), so there is no way to see which division it was.

## The Sara question is doing the tripping

"Sara has 30 cards. Sara shares them equally among 6 friends, then gives away 4 of
their own share. How many does each friend keep?" Both girls answered 1 — they both
did 30 ÷ 6 = 5 correctly and then took the 4 off. "their own share" reads as the
friends' share, not Sara's. "then gives away 4 from her own share" would fix it.

## Smaller things

- Both girls left the two ★ puzzles essentially unattempted (Alvina blank on both,
  Andrila a guess of 100 on the consecutive-numbers one).
- Andrila's page-digits answer of 149 is `9 + 2 × 70` — right method, counted 70
  two-digit pages instead of 63.
- Timers look healthy again: Alvina's maths block logged 1019s, against 5s on 11-05.
- Alvina left the monarch comprehension question blank; it is her only eng miss.
