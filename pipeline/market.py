"""Frozen November 17, 2026 U.S. Census retail-market release.

Grain: one current-vintage month/category/adjustment estimate, USD millions.
This market dataset has no customer, invoice, retention, or causal outcomes.
The separate 2011 transaction laboratory remains in pipeline.cli.
"""
from __future__ import annotations

import argparse
import calendar
from collections import Counter
from datetime import datetime, timezone
import hashlib
import html
import json
from pathlib import Path
import platform
import re
import shutil
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/raw/market'
SNAPSHOTS = ROOT / 'data/snapshots/market/2026-11-17'
RULE = 'census-retail-market-v1.0.0'
RELEASE = '2026-11-17'
LATEST = '2026-10'
SOURCES = [
    {'id':'mrts','name':'mrtssales92-present.xlsx','url':'https://www.census.gov/retail/mrts/www/mrtssales92-present.xlsx','role':'Monthly historical SA/NSA levels through September 2026'},
    {'id':'marts','name':'marts_current.xlsx','url':'https://www.census.gov/retail/marts/www/marts_current.xlsx','role':'October advance levels, matched comparison values, reported changes, sampling/revision medians'},
    {'id':'release','name':'sales.html','url':'https://www.census.gov/retail/sales.html','role':'Release date and directly published headline uncertainty'},
    {'id':'total-series','name':'adv44X72.txt','url':'https://www.census.gov/retail/marts/www/adv44X72.txt','role':'Independent text representation of the total seasonally adjusted series'},
    {'id':'methodology','name':'marts_methodology.html','url':'https://www.census.gov/retail/marts/how_surveys_are_collected.html','role':'Meaning of sampling margins and seasonality adjustment'},
    {'id':'release-pdf','name':'marts_current.pdf','url':'https://www.census.gov/retail/marts/www/marts_current.pdf','role':'Human-readable release and table footnotes'},
]
CATEGORIES = [
    {'id':'total','name':'Retail and food services, total','shortName':'All retail & food services','additive':False},
    {'id':'441','name':'Motor vehicle and parts dealers','shortName':'Motor vehicles & parts','additive':True},
    {'id':'442','name':'Furniture and home furnishings stores','shortName':'Furniture & home','additive':True},
    {'id':'443','name':'Electronics and appliance stores','shortName':'Electronics & appliances','additive':True},
    {'id':'444','name':'Building material and garden equipment and supplies dealers','shortName':'Building & garden','additive':True},
    {'id':'445','name':'Food and beverage stores','shortName':'Food & beverage stores','additive':True},
    {'id':'446','name':'Health and personal care stores','shortName':'Health & personal care','additive':True},
    {'id':'447','name':'Gasoline stations','shortName':'Gasoline stations','additive':True},
    {'id':'448','name':'Clothing and clothing accessories stores','shortName':'Clothing & accessories','additive':True},
    {'id':'451','name':'Sporting goods, hobby, musical instrument, and book stores','shortName':'Sporting, hobby & books','additive':True},
    {'id':'452','name':'General merchandise stores','shortName':'General merchandise','additive':True},
    {'id':'453','name':'Miscellaneous store retailers','shortName':'Miscellaneous retailers','additive':True},
    {'id':'454','name':'Nonstore retailers','shortName':'Nonstore retailers','additive':True},
    {'id':'722','name':'Food services and drinking places','shortName':'Restaurants & drinking places','additive':True},
]
BY_ID = {c['id']:c for c in CATEGORIES}


def stamp():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, value):
    path=Path(path)
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix(path.suffix+'.tmp')
    tmp.write_text(json.dumps(value,ensure_ascii=False,allow_nan=False,separators=(',',':')),encoding='utf-8')
    tmp.replace(path)


def download():
    """Restore the pinned bundled originals; fetch only a missing source file."""
    RAW.mkdir(parents=True,exist_ok=True)
    SNAPSHOTS.mkdir(parents=True,exist_ok=True)
    lock_path=ROOT/'data/market-source-lock.json'
    lock=json.loads(lock_path.read_text(encoding='utf-8')) if lock_path.exists() else {}
    files=[]
    for item in SOURCES:
        path=RAW/item['name']
        frozen=SNAPSHOTS/item['name']
        if not path.exists():
            if frozen.exists():
                shutil.copy2(frozen,path)
            else:
                request=urllib.request.Request(item['url'],headers={'User-Agent':'RevenueLens/1.0 reproducible public-data analysis'})
                with urllib.request.urlopen(request,timeout=90) as response:
                    path.write_bytes(response.read())
        checksum=sha(path)
        if lock and lock['files'].get(item['name'])!=checksum:
            raise ValueError(f"Source checksum mismatch: {item['name']}. Restore the frozen November 17 snapshot; do not relabel a newer release.")
        if not frozen.exists():
            shutil.copy2(path,frozen)
        elif sha(frozen)!=checksum:
            raise ValueError(f"Frozen and raw copies disagree for {item['name']}")
        files.append({**item,'sha256':checksum,'bytes':path.stat().st_size,'releaseVintage':RELEASE})
    if not lock:
        write_json(lock_path,{'releaseVintage':RELEASE,'files':{f['name']:f['sha256'] for f in files},
                             'policy':'Fail closed if mutable Census current URLs change. Bundled original files preserve this release.'})
    target=ROOT/'data/market-manifest.json'
    old=json.loads(target.read_text(encoding='utf-8')) if target.exists() else {}
    manifest={'releaseVintage':RELEASE,'retrievedAt':old.get('retrievedAt',stamp()),'files':files,
              'sourceUnit':'USD millions, nominal','codeVersion':RULE}
    write_json(target,manifest)
    print(json.dumps({'marketSources':'verified','files':len(files),'releaseVintage':RELEASE}),flush=True)
    return manifest


def numeric(value):
    """Never impute suppressed/unavailable published estimates to zero."""
    if isinstance(value,bool):
        raise ValueError('Boolean is not a published sales estimate')
    if isinstance(value,(int,float)):
        if int(value)!=value:
            raise ValueError('Sales levels must be integral published USD millions')
        return int(value),'observed'
    label=str(value or '').strip()
    if label in ('(S)','S'):
        return None,'suppressed'
    if label in ('(*)','*'):
        return None,'advance_not_available'
    if label in ('(NA)','NA',''):
        return None,'unavailable'
    raise ValueError(f'Unrecognized published value token: {value!r}')


def month_before(month,offset=1):
    year,number=map(int,month.split('-'))
    index=year*12+number-1-offset
    return f'{index//12:04d}-{index%12+1:02d}'


def point(points,month,category):
    key=category+'|'+month
    if key not in points:
        points[key]={'month':month,'category':category,'sa':None,'nsa':None,
                     'status':'historical','vintage':RELEASE,'source':{},'reported':None,
                     'valueStatus':{}}
    return points[key]


def source_ref(file,sheet,row,column):
    from openpyxl.utils import get_column_letter
    return {'file':file,'sheet':sheet,'row':row,'column':get_column_letter(column)}


def mrts_category(code,label):
    code=str(code or '').strip()
    if code in BY_ID:
        return code
    if str(label or '').strip().lower()=='retail and food services sales, total':
        return 'total'
    if str(label or '').strip().lower()=='retail sales, total':
        return '_retail'
    return None


def parse_mrts(path,points,records):
    import openpyxl
    workbook=openpyxl.load_workbook(path,read_only=True,data_only=True)
    source_count=0
    for sheet in workbook:
        if not sheet.title.isdigit() or int(sheet.title)<2023:
            continue
        year=int(sheet.title)
        rows=list(sheet.values)
        if 'millions of dollars' not in str(rows[1][0]).lower():
            raise ValueError('Unexpected source units in MRTS workbook')
        headers=rows[4]
        months=[]
        for column,label in enumerate(headers,1):
            match=re.fullmatch(r'([A-Za-z]+)\.? (\d{4})(\(p\))?',str(label or '').strip())
            if match:
                number=list(calendar.month_abbr).index(match[1][:3].title())
                if int(match[2])!=year:
                    raise ValueError('Sheet/header year conflict')
                months.append((column,f'{year:04d}-{number:02d}',bool(match[3])))
        if not months:
            raise ValueError('No validated monthly columns in MRTS sheet')
        adjustment=None
        for ordinal,values in enumerate(rows,1):
            label=str(values[1] or '').strip() if len(values)>1 else ''
            if label=='NOT ADJUSTED':
                adjustment='nsa'
                continue
            if label.startswith('ADJUSTED'):
                adjustment='sa'
                continue
            category=mrts_category(values[0],label) if len(values)>1 else None
            if not category or adjustment is None:
                continue
            for column,month,preliminary in months:
                value,state=numeric(values[column-1])
                p=point(points,month,category)
                if adjustment in p['source']:
                    raise ValueError('Duplicate canonical MRTS month/category/adjustment')
                p[adjustment]=value
                p['source'][adjustment]=source_ref('mrts',sheet.title,ordinal,column)
                p['valueStatus'][adjustment]=state
                if preliminary:
                    p['status']='preliminary'
                records.append({'month':month,'category':category,'adjustment':adjustment,
                                'value':value,'valueStatus':state,'status':p['status'],
                                'file':'mrts','sheet':sheet.title,'row':ordinal,'column':column})
                source_count+=1
    workbook.close()
    return source_count


def find_release_rows(rows,value_column):
    """Preserve split labels: 444, 448 and 451 carry their numbers next row."""
    found={}
    pending=None
    for ordinal,values in enumerate(rows,1):
        code=str(values[0] or '').strip()
        label=str(values[1] or '').strip().lower() if len(values)>1 else ''
        if code in BY_ID:
            pending=code
        elif label.startswith('total') and isinstance(values[value_column-1],(int,float)) and 'total' not in found:
            pending='total'
        elif label.startswith('retail') and isinstance(values[value_column-1],(int,float)) and '_retail' not in found:
            pending='_retail'
        elif code:
            pending=None
        if pending and isinstance(values[value_column-1],(int,float)):
            if pending in found:
                raise ValueError('Duplicate release category row')
            found[pending]=(ordinal,values)
            pending=None
    expected=set(BY_ID)
    if not expected.issubset(found):
        raise ValueError('Missing nonoverlapping top-level categories: '+str(expected-set(found)))
    return found


def parse_marts(path,points,records):
    import openpyxl
    workbook=openpyxl.load_workbook(path,read_only=True,data_only=True)
    one=list(workbook['Table 1.'].values)
    if one[6][4]!=2026 or 'Oct.' not in str(one[7][4]):
        raise ValueError('This implementation is pinned to the October 2026 release.')
    footer=' '.join(str(row[0] or '') for row in one)
    if 'November 17, 2026' not in footer:
        raise ValueError('MARTS release date is not the frozen release vintage')
    found=find_release_rows(one,10)
    # Exact Table 1 columns, retained in provenance. (a)/(p)/(r) are row 9.
    dates=[('2026-10',5,10,'advance'),('2026-09',6,11,'preliminary'),
           ('2026-08',7,12,'revised'),('2025-10',8,13,'revised'),('2025-09',9,14,'revised')]
    overlaps=[]
    for category,(ordinal,values) in found.items():
        for month,nsa_column,sa_column,status in dates:
            p=point(points,month,category)
            p['status']=status
            for adjustment,column in [('nsa',nsa_column),('sa',sa_column)]:
                value,state=numeric(values[column-1])
                if p[adjustment] is not None:
                    overlaps.append({'month':month,'category':category,'adjustment':adjustment,
                                     'mrts':p[adjustment],'marts':value,'matches':p[adjustment]==value})
                    if p[adjustment]!=value:
                        raise ValueError('MRTS and MARTS source vintages disagree: '+str(overlaps[-1]))
                p[adjustment]=value
                p['source'][adjustment]=source_ref('marts','Table 1.',ordinal,column)
                p['valueStatus'][adjustment]=state
                records.append({'month':month,'category':category,'adjustment':adjustment,
                                'value':value,'valueStatus':state,'status':status,
                                'file':'marts','sheet':'Table 1.','row':ordinal,'column':column})
    # Published percentage changes are separate from rounded level arithmetic.
    two=list(workbook['Table 2.'].values)
    for category,(ordinal,values) in find_release_rows(two,3).items():
        points[category+'|'+LATEST]['publishedChange']={
            'momPct':float(values[2]),'yoyPct':float(values[3]),
            'source':source_ref('marts','Table 2.',ordinal,3),
            'note':'Published seasonally adjusted percent changes, not a confidence interval.'}
    three=list(workbook['Table 3.'].values)
    medians={}
    for category,(ordinal,values) in find_release_rows(three,3).items():
        medians[category]={'medianCV':float(values[2]),'medianMoMSE':float(values[3]),
                           'medianYoYSE':float(values[5]),'averageRevision':float(values[6]),
                           'medianAbsoluteRevision':float(values[7]),
                           'source':source_ref('marts','Table 3.',ordinal,3),
                           'note':'Historical medians for the most recent 12 months; based on not-adjusted estimates. Not a current SA confidence interval.'}
    workbook.close()
    return overlaps,medians


def headline_uncertainty(path):
    text=html.unescape(re.sub('<[^>]+>',' ',Path(path).read_text(encoding='utf-8')))
    text=re.sub(r'\s+',' ',text)
    start=text.index('Advance estimates of U.S.')
    excerpt=text[start:start+900]
    matches=re.findall(r'(up|down) ([\d.]+) percent \(±([\d.]+) percent\)',excerpt)
    if len(matches)<2:
        raise ValueError('Published headline margins could not be extracted without assumptions')
    (direction,mom,moe),(ydirection,yoy,yoe)=matches[:2]
    mom=float(mom)*(1 if direction=='up' else -1)
    yoy=float(yoy)*(1 if ydirection=='up' else -1)
    moe,yoe=float(moe),float(yoe)
    return {'momPct':mom,'yoyPct':yoy,'momHalfWidth':moe,'yoyHalfWidth':yoe,
            'confidenceLevel':0.9,'momSignificant':abs(mom)>moe,'yoySignificant':abs(yoy)>yoe,
            'momInterval':[mom-moe,mom+moe],'yoyInterval':[yoy-yoe,yoy+yoe],
            'source':{'file':'release','locator':'Advance Estimates headline, November 17, 2026'},
            'methodologyUrl':'https://www.census.gov/retail/marts/how_surveys_are_collected.html',
            'scope':'Only total October 2026 SA MoM and YoY changes. Sampling error only; nonsampling error remains.'}


def parse_total_text(path):
    text=Path(path).read_text(encoding='utf-8')
    sales=text.split('SEASONAL FACTORS')[0]
    output={}
    for ordinal,line in enumerate(sales.splitlines(),1):
        match=re.match(r'^\s*(20\d\d)\s+([\d\s]+)$',line)
        if match and int(match[1])>=2023:
            for month,value in enumerate(match[2].split(),1):
                output[f'{match[1]}-{month:02d}']={'value':int(value),'row':ordinal}
    return output


def build_bridge(points,month,adjustment):
    previous,year_ago=month_before(month),month_before(month,12)
    def value(category,date):
        return points.get(category+'|'+date,{}).get(adjustment)
    current,prior,year=value('total',month),value('total',previous),value('total',year_ago)
    def diff(a,b):
        return a-b if a is not None and b is not None else None
    sectors=[]
    for category in CATEGORIES[1:]:
        a,b,c=value(category['id'],month),value(category['id'],previous),value(category['id'],year_ago)
        d,y=diff(a,b),diff(a,c)
        sectors.append({'id':category['id'],'name':category['shortName'],'current':a,'previous':b,
                        'delta':d,'yoyPrevious':c,'yoyDelta':y,
                        'momContributionPp':100*d/prior if d is not None and prior else None,
                        'yoyContributionPp':100*y/year if y is not None and year else None})
    residual={}
    for name,total,field in [('current',current,'current'),('previous',prior,'previous'),('yoyPrevious',year,'yoyPrevious')]:
        values=[s[field] for s in sectors]
        residual[name]=total-sum(values) if total is not None and all(v is not None for v in values) else None
    residual['delta']=diff(residual['current'],residual['previous'])
    residual['yoyDelta']=diff(residual['current'],residual['yoyPrevious'])
    return {'current':current,'previous':prior,'delta':diff(current,prior),'yoyPrevious':year,
            'yoyDelta':diff(current,year),'sectors':sectors,'residual':residual}


def validate(data=None):
    data=data or json.loads((ROOT/'dist/data/market.json').read_text(encoding='utf-8'))
    checks=[]
    def check(name,passed,detail=None):
        checks.append({'name':name,'passed':bool(passed),'detail':detail})
    p=data['points']
    check('native_nominal_usd_millions',data['meta']['currency']=='USD' and data['meta']['unit']=='USD millions' and data['meta']['nominal'])
    expected={c['id'] for c in CATEGORIES[1:]}
    check('thirteen_disjoint_top_level_categories',len(expected)==13 and expected=={c['id'] for c in data['categories'] if c['additive']})
    check('unique_month_category_keys',all(key==x['category']+'|'+x['month'] for key,x in p.items()))
    check('exact_integer_published_levels',all(isinstance(x[a],int) for x in p.values() for a in ('sa','nsa') if x[a] is not None))
    check('every_point_has_separate_sa_nsa_provenance',all(set(x['source'])=={'sa','nsa'} for x in p.values()))
    check('no_future_months',max(x['month'] for x in p.values())==LATEST)
    check('current_release_total_sa',p['total|2026-10']['sa']==748220 and p['total|2026-09']['sa']==746637 and p['total|2025-10']['sa']==700427)
    check('current_release_total_nsa',p['total|2026-10']['nsa']==761378)
    check('historical_current_vintage',all(x['vintage']==RELEASE for x in p.values()))
    check('release_status_flags',p['total|2026-10']['status']=='advance' and p['total|2026-09']['status']=='preliminary' and p['total|2026-08']['status']=='revised')
    bridges_ok=True
    contributions_ok=True
    for b in data['bridges'].values():
        bridges_ok &= b['current']==sum(s['current'] for s in b['sectors'])+b['residual']['current']
        bridges_ok &= b['previous']==sum(s['previous'] for s in b['sectors'])+b['residual']['previous']
        bridges_ok &= b['delta']==sum(s['delta'] for s in b['sectors'])+b['residual']['delta']
        bridges_ok &= b['yoyDelta']==sum(s['yoyDelta'] for s in b['sectors'])+b['residual']['yoyDelta']
        contributions_ok &= abs(sum(s['momContributionPp'] for s in b['sectors'])+100*b['residual']['delta']/b['previous']-100*b['delta']/b['previous'])<1e-10
    check('all_sa_nsa_sector_bridges_and_residuals_reconcile',bridges_ok)
    check('contributions_sum_to_headline_percentage_points',contributions_ok)
    uncertainty=p['total|2026-10']['reported']
    check('published_current_90pct_interval',uncertainty['confidenceLevel']==0.9 and uncertainty['momInterval'][0]<0<uncertainty['momInterval'][1] and uncertainty['yoyInterval'][0]>0 and not uncertainty['momSignificant'])
    check('no_invented_uncertainty_for_other_points',sum(x['reported'] is not None for x in p.values())==1)
    check('matched_mrts_marts_vintage',data['quality']['overlapAgreements']>0 and data['quality']['overlapDisagreements']==0)
    check('independent_text_total_series_agrees',data['quality']['independentTextAgreements']==46 and data['quality']['independentTextDisagreements']==0)
    check('ex_auto_and_gas_identity',data['findings']['latest']['exAutoGasSA']==542618)
    check('frozen_source_hashes',all(sha(SNAPSHOTS/f['name'])==f['sha256'] for f in data['meta']['files']))
    check('comparison_baselines_available',all('total|'+month_before(m,12) in p and 'total|'+month_before(m) in p for m in data['periods']))
    result={'validatedAt':stamp(),'codeVersion':RULE,'sourceReleaseDate':RELEASE,
            'checks':checks,'passed':all(c['passed'] for c in checks)}
    write_json(ROOT/'artifacts/market_validation.json',result)
    if not result['passed']:
        raise ValueError('Market validation failed: '+', '.join(c['name'] for c in checks if not c['passed']))
    return result


def build():
    manifest=download()
    points,records={},[]
    parse_mrts(RAW/'mrtssales92-present.xlsx',points,records)
    overlaps,medians=parse_marts(RAW/'marts_current.xlsx',points,records)
    points['total|'+LATEST]['reported']=headline_uncertainty(RAW/'sales.html')
    independent=parse_total_text(RAW/'adv44X72.txt')
    independent_checks=[points['total|'+m]['sa']==v['value'] for m,v in independent.items() if 'total|'+m in points]
    retail={m:points['_retail|'+m] for m in {x['month'] for x in points.values()} if '_retail|'+m in points}
    points={k:v for k,v in points.items() if v['category'] in BY_ID}
    points=dict(sorted(points.items()))
    months=sorted({p['month'] for p in points.values()})
    periods=sorted([m for m in months if m>='2024-01'],reverse=True)
    bridges={m+'|'+a:build_bridge(points,m,a) for m in periods for a in ('sa','nsa')}
    notes=[
        'National employer-business survey estimates, not individual transactions. No customers, invoices, orders, cancellations or retention can be inferred.',
        'All levels are native USD millions and nominal: seasonal adjustment does not adjust for inflation.',
        'SA adjusts seasonal, holiday and trading-day patterns; NSA preserves those patterns. Never splice them or sum across adjustment modes.',
        'Values are a frozen November 17, 2026 release vintage, retrieved later. Historical means an older observation in this current vintage, not an obsolete release.',
        'October 2026 is advance; September 2026 is preliminary; marked comparison months are revised. Subsequent Census releases may revise them.',
        'The 13 top-level sectors are nonoverlapping. Retail subtotals, exclusion totals, grocery stores and department stores are not additional sectors. Any published rounding residual stays explicit.',
        'Only the directly published total October 2026 SA MoM/YoY margins are current-release 90% sampling intervals. Table 3 CV/SE are recent-12-month medians of NSA estimates, not current-sector SA confidence intervals.',
        'The current Census time series excludes nonemployer businesses following the April 2025 annual revision; do not splice an older vintage that included them.',
        'Source prices, costs, quantities and customer histories are unavailable. Growth is descriptive and cannot establish an intervention or real purchasing-volume increase.',
    ]
    current=points['total|'+LATEST]
    previous=points['total|'+month_before(LATEST)]
    year_ago=points['total|'+month_before(LATEST,12)]
    latest_bridge=bridges[LATEST+'|sa']
    gain=max(latest_bridge['sectors'],key=lambda x:x['delta'])
    decline=min(latest_bridge['sectors'],key=lambda x:x['delta'])
    source_statuses=Counter(r['valueStatus'] for r in records)
    def identity(adjustment):
        r=retail[LATEST][adjustment]
        f=points['722|'+LATEST][adjustment]
        t=current[adjustment]
        return {'retail':r,'foodServices':f,'total':t,'residual':t-r-f}
    quality={'checks':[],'sourceRows':len(records),'sourceValueCount':len(records),
             'missingValues':sum(v for k,v in source_statuses.items() if k not in ('observed','suppressed')),
             'suppressedValues':source_statuses.get('suppressed',0),
             'overlapAgreements':sum(x['matches'] for x in overlaps),
             'overlapDisagreements':sum(not x['matches'] for x in overlaps),
             'independentTextAgreements':sum(independent_checks),
             'independentTextDisagreements':sum(not x for x in independent_checks),
             'latestIdentity':identity('sa'),'latestIdentityNSA':identity('nsa'),
             'samplingMedians':medians,'notes':notes}
    findings={'latest':{'current':current['sa'],'previous':previous['sa'],'yearAgo':year_ago['sa'],
                        'momDelta':current['sa']-previous['sa'],'yoyDelta':current['sa']-year_ago['sa'],
                        'momPct':100*(current['sa']/previous['sa']-1),'yoyPct':100*(current['sa']/year_ago['sa']-1),
                        'exAutoGasSA':current['sa']-points['441|'+LATEST]['sa']-points['447|'+LATEST]['sa'],
                        'largestMoMGainer':gain,'largestMoMDecliner':decline,
                        'caution':'October total growth is not statistically distinguishable from zero at the published 90% sampling confidence level; nominal year-over-year growth is positive. Sector arithmetic does not establish causes.'}}
    data={'meta':{'title':'RevenueLens','sourceName':'U.S. Census Bureau retail surveys',
                  'releaseDate':RELEASE,'latestReleaseDate':RELEASE,'latestMonth':LATEST,
                  'latestMonthLabel':'October 2026','currency':'USD','unit':'USD millions',
                  'valueScale':1_000_000,'nominal':True,'geography':'United States',
                  'retrievedAt':manifest['retrievedAt'],'generatedAt':stamp(),'codeVersion':RULE,
                  'files':manifest['files'],'notes':notes,'codeSha256':sha(Path(__file__)),
                  'sourceUrl':'https://www.census.gov/retail/sales.html',
                  'adjustments':{'sa':'Seasonally adjusted','nsa':'Not seasonally adjusted'}},
          'categories':CATEGORIES,'periods':periods,'points':points,'bridges':bridges,
          'quality':quality,'findings':findings}
    result=validate(data)
    data['quality']['checks']=result['checks']
    write_json(ROOT/'dist/data/market.json',data)
    import csv
    for name,rows in [('market_source_observations',records),('market_points',[{'month':p['month'],'category':p['category'],'sa':p['sa'],'nsa':p['nsa'],'status':p['status'],'vintage':p['vintage']} for p in points.values()])]:
        path=ROOT/'artifacts'/f'{name}.csv'
        with path.open('w',encoding='utf-8',newline='') as stream:
            writer=csv.DictWriter(stream,fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)
    write_json(ROOT/'artifacts/market_reconciliation.json',{
        'releaseDate':RELEASE,'overlapComparisons':overlaps,'independentTextTotalSeries':independent,
        'latestIdentitySA':identity('sa'),'latestIdentityNSA':identity('nsa'),
        'bridges':{k:{'current':v['current'],'previous':v['previous'],'delta':v['delta'],
                       'sectorCurrentSum':sum(s['current'] for s in v['sectors']),
                       'sectorDeltaSum':sum(s['delta'] for s in v['sectors']),
                       'residual':v['residual']} for k,v in bridges.items()}})
    write_json(ROOT/'artifacts/market_run_manifest.json',{'generatedAt':stamp(),
        'command':'python -m pipeline.market build','python':sys.version,'platform':platform.platform(),
        'codeVersion':RULE,'codeSha256':sha(Path(__file__)),'sourceReleaseDate':RELEASE,
        'reportSha256':sha(ROOT/'dist/data/market.json'),'reportBytes':(ROOT/'dist/data/market.json').stat().st_size,
        'inputHashes':{f['name']:f['sha256'] for f in manifest['files']},
        'pointCount':len(points),'periodCount':len(periods),'bridgeCount':len(bridges),
        'artifactHashes':{p.name:sha(p) for p in sorted((ROOT/'artifacts').glob('market_*')) if p.is_file() and p.name!='market_run_manifest.json'}})
    print(json.dumps({'marketBuild':'complete','points':len(points),'periods':len(periods),
                      'bridges':len(bridges),'checks':len(result['checks']),'passed':result['passed'],
                      'latestTotalSA':current['sa'],'reportBytes':(ROOT/'dist/data/market.json').stat().st_size}),flush=True)
    return data


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command',choices=['download','build','validate'])
    command=parser.parse_args().command
    if command=='download':
        download()
    elif command=='build':
        build()
    else:
        result=validate()
        print(json.dumps({'marketValidation':'complete','checks':len(result['checks']),'passed':result['passed']}),flush=True)


if __name__=='__main__':
    main()
