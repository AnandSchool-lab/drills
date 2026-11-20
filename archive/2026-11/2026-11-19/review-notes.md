# Notes for Anand — 2026-11-19

One file tonight: `review-Andrila.json`. Alvina has no file because she has no
work — nothing in `day.json`, no paper upload, no pads. Not a filler day, an
empty one.

## Paper mode gave us a real time for the first time

```
Andrila   recap   3/4   830s   (4 questions, copied out by hand and answered on paper)
```

830 seconds is the first block time in the archive that a person could
actually have taken. The 4-second maths and 8-second thinking blocks that made
the last three nights' scores meaningless are simply gone, because the block is
paper now and the clock runs while she writes. Nothing else needed fixing — the
mode did it.

She copied all four questions onto the sheet by hand before answering them, put
her name and the date at the top, and boxed her answer on the multiple-choice
one. That accounts for most of the 830s.

## Where I differ from `school.json`

I read all three photographs rather than taking the marking pass on trust. The
count is the same — **58 of 60** — but the reading of both errors is different,
and it changed what her note says.

| | `school.json` | What the page shows |
|---|---|---|
| `7 x 10` (last box, Monday) | "looks like 20 … the writing is cramped" | A clean `20`. Same two shapes as the `20` in the box immediately to its left; her `7` elsewhere on the page is a straight diagonal and looks nothing like it. A wrong answer, not a doubtful reading. |
| Both errors | "on 7s and 8s facts, which matches where facts slip elsewhere" | Both facts are answered **correctly elsewhere on the same sheet**: `7 x 8 = 56` one row above the `8 x 7 = 55`, and `10 x 7 = 70` written twice in the row above the `20`. |

So these are not gaps in the 7s and 8s. They are timer slips, and the `20`
looks copied from the box beside it. Her maths note says that, and gives her
the proof from her own page — which seemed more use to her than being told to
practise facts she demonstrably knows.

Her fastest column was also her only clean one: Wednesday, 31 seconds, 20/20.
Monday (43s) and Tuesday (48s) carry one error each.

## The true/false question I left alone

Question 4: *"Travis ate hamburgers for his Thanksgiving meal."* She marked
**True** and `school.json` marks that correct. The story says the family's main
dish was hamburgers and that Travis was given *"a nice plate of berries, grass,
and seeds."* Strictly, Travis did not eat hamburgers.

The worksheet almost certainly intends True, so correcting her would be
punishing her for being right about a badly written question — I said nothing.
Worth knowing, though, because it cuts against the thing I praised her for on
the same page: on question 6 she went back to the text and found *shed* rather
than *hay barn*, and question 4 rewards not doing that.

## The multiplication sheet has no name on it

The `Name:` box is blank, and it is the same Math-Drills "Multiplication Facts
to 100 (A)" sheet Alvina uploaded yesterday. The only thing that makes this
Andrila's is which account sent it. The answers and times are clearly a
different sitting, so there is no doubt tonight — but on a day when both girls
upload, nothing on the page itself would say whose is whose. One word in the
Name box would fix it permanently.

## Still true from previous nights

- **The export race, sixth night.** `nightly-export.yml` is scheduled for 06:10
  UTC and GitHub started it at 07:19 and 07:20 the last two nights; this job
  fires at 06:47. I dispatched it by hand at 06:51 and it committed
  `Archive 2026-11-19`. Moving this job to 07:45 UTC, or having the export
  dispatch the review when it finishes, ends this. I have changed nothing
  outside `archive/`.
- **`focus[]` is written every night and rendered by nothing.** It is not in
  `app.js` or anywhere under `parent/`. Either wire it into tomorrow's Recap
  picker or drop it from the schema; writing it costs nothing but it is
  currently going nowhere.
