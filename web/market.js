import {esc as e, valid, number, growth as comparison, interval, buildCSV, saveFile} from './market-model.mjs';

const app = document.querySelector('#app');
const dialog = document.querySelector('#detail-dialog');
let report;
let state = {view:'overview', month:'', category:'total', basis:'sa'};
let toastTimer;
const navigation = [['overview','Market overview','Overview'],['drivers','Sector drivers','Drivers'],['trends','Trends & comparisons','Trends'],['trust','Data trust','Trust'],['memo','Decision brief','Brief']];
const shapes = {
  overview:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  drivers:'M4 20h16 M7 16V8 M12 16V3 M17 16v-5',
  trends:'M3 19h18 M4 14l5-6 5 4 6-8',
  trust:'m12 3 8 4v6c0 5-8 9-8 9s-8-4-8-9V7z M8 12l3 3 5-6',
  memo:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h6',
  calendar:'M4 5h16v16H4z M8 2v6 M16 2v6 M4 11h16',
  globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M3 12h18 M12 3c4 5 4 13 0 18-4-5-4-13 0-18',
  book:'M12 5c-3-3-7-3-10-2v16c4-1 7 0 10 2 3-2 6-3 10-2V3c-3-1-7-1-10 2z M12 5v16',
  download:'M12 3v12 M7 10l5 5 5-5 M5 16v5h14v-5',
  info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M12 11v6 M12 7h.01',
  close:'m6 6 12 12 M6 18 18 6', reset:'M3 10a9 9 0 1 1 1 8 M3 3v7h7',
  external:'M14 3h7v7 M10 14 11-11 M21 14v7H3V3h7',
  bulb:'M9 18h6 M10 22h4 M8.5 14.5a6 6 0 1 1 7 0c-1 .7-1.5 1.5-1.5 3h-4c0-1.5-.5-2.3-1.5-3z',
  money:'M12 2v20 M17 5H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6',
  filter:'M4 5h16 M7 12h10 M10 19h4', clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M12 7v5l3 2',
  print:'M6 9V3h12v6 M6 18H3V9h18v9h-3 M6 14h12v8H6z',
  code:'m8 7-5 5 5 5 M16 7l5 5-5 5 M14 3l-4 18', check:'m5 12 4 4L19 6'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${shapes[name]||shapes.info}"/></svg>`;
const point = (category=state.category,month=state.month) => report.points[`${category}|${month}`];
const category = id => report.categories.find(x=>x.id===id);
const level = (id=state.category,month=state.month) => point(id,month)?.[state.basis];
const shift = (month,delta) => {const [y,m]=month.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+delta,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;};
const dateLabel = (month,long=false) => new Intl.DateTimeFormat('en-US',{month:long?'long':'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T00:00:00Z`));
const dollars = (millions,compact=true) => valid(millions)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:compact?'compact':'standard',minimumFractionDigits:compact?2:0,maximumFractionDigits:compact?2:0}).format(millions*1000000):'Unavailable';
const percentage = (v,d=1) => valid(v)?`${v>0?'+':''}${v.toFixed(d)}%`:'Unavailable';
const share = v => valid(v)?`${v.toFixed(1)}%`:'Unavailable';
const deltaMoney = v => valid(v)?`${v>0?'+':''}${dollars(v)}`:'Unavailable';
const periodMetrics = (id=state.category,month=state.month) => {const current=level(id,month),previous=level(id,shift(month,-1)),priorYear=level(id,shift(month,-12));return {current,previous,priorYear,mom:comparison(current,previous),yoy:comparison(current,priorYear)};};
const currentBridge = () => report.bridges[`${state.month}|${state.basis}`];
const published = () => state.basis==='sa' ? point()?.reported : null;
const sourceName = fileId => report.meta.files.find(f=>f.id===fileId);
const status = p => ({advance:'Advance estimate',preliminary:'Preliminary',revised:'Revised',historical:'Current-vintage history'}[p?.status]||'Published estimate');

function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800);}
function updateURL(){const url=new URL(location.href);url.searchParams.set('view',state.view);url.searchParams.set('month',state.month);url.searchParams.set('sector',state.category);url.searchParams.set('basis',state.basis);history.replaceState(null,'',url);}
function render(){
  const focused = app.contains(document.activeElement) ? document.activeElement : null;
  const focusAttribute = focused && ['id','data-view','data-action','data-month'].find(attribute => focused.getAttribute(attribute));
  const focusValue = focusAttribute ? focused.getAttribute(focusAttribute) : null;
  const titles={overview:'The US retail picture',drivers:'What moved the market',trends:'Put the change in context',trust:'Current data. Visible evidence.',memo:'A decision, with its limits'};
  const subtitles={overview:'Recent official sales estimates. A clear view of what the numbers support.',drivers:'Non-overlapping industries, reconciled to the national change.',trends:'Compare the same sector, adjustment basis, and release vintage.',trust:'Source files, observation dates, revisions, and sampling uncertainty.',memo:'An evidence brief for the selected sector and observation month.'};
  const fixed = ['drivers','trust'].includes(state.view);
  const mainPoint=point(state.view==='drivers'?'total':state.category);
  app.innerHTML=`<div class="shell market-shell">
    <aside class="sidebar" aria-label="Main navigation">
      <div class="brand"><svg viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="9" fill="#4566ed"/><path d="M8 26V18h5v8zm8 0V12h5v14zm8 0V7h5v19z" fill="#fff"/></svg><span>Revenue<span class="lens">Lens</span></span></div>
      <div class="workspace-switch"><span class="workspace-mark">US</span><span class="workspace-text">Retail intelligence</span>${icon('globe')}</div>
      <p class="sidebar-label">Market workspace</p><nav class="nav">${navigation.map(([id,label,short])=>`<button class="nav-button ${state.view===id?'active':''}" data-view="${id}" aria-label="${label}" ${state.view===id?'aria-current="page"':''}>${icon(id)}<span class="nav-label">${label}</span><span class="nav-short">${short}</span></button>`).join('')}</nav>
      <div class="sidebar-bottom"><div class="snapshot-card"><h3>Official. Recent. US dollars.</h3><p>US Census Bureau<br>Latest observation: ${e(dateLabel(report.meta.latestMonth))}<br>Release: ${e(report.meta.releaseDate)}</p><a class="source-link" href="https://www.census.gov/retail/sales.html" target="_blank" rel="noopener noreferrer">View the release ${icon('external')}</a></div>
      <a class="nav-button historical-lab" href="./lab.html">${icon('code')}<span class="nav-label">Historical transaction lab<small>Separate case · 2009–2011</small></span></a>
      <div class="sidebar-user"><span class="avatar">US</span><span>Market intelligence<small>Versioned public evidence</small></span></div></div>
    </aside>
    <div class="workspace"><header class="topbar"><div class="breadcrumb"><span>Workspace</span><span class="slash">/</span><strong>US retail intelligence</strong></div><div class="top-actions"><span class="historical">${icon('clock')}Latest data: ${e(dateLabel(report.meta.latestMonth))}</span><span class="rule"></span><button class="icon-button" data-action="about" aria-label="About data freshness">${icon('info')}</button><span class="avatar">US</span></div></header>
    <main id="main" class="content" tabindex="-1">
      <div class="page-heading"><div><p class="eyebrow">US retail intelligence</p><h1>${titles[state.view]}</h1><p class="page-subtitle">${subtitles[state.view]}</p></div><div class="heading-buttons">${state.view==='memo'?`<button class="button" data-action="pdf" aria-label="Download brief PDF">${icon('download')}<span>Download PDF</span></button>`:''}<button class="button" data-action="dictionary" aria-label="Metric dictionary">${icon('book')}<span>Metric dictionary</span></button><button class="button primary" data-action="${state.view==='trust'?'audit':state.view==='memo'?'print':'export'}" aria-label="${state.view==='trust'?'Download source audit':state.view==='memo'?'Print decision brief':'Export current evidence'}">${icon(state.view==='memo'?'print':'download')}<span>${state.view==='trust'?'Download audit':state.view==='memo'?'Print brief':'Export evidence'}</span></button></div></div>
      <div class="filters">
        ${state.view!=='trust'?`<label class="filter">${icon('calendar')}<span class="visually-hidden">Observation month</span><select id="market-month">${report.periods.map(m=>`<option value="${m}" ${m===state.month?'selected':''}>${dateLabel(m,true)}</option>`).join('')}</select></label>`:'<span class="chip blue">Frozen release audit</span>'}
        ${!fixed?`<label class="filter sector-filter">${icon('globe')}<span class="visually-hidden">Industry</span><select id="market-category">${report.categories.map(c=>`<option value="${e(c.id)}" ${state.category===c.id?'selected':''}>${e(c.shortName||c.name)}</option>`).join('')}</select></label>`:''}
        ${state.view!=='trust'?`<label class="filter">${icon('filter')}<span class="visually-hidden">Adjustment basis</span><select id="market-basis"><option value="sa" ${state.basis==='sa'?'selected':''}>Seasonally adjusted</option><option value="nsa" ${state.basis==='nsa'?'selected':''}>Not seasonally adjusted</option></select></label>`:''}
        <div class="filter-right"><span class="chip ${mainPoint?.status==='advance'?'blue':'amber'}">${e(state.view==='trust'?'Original source files':status(mainPoint))}</span><button class="icon-button" data-action="reset" aria-label="Reset current report">${icon('reset')}</button></div>
      </div>
      <div class="currency-note"><span><strong>Native USD</strong> · nominal sales · release vintage ${e(report.meta.releaseDate)}<span class="currency-detail"> · ${state.view==='drivers'?'US national scope':e(state.view==='trust'?'Full published snapshot':category(state.category)?.name||'United States')}</span></span><button class="text-button" data-action="source" aria-label="Inspect source observation">Source evidence</button></div>
      <section id="page-content" aria-label="${titles[state.view]}">${page()}</section>
      <footer class="footer"><span>RevenueLens <span class="separator">·</span> US Census estimates · nominal USD · subject to revision</span><span>Observation ${e(report.meta.latestMonth)} <span class="separator">·</span> Release ${e(report.meta.releaseDate)} <span class="separator">·</span> <a href="./lab.html">Historical lab</a></span></footer>
    </main></div></div>`;
  document.title=`${titles[state.view]} · RevenueLens`;
  if (focusAttribute) app.querySelector(`[${focusAttribute}="${CSS.escape(focusValue)}"]`)?.focus({preventScroll:true});
}

function page(){return ({overview:overview,drivers:drivers,trends:trends,trust:trust,memo:memo})[state.view]();}
function insight(){
  const m=periodMetrics();const uncertainty=interval(published());
  const message=uncertainty?.includesZero
    ? `<strong>The monthly increase is not statistically distinguishable from zero.</strong> The published ${Math.round((published().confidenceLevel||.9)*100)}% interval is ${percentage(uncertainty.low)} to ${percentage(uncertainty.high)}. Interpret the sector mix and the longer trend before calling an acceleration.`
    : `<strong>${e(category(state.category).shortName||category(state.category).name)}: ${percentage(m.mom)} month over month, ${percentage(m.yoy)} year over year.</strong> These are nominal sales estimates. Price changes, seasonal patterns, and revisions affect interpretation.`;
  return `<div class="insight-banner"><span class="insight-icon">${icon('bulb')}</span><p>${message}</p><button class="text-button" data-view="memo">Read the brief ${icon('memo')}</button></div>`;
}
function kpis(id=state.category){
  const m=periodMetrics(id);const national=level('total');const exAutoGas=valid(national)&&valid(level('441'))&&valid(level('447'))?national-level('441')-level('447'):null;
  const last=id==='total'?['Excluding autos & gas',dollars(exAutoGas),'National sales · same adjustment basis','drivers']:['Share of US total',share(valid(m.current)&&national?100*m.current/national:null),'Selected industry / national total','globe'];
  const values=[['Estimated sales',dollars(m.current),`${dateLabel(state.month)} · ${state.basis.toUpperCase()}`,'money'],['Month over month',percentage(m.mom),`vs ${dateLabel(shift(state.month,-1))}`,'trends'],['Year over year',percentage(m.yoy),`vs ${dateLabel(shift(state.month,-12))}`,'calendar'],last];
  return `<div class="kpi-grid">${values.map(([name,value,note,ico])=>`<article class="kpi"><div class="kpi-top"><h2 class="kpi-title">${name}</h2>${icon(ico)}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${e(note)}</div></article>`).join('')}</div>`;
}
function overview(){
  return `${insight()}${kpis()}<div class="chart-row"><article class="panel"><div class="panel-head"><div><h2>The recent sales trajectory</h2><p>${e(category(state.category).shortName||category(state.category).name)} · ${state.basis==='sa'?'seasonally adjusted':'not seasonally adjusted'} · USD</p></div><div class="legend"><span><i></i>Selected window</span><span><i class="previous"></i>12 months earlier</span></div></div><div class="line-chart-wrap">${chart()}</div><div class="chart-foot"><span>12 months ending ${e(dateLabel(state.month))} · same release vintage</span><button class="text-button" data-action="trend-data">View data</button></div></article><article class="panel"><div class="panel-head"><div><h2>National sector contributions</h2><p>Change from the previous month · USD</p></div><button class="icon-button" data-action="bridge-info" aria-label="About additive sector contributions">${icon('info')}</button></div>${bridgeBars(6)}<div class="panel-bottom"><span>US total · non-overlapping industries</span><button class="text-button" data-view="drivers">Explore drivers</button></div></article></div>
  <div class="bottom-row"><article class="panel"><div class="panel-head"><div><h2>The industry pulse</h2><p>Largest national industries · select one to investigate</p></div><span class="chip">Published estimates</span></div>${industryTable(5)}<div class="panel-bottom"><span>National context · same month and adjustment basis</span><button class="text-button" data-view="trends">Compare all industries</button></div></article><article class="panel"><div class="panel-head"><div><h2>What sits inside the total?</h2><p>US national sales mix · same month and basis</p></div></div>${marketMix()}<p class="market-note">These are industry sales estimates. They do not establish customer counts, retention, invoice value, or an individual retailer’s results.</p></article></div>`;
}
function chartRows(){return Array.from({length:12},(_,i)=>{const month=shift(state.month,i-11);return {month,current:level(state.category,month),prior:level(state.category,shift(month,-12))};});}
function chart(){
  const rows=chartRows();const W=720,H=284,L=68,R=18,T=24,B=42;
  const vals=rows.flatMap(r=>[r.current,r.prior]).filter(valid);let max=Math.max(1,...vals)*1.15;const pow=10**Math.floor(Math.log10(max));max=Math.ceil(max/pow*2)/2*pow;
  const x=i=>L+i*(W-L-R)/11;const y=v=>H-B-v/max*(H-T-B);
  const path=field=>{let connected=false;return rows.map((r,i)=>{if(!valid(r[field])){connected=false;return '';}const result=`${connected?'L':'M'}${x(i)},${y(r[field])}`;connected=true;return result;}).join(' ');};
  const currentPath=path('current');const complete=rows.every(r=>valid(r.current));
  const marker=(r,i)=>{
    if(!valid(r.current))return '';
    const interactive=report.periods.includes(r.month);
    const label=`${dateLabel(r.month)}: ${dollars(r.current,false)}${interactive?'':' (historical context)'}`;
    const attributes=interactive?`class="chart-dot" data-month="${r.month}" tabindex="0" role="button"`:'class="chart-history-dot" role="img" focusable="false" fill="#fff" stroke="#5474ef" stroke-width="2"';
    return `<circle ${attributes} cx="${x(i)}" cy="${y(r.current)}" r="${i===11?4.5:3}" aria-label="${e(label)}"><title>${e(label)}</title></circle>`;
  };
  return `<svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="market-chart-title market-chart-desc"><title id="market-chart-title">Recent nominal sales for ${e(category(state.category).name)}</title><desc id="market-chart-desc">Twelve-month window compared with the same calendar months one year earlier. Use View data for exact USD amounts and unavailable observations.</desc><defs><linearGradient id="market-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5474ef" stop-opacity=".15"/><stop offset="100%" stop-color="#5474ef" stop-opacity=".01"/></linearGradient></defs>${[0,.25,.5,.75,1].map(t=>`<line class="gridline" x1="${L}" x2="${W-R}" y1="${y(max*t)}" y2="${y(max*t)}"/><text x="${L-10}" y="${y(max*t)+4}" text-anchor="end">${dollars(max*t)}</text>`).join('')}${complete?`<path d="${currentPath} L${x(11)},${H-B} L${x(0)},${H-B}Z" fill="url(#market-fill)"/>`:''}<path class="previous-path" d="${path('prior')}"/><path class="current-path" d="${currentPath}"/>${rows.map((r,i)=>`<text x="${x(i)}" y="${H-16}" text-anchor="middle">${new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}).format(new Date(`${r.month}-01T00:00:00Z`))}</text>${marker(r,i)}`).join('')}</svg>`;
}
function bridgeBars(limit=14,field='delta'){
  const b=currentBridge();if(!b)return '<div class="empty">No comparable national bridge is available.</div>';
  const sorted=b.sectors.filter(r=>valid(r[field])).sort((a,b)=>Math.abs(b[field])-Math.abs(a[field]));
  const shown=sorted.slice(0,limit-1);const rest=sorted.slice(limit-1);const residual=rest.reduce((sum,r)=>sum+r[field],0)+(b.residual?.[field]||0);
  if(rest.length||residual!==0)shown.push({id:'residual',name:'Other sectors / residual',[field]:residual});
  const maximum=Math.max(1,...shown.map(r=>Math.abs(r[field])));
  return `<div class="bridge-list">${shown.map(r=>`<div class="bridge-item"><span class="bridge-name" title="${e(r.name)}">${e(category(r.id)?.shortName||r.name)}</span><div class="bridge-track"><div class="bridge-fill ${r[field]<0?'negative':''}" style="width:${Math.max(.5,Math.abs(r[field])/maximum*100)}%"></div></div><span class="bridge-amount ${r[field]<0?'negative':''}">${deltaMoney(r[field])}</span></div>`).join('')}</div>`;
}
function industryTable(limit=30){
  const rows=report.categories.filter(c=>c.additive).map(c=>({...c,...periodMetrics(c.id)})).sort((a,b)=>(b.current||0)-(a.current||0)).slice(0,limit);
  return `<div class="table-wrap"><table class="data-table industry-table"><caption class="visually-hidden">Published industry sales, with month and year comparisons on the same basis.</caption><thead><tr><th>Industry</th><th>Sales USD</th><th>MoM</th><th>YoY</th></tr></thead><tbody>${rows.map(r=>`<tr><td><button class="invoice-btn" data-sector="${e(r.id)}">${e(r.shortName||r.name)}</button></td><td class="strong">${dollars(r.current)}</td><td>${percentage(r.mom)}</td><td>${percentage(r.yoy)}</td></tr>`).join('')}</tbody></table></div>`;
}
function marketMix(){
  const total=level('total');const auto=level('441'),gas=level('447'),food=level('722');
  if(!valid(total)||!valid(auto)||!valid(gas)||!valid(food)||total<=0)return '<div class="empty">Market composition is unavailable.</div>';
  const parts=[['Auto & parts',auto,'#536ff0'],['Gas stations',gas,'#91a8e8'],['Food services',food,'#78aaa6'],['Other industries',total-auto-gas-food,'#dce4f4']];
  const circumference=2*Math.PI*55;let offset=0;
  const rings=parts.map(([,value,color])=>{const amount=value/total*circumference;const ring=`<circle cx="70" cy="70" r="55" fill="none" stroke="${color}" stroke-width="14" stroke-dasharray="${amount} ${circumference}" stroke-dashoffset="${-offset}"/>`;offset+=amount;return ring;}).join('');
  return `<div class="market-body"><div class="donut"><svg viewBox="0 0 140 140" role="img" aria-label="National sales composition across autos, gasoline, food services and all other industries">${rings}</svg><div class="donut-label"><strong>${dollars(total)}</strong><span>US total</span></div></div><div class="market-legend">${parts.map(([name,value,color])=>`<div class="market-legend-row"><i style="background:${color}"></i>${name}<strong>${share(value/total*100)}</strong></div>`).join('')}</div></div>`;
}

function drivers(){
  const b=currentBridge();if(!b)return '<div class="panel empty">The selected comparison has no published sector bridge.</div>';
  const top=[...b.sectors].filter(r=>valid(r.delta)).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))[0];
  return `${kpis('total')}<div class="insight-banner"><span class="insight-icon">${icon('drivers')}</span><p><strong>National change: ${deltaMoney(b.delta)} from the prior month.</strong> ${top?`${e(top.name)} is the largest absolute sector contribution, at ${deltaMoney(top.delta)}.`:''} This is an arithmetic attribution across industries, not a causal explanation.</p></div><div class="section-grid"><article class="panel"><div class="panel-head"><div><h2>Month-over-month contribution</h2><p>Non-overlapping top-level NAICS industries · USD</p></div></div>${bridgeBars(14)}<div class="panel-bottom">All sectors plus the residual reconcile to ${deltaMoney(b.delta)}.</div></article><article class="panel"><div class="panel-head"><div><h2>Year-over-year contribution</h2><p>Same observation month in the prior year · USD</p></div></div>${bridgeBars(14,'yoyDelta')}<div class="panel-bottom">All sectors plus the residual reconcile to ${deltaMoney(b.yoyDelta)}.</div></article></div><article class="panel" style="margin-bottom:23px"><div class="panel-head"><div><h2>The bridge, with denominators</h2><p>Contribution in percentage points uses the national previous-period total</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Industry</th><th>Current USD</th><th>Prior month USD</th><th>Change USD</th><th>Contribution pp</th></tr></thead><tbody>${b.sectors.map(r=>`<tr><td>${e(category(r.id)?.shortName||r.name)}</td><td>${dollars(r.current)}</td><td>${dollars(r.previous)}</td><td>${deltaMoney(r.delta)}</td><td>${valid(r.momContributionPp)?r.momContributionPp.toFixed(3):'Unavailable'}</td></tr>`).join('')}<tr><td>Rounding / published residual</td><td>${dollars(b.residual.current)}</td><td>${dollars(b.residual.previous)}</td><td>${deltaMoney(b.residual.delta)}</td><td>—</td></tr></tbody></table></div><div class="panel-bottom">Subcategories and overlapping aggregates are excluded from this bridge.</div></article><div class="callout" style="margin:0 0 23px">Comparisons across industries have not been tested for statistical significance. A large contribution is not proof that the industry’s underlying demand accelerated; these nominal estimates also reflect price changes.</div>`;
}
function trends(){
  const observation=point();
  return `${insight()}${kpis()}<article class="panel" style="margin-bottom:23px"><div class="panel-head"><div><h2>One industry. One comparable basis.</h2><p>${e(category(state.category).name)} · ${state.basis==='sa'?'seasonally adjusted':'not seasonally adjusted'} · nominal USD</p></div><div class="legend"><span><i></i>Selected window</span><span><i class="previous"></i>12 months earlier</span></div></div><div class="line-chart-wrap">${chart()}</div><div class="chart-foot"><span>Same calendar months in the previous year</span><button class="text-button" data-action="trend-data">Exact source levels</button></div></article><div class="section-grid"><article class="panel panel-pad"><h2>Adjustment changes the question</h2><p>Seasonally adjusted estimates remove estimated recurring seasonal, holiday, and trading-day effects. They are useful for month-to-month context. Unadjusted estimates retain those patterns.</p><div class="comparison-pair"><div><small>Selected observation · SA</small><strong>${dollars(observation?.sa)}</strong></div><div><small>Selected observation · NSA</small><strong>${dollars(observation?.nsa)}</strong></div></div><div class="callout">Do not calculate a change using a seasonally adjusted numerator and an unadjusted denominator. Neither series is adjusted for price changes.</div></article><article class="panel panel-pad"><h2>What the published interval says</h2>${uncertaintyContent()}<div class="callout">Published uncertainty is displayed only for the exact observation and scope supplied by the source. It is not inherited by another month, sector, adjustment basis, or a calculated industry bridge.</div></article></div><article class="panel" style="margin-bottom:23px"><div class="panel-head"><div><h2>All industries, same observation</h2><p>Descriptive context · industry comparisons have not been tested for significance</p></div></div>${industryTable()}</article>`;
}
function uncertaintyContent(){
  const pub=published();const band=interval(pub);
  if(!band)return '<p>A matching published confidence interval is not included for this selected cut. The report keeps it unavailable rather than treating it as zero uncertainty.</p>';
  return `<div class="large-stat">${percentage(pub.momPct)}</div><p>Official rounded month-over-month estimate · margin ±${pub.momHalfWidth.toFixed(1)} percentage points</p><div class="confidence-range"><span>${percentage(band.low)}</span><span>${Math.round((pub.confidenceLevel||.9)*100)}% interval</span><span>${percentage(band.high)}</span></div><div class="callout ${band.includesZero?'warning':''}">${band.includesZero?'The interval contains zero. The monthly change is not statistically distinguishable from zero at the published confidence level.':'The published interval excludes zero for this specific comparison.'}</div>`;
}

function trust(){
  const q=report.quality;const checks=q.checks||[];const failures=checks.filter(c=>!c.passed);
  return `<div class="quality-banner">${icon(failures.length?'info':'check')}<div><h2>${failures.length?'A source check needs review.':'A recent release, with a reproducible path.'}</h2><p>${checks.filter(c=>c.passed).length} of ${checks.length} current-data checks passed · original USD units preserved · no FX conversion</p></div></div><div class="section-grid"><article class="panel panel-pad"><h2>What “current” means here</h2><dl class="source-grid"><div><dt>Latest observation</dt><dd>${e(dateLabel(report.meta.latestMonth,true))}</dd></div><div><dt>Official release date</dt><dd>${e(report.meta.releaseDate)}</dd></div><div><dt>Geography</dt><dd>United States</dd></div><div><dt>Source units</dt><dd>Millions of US dollars</dd></div><div><dt>Estimate type</dt><dd>Nominal sales · not inflation adjusted</dd></div><div><dt>Primary source</dt><dd>US Census Bureau · MARTS / MRTS</dd></div></dl><div class="callout">The month describes when sales occurred. The release date describes when the estimate became available. A data refresh can revise earlier observations, so this report freezes one source vintage.</div></article><article class="panel panel-pad"><h2>Reconcile the latest national total</h2><p>${e(report.meta.latestMonth)} · seasonally adjusted · USD</p><div class="reconciliation"><div class="rec-row"><span>Retail trade</span><strong>${dollars(q.latestIdentity.retail)}</strong></div><div class="rec-row"><span>Food services and drinking places</span><strong>${dollars(q.latestIdentity.foodServices)}</strong></div><div class="rec-row total"><span>Retail and food services</span><strong>${dollars(q.latestIdentity.total)}</strong></div><div class="rec-row"><span>Identity residual</span><strong>${dollars(q.latestIdentity.residual,false)}</strong></div></div><div class="callout">The sector bridge uses 13 mutually exclusive top-level industries and an explicit published/rounding residual. A parent industry and its subcategories never enter the same additive total.</div></article></div><div class="section-grid"><article class="panel panel-pad"><h2>Executed source checks</h2><div class="market-checks">${checks.map(c=>`<div><span class="chip ${c.passed?'green':'amber'}">${c.passed?'Passed':'Review'}</span><span>${e(c.name.replaceAll('_',' '))}</span></div>`).join('')}</div></article><article class="panel panel-pad"><h2>Keep the uncertainty visible</h2><p>The October 2026 advance total has a published 90% margin of ±0.4 percentage points around the +0.2% monthly change. The interval contains zero. This does not establish a statistically detectable monthly increase.</p><p>Sales are nominal. Seasonal adjustment does not remove inflation. Advance, preliminary, revised, and historical estimates have different publication statuses; “historical” here means earlier periods in the current frozen vintage.</p><div class="callout warning">Market totals do not contain invoices or individual customer histories. Customer retention, AOV, order counts, and retailer-level causality are not inferred from these estimates.</div></article></div><article class="panel" style="margin-bottom:23px"><div class="panel-head"><div><h2>Original source files</h2><p>Frozen download fingerprints · exact observation coordinates remain in the export</p></div></div><div class="source-files">${report.meta.files.map(f=>`<div class="source-file"><h3>${e(f.id)}</h3><a href="${e(f.url)}" target="_blank" rel="noopener noreferrer">${e(f.url)}</a><p class="mono">SHA-256 ${e(f.sha256)}</p><small>${number(f.bytes)} bytes</small></div>`).join('')}</div><div class="panel-bottom"><span>${number(q.sourceRows)} source observations inspected</span><button class="text-button" data-action="audit">Download source audit</button></div></article>`;
}

function memo(){
  const m=periodMetrics();const pub=published();const band=interval(pub);const b=currentBridge();const leader=b?.sectors?.filter(r=>valid(r.delta)).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))[0];
  return `<div class="memo"><article class="panel" style="margin-bottom:23px"><div class="memo-cover"><p class="memo-tag">US retail decision brief</p><h2>${band?.includesZero?'A positive point estimate is not a clear acceleration signal.':'Read the industry change in its market context.'}</h2><div class="memo-meta"><span>${e(dateLabel(state.month,true))}</span><span>${e(category(state.category).name)}</span><span>${state.basis==='sa'?'Seasonally adjusted':'Not seasonally adjusted'}</span><span>Native USD · release ${e(report.meta.releaseDate)}</span></div><p class="memo-intro">Estimated nominal sales in the selected scope were <strong>${dollars(m.current)}</strong>, compared with <strong>${dollars(m.previous)}</strong> one month earlier and <strong>${dollars(m.priorYear)}</strong> in the same month last year. The level-based changes are <strong>${percentage(m.mom)} month over month</strong> and <strong>${percentage(m.yoy)} year over year</strong>.</p><div class="memo-findings"><div class="memo-finding"><strong>${deltaMoney(valid(m.current)&&valid(m.previous)?m.current-m.previous:null)}</strong><small>Month-over-month level change</small></div><div class="memo-finding"><strong>${percentage(m.yoy)}</strong><small>Same-month annual change</small></div><div class="memo-finding"><strong>${e(status(point()))}</strong><small>Publication status</small></div></div></div><section class="memo-section"><h3>What can be concluded</h3><p>${band?`For this exact published comparison, the official rounded monthly estimate is ${percentage(pub.momPct)} with a ${Math.round((pub.confidenceLevel||.9)*100)}% margin of ±${pub.momHalfWidth.toFixed(1)} percentage points. The interval runs from ${percentage(band.low)} to ${percentage(band.high)}. ${band.includesZero?'It contains zero, so there is insufficient statistical evidence of a nonzero monthly change.':'It excludes zero for this published comparison.'}`:'A matching published confidence interval is not included for this selected cut. The observed level comparison is descriptive; no significance claim is made.'}</p><p>${leader?`In the national market, ${e(leader.name)} has the largest absolute month-over-month contribution at ${deltaMoney(leader.delta)}. That bridge uses mutually exclusive industries and reconciles to the national level change.`:'Review the source industry table before attributing national change.'} Industry comparisons themselves have not been tested for significance.</p></section><section class="memo-section"><h3>Recommended next action</h3><p>Use the current release as a market benchmark. Compare the company’s own comparable-period sales against the relevant industry, then investigate product, customer, and channel changes in company transaction data before changing commercial plans.</p><p>Where the published monthly interval includes zero, avoid treating the headline as proof of acceleration. Check the multi-month trajectory, the next release and any revisions. A positive nominal trend can also reflect prices, so an inflation-aware analysis needs an appropriate, separately documented price index.</p><button class="text-button" data-view="drivers">Review national sector contributions ${icon('drivers')}</button></section><section class="memo-section"><h3>Competing explanations and limits</h3><p>A sales-level change may reflect volumes, prices, industry mix, seasonal patterns, sampling variation, or a revision. This report separates adjustment bases, fixes the release vintage, and shows reported uncertainty where available. It cannot identify a causal intervention effect from national aggregates.</p><p>No individual retailer invoices, customer cohorts, retention rates, order counts, margin, marketing spend, or campaign lift are present in these current-data sources. The separate 2009–2011 transaction lab demonstrates those analytical mechanics with historical data; it does not supply current customer evidence.</p></section><section class="memo-section"><h3>Source trail</h3><p>US Census Bureau, Advance Monthly Retail Trade and Monthly Retail Trade, release ${e(report.meta.releaseDate)}. Observation ${e(state.month)}; selected basis ${state.basis.toUpperCase()}; source values in millions of USD. Native USD amounts require no currency conversion.</p><p>Complete source fingerprints, row and column coordinates, validation results, and original source snapshots accompany this release. Earlier periods are revised estimates from this same frozen vintage.</p></section></article></div>`;
}

function openDialog(title,subtitle,body){dialog.innerHTML=`<div class="dialog-head"><div><h2 id="dialog-title">${e(title)}</h2><p>${e(subtitle)}</p></div><button class="icon-button" data-action="close" aria-label="Close dialog">${icon('close')}</button></div><div class="dialog-content">${body}</div>`;dialog.showModal();}
function sourceDialog(){
  const audit=state.view==='trust';const month=audit?report.meta.latestMonth:state.month;const basis=audit?'sa':state.basis;const id=audit||state.view==='drivers'?'total':state.category;const p=point(id,month);const src=p?.source?.[basis];const file=sourceName(src?.file);
  openDialog('The original observation','Published USD millions · exact source coordinates',`<dl class="source-grid"><div><dt>Observation</dt><dd>${e(month)}</dd></div><div><dt>Industry</dt><dd>${e(category(id).name)}</dd></div><div><dt>Adjustment basis</dt><dd>${basis.toUpperCase()}</dd></div><div><dt>Original value, USD millions</dt><dd>${number(p?.[basis])}</dd></div><div><dt>Publication status</dt><dd>${e(status(p))}</dd></div><div><dt>Release vintage</dt><dd>${e(p?.vintage||report.meta.releaseDate)}</dd></div><div class="full"><dt>Source coordinate</dt><dd>${e(src?`${src.file} · ${src.sheet||'text series'} · row ${src.row} · column ${src.column}`:'No coordinate is available for this observation.')}</dd></div>${file?`<div class="full"><dt>Frozen source SHA-256</dt><dd class="mono hash">${e(file.sha256)}</dd></div>`:''}</dl><p>The source value is already US dollars, reported in millions. For example, 748,220 million USD is $748.22 billion. Formatting changes the display scale, not the source unit.</p>${file?`<p><a href="${e(file.url)}" target="_blank" rel="noopener noreferrer">Open the official source file</a></p>`:''}`);
}
function about(){openDialog('Current US data, with the right boundaries','October 2026 observation · November 17, 2026 official release',`<h3>A new primary data foundation</h3><p>The main report uses recent US Census Bureau retail estimates in native USD. It no longer presents a 2011 UK transaction dataset as the main business case. Latest observation: ${e(dateLabel(report.meta.latestMonth,true))}; release vintage: ${e(report.meta.releaseDate)}.</p><h3>What these sources contain</h3><p>Published industry-level sales estimates, seasonal adjustment, publication statuses, comparable periods, and reported uncertainty. They do not contain customer IDs, invoices, order counts, retention, or profit.</p><h3>Historical lab</h3><p><a href="./lab.html">The transaction lab</a> preserves the 2009–2011 UCI case as a separate, explicitly historical demonstration of invoice provenance, cohort boundaries, and exact reconciliation. Its fixed GBP-to-USD display conversion applies only inside that lab.</p><h3>Frozen and reproducible</h3><p>The pipeline downloads and fingerprints the official sources, retains source coordinates, applies documented precedence for current and revised values, and exports this static report. It is a verified release snapshot, not an unmonitored live feed.</p>`);}
function dictionary(){
  const definitions=[
    ['Estimated sales','Published nominal retail and food-services sales. Original units are millions of US dollars. The interface displays USD with an explicit scale.'],
    ['Month-over-month change','100 × (current-month level / previous-month level − 1), using one industry, adjustment basis, and frozen source vintage. An unavailable or zero denominator remains unavailable.'],
    ['Year-over-year change','100 × (current-month level / the same month one year earlier − 1), on the identical scope and basis.'],
    ['Seasonally adjusted (SA)','Census-adjusted for recurring seasonal, holiday, and trading-day effects. Seasonal adjustment does not remove price changes or make the values inflation adjusted.'],
    ['Not seasonally adjusted (NSA)','Published sales retaining seasonal, holiday, and trading-day patterns. Never combine SA and NSA levels in a comparison.'],
    ['Industry contribution','Industry current level minus its prior level. Percentage-point contribution divides that difference by the national prior total. The national bridge uses 13 non-overlapping broad industries plus an explicit residual.'],
    ['Reported uncertainty','A published confidence interval is tied to its exact scope, adjustment basis, month, and comparison. A 90% interval containing zero does not support a nonzero change at that confidence level.'],
    ['Release vintage and revisions','Observation month records when sales occurred. Release vintage identifies which publication supplied the estimate. Advance, preliminary, revised, and current-vintage historical points are distinguished.'],
    ['Customer metrics','This current Census dataset has no invoices or individual customer histories. AOV, customer retention, order count, campaign lift, and profit cannot be calculated from it.']
  ];
  openDialog('Metric dictionary','Current US market report · native USD',definitions.map(([title,text])=>`<article class="dictionary-item"><h3>${e(title)}</h3><p>${e(text)}</p></article>`).join(''));
}
function exportEvidence(){
  const id=state.view==='drivers'?'total':state.category;const m=periodMetrics(id);const p=point(id);const b=currentBridge();
  const rows=[['RevenueLens current US evidence'],['Source','US Census Bureau MARTS/MRTS'],['Latest observation',report.meta.latestMonth],['Release vintage',report.meta.releaseDate],['Selected month',state.month],['Industry',category(id).name],['Adjustment basis',state.basis],['Source file ID',p?.source?.[state.basis]?.file],['Source worksheet',p?.source?.[state.basis]?.sheet],['Source row',p?.source?.[state.basis]?.row],['Source column',p?.source?.[state.basis]?.column],['Currency','Native USD; source levels in millions'],['Prices','Nominal; not inflation adjusted'],[],['Measure','Unit','Value'],['Current sales','USD millions',m.current],['Previous-month sales','USD millions',m.previous],['Prior-year same-month sales','USD millions',m.priorYear],['MoM','Percent',m.mom],['YoY','Percent',m.yoy],['Status','Text',p?.status],[],['Published uncertainty (exact matching cut only)'],['MoM margin','Percentage points',state.basis==='sa'?p?.reported?.momHalfWidth:null],['Confidence level','Fraction',state.basis==='sa'?p?.reported?.confidenceLevel:null],[],['National sector','Current USD millions','Prior USD millions','Delta USD millions','Contribution pp'],...(b?[...b.sectors.map(r=>[r.name,r.current,r.previous,r.delta,r.momContributionPp]),['Rounding / published residual',b.residual.current,b.residual.previous,b.residual.delta,b.previous?100*b.residual.delta/b.previous:null]]:[['National bridge unavailable']]),[],['Source files','URL','SHA256'],...report.meta.files.map(f=>[f.id,f.url,f.sha256]),[],['Limitations','Estimates subject to revision; no retailer invoices, customer retention, profit, causal lift or inflation-adjusted sales are inferred.']];
  saveFile(buildCSV(rows),`RevenueLens-US-${state.month}-${id}-${state.basis}.csv`,'text/csv;charset=utf-8');toast('Current US evidence exported with source fingerprints.');
}
function trendData(){openDialog('The trend, in numbers',`${category(state.category).name} · ${state.basis.toUpperCase()} · native USD`, `<div class="dialog-table"><table class="data-table"><thead><tr><th>Observation</th><th>Sales USD</th><th>Prior-year USD</th><th>YoY</th></tr></thead><tbody>${chartRows().slice().reverse().map(r=>`<tr><td>${dateLabel(r.month)}</td><td>${dollars(r.current,false)}</td><td>${dollars(r.prior,false)}</td><td>${percentage(comparison(r.current,r.prior))}</td></tr>`).join('')}</tbody></table></div><p>Original values are USD millions. Every row uses the same industry, adjustment basis, and release vintage. Unavailable observations are not assigned zero.</p>`);}

async function exportBriefPDF(button){
  const memo=document.querySelector('.memo');
  if(!memo||button.disabled)return;
  const snapshot=memo.cloneNode(true);
  const options={title:'US retail decision brief',filename:`RevenueLens-US-${state.month}-${state.category}-${state.basis}.pdf`,contextLines:[`Reporting currency: USD (native source amounts)`, `Observation: ${state.month} | Industry: ${category(state.category).name} | Basis: ${state.basis.toUpperCase()}`, `US Census release vintage: ${report.meta.releaseDate}`]};
  button.disabled=true;button.setAttribute('aria-busy','true');
  try{
    const {downloadBriefPDF}=await import('./brief-pdf.mjs');
    await downloadBriefPDF(snapshot,options);
    toast('Selected brief PDF downloaded.');
  }catch(error){
    console.error('Brief PDF export failed',error);
    toast('PDF download failed. Please try again or use Print brief.');
  }finally{
    if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');}
  }
}

document.addEventListener('click',event=>{
  const target=event.target.closest('button,a,[data-month]');if(!target)return;
  if(target.dataset.view){state.view=target.dataset.view;updateURL();render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(target.dataset.sector){state.category=target.dataset.sector;state.view='overview';updateURL();render();return;}
  if(target.dataset.month&&report.periods.includes(target.dataset.month)){state.month=target.dataset.month;updateURL();render();return;}
  switch(target.dataset.action){
    case 'close':dialog.close();break;
    case 'dictionary':dictionary();break;
    case 'about':about();break;
    case 'source':sourceDialog();break;
    case 'trend-data':trendData();break;
    case 'export':exportEvidence();break;
    case 'pdf':void exportBriefPDF(target);break;case 'print':window.print();break;
    case 'reset':state={view:state.view,month:report.meta.latestMonth,category:'total',basis:'sa'};updateURL();render();toast('Returned to the latest US release.');break;
    case 'audit':saveFile(JSON.stringify({meta:report.meta,quality:report.quality,points:report.points},null,2),'RevenueLens-US-source-audit.json','application/json');break;
    case 'bridge-info':openDialog('An additive national bridge','USD sales change · arithmetic attribution','<p>The bridge sums changes in 13 mutually exclusive broad industries. It excludes subcategories and overlapping totals. A residual keeps any published rounding or uncovered difference visible. Percentage-point contributions use the national prior level as denominator. None of these arithmetic allocations establishes causality.</p>');break;
  }
});
document.addEventListener('change',event=>{const {id,value}=event.target;if(id==='market-month'&&report.periods.includes(value))state.month=value;else if(id==='market-category'&&category(value))state.category=value;else if(id==='market-basis'&&['sa','nsa'].includes(value))state.basis=value;else return;updateURL();render();});
document.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target.dataset.month){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});

async function boot(){
  try{
    const response=await fetch('./data/market.json');if(!response.ok)throw new Error(`Current snapshot request failed (${response.status}).`);
    report=await response.json();if(!report.meta?.latestMonth||!report.points||!report.categories?.length)throw new Error('The current-data export is incomplete.');
    state.month=report.meta.latestMonth;
    const query=new URLSearchParams(location.search);
    if(navigation.some(v=>v[0]===query.get('view')))state.view=query.get('view');
    if(report.periods.includes(query.get('month')))state.month=query.get('month');
    if(category(query.get('sector')))state.category=query.get('sector');
    if(['sa','nsa'].includes(query.get('basis')))state.basis=query.get('basis');
    render();
  }catch(error){app.innerHTML=`<main class="error-state"><p class="eyebrow">RevenueLens · US retail</p><h1>The current US snapshot is not available yet.</h1><p>${e(error.message)}</p><p>Build the official current-data snapshot with <span class="mono">python -m pipeline.market build</span>, then serve the report over HTTP.</p><button class="button primary" id="retry-market">Retry current snapshot</button></main>`;document.querySelector('#retry-market').addEventListener('click',boot);}
}
boot();
