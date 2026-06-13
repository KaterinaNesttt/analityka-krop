# API Contracts

Base URL задається через `VITE_API_URL`. Усі endpoint-и Worker мають CORS і повертають JSON. Помилки повертаються як `{ "error": string }`.

## Cache Validation

GET endpoints для великих читань підтримують `ETag`:

- `GET /api/sales`
- `GET /api/sales/:id`
- `GET /api/users`
- `GET /api/imports`

Клієнт може надсилати `If-None-Match`. Якщо version stamp не змінився, API повертає `304` без body. Відповіді мають `Cache-Control: private, no-cache`. Формат JSON body для `200` не змінюється.

## Auth

### `POST /api/auth/register`

Body:

```json
{ "email": "user@example.com", "password": "password123", "name": "Name" }
```

Rules:

- email має бути валідним;
- password мінімум 8 символів;
- перший користувач стає `admin` + `approved`;
- наступні користувачі стають `user` + `pending`.

Response `201`:

```json
{ "id": "id", "email": "user@example.com", "role": "user", "status": "pending", "name": "Name", "message": "..." }
```

### `POST /api/auth/login`

Body:

```json
{ "email": "user@example.com", "password": "password123" }
```

Response:

```json
{ "access": "jwt", "refresh": "jwt", "user": { "id": "id", "email": "user@example.com", "name": null, "role": "user", "status": "approved" } }
```

### `POST /api/auth/refresh`

Body:

```json
{ "refresh": "jwt" }
```

Response:

```json
{ "access": "jwt", "refresh": "jwt" }
```

Refresh token ротується: старий token позначається revoked.

### `POST /api/auth/logout`

Body:

```json
{ "refresh": "jwt" }
```

Response:

```json
{ "ok": true }
```

### `GET /api/auth/me`

Auth: Bearer access token.

Response:

```json
{ "user": { "id": "id", "email": "user@example.com", "name": null, "role": "user", "status": "approved" } }
```

## Users

Auth: `admin`, або `superuser`.

- `GET /api/users` returns `{ "users": [...] }`.
- `PATCH /api/users/:id/approve` returns `{ "ok": true }`.
- `PATCH /api/users/:id/role` body `{ "role": "admin" }`, returns `{ "ok": true }`.
- `PATCH /api/users/:id/block` body `{ "unblock": true }`, returns `{ "ok": true, "status": "approved" }`.

Non-superuser не може змінювати або блокувати `superuser`.

## Sales

Auth: approved user.

Sale fields:

- `district`
- `floor`
- `characteristics`
- `sale_term`
- `initial_price`
- `final_price`
- `comment`
- `status`

### `GET /api/sales`

Query filters:

- `district`
- `price_min`, `price_max`
- `status`
- `sort`
- `limit`

Sort values:

- `created_at_desc`
- `created_at_asc`
- `price_desc`
- `price_asc`
- `district`

Users з роллю `user` завжди бачать тільки `approved`; staff може фільтрувати `status`.

### `POST /api/sales`

Required fields:

- `district`

Response `201`:

```json
{ "id": "id", "status": "pending", "message": "Дані відправлено на перевірку" }
```

Staff може створити `pending` або `approved`. Role `user` завжди створює `pending`.

### `GET /api/sales/:id`

Returns:

```json
{ "sale": {} }
```

Role `user` не бачить non-approved sale.

### Staff sales actions

Auth: `admin`, `moderator`, або `superuser`.

- `PATCH /api/sales/:id` updates editable sale fields.
- `PATCH /api/sales/:id/approve` sets `status = approved`.
- `PATCH /api/sales/:id/reject` sets `status = rejected`.
- `PATCH /api/sales/:id/duplicate` sets `status = duplicate`.

Delete:

- `DELETE /api/sales/:id` requires `admin` або `superuser`.

## Analytics

Auth: approved user. Analytics завжди рахується тільки по `approved` sales.

Endpoints:

- `GET /api/analytics/summary`
- `GET /api/analytics/price-dynamics`
- `GET /api/analytics/price-per-m2`
- `GET /api/analytics/districts`
- `GET /api/analytics/floors`
- `GET /api/analytics/discounts`
- `GET /api/analytics/comparison`
- `GET /api/analytics/distribution`

Підтримують ті самі filters, що й `GET /api/sales`, через shared `parseFilters`.

## Imports

Auth: `admin`, `moderator`, або `superuser`.

### `POST /api/import/telegram-text`

Body:

```json
{ "text": "..." }
```

Response:

```json
{ "parsed": {} }
```

### `POST /api/import/csv`

Body:

```json
{ "rows": [], "file_name": "file.csv", "status": "approved" }
```

Response:

```json
{ "total": 10, "created": 8, "duplicates": 1, "errors": 1 }
```

### `GET /api/imports`

Returns latest 100 import records.

## Common Errors

- `400`: invalid body or missing required field.
- `401`: missing/invalid auth or refresh.
- `403`: blocked, pending, or insufficient role.
- `404`: route/entity not found.
- `409`: duplicate email on register.
- `500`: unhandled Worker error.
