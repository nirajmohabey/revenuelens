export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const valid = value => typeof value === 'number' && Number.isFinite(value);
export const number = value => valid(value) ? new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(value) : 'Unavailable';
export const usd = (millions,compact=true) => valid(millions) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:compact?'compact':'standard',minimumFractionDigits:compact?1:0,maximumFractionDigits:compact?2:0}).format(millions*1000000) : 'Unavailable';
export const signedUSD = value => valid(value) ? `${value>0?'+':''}${usd(value)}` : 'Unavailable';
export const rate = (value,digits=1,signed=false) => valid(value) ? `${signed&&value>0?'+':''}${value.toFixed(digits)}%` : 'Unavailable';
export const growth = (current,prior) => valid(current)&&valid(prior)&&prior!==0 ? (current-prior)/prior*100 : null;
export function shiftMonth(month,offset){const [y,m]=month.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+offset,1));return d.toISOString().slice(0,7);}
export function monthName(month,short=false){return new Intl.DateTimeFormat('en-US',{month:short?'short':'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T00:00:00Z`));}
export function getPoint(data,category,month){return data.points[`${category}|${month}`]??null;}
export function comparison(data,category,month,basis){const current=getPoint(data,category,month),prior=getPoint(data,category,shiftMonth(month,-1)),year=getPoint(data,category,shiftMonth(month,-12));const value=current?.[basis]??null,previous=prior?.[basis]??null,priorYear=year?.[basis]??null;return {current,prior,year,value,previous,priorYear,mom:growth(value,previous),yoy:growth(value,priorYear),delta:valid(value)&&valid(previous)?value-previous:null,yoyDelta:valid(value)&&valid(priorYear)?value-priorYear:null,reported:basis==='sa'?current?.reported??null:null};}
export function interval(reported,key='mom'){const center=reported?.[`${key}Pct`],halfWidth=reported?.[`${key}HalfWidth`];return valid(center)&&valid(halfWidth)?{low:center-halfWidth,high:center+halfWidth,includesZero:center-halfWidth<=0&&center+halfWidth>=0}:null;}
export function buildCSV(rows){return '\uFEFF'+rows.map(row=>row.map(v=>{if(typeof v==='number')return Number.isFinite(v)?String(v):'';let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
export function saveFile(content,name,type='text/plain'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
