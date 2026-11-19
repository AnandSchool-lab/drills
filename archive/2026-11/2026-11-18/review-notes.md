# Notes for Anand — 2026-11-18

Both girls have a file tonight. Alvina's note is built almost entirely from
her three school photographs; Andrila's from her typed spelling and essay.

## The export had not run when the review job woke up

Fifth night running. `nightly-export.yml` is scheduled for 06:10 UTC; GitHub
started it at 07:19 last night and had not started it at all by 06:50 tonight.
The review job fires at 06:47, so it found a folder containing only Alvina's
school upload and no `day.json`. I dispatched the export by hand and it
committed `Archive 2026-11-18` at 06:53.

This is now predictable rather than bad luck. Moving the review job to 07:45
UTC, or having `nightly-export.yml` end by dispatching the review, would stop
it. Your call — I have changed nothing outside `archive/`.

## The scores still cannot carry weight

```
            recap        math           think        eng
Alvina      4/4   17s    42/42    4s    10/10  11s   14/14   605s
Andrila     4/4  110s    42/42  941s    10/10   8s   14/14  1009s
```

`misses` is empty for both, so there are no `tips` in either file.

Forty-two maths problems in **4 seconds**, and ten thinking problems in 8 and
11 seconds, are not times anyone can answer in. The same pattern was in the
16th. The blocks that look like real work are Andrila's maths (941s, about 22
seconds a problem) and both English blocks. Everything else is a block being
marked complete without being worked.

## Nobody used the Pencil, so there is no working to read

Every pad from both girls is `mode: "type"`. Stroke counts:

| Pad | Strokes | Points per stroke |
|---|---|---|
| Alvina `eng-sp6` | 2 | 1, 31 |
| the other five stroke files | 1–2 | all 1 |

A one-point stroke is a tap. The single 31-point stroke on Alvina's `sp6` is a
drag across the canvas, not a letter. **Neither girl has a `math` field from
the drills app** — Alvina's `math` block comes from her school sheet, and
Andrila has no maths working at all, so writing about her approach would be
inventing it.

## Spelling was typed, with the list reachable

Both girls typed the ten words rather than writing them, so the sheet's own
word list is on screen. That makes a perfect score impossible to tell apart
from copying.

- **Andrila, 9/10** — `exersicse` for *exercise*. The miss is the useful part:
  she was genuinely spelling, not copying, so her praise line leads on the
  spelling.
- **Alvina, 10/10** — cannot be distinguished from copying, so her praise
  leads on the school maths sheet instead, and her `spelling` array is the
  three words she actually **handwrote** wrong on the Travis page.

Paper mode (v35) speaks the words instead of showing them, which fixes this.
They were not in Paper mode tonight.

## Alvina's school upload — where I differ from `school.json`

First upload through the v36 route; it worked. I read all three pages myself
rather than taking the marking pass on trust, and it is right about nearly
everything. Two corrections:

- **9 × 10, row 4** — `school.json` flags this as possibly `96`. It is a clean
  `90`. Her `0` there is a closed oval; the `6` in row 10 has an open top and a
  looped tail, and the two are clearly different characters.
- **8 × 8** — called smudged. It is legible, and it is `64`.

So the sheet is **59 of 60**, with one wrong answer, not two doubtful ones:
`9 × 10 = 96` in the last row. She wrote `90` for the same fact in row 4, which
is why her note calls it a speed slip rather than a gap.

## Words I deliberately left out of her note

Real errors, but I could not read them letter for letter and a wrong
correction is worse than a missing one:

| On the page | Looks like | Why left out |
|---|---|---|
| *nervous* | `nervaus` or `nervais` | her `a`/`u`/`i` are not separable here |
| *perfect* | `perfet`? | her `e` and `o` have the same shape at speed; appears ~10 times and I cannot pick a consistent reading |
| *omelets* | `amlets` | legible, but cut for the 3-item limit |
| *strawberries* | `stranberries` | legible, but cut for the 3-item limit |

Also left alone: `an` for *and* on the Travis page, and `favorite food` for
*favorite foods* in the essay — both true, both less useful to her than the
three fixes she got.
