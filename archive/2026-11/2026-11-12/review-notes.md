# Notes for Anand — 2026-11-12

Kept out of Andrila's note. Alvina recorded nothing on the 12th (or the 11th),
so she has no file.

## There is real working on a maths pad, for the first time

`math · m2-2`, 60 strokes, 710 × 359 px of ink. Regenerating the sheet for the
date (`seedFor("math","2026-11-12")`, level 1) gives `m2-2` = **4 8/10 − 4/10
(simplify)**, and the pad matches it exactly: the `4` and the `8/10` written out
on the left, then a bar cut into ten parts with all ten numbered and eight
ringed, then a second ten-part bar with the first four ringed and struck
through. That is a correct model of the question, drawn unprompted.

| Day | Her maths pads |
|---|---|
| 11-05, 11-09, 11-10 | one stroke of one point — a dot |
| 11-12 | 60 strokes, two numbered bar models |

Whatever changed between v29 and v31, the pad is usable now. This is the thing
you have been asking the app to show you, and it finally showed it.

## …and the maths block was never recorded

`results` has one row: `recap 1/4, 415 s`. No `math` row at all. So the sheet she
drew that working on never reached the server as answers — only the pad did,
via the v28 draft queue.

v34's own commit notes say why this is worth asking her about: the palm shield
swallowed **Save & close** after Pencil use, and "15 taps did nothing in
testing". That fix landed **16:23 Pacific**; her Recap went in at **15:47:57**.
If she spent the session tapping a button that was ignoring her, a maths block
that never got sent is the expected shape. Worth one question to her before
assuming she wandered off.

I left this out of her note — I am not going to tell her to press a button that
may not have worked.

## Her Recap answers are the input, not her maths

Three fraction questions, and **not one slash between them**:

| Question | Recorded | On 11-09 she wrote |
|---|---|---|
| `5 3/4 − 1 1/4 (simplify)` | `1 .24` | `4 2/4` |
| `1/4 = ?/8` | `28` | `4/8` |
| `2 5/6 − 1 1/6 (simplify)` | `-6 -46` | `1 4/6` |

She was on **v31**. There, `recapRow` used `numInput(...)` — a single box with
`inputmode="numeric"`. The maths sheet uses the three-box `fracbox`
(whole / numerator / denominator), which is why her maths answers have always
come back clean and her Recap answers never do. **v32 landed 43 seconds after
she pressed send** (15:48:40 vs 15:47:57), so she missed the fix by under a
minute.

- `28` is almost certainly **2/8**, and it matters: on the 9th she gave `4/8`
  for this question, so she had moved to the right numerator and the box lost
  it. Her note tells her the 2 and the 8 were the right pair.
- `1 .24` and `-6 -46` I cannot reconstruct, so I have not guessed at them.
  Note that a space and a `.` and a `-` all got through, which does not quite
  fit "the numeric keypad has nothing but digits" — the other candidate is
  **Scribble**, since she had the Pencil in her hand all session and these are
  plain text inputs. That is the same trap that made you move spelling onto
  canvases.

Worth considering: give the Recap the **same three-box `fracbox` as the maths
sheet** rather than free text. It cannot be Scribbled into a mess, it cannot
lose a slash, and it is the layout she already knows. (Not touching the code —
flagging it.)

**Do not read `1/4` as a maths result.** Her fraction arithmetic is right.

## Simplifying is the actual gap — fourth session running

| Day | Question | She wrote | Wanted |
|---|---|---|---|
| 11-05 | `6 9/12 − 3 1/12 (simplify)` | `3 8/12` | `3 2/3` |
| 11-09 | `5 3/4 − 1 1/4 (simplify)` | `4 2/4` | `4 1/2` |
| 11-09 | `2 5/6 − 1 1/6 (simplify)` | `1 4/6` | `1 2/3` |
| 11-12 | `4 8/10 − 4/10 (simplify)` | (never sent; pad shows 4/10) | `4 2/5` |

Same shape every time: the subtraction is correct, the whole number is
correct, the final reduction is skipped. She can do the reduction in
isolation — `4/10 in simplest form` on the 9th was right. It is the *last
step of a longer question* that falls off. Her note and both tips lead on it.

## Alvina

No `results`, no pads, nothing on the 11th either. The 11-12 export found her
empty; the scheduled 11-12 run found nothing at all for the 11th. No review
file for her — nothing to say that would not be filler.

## The export race, third night

The routine fired 06:49 UTC; `nightly-export.yml` is `cron: "10 6 * * *"` but
GitHub started the last four runs at 06:50–07:28, so the folder did not exist.
Dispatched by hand with `date: 2026-11-12` and worked from the real data.

Same two fixes as last night, and the second is still the better one:

- move the review to ~08:00 UTC, **or**
- fire the review from the archive commit, so it runs *because* the data
  arrived rather than hoping GitHub is on time.
