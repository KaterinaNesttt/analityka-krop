# Project Context

Проєкт `analityka-krop` — платформа аналітики ринку нерухомості Кропивницького.

## Призначення

- Збирати та модерувати дані про продажі нерухомості.
- Давати користувачам перегляд підтверджених продажів і базову аналітику.
- Дозволяти staff-користувачам імпорт CSV, парсинг Telegram-тексту, модерацію та керування користувачами.

## Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS, shadcn/ui, React Router, TanStack Query, Recharts.
- Backend: Cloudflare Worker, Cloudflare D1.
- Auth: JWT access/refresh tokens, refresh token rotation, localStorage на frontend.
- Deploy: frontend окремо від Worker API; API URL задається через `VITE_API_URL`.

## Основні ролі

- `superuser`: повний доступ, включно з діями над superuser.
- `admin`: staff-доступ, користувачі, видалення продажів.
- `moderator`: staff-доступ до модерації, імпорту, редагування продажів.
- `user`: доступ до підтверджених продажів і аналітики.

## Основні frontend routes

- `/auth` — вхід і реєстрація.
- `/pending` — очікування підтвердження акаунта.
- `/dashboard` — staff dashboard.
- `/analytics` — аналітика.
- `/sales` — список продажів.
- `/sales/new` — створення продажу.
- `/sales/:id` — деталі продажу.
- `/import` — імпорт CSV/Telegram для staff.
- `/moderation` — модерація.
- `/users` — керування користувачами.
- `/settings` — налаштування.

## Правила роботи

- Не змінювати runtime-поведінку під час документаційних задач.
- Перед великими задачами звірятися з документацією в `docs/`.
- Для змін API/БД оновлювати відповідні docs разом із кодом.
