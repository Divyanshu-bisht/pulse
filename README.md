# Pulse -- real-time monitoring & alerting platform

A generic real-time ingestion, dashboard, and alerting platform, now with a
production-oriented feature set layered on top of the original MVP.

## Project structure

```
pulse-project/
  backend/          Express + Socket.io + MongoDB API
  frontend/         React dashboard (plain CSS)
  agent/            Script that reports system metrics
  demo-producer/    Script that simulates e-commerce events
  .github/workflows/ci.yml   Runs backend tests on every push
```

## Setup (same as before)

```
cd backend && npm install && cp .env.example .env
cd frontend && npm install && cp .env.example .env
```

Fill in `backend/.env` -- see the comments in `.env.example` for exactly
where each value comes from (Atlas connection string, JWT secret, etc).

Then: `npm run dev` in `backend`, `npm start` in `frontend`.

## What's new in this version

### Security
- **Rate limiting** on `/api/events/ingest` and all `/api/auth/*` routes
- **Input validation** on the ingest endpoint (type/length checks, rejects malformed payloads)
- **CORS locked** to your actual `CLIENT_URL`, not left open to any origin
- **sourceKey rotation** -- "Rotate key" button on a source's detail page, for when a key leaks
- **Password reset flow** -- "Forgot your password?" on the login page

### Reliability
- **`/api/health` endpoint** -- returns backend + DB connection status, for uptime checks
- **Automatic data retention** -- a nightly job (`node-cron`) deletes events older than `RETENTION_DAYS` (default 30), so the database doesn't grow forever
- **Structured request logging** via `morgan`

### Alerting
- **Real email delivery** for alerts and password resets, via Nodemailer -- see "What still needs your own setup" below
- **Alert cooldown** -- a rule won't re-fire more than once per `cooldownMinutes` (default 15), preventing alert spam while a condition stays true
- **Webhook delivery with retries** -- set a `webhookUrl` on a rule (via the API for now) and it'll be POSTed to with 3 retry attempts on failure

### Account
- **Settings page now actually persists** the notification email, wired to a real backend route
- **Session expiry handling** -- if your login token expires, you're now cleanly redirected to log in again instead of seeing silent failed requests

### Quality
- **Automated tests** for the rule engine's core logic (`backend/tests/`), run with `npm test`
- **CI pipeline** (`.github/workflows/ci.yml`) that runs those tests on every push, if you push this to GitHub

### Frontend polish
- Basic responsive layout adjustments for narrow/mobile screens

## What still needs your own setup (can't be provided as code)

These require real accounts/credentials that only you can provide -- the
code is ready and will work the moment you fill these in:

- **Real email sending**: fill in `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` in
  `backend/.env`. Without these, alerts and password resets still work
  logically, they just log to the console instead of emailing anyone
  (same graceful-fallback pattern as before). Easiest free options: a
  Gmail account with an "app password", or a free tier from Resend/Mailtrap/SendGrid.
- **HTTPS**: when you deploy (e.g. to Render/Railway), these platforms
  provision HTTPS automatically -- nothing to configure in code, just don't
  run production traffic over plain `http://`.
- **Secrets management**: when deployed, set `JWT_SECRET`, `MONGO_URI`,
  `SMTP_PASS` etc. as environment variables in your hosting platform's
  dashboard, not in a committed `.env` file.
- **Database backups**: MongoDB Atlas's free tier has limited backup options;
  paid tiers include automated continuous backups -- this is an Atlas
  dashboard setting, not something to build.
- **Error monitoring** (e.g. Sentry): sign up for a free Sentry account,
  install `@sentry/node`, and initialize it in `server.js` with your DSN --
  intentionally left out here since it requires your own account/API key.
- **Horizontal scaling** (multiple backend instances): only relevant at real
  scale. Would need a Redis-backed Socket.io adapter (`@socket.io/redis-adapter`)
  so live events broadcast correctly across instances -- not implemented,
  since it requires a Redis instance and adds real complexity for a single-
  instance project like this one.

## What's intentionally out of scope for this project

- **Multi-user/team accounts with roles** -- meaningfully larger feature
  (shared sources, permissions, invites); a reasonable "if I had more time"
  answer in a viva, not something to bolt on quickly.
- **Message queueing for ingestion** (e.g. BullMQ) -- only matters at a
  volume this project will never hit in a demo; also needs Redis.
- **Full end-to-end test suite** -- only the rule engine's core logic is
  tested here as a representative example; a real production app would
  have much broader coverage (API integration tests, frontend tests).

## Prior usage instructions (still accurate)

See the earlier sections of this README history in your conversation with
Claude for the full walkthrough: signing up, adding a source, running the
agent, creating rules, and testing alerts end to end. The mechanics are
unchanged -- everything above is additive.
