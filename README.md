# Daily Drills

A self-contained practice app for two 4th-grade students. No accounts, no server,
no logins. Problems are generated from the date, so a new set appears every day
and both iPads get the same set on the same day.

## Putting it online (one time, about 15 minutes)

1. Go to **github.com** and sign in. Click **+** (top right) → **New repository**.
2. Name it `drills`. Choose **Public** — GitHub Pages is free only for public
   repositories. Nothing personal lives in these files: the girls' names and all
   their scores are stored on the iPad itself, never in the repo.
3. On the new empty repo page, click **uploading an existing file**.
4. Drag in all of these files, then click **Commit changes**:

   ```
   index.html   app.js   content.js   sw.js
   manifest.webmanifest   icon-180.png   icon-192.png   icon-512.png
   ```

5. Go to **Settings → Pages**. Under *Build and deployment*, set
   **Source: Deploy from a branch**, **Branch: main**, **Folder: / (root)**. Save.
6. Wait about a minute, then reload that page. It will show your address:

   ```
   https://<your-github-username>.github.io/drills/
   ```

## Putting it on each iPad

1. Open that address in **Safari** (it must be Safari, not Chrome).
2. Tap the **Share** button (square with an arrow).
3. Tap **Add to Home Screen** → **Add**.
4. A "Daily Drills" icon now sits on the home screen. Tapping it opens the app
   full screen with no address bar.
5. First time only: open **Set up names**, type both names, save. Then tap a name.

Repeat on the second iPad. Each iPad keeps its own scores.

## Daily use

| Block | Time | What it covers |
|---|---|---|
| Math | 30 min | Multiplication, division, fractions, and decimals from level 2 |
| Thinking | 20 min | Word problems, patterns, missing numbers, measurement, reasoning |
| English | 40 min | Spelling, vocabulary, grammar, a reading passage, a writing prompt |

Each block has its own countdown. The clock turns amber with five minutes left
and red when the time is up, but nothing stops — they can keep going.

**Check my answers** marks everything green or red and records the score.
**Show answers** fills the correct answers in.

## Difficulty

The level climbs on its own: level 1 for the first four weeks, then up one level
every four weeks to level 4 (5th-grade entry) by week 13.

| Level | Math | English |
|---|---|---|
| 1 | ×4 facts, 2-digit × 1-digit, ÷4, like-denominator fractions | Common 4th-grade words, basic parts of speech |
| 2 | All tables, 3-digit × 1-digit, remainders, fraction subtraction, decimals | Longer words, possessives, agreement |
| 3 | 2-digit × 2-digit, long division, simplifying fractions | Clauses, semicolons, voice, prefixes |
| 4 | 3-digit × 2-digit, decimal multiplication, unlike denominators | Modifiers, roots, subjunctive, figurative language |

To hold or push the level, open **For parents → Change level**. Each tap moves to
the next fixed level, and one more tap returns to automatic.

The start date lives at the top of `app.js`:

```js
var START_DATE = "2026-10-27";
```

## Getting their work back

**For parents → Copy report** puts the last two weeks on the clipboard for both
girls: scores per block, time taken, and everything they typed in the reading and
writing boxes. Paste that into Claude along with photos of their school
worksheets, and the material can be adjusted to match what school is covering.

**Print** produces a clean printed copy of whatever is on screen.

## Changing the content

Everything in English comes from `content.js` — spelling lists, vocabulary,
grammar questions, reading passages, writing prompts. Each item has a `level`
from 1 to 4. Add or replace items there, re-upload that one file, and bump the
version in `sw.js` (`drills-v1` → `drills-v2`) so the iPads pick it up.

Math and thinking problems are generated in `app.js` and need no content file.

## Offline

After the first visit, the app works with no internet. Changes you upload are
picked up the next time the iPad is online.
