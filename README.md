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
