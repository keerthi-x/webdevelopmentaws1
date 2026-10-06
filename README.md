# VIT Recover

Campus lost-and-found for the VIT community. Students post Lost and Found notices on official campus landmarks, prove ownership through a private claim check, and coordinate returns at campus checkpoints — without publishing registration numbers, emails, or phone numbers.

## What it does

- Separate **Lost** and **Found** boards tagged to VIT academic blocks, hostel blocks, food courts, Central Library, and Sports Complex.
- Categories: ID Cards, Room Keys, Calculators, Lab Equipment, Earphones, Wallets.
- Public cards hide the reporter’s identity. Claimants answer a verification question set by the reporter.
- The reporter approves or rejects claims on a private desk. Approved pairs get an in-app handoff thread and pick an official meetup checkpoint.
- Either party can mark the item **Resolved**, which removes it from the active boards.

## Local setup

Requires **Node 22**.

```bash
npm install
```

Do not create a `.env` file for local preview. The app uses embedded Postgres (PGLite) when `DATABASE_URL` is unset, and Neon when it is set.

Sign-in is enabled. Supported methods: Google, X, and email/password. In this repo, email/password is turned on in `src/lib/auth/email-password.ts`.

## Database bootstrap

Schema lives in `migrations/` and is applied automatically:

| File | Purpose |
| --- | --- |
| `migrations/0001_auth.sql` | Better Auth identity tables (copied from `migrations/auth/`) |
| `migrations/0002_schema.sql` | `profiles`, `items`, `claims`, `messages` |
| `migrations/0003_seed.sql` | Sample campus notices so the boards are not empty |

- **Preview / no `DATABASE_URL`:** PGLite applies every `migrations/*.sql` file on startup.
- **Deployed / `DATABASE_URL` set:** `npm run build` runs `npm run db:migrate` (`scripts/migrate.mjs`).

To apply migrations against a Postgres URL without a full build:

```bash
DATABASE_URL=postgres://… npm run db:migrate
```

Never edit an already-applied migration. Add a new numbered file instead.

## Run

```bash
npm run dev
```

The app listens on `0.0.0.0:8080`.

Other scripts:

```bash
npm run typecheck
npm run build
npm run preview
```

## Privacy model

Server functions that touch a student’s data use verified session identity (`authMiddleware`) and never trust a client-supplied user id.

Public board payloads include title, description, category, venue, kind, status, timestamps, and the **verification question** — never `reporter_id`, registration number, email, or phone. Handoff threads label parties as Finder / Claimant rather than exposing accounts.

## Checkpoints

Approved claims coordinate at official desks such as SJT Ground Floor Reception and Central Library Security Desk. Phone numbers are not required for a return.
