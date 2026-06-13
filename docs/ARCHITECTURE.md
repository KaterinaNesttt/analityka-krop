# Architecture

## Загальна схема

Frontend працює як Vite/React SPA і звертається до Cloudflare Worker API через `src/lib/api.ts`.
Worker маршрутизує `/api/*` запити, перевіряє JWT, працює з D1 через prepared statements і повертає JSON.

## Frontend

- Entry point: `src/main.tsx`.
- Routing: `src/App.tsx`.
- Layout для авторизованих сторінок: `src/layouts/AuthenticatedLayout.tsx`.
- API client: `src/lib/api.ts`.
- Auth state: `src/lib/auth-context.tsx`.
- UI primitives: `src/components/ui/*`.
- Domain pages: `src/pages/*`.

API client:

- бере базовий URL з `VITE_API_URL`;
- у dev без `VITE_API_URL` використовує relative URL;
- у production fallback — Worker URL;
- додає `Authorization: Bearer <access>`;
- при `401` пробує `/api/auth/refresh` і повторює запит.

## Backend Worker

- Entry point/router: `worker/src/index.ts`.
- Auth handlers: `worker/src/auth.ts`.
- Auth guards: `worker/src/middleware.ts`.
- Sales CRUD/filtering: `worker/src/sales.ts`.
- Analytics aggregations: `worker/src/analytics.ts`.
- Imports: `worker/src/imports.ts`.
- Users management: `worker/src/users.ts`.
- Shared utils/JWT/password/CORS: `worker/src/utils.ts`.
- Types: `worker/src/types.ts`.

## Data Flow

1. User входить через `/api/auth/login`.
2. Frontend зберігає `ak.access` і `ak.refresh` у `localStorage`.
3. Authenticated API calls ідуть з Bearer token.
4. Worker перевіряє JWT і статус користувача.
5. D1 повертає дані, Worker формує JSON response.
6. Frontend кешує server state через TanStack Query.

## Access Model

- `requireAuth`: потрібен валідний Bearer token, blocked користувачі отримують `403`.
- `requireApproved`: додатково вимагає `status = approved`.
- `requireRole`: `superuser` проходить завжди, інші ролі мають бути в allowlist.
- Користувачі з роллю `user` бачать тільки `approved` продажі.
- Staff бачить більше полів і може працювати з pending/rejected/duplicate.

## Storage

- Основне сховище: Cloudflare D1.
- Таблиці: `users`, `refresh_tokens`, `sales`, `imports`, `audit_logs`.
- Міграції лежать у `worker/migrations`.
