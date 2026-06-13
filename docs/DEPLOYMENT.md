# Deployment

## Frontend

Root package scripts:

```bash
npm run dev
npm run build
npm run build:dev
npm run preview
npm run lint
npm run format
```

API URL:

- `VITE_API_URL` controls the Worker API base URL.
- In dev, empty `VITE_API_URL` means relative API paths.
- In production, frontend falls back to `https://analityka-krop-api.roman-v-shkurenko.workers.dev` if `VITE_API_URL` is not set.

## Worker

Worker config: `wrangler.toml`.

Current configured values:

- Worker name: `analityka-krop-api`
- Main: `worker/src/index.ts`
- Compatibility date: `2026-06-06`
- D1 binding: `DB`
- D1 database name: `anal`
- Migrations dir: `migrations`
- Env var: `ALLOWED_ORIGIN`

Worker package scripts from `worker/package.json`:

```bash
npm run build
npm run dev
npm run deploy
npm run typecheck
npm run db:migrate:local
npm run db:migrate
npm run db:seed
```

## Secrets

Required Worker secrets:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

Use different long random strings.

## D1

Remote migrations:

```bash
npx wrangler d1 migrations apply anal --remote
```

Local migrations:

```bash
npx wrangler d1 migrations apply anal --local
```

Seed:

```bash
npx wrangler d1 execute anal --remote --file=./seed.sql
```

Before running commands, verify the working directory and `wrangler.toml` path because the root config points to `worker/src/index.ts`, while worker scripts run from `worker/`.

## CORS

`ALLOWED_ORIGIN` is configured in `wrangler.toml`.

Current value includes:

- `https://analityka-krop.pages.dev`
- `http://localhost:8080`

When frontend domain changes, update `ALLOWED_ORIGIN`.

## Bootstrap Admin

The first registered user becomes `admin` with `approved` status.
All later users start as `user` with `pending` status and need approval.

## Verification

For code changes:

- Frontend: `npm run build`
- Worker: from worker context, `npm run typecheck` or `npm run build`

For documentation-only changes, build is not required.
