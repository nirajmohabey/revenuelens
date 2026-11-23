CREATE INDEX IF NOT EXISTS ix_raw_invoice ON raw_line(invoice);
CREATE INDEX IF NOT EXISTS ix_raw_content ON raw_line(content_hash);
CREATE INDEX IF NOT EXISTS ix_fact_month ON fact_invoice_line(month,country_key,line_class);
CREATE INDEX IF NOT EXISTS ix_fact_customer ON fact_invoice_line(customer_key,stamp);
CREATE INDEX IF NOT EXISTS ix_fact_invoice ON fact_invoice_line(invoice_key);
DROP VIEW IF EXISTS mart_invoice;
DROP TABLE IF EXISTS mart_invoice_snapshot;
CREATE TABLE mart_invoice_snapshot AS
SELECT invoice_key, MIN(stamp) AS stamp, month, country_key, customer_key,
 SUM(amount_units) AS sales_units, SUM(quantity) AS units, COUNT(*) AS line_count
FROM fact_invoice_line WHERE line_class='sale'
GROUP BY invoice_key,month,country_key,customer_key;
CREATE UNIQUE INDEX ix_mart_invoice ON mart_invoice_snapshot(invoice_key);
CREATE INDEX ix_mart_invoice_customer ON mart_invoice_snapshot(customer_key,stamp);
CREATE VIEW mart_invoice AS SELECT * FROM mart_invoice_snapshot;
DROP VIEW IF EXISTS mart_customer_first;
CREATE VIEW mart_customer_first AS
WITH ranked AS (
 SELECT *,ROW_NUMBER() OVER(PARTITION BY customer_key ORDER BY stamp,invoice_key) AS n
 FROM mart_invoice WHERE customer_key <> '__UNKNOWN__'
)
SELECT customer_key,stamp AS first_stamp,month AS cohort,country_key AS first_country,
 invoice_key AS first_invoice FROM ranked WHERE n=1;
DROP VIEW IF EXISTS mart_monthly;
CREATE VIEW mart_monthly AS
SELECT month,country_key AS country,
 SUM(CASE WHEN line_class='sale' THEN amount_units ELSE 0 END) AS sales_units,
 -SUM(CASE WHEN line_class='cancellation' THEN amount_units ELSE 0 END) AS cancellation_units,
 COUNT(DISTINCT CASE WHEN line_class='sale' THEN invoice_key END) AS invoices,
 COUNT(DISTINCT CASE WHEN line_class='sale' AND customer_key<>'__UNKNOWN__' THEN customer_key END) AS customers,
 SUM(CASE WHEN line_class='sale' AND customer_key<>'__UNKNOWN__' THEN amount_units ELSE 0 END) AS known_sales_units,
 COUNT(DISTINCT CASE WHEN line_class='sale' AND customer_key<>'__UNKNOWN__' THEN invoice_key END) AS known_invoices,
 SUM(CASE WHEN line_class='sale' AND customer_key='__UNKNOWN__' THEN amount_units ELSE 0 END) AS anonymous_sales_units,
 SUM(CASE WHEN line_class='sale' THEN quantity ELSE 0 END) AS units,
 COUNT(*) AS rows
FROM fact_invoice_line GROUP BY month,country_key;
