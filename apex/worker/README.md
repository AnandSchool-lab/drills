# apex-api

Sync server for Anand's APEX Expert Drills (`/apex/`). Separate from the girls' `drills-api`.

| Part | Name |
|---|---|
| Worker | `apex-api`, built by Cloudflare Workers Builds from this folder (root `apex/worker`) |
| Database | D1 `apex` (binding `DB`), tables in `schema.sql` |
| Passphrase | secret `APEX_KEY`, set in the dashboard only |
| URL | https://apex-api.anandm401-amazon.workers.dev |

Routes: `GET /health`, `POST /read`, `POST /save` (both need `APEX_KEY`).
