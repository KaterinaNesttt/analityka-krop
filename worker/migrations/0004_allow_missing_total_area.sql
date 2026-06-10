DROP INDEX IF EXISTS idx_sales_status;
DROP INDEX IF EXISTS idx_sales_date;
DROP INDEX IF EXISTS idx_sales_district;
DROP INDEX IF EXISTS idx_sales_type;
DROP INDEX IF EXISTS idx_sales_rooms;

CREATE TABLE sales_next (
  id TEXT PRIMARY KEY,
  property_type TEXT NOT NULL,
  district TEXT NOT NULL,
  rooms INTEGER,
  total_area REAL,
  floor INTEGER,
  floors_total INTEGER,
  building_type TEXT,
  land_area TEXT,
  communications TEXT,
  amenities TEXT,
  condition TEXT,
  furniture TEXT,
  sale_term TEXT,
  initial_price REAL,
  final_price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  sale_date TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'csv',
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO sales_next (
  id,
  property_type,
  district,
  rooms,
  total_area,
  floor,
  floors_total,
  building_type,
  land_area,
  communications,
  amenities,
  condition,
  furniture,
  sale_term,
  initial_price,
  final_price,
  currency,
  sale_date,
  source_type,
  comment,
  status,
  created_at,
  updated_at
)
SELECT
  id,
  property_type,
  district,
  rooms,
  total_area,
  floor,
  floors_total,
  building_type,
  land_area,
  communications,
  amenities,
  condition,
  furniture,
  sale_term,
  initial_price,
  final_price,
  currency,
  sale_date,
  source_type,
  comment,
  status,
  created_at,
  updated_at
FROM sales;

DROP TABLE sales;
ALTER TABLE sales_next RENAME TO sales;

CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_district ON sales(district);
CREATE INDEX idx_sales_type ON sales(property_type);
CREATE INDEX idx_sales_rooms ON sales(rooms);
