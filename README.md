# Sporty Cam API

Express + TypeScript backend using Supabase for Auth, DB, and Storage. Swagger docs available at `/api-docs`.

## Features
- Supabase Auth (email/password) with JWT Bearer
- Password policy enforcement
- Change password (authenticated)
- OTP-based password reset via email (Nodemailer; optional Redis store)
- Storage file upload (Supabase Storage)
- OpenAPI/Swagger docs

## Setup

1) Copy env file

Windows (PowerShell):
```powershell
copy .env.example .env
```
macOS/Linux:
```bash
cp .env.example .env
```


Fill in these variables:
- PORT (optional, default 3000)
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (required for admin operations like password reset)
- EMAIL_USER, EMAIL_PASS (SMTP creds for sending OTP email)
- REDIS_URL (optional; if not set, OTPs are stored in-memory and won’t survive restarts)

2) Install dependencies
```bash
npm install
```

3) Run
```bash
# Compile once and start
npm start

# or: watch mode + auto-restart
npm run serve
```

Visit Swagger UI at: http://localhost:3000/api-docs

## Authentication
- Use the Authorization header with a Supabase access token: `Authorization: Bearer <token>`
- The middleware validates the access token and, if invalid/expired, attempts to treat the same token as a refresh token to renew the session.

### Endpoints
- GET `/api/auth/me` (protected) – returns the authenticated user
- POST `/api/auth/register` – body: `{ fullName, email, password, confirmPassword }`
- POST `/api/auth/login` – body: `{ email, password }`, returns `{ accessToken, refreshToken, ... }`
- POST `/api/auth/refresh` – body: `{ refreshToken }` to obtain a new access token
- PUT `/api/auth/change-password` (protected) – body: `{ currentPassword, newPassword, confirmNewPassword }`

## Clubs
- GET `/api/clubs` - paginated list of clubs (query: page, pageSize)
- GET `/api/clubs/{id}` - fetch single club by id
- GET `/api/clubs/search` - search and filter clubs (params below)

Search params for `/api/clubs/search`:
- `q` - general search string (matches name, sport, country, state, city)
- `city`, `sport`, `country`, `state` - optional exact filters
- `page`, `pageSize` - pagination

Example search requests
```bash
# Search by text
curl "http://localhost:3000/api/clubs/search?q=united&page=1&pageSize=20"

# Search and filter by city
curl "http://localhost:3000/api/clubs/search?q=fc&city=Manchester"

# Filter-only (no text)
curl "http://localhost:3000/api/clubs/search?city=Manchester&sport=football"
```

## Guest applications (player_applications)

- POST `/api/guests` - create a guest application. Body must include `email` and `full_name`.
- If `club_id` is provided, the server validates that the club exists in the `clubs` table before inserting. If the club is not found the endpoint returns `400` with message `club_id does not exist`.

### Password policy
Passwords must include:
- At least 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

## Password reset (OTP)
Two-step OTP-based flow implemented with Nodemailer and Supabase Admin:

1) Request OTP
- POST `/api/auth/request-password-reset`
- body: `{ email }`
- Sends a 6-digit OTP to the user’s email. OTP expires in 10 minutes.

2) Reset password
- POST `/api/auth/reset-password`
- body: `{ otp, newPassword, confirmPassword }`
- Enforces the same password policy. On success, updates the user’s password in Supabase Auth and invalidates the OTP.

Notes:
- Requires `SUPABASE_SERVICE_ROLE_KEY` on the server for admin password updates.
- OTPs are stored in Redis if `REDIS_URL` is set; otherwise an in-memory fallback is used.

## Profiles
Assumes a `profiles` table keyed by `id` (uuid) matching `auth.users.id`.
- GET `/api/profiles/me` – current user profile row

## Storage
- POST `/api/storage/upload` – multipart/form-data with field `file` (and optional `bucket`)
- Returns path and public URL (for public buckets)

## Swagger/OpenAPI
- Auto-generated docs at `/api-docs`

## Tech stack
- Node.js + Express (TypeScript)
- Supabase JS SDK
- Nodemailer (Gmail SMTP by default)
- Optional Redis (for OTP persistence)

## Logging
- The project uses a centralized logger (winston) and request-logging middleware.
- Logs include request method, path, status and basic timing.
- To enable production-style logging, set LOG_LEVEL env var (default: info).

Example: run locally and inspect logs
```bash
npm start
# watch logs in terminal; to send logs to files or a remote sink, configure the logger in src/utils/logger.ts
```

## Recent changes (Nov 2025)

This project recently received several feature and API changes to better support canonical players, applications and club memberships. Summary:

- Player / PlayerApplication / Membership flow
	- `player_applications` is the canonical table for membership applications. `joinClub` creates an application (prefilled from the canonical `players` row when present).
	- Approved applications are promoted into `players` rows and a `player_club_membership` row is created linking a `player.id` to a `club.id` (this can be done by an admin action or the scheduled sync job).
	- `getClubsAuthUser` now returns clubs based on `player_club_membership` for the authenticated user (reads `players` by `user_id` then memberships). The old email-fallback behavior was removed.

- New endpoints
	- POST `/api/players/me/join-club` — apply to join a club (creates a `player_applications` row). Idempotent and pre-fills data from `players` when available.
	- POST `/api/players/me/leave-club` — leave a club (deletes the `player_club_membership` row for the authenticated player).
	- GET `/api/players/me/clubs` — returns clubs where the user is a member (uses `player_club_membership`).
	- GET `/api/players/me/events` — returns upcoming `club_events` (events with `event_date >= today`) for clubs the authenticated player has joined.
	- POST `/api/players` — a create endpoint for server-side insertion of `players` rows (useful for admin/sync jobs). The controller now ensures an `id` is provided (server-generated when missing) to avoid DB null-id errors.

- Background jobs & scripts
	- A scheduled job (`src/jobs/sync-approved-players.ts`) promotes approved `player_applications` into canonical `players` rows and creates `player_club_membership` entries. The job is idempotent and handles UUID generation and deduplication.
	- Backfill script: `src/scripts/backfill-memberships.ts` — idempotent script to create missing `player_club_membership` rows for historical approved applications. Run it when you want to populate memberships from existing approved applications.

- Migrations
	- A migration was added for `player_club_membership` and SQL to add `player_id` to that table. If your DB does not auto-generate UUIDs for `players.id`, the server now generates UUIDs on insert. Alternatively, add a DB default `gen_random_uuid()` or `uuid_generate_v4()` for `players.id`.
	- Recommendation: add a unique index on `player_club_membership(player_id, club_id)` to prevent duplicates.

- OpenAPI / Swagger
	- OpenAPI docs were updated for the new/changed endpoints above (see `src/routes/player.ts`). A `Player` schema was synchronized to match DB columns. The new `GET /api/players/me/events` route is documented in Swagger.

Testing & run notes

- Build
	- Run a full TypeScript build before deploying or testing locally:
```powershell
npm run build
```

- Backfill (manual)
	- To execute the backfill script locally (ensure env vars and SUPABASE_SERVICE_ROLE_KEY are set):
```powershell
node -r ts-node/register src/scripts/backfill-memberships.ts
```

- Quick endpoint checks (use a valid bearer token):
	- Apply to a club: POST `/api/players/me/join-club` { "club_id": "<club-uuid>" }
	- Leave a club: POST `/api/players/me/leave-club` { "club_id": "<club-uuid>" }
	- Get memberships: GET `/api/players/me/clubs`
	- Get upcoming events: GET `/api/players/me/events`

If you want, I can add a `ClubEvent` schema to the OpenAPI components and/or create a SQL migration file to add the recommended unique index. Let me know which of those you prefer.
