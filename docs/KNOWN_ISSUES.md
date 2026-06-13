# Known Issues

## Frontend Production API Fallback

`src/lib/api.ts` has a production fallback Worker URL. If the API is redeployed to another account/domain, set `VITE_API_URL` explicitly.

## Type Strictness

Several frontend pages and Worker modules use `any`. Avoid broad type rewrites unless the task specifically asks for it.

## Analytics Implementation

Analytics loads approved sales into memory and aggregates in Worker code. This is simple but may need SQL aggregation/pagination if data volume grows.

## Offline Limits

Offline mode works after the user has opened the app and loaded the needed data online at least once.

Only sale creation and prepared CSV import are queued offline. Telegram parsing, moderation, user management, role changes, blocking, and deletion require online API access.
