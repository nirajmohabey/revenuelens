"""Hand-checkable acceptance cases; no network or UCI download needed."""
from datetime import datetime
import hashlib
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from pipeline.cli import (ROOT, SCALE, UNKNOWN, ALL, RULE, build_facts, classify,
                          export_cohorts, import_workbook, metrics, shapley, bridge,
                          require_current_rules, classification_hash)


class PipelineAcceptance(unittest.TestCase):
    def connection(self):
        con = sqlite3.connect(':memory:')
        con.row_factory = sqlite3.Row
        con.executescript((ROOT / 'sql/00_schema.sql').read_text(encoding='utf-8'))
        con.execute("INSERT INTO dataset(sha256,source_url,imported_at) VALUES ('fixture','fixture','2026-01-01')")
        return con

    def add(self, con, row, values):
        typed = classify(values)
        payload = json.dumps(values, default=str)
        con.execute('''INSERT INTO raw_line(source_sha,sheet,source_row,content_hash,payload,
          invoice,stock,description,quantity,price_units,stamp,customer,country,amount_units,disposition,reason)
          VALUES ('fixture','fixture',?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                    (row, hashlib.sha256(payload.encode()).hexdigest(), payload, *typed))

    def test_exact_money_and_explicit_dispositions(self):
        stamp = datetime(2011, 1, 31, 12)
        sale = ['100','SKU','Widget',3,stamp,0.001,1,'UK']
        self.assertEqual(classify(sale)[8], 30)
        self.assertEqual(classify(sale)[9], 'sale')
        self.assertEqual(classify(['C100','SKU','Widget',-2,stamp,2,1,'UK'])[9], 'cancellation')
        self.assertEqual(classify(['C100','SKU','Widget',2,stamp,2,1,'UK'])[9], 'other_movement')
        self.assertEqual(classify(['100','SKU','Widget',2,'bad date',2,None,'UK'])[9], 'quarantined')
        self.assertEqual(classify(['100','POST','Postage',2,stamp,2,1,'UK'])[9], 'non_merchandise')
        # Review found PADS is a physical cushion product; it must stay eligible.
        self.assertEqual(classify(['100','PADS','PADS TO MATCH ALL CUSHIONS',1,stamp,0.001,1,'UK'])[9], 'sale')
        self.assertEqual(classify(['100','SKU','Widget',2,stamp,0,1,'UK'])[9], 'other_movement')
        self.assertEqual(classify(['100','SKU','Widget',2,stamp,'oops',1,'UK'])[9], 'unparsed_amount')
        self.assertEqual(classify(['100','SKU','Widget',2,stamp,2,None,'UK'])[6], UNKNOWN)

    def test_eight_line_fixture_reconciles_and_retains_duplicate_candidates(self):
        con = self.connection()
        d = datetime(2011, 1, 1, 12)
        rows = [
            ['1','SKU','Widget',2,d,5,1,'UK'],       # +10 sale
            ['C2','SKU','Widget',-1,d,5,1,'UK'],     # -5 cancellation
            ['3','SKU','Widget',1,'bad',4,1,'UK'],  # +4 quarantine
            ['4','SKU','Widget',1,d,3,None,'UK'],   # +3 anonymous sale
            ['1','SKU','Widget',2,d,5,1,'UK'],      # +10 duplicate candidate retained
            ['C5','SKU','Widget',1,d,2,1,'UK'],     # +2 unusual sign
            ['6','SKU','Widget',1,d,0,1,'UK'],      # 0 free
            ['7','SKU','Widget',1,d,7,1,'UK'],      # +7 collision
            ['7','SKU','Widget',1,d,8,2,'UK'],      # +8 collision
        ]
        for i, row in enumerate(rows, 2):
            self.add(con, i, row)
        build_facts(con)
        self.assertEqual(con.execute('SELECT COUNT(*) FROM raw_line').fetchone()[0], 9)
        self.assertEqual(con.execute('SELECT SUM(amount_units) FROM raw_line').fetchone()[0], 39*SCALE)
        self.assertEqual(con.execute("SELECT SUM(amount_units) FROM fact_invoice_line WHERE line_class='sale'").fetchone()[0], 23*SCALE)
        self.assertEqual(con.execute('SELECT COUNT(*) FROM duplicate_group').fetchone()[0], 1)
        self.assertEqual(con.execute('SELECT SUM(duplicate_candidate) FROM raw_line').fetchone()[0], 2)
        self.assertEqual(con.execute("SELECT COUNT(*) FROM fact_invoice_line WHERE invoice_key='7'").fetchone()[0], 0)
        self.assertEqual(con.execute('SELECT SUM(rows) FROM invoice_collision').fetchone()[0], 2)
        self.assertEqual(con.execute('PRAGMA foreign_key_check').fetchall(), [])
        # Rebuild produces the same exact result, and the invoice-line join has no fanout.
        build_facts(con)
        self.assertEqual(con.execute('SELECT COUNT(*) FROM fact_invoice_line').fetchone()[0], 4)
        con.close()

    def test_same_workbook_import_is_idempotent(self):
        import openpyxl
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'fixture.xlsx'
            wb = openpyxl.Workbook()
            sheet = wb.active
            sheet.title = 'Fixture'
            sheet.append(['Invoice','StockCode','Description','Quantity','InvoiceDate','Price','Customer ID','Country'])
            sheet.append(['1','SKU','Widget',2,datetime(2011,1,31,12),1.25,1,'UK'])
            wb.save(path)
            con = sqlite3.connect(':memory:')
            con.row_factory = sqlite3.Row
            con.executescript((ROOT / 'sql/00_schema.sql').read_text(encoding='utf-8'))
            try:
                with patch('pipeline.cli.write_json'):
                    one = import_workbook(con, path)
                    two = import_workbook(con, path)
                self.assertEqual(one['sha256'], two['sha256'])
                self.assertEqual(con.execute('SELECT COUNT(*) FROM raw_line').fetchone()[0], 1)
            finally:
                con.close()

    def test_shapley_exact_identity_and_zero_denominator(self):
        old = {'customers': 10,'knownInvoices': 20,'knownSales': 1000}
        new = {'customers': 12,'knownInvoices': 36,'knownSales': 2160}
        parts = shapley(old, new)
        self.assertAlmostEqual(sum(x['contribution'] for x in parts), 1160)
        self.assertIsNone(shapley({'customers':0,'knownInvoices':0,'knownSales':0},new))
        self.assertIsNone(metrics()['aov'])

    def test_cohort_month_boundary_maturity_and_strict_distinct_invoice(self):
        con = self.connection()
        rows = [
            ['1','A','Widget',1,datetime(2011,1,31,12),1,1,'UK'],
            ['1','B','Other line',1,datetime(2011,1,31,12),1,1,'UK'],
            ['2','A','Simultaneous invoice',1,datetime(2011,1,31,12),1,1,'UK'],
            ['3','A','Repeat next month',1,datetime(2011,2,1,12),1,1,'France'],
            ['4','A','Anonymous',1,datetime(2011,1,31,12),1,None,'UK'],
            ['5','A','Immature customer',1,datetime(2011,9,15,12),1,2,'UK'],
            ['6','A','Simultaneous-only customer',1,datetime(2011,1,15,12),1,3,'UK'],
            ['7','A','Same timestamp',1,datetime(2011,1,15,12),1,3,'UK'],
        ]
        for i, row in enumerate(rows, 2):
            self.add(con,i,row)
        build_facts(con)
        profile = {'cohortObservationCutoff':'2011-12-09 12:50:00','completeThrough':'2011-11-30'}
        cohorts = export_cohorts(con,profile)
        jan = next(x for x in cohorts[ALL] if x['cohort']=='2011-01')
        self.assertEqual(jan['size'],2)       # Anonymous excluded
        self.assertEqual(jan['mature90'],2)
        self.assertEqual(jan['repeat90'],1)   # Same timestamp never a repeat
        self.assertEqual(jan['cells'][1]['rate'],0.5)
        self.assertIsNone(jan['cells'][11]['rate'])  # December incomplete
        self.assertEqual(next(x for x in cohorts['UK'] if x['cohort']=='2011-01')['size'],2)
        self.assertNotIn('France',cohorts)    # Country fixed at first purchase
        sep = next(x for x in cohorts[ALL] if x['cohort']=='2011-09')
        self.assertEqual(sep['mature90'],0)
        self.assertIsNone(sep['repeat90Rate'])
        con.close()

    def test_bridge_other_residual(self):
        old = {str(i):i*10000 for i in range(20)}
        new = {str(i):i*20000 for i in range(20)}
        rows = bridge(old,new,limit=3)
        self.assertEqual(rows[-1]['name'],'Other')
        self.assertAlmostEqual(sum(r['delta'] for r in rows),190)

    def test_stale_classification_fails_closed(self):
        require_current_rules({'ruleVersion':RULE,'classificationSha256':classification_hash()})
        for profile in ({'ruleVersion':RULE}, {'ruleVersion':RULE,'classificationSha256':'older-rules'},
                        {'ruleVersion':'older-version','classificationSha256':classification_hash()}):
            with self.assertRaisesRegex(ValueError,'fresh database'):
                require_current_rules(profile)


if __name__ == '__main__':
    unittest.main()
