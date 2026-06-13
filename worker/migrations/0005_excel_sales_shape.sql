DROP INDEX IF EXISTS idx_sales_status;
DROP INDEX IF EXISTS idx_sales_date;
DROP INDEX IF EXISTS idx_sales_district;
DROP INDEX IF EXISTS idx_sales_type;
DROP INDEX IF EXISTS idx_sales_rooms;

CREATE TABLE sales_excel (
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

INSERT INTO sales_excel (
  id,
  district,
  floor,
  characteristics,
  sale_term,
  initial_price,
  final_price,
  comment,
  status,
  created_at,
  updated_at
)
SELECT
  id,
  district,
  CASE
    WHEN floor IS NOT NULL AND floors_total IS NOT NULL THEN CAST(floor AS TEXT) || '/' || CAST(floors_total AS TEXT)
    WHEN floor IS NOT NULL THEN CAST(floor AS TEXT)
    ELSE NULL
  END,
  NULL,
  sale_term,
  initial_price,
  final_price,
  comment,
  status,
  created_at,
  updated_at
FROM sales;

DROP TABLE sales;
ALTER TABLE sales_excel RENAME TO sales;

CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_district ON sales(district);
CREATE INDEX idx_sales_final_price ON sales(final_price);
