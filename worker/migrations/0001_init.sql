-- Initial schema for Аналітика Кроп
-- Cloudflare D1 (SQLite)

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
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_hash ON refresh_tokens(token_hash);

CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  property_type TEXT NOT NULL,
  district TEXT NOT NULL,
  address_hint TEXT,
  rooms INTEGER,
  total_area REAL NOT NULL,
  living_area REAL,
  kitchen_area REAL,
  floor INTEGER,
  floors_total INTEGER,
  building_type TEXT,
  condition TEXT,
  year_built INTEGER,
  initial_price REAL,
  final_price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  discount_amount REAL,
  discount_percent REAL,
  sale_date TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_text TEXT,
  listing_url TEXT,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  is_demo INTEGER NOT NULL DEFAULT 0,
  submitted_by TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_district ON sales(district);
CREATE INDEX idx_sales_type ON sales(property_type);
CREATE INDEX idx_sales_rooms ON sales(rooms);

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

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
