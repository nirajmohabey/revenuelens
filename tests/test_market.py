"""Offline market-parser and comparison cases with hand-checkable values."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from pipeline import market


class MarketAcceptance(unittest.TestCase):
    def test_published_missing_tokens_are_not_zero(self):
        self.assertEqual(market.numeric(0),(0,'observed'))
        self.assertEqual(market.numeric('(S)'),(None,'suppressed'))
        self.assertEqual(market.numeric('(NA)'),(None,'unavailable'))
        self.assertEqual(market.numeric('(*)'),(None,'advance_not_available'))
        for invalid in (True,1.2,'unexpected token'):
            with self.assertRaises(ValueError):
                market.numeric(invalid)

    def test_split_labels_do_not_add_parent_or_nested_subtotals(self):
        rows=[
            ['441','Motor dealers',100],
            ['4411','Nested auto dealers',90],
            ['444','Building material & garden',None],
            [None,'supplies dealers',20],
            ['448','Clothing & accessories',None],
            [None,'stores',30],
            ['451','Sporting goods, hobby',None],
            [None,'and book stores',40],
        ]
        rows.append([None,'total',190])
        for code in ['442','443','445','446','447','452','453','454','722']:
            rows.append([code,'Other top-level sector',1])
        result=market.find_release_rows(rows,3)
        self.assertEqual(set(result),set(market.BY_ID))
        self.assertEqual(result['444'][0],4)
        self.assertEqual(result['451'][1][2],40)
        self.assertNotIn('4411',result)

    def test_sector_bridge_preserves_rounding_residual_and_pp(self):
        points={}
        months=['2026-10','2026-09','2025-10']
        for i,category in enumerate(market.CATEGORIES[1:]):
            for month,value in zip(months,[100+i,90+i,80+i]):
                points[category['id']+'|'+month]={'sa':value,'nsa':value*2}
        for month,residual in zip(months,[7,3,-2]):
            total=sum(points[c['id']+'|'+month]['sa'] for c in market.CATEGORIES[1:])+residual
            points['total|'+month]={'sa':total,'nsa':total*2}
        sa=market.build_bridge(points,'2026-10','sa')
        nsa=market.build_bridge(points,'2026-10','nsa')
        self.assertEqual(sa['residual']['current'],7)
        self.assertEqual(sa['residual']['delta'],4)
        self.assertEqual(sa['delta'],sum(s['delta'] for s in sa['sectors'])+4)
        self.assertEqual(nsa['delta'],sa['delta']*2)
        self.assertAlmostEqual(sum(s['momContributionPp'] for s in sa['sectors'])+100*4/sa['previous'],100*sa['delta']/sa['previous'])

    def test_missing_sector_is_unavailable_not_zero(self):
        points={'total|2026-10':{'sa':100},'total|2026-09':{'sa':90},'total|2025-10':{'sa':80}}
        result=market.build_bridge(points,'2026-10','sa')
        self.assertIsNone(result['sectors'][0]['current'])
        self.assertIsNone(result['sectors'][0]['delta'])
        self.assertIsNone(result['residual']['current'])

    def test_mrts_sections_month_headers_and_provenance(self):
        import openpyxl
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'fixture.xlsx'
            book=openpyxl.Workbook()
            sheet=book.active
            sheet.title='2026'
            sheet.cell(2,1,'Estimates are in millions of dollars')
            sheet.cell(5,3,'Jan. 2026')
            sheet.cell(5,4,'Feb. 2026(p)')
            rows=[
                ['', 'NOT ADJUSTED'],
                ['', 'Retail and food services sales, total',100,120],
                [441,'Motor vehicle and parts dealers',20,'(S)'],
                ['', 'ADJUSTED(2)'],
                ['', 'Retail and food services sales, total',110,115],
                [441,'Motor vehicle and parts dealers',22,23],
            ]
            for ordinal,values in enumerate(rows,6):
                for column,value in enumerate(values,1):
                    sheet.cell(ordinal,column,value)
            book.save(path)
            points,records={},[]
            market.parse_mrts(path,points,records)
            self.assertEqual(points['total|2026-01']['nsa'],100)
            self.assertEqual(points['total|2026-01']['sa'],110)
            self.assertEqual(points['441|2026-02']['status'],'preliminary')
            self.assertIsNone(points['441|2026-02']['nsa'])
            self.assertEqual(points['441|2026-02']['source']['sa'],{'file':'mrts','sheet':'2026','row':11,'column':'D'})
            self.assertEqual(len(records),8)

    def test_source_drift_fails_closed_without_network(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            raw=root/'raw'
            frozen=root/'frozen'
            raw.mkdir()
            (raw/'fixture.txt').write_text('original',encoding='utf-8')
            sources=[{'id':'fixture','name':'fixture.txt','url':'https://www.census.gov/fixture.txt','role':'test'}]
            with patch.multiple(market,ROOT=root,RAW=raw,SNAPSHOTS=frozen,SOURCES=sources):
                market.download()
                (raw/'fixture.txt').write_text('changed',encoding='utf-8')
                with self.assertRaisesRegex(ValueError,'checksum mismatch'):
                    market.download()

    def test_total_text_does_not_parse_seasonal_factors_as_sales(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'series.txt'
            path.write_text('RETAIL\n2026 100 200 300\nSEASONAL FACTORS\n2026 1 2 3',encoding='utf-8')
            result=market.parse_total_text(path)
            self.assertEqual(result['2026-01']['value'],100)
            self.assertEqual(result['2026-03']['value'],300)
            self.assertEqual(len(result),3)


if __name__=='__main__':
    unittest.main()
