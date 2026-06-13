CREATE TABLE IF NOT EXISTS cache_versions (
  entity TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO cache_versions (entity, version, updated_at)
VALUES
  ('sales', 1, CURRENT_TIMESTAMP),
  ('users', 1, CURRENT_TIMESTAMP),
  ('imports', 1, CURRENT_TIMESTAMP);

