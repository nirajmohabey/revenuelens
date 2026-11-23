PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS dataset (
 sha256 TEXT PRIMARY KEY, source_url TEXT NOT NULL, imported_at TEXT NOT NULL,
 row_count INTEGER NOT NULL DEFAULT 0, profile_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS raw_line (
 id INTEGER PRIMARY KEY, source_sha TEXT NOT NULL REFERENCES dataset(sha256),
 sheet TEXT NOT NULL, source_row INTEGER NOT NULL, content_hash TEXT NOT NULL,
 payload TEXT NOT NULL, invoice TEXT, stock TEXT, description TEXT,
 quantity INTEGER, price_units INTEGER, stamp TEXT, customer TEXT, country TEXT,
 amount_units INTEGER, disposition TEXT NOT NULL, reason TEXT NOT NULL,
 duplicate_candidate INTEGER NOT NULL DEFAULT 0,
 UNIQUE(source_sha, sheet, source_row)
);
CREATE TABLE IF NOT EXISTS dim_customer (customer_key TEXT PRIMARY KEY, is_unknown INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS dim_product (product_key TEXT PRIMARY KEY, description TEXT);
CREATE TABLE IF NOT EXISTS dim_country (country_key TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS dim_invoice (
 invoice_key TEXT PRIMARY KEY, stamp TEXT NOT NULL,
 customer_key TEXT NOT NULL REFERENCES dim_customer(customer_key),
 country_key TEXT NOT NULL REFERENCES dim_country(country_key)
);
CREATE TABLE IF NOT EXISTS fact_invoice_line (
 raw_id INTEGER PRIMARY KEY REFERENCES raw_line(id),
 invoice_key TEXT NOT NULL REFERENCES dim_invoice(invoice_key),
 product_key TEXT NOT NULL REFERENCES dim_product(product_key),
 customer_key TEXT NOT NULL REFERENCES dim_customer(customer_key),
 country_key TEXT NOT NULL REFERENCES dim_country(country_key),
 stamp TEXT NOT NULL, month TEXT NOT NULL, quantity INTEGER NOT NULL,
 price_units INTEGER NOT NULL, amount_units INTEGER NOT NULL,
 line_class TEXT NOT NULL CHECK(line_class IN ('sale','cancellation')),
 duplicate_candidate INTEGER NOT NULL
);
