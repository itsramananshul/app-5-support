# APP 5 — Support Tickets

Standalone Next.js 14 + TypeScript app for tracking internal support and
maintenance tickets at a factory or warehouse, backed by Supabase Postgres.
Same codebase runs as Factory 1–4 and Warehouse 1–2 with per-instance
isolation via the `instance_name` column.

The `/api/status` endpoint reports `health: "degraded"` whenever there is at
least one OPEN ticket at CRITICAL severity. That's the signal Nexus will read
in a later phase of the demo.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- `@supabase/supabase-js`
- Vercel-ready (no custom port handling)

## Supabase setup

1. Paste `supabase/schema.sql` into the Supabase SQL editor and run (once).
2. Paste `supabase/seed.sql` and run. It upserts 60 rows — 10 per instance.
   Each instance gets at least 1 CRITICAL OPEN ticket and at least 2 OPEN
   tickets total. Several rows have `resolved_at` set to 2026-05-13 so the
   "Resolved Today" stat is non-zero on first load.

## Environment

`.env.local` (copied from app-1, same Supabase project):

```env
INSTANCE_NAME=Factory 1
NEXT_PUBLIC_INSTANCE_NAME=Factory 1

SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # preferred (bypasses RLS)
SUPABASE_ANON_KEY=...           # fallback
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Switch instance locally by changing `INSTANCE_NAME` and
`NEXT_PUBLIC_INSTANCE_NAME` and restarting `npm run dev`.

## Local dev

```bash
npm install
npm run dev          # http://localhost:3000
```

## API

| Method | Path                                | Body                                       | Notes                                            |
| ------ | ----------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| GET    | `/api/tickets`                      | —                                          | List, sorted by severity (CRITICAL first) then `created_at` DESC |
| POST   | `/api/tickets`                      | new-ticket fields (no `status`, `resolution`, `resolved_at`) | Creates row in OPEN status |
| GET    | `/api/tickets/[id]`                 | —                                          | Single ticket                                    |
| PATCH  | `/api/tickets/[id]/status`          | `{ "status": "...", "resolution"?: "..." }` | RESOLVED or CLOSED require non-empty `resolution`; RESOLVED auto-sets `resolved_at = now()` |
| PATCH  | `/api/tickets/[id]/severity`        | `{ "severity": "..." }`                    | Change severity                                  |
| PATCH  | `/api/tickets/[id]/assign`          | `{ "assignedTo": "..." }`                  | Reassign; non-empty required                     |
| GET    | `/api/status`                       | —                                          | health is `degraded` if `criticalOpenCount > 0`  |

All errors → `{ "success": false, "error": "..." }`.
All mutation successes → `{ "success": true, "ticket": { ... } }`.

`resolution` is validated **client-side** (StatusModal disables submit until
non-empty for RESOLVED/CLOSED), **at the route helper** (`parseStatusUpdate`
returns 400), and **at the store** (throws `validation_error` mapped to 400).
Three layers; can't slip through.

## UI

- Header with instance chip, connection status, **+ New ticket** button.
- Four stat cards: Total, Open (warning when > 0), Critical Open (danger
  when > 0), Resolved Today (success).
- Filter bar: status, severity, category, free-text search, "Critical only"
  toggle.
- Tickets table — CRITICAL rows tinted rose; HIGH + OPEN rows tinted amber.
  Click a ticket number to expand and see Description and Resolution
  (with `resolved_at` timestamp when present).
- Per-row actions: Status / Severity / Assign → modal.
- Toast for every mutation. Bottom **Recent Activity** panel logs the last
  50 attempts client-side.

## Deploy to Vercel

One Vercel project per instance, all pointing at the same git repo with
**Root Directory** = `app-5-support`. Same Supabase env vars across projects;
only `INSTANCE_NAME` / `NEXT_PUBLIC_INSTANCE_NAME` differ.

## curl smoke test

```bash
BASE=http://localhost:3000

curl $BASE/api/tickets
curl $BASE/api/status

# Use an id from the list above.
curl -X PATCH $BASE/api/tickets/<uuid>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}'

# 400 — RESOLVED without resolution
curl -X PATCH $BASE/api/tickets/<uuid>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"RESOLVED"}'

# 200 — RESOLVED with resolution, server auto-sets resolved_at
curl -X PATCH $BASE/api/tickets/<uuid>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"RESOLVED","resolution":"Bearing replaced"}'

curl -X PATCH $BASE/api/tickets/<uuid>/severity \
  -H "Content-Type: application/json" \
  -d '{"severity":"HIGH"}'

curl -X PATCH $BASE/api/tickets/<uuid>/assign \
  -H "Content-Type: application/json" \
  -d '{"assignedTo":"Mike Torres"}'

curl -X POST $BASE/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_number":"TKT-F1-999",
    "title":"Test ticket",
    "description":"...",
    "category":"GENERAL",
    "severity":"MEDIUM",
    "assigned_to":"Unassigned",
    "reported_by":"Demo user"
  }'

# 400 — bad enum value
curl -X PATCH $BASE/api/tickets/<uuid>/severity \
  -H "Content-Type: application/json" \
  -d '{"severity":"YIKES"}'

# 404 — unknown id
curl $BASE/api/tickets/00000000-0000-0000-0000-000000000000
```
