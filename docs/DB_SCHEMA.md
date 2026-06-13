# DB Schema

Database: Cloudflare D1 / SQLite.

Migrations directory: `worker/migrations`.

## `users`

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);
```

Indexes:

- `idx_users_status ON users(status)`
- `idx_users_role ON users(role)`

Roles:

- `superuser`
- `admin`
- `moderator`
- `user`

Statuses:

- `pending`
- `approved`
- `blocked`

## `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Indexes:

- `idx_refresh_user ON refresh_tokens(user_id)`
- `idx_refresh_hash ON refresh_tokens(token_hash)`

Notes:

- Refresh tokens are stored as HMAC hashes.
- Refresh rotation sets `revoked_at` on the used token.

## `sales`

Final shape after migrations:

```sql
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  district TEXT NOT NULL,
  floor TEXT,
  characteristics TEXT,
  sale_term TEXT,
  initial_price REAL,
  final_price REAL,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Indexes:

- `idx_sales_status ON sales(status)`
- `idx_sales_created_at ON sales(created_at)`
- `idx_sales_district ON sales(district)`
- `idx_sales_final_price ON sales(final_price)`

Statuses:

- `pending`
- `approved`
- `rejected`
- `duplicate`

Important:

- `district` is the only required business field.
- `floor` is text to preserve spreadsheet values like `9/5`.
- `final_price` can be `NULL`.
- Analytics should use approved sales only.

## `imports`

```sql
CREATE TABLE imports (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  file_name TEXT,
  raw_text TEXT,
  imported_by TEXT,
  total_rows INTEGER,
  created_count INTEGER,
  duplicate_count INTEGER,
  error_count INTEGER,
  created_at TEXT NOT NULL
);
```

Used by CSV import history.

## `audit_logs`

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL
);
```

Indexes:

- `idx_audit_user ON audit_logs(user_id)`
- `idx_audit_entity ON audit_logs(entity_type, entity_id)`

Currently used for user approve/role/block events.

## `cache_versions`

```sql
CREATE TABLE cache_versions (
  entity TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
```

Entities:

- `sales`
- `users`
- `imports`

Used for API `ETag` generation. Versions are incremented only by mutations that change the related entity cache.

## Migration Notes

- `0001_init.sql` created the initial schema.
- `0002_property_table_fields.sql` added property detail fields to `sales`.
- `0003_prune_sales_columns.sql` removed unused sale columns by rebuilding `sales`.
- `0004_allow_missing_total_area.sql` rebuilt `sales` so `total_area` can be missing.
- `0005_excel_sales_shape.sql` rebuilt `sales` to match the spreadsheet format.
- `0006_cache_versions.sql` added cache version stamps for offline/ETag support.
