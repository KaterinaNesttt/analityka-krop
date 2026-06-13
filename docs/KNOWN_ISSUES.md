# Known Issues

## Worker README Drift

`worker/README.md` says `seed.sql` contains `is_demo=1` records and mentions cleanup through `DELETE /api/sales/demo`.

Current Worker routes do not define `DELETE /api/sales/demo`, and final `sales` schema after migrations no longer contains `is_demo`.

Before relying on seed/demo cleanup docs, update README, seed, or Worker route behavior.

## Seed vs Final Schema

`worker/seed.sql` was written for older `sales` columns such as `address_hint`, `living_area`, `kitchen_area`, `year_built`, `discount_amount`, `discount_percent`, `source_text`, `listing_url`, `is_demo`, `submitted_by`, `reviewed_by`, `reviewed_at`.

Final `sales` table after migrations does not include those columns.

Seed may fail against the current migrated schema unless adjusted.

## Wrangler Working Directory

Root `wrangler.toml` uses:

```toml
main = "worker/src/index.ts"
migrations_dir = "migrations"
```

Worker package scripts are inside `worker/`. Verify command cwd and config resolution before deploy/migrations.

## Frontend Production API Fallback

`src/lib/api.ts` has a production fallback Worker URL. If the API is redeployed to another account/domain, set `VITE_API_URL` explicitly.

## Type Strictness

Several frontend pages and Worker modules use `any`. Avoid broad type rewrites unless the task specifically asks for it.

## Analytics Implementation

Analytics loads approved sales into memory and aggregates in Worker code. This is simple but may need SQL aggregation/pagination if data volume grows.

## Offline Limits

Offline mode works after the user has opened the app and loaded the needed data online at least once.

Only sale creation and prepared CSV import are queued offline. Telegram parsing, moderation, user management, role changes, blocking, and deletion require online API access.
