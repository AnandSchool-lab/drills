# Daily Drills — the API

The small server behind the app. It replaces the Google Apps Script bridge.

The difference that matters is not speed. The old bridge was posted to blind:
the browser could not read the response, so a save that failed looked exactly
like one that worked. This one answers, with real status codes and real CORS
headers, so the app can tell a child when something did not save and try again.

## What runs where

| Piece | Holds |
|---|---|
| **D1** (`drills`) | answers, scores, every wrong answer, progress, retakes |
| **R2** (`drills-ink`) | their pencil pages, one JSON object per pad |
| **GitHub** | this code, and later the nightly export of everything above |

## Routes

| Route | Who | What |
|---|---|---|
| `POST /ping` | app | progress while they work, overwrites one row |
| `POST /result` | app | a finished block, with every wrong answer |
| `POST /ink` | app | one pad of working |
| `POST /writing` | app | their writing, when typed |
| `GET /retake?kid=` | app | has a parent asked for a redo |
| `GET /live?key=` | parent | everything the dashboard draws |
| `POST /retake` + key | parent | ask for a day to be done again |
| `GET /health` | anyone | is this thing on |

The write routes are open. Locking them would mean putting a secret inside a
public web page, which is not a secret. They accept only known names and
bounded payloads, so the worst a stranger with the URL can do is add noise.
Everything that **reads** a child's work needs the parent key.

## Setting it up (once)

1. **D1** → Create database named `drills` → open its **Console** → paste
   `schema.sql` → run.
2. Copy the **Database ID** from that page into `database_id` in
   `wrangler.jsonc`.
3. **R2** → Create bucket named `drills-ink`.
4. **Workers** → Create application → **GitHub** → this repo.
   Set **Root directory** to `worker`. Name the Worker `drills-api`.
5. Worker → **Settings → Variables and Secrets** → add `PARENT_KEY`
   as a **Secret**. This is the passphrase the dashboard asks for.

After that, every push to `main` deploys itself.

## Checking it works

    curl https://drills-api.<your-subdomain>.workers.dev/health

Should return `{"ok":true,...}`.

## Changing the schema later

Add new `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE` statements to the end of
`schema.sql` and run the new ones in the D1 console. The file is written so the
whole thing can be re-run safely.
