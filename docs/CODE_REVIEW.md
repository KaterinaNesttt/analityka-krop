# Code Review

## Baseline

- Keep changes minimal and task-scoped.
- Read/write UTF-8 without BOM.
- Do not alter Cyrillic text unless directly required.
- Do not touch secrets, tokens, passwords, API keys, or private keys.
- Do not refactor unrelated code.
- Do not reformat unchanged code.

## Frontend Checklist

- API calls should go through `src/lib/api.ts`.
- Auth-sensitive views should use existing auth context and route guards.
- Reuse existing shadcn/ui components and local layout/components.
- Keep UI aligned with dark Liquid Glass/gold accent direction.
- Avoid blue as a dominant color unless required.
- Ensure text fits on mobile and desktop.
- Preserve existing query cache behavior when changing mutations.

## Worker Checklist

- Use prepared D1 statements and `.bind(...)`.
- Guard protected endpoints with `requireApproved` or `requireRole`.
- Keep `superuser` behavior intact.
- Keep role and status values aligned with `worker/src/types.ts`.
- Return consistent JSON errors through shared helpers.
- Do not leak password hashes, token hashes, or secrets.
- For `user` role, sales visibility must remain limited to `approved`.
- Analytics must use approved sales only unless a task explicitly changes that.

## DB Checklist

- Any schema change needs a new migration under `worker/migrations`.
- Update `docs/DB_SCHEMA.md` when final schema changes.
- Update `docs/API_CONTRACTS.md` if request/response fields change.
- Check seed data against the final migrated schema.
- Preserve indexes or recreate them when rebuilding tables.

## Deployment Checklist

- Confirm `VITE_API_URL` and Worker URL.
- Confirm `ALLOWED_ORIGIN` includes the frontend origin.
- Confirm `JWT_SECRET` and `JWT_REFRESH_SECRET` exist in Worker secrets.
- Confirm D1 binding name remains `DB`.

## Documentation Checklist

- Update relevant docs with code changes.
- Keep docs factual and short.
- Mark known drift in `KNOWN_ISSUES.md` instead of hiding it.
