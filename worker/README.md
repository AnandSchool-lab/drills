# Daily Drills — the API

The small server behind the app. It replaces the Google Apps Script bridge.

The difference that matters is not speed. The old bridge was posted to blind:
the browser could not read the response, so a save that failed looked exactly
like one that worked. This one answers, with real status codes and real CORS
headers, so the app can tell a child when something did not save and try again.

## What runs where

| Piece | Holds |
|---|---|
| **D1** (`drills`) | everything — answers, scores, every wrong answer, progress, retakes, and their pencil work |
| **GitHub** | this code, and later the nightly export of all of the above |

There is deliberately no object storage. A page of working is a few KB and a
year of it is about 40 MB, against D1's 5 GB — so R2 would be a second service
solving a problem this does not have. Only `postInk` knows where a pad is kept,
so moving it later is a few lines.

## Routes

| Route | Who | What |
|---|---|---|
| `POST /ping` | app | progress while they work, overwrites one row |
| `POST /result` | app | a finished block, with every wrong answer |
| `POST /ink` | app | one pad of working, stored in D1 |
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
3. **Workers** → Create application → **GitHub** → this repo.
   Set **Root directory** to `worker`. Name the Worker `drills-api`.
4. Worker → **Settings → Variables and Secrets** → add `PARENT_KEY`
   as a **Secret**. This is the passphrase the dashboard asks for.

After that, every push to `main` deploys itself.

## Checking it works

    curl https://drills-api.<your-subdomain>.workers.dev/health

Should return `{"ok":true,...}`.

## Changing the schema later

Add new `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE` statements to the end of
`schema.sql` and run the new ones in the D1 console. The file is written so the
whole thing can be re-run safely.
