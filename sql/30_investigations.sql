-- Exact signed movement reconciliation. Every raw numeric line has one disposition.
SELECT disposition,COUNT(*) AS rows,SUM(amount_units) AS amount_units
FROM raw_line GROUP BY disposition;

-- All known-customer factors share the identical eligible-sale population.
SELECT month,country,known_sales_units,customers,known_invoices,
 1.0*known_invoices/NULLIF(customers,0) AS invoices_per_customer,
 1.0*known_sales_units/10000/NULLIF(known_invoices,0) AS sales_per_invoice
FROM mart_monthly;

-- First observed means first in this finite snapshot, never true acquisition.
-- Same-timestamp distinct invoices are deliberately not counted as repurchase.
SELECT f.customer_key,f.first_stamp,f.cohort,f.first_country,
 MIN(i.stamp) AS second_later_stamp
FROM mart_customer_first f LEFT JOIN mart_invoice i
 ON i.customer_key=f.customer_key AND i.invoice_key<>f.first_invoice
 AND i.stamp>f.first_stamp AND i.stamp<=datetime(f.first_stamp,'+90 days')
GROUP BY f.customer_key,f.first_stamp,f.cohort,f.first_country;
