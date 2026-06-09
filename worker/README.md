# Аналітика Кроп — Cloudflare Worker

Бекенд для платформи на Cloudflare Workers + D1.

## Швидкий старт

```bash
cd worker
npm install            # або bun install / pnpm install
npx wrangler login

# 1. Створити D1 базу
npx wrangler d1 create analityka-krop
# Скопіювати database_id з виводу і вставити в wrangler.toml

# 2. Прогнати міграції
npx wrangler d1 migrations apply analityka-krop --remote

# 3. (Опційно) Завантажити демо-дані
npx wrangler d1 execute analityka-krop --remote --file=./seed.sql

# 4. Задати секрети
npx wrangler secret put JWT_SECRET           # будь-який довгий рядок
npx wrangler secret put JWT_REFRESH_SECRET   # інший довгий рядок

# 5. Деплой
npx wrangler deploy
```

Після деплою отримаєте URL виду `https://analityka-krop-api.<account>.workers.dev`.
Передайте його у фронтенд через змінну `VITE_API_URL`.

## CORS

У `wrangler.toml` встановіть `ALLOWED_ORIGIN` на URL фронтенду (Cloudflare Pages),
напр. `https://analityka-krop.pages.dev`. На час розробки можна залишити `*`.

## Перший адмін

Перший зареєстрований через `/api/auth/register` користувач автоматично
отримує роль `admin` і статус `approved`. Усі наступні — `user` + `pending`,
і потребують підтвердження адміністратором.

## Локальна розробка

```bash
npx wrangler d1 migrations apply analityka-krop --local
npx wrangler d1 execute analityka-krop --local --file=./seed.sql
npx wrangler dev
```

## Структура

- `src/index.ts` — роутер
- `src/auth.ts` — реєстрація/логін/refresh (JWT HS256 + PBKDF2)
- `src/middleware.ts` — `requireAuth`, `requireRole`, `requireApproved`
- `src/sales.ts` — CRUD продажів + фільтри
- `src/analytics.ts` — агрегації, без БД-агрегатів (для простоти)
- `src/imports.ts` — парсинг Telegram-тексту + CSV-імпорт
- `src/users.ts` — керування користувачами (admin)
- `migrations/0001_init.sql` — схема D1
- `seed.sql` — демо-дані (is_demo=1, чистяться через `DELETE /api/sales/demo`)
