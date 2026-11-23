import { REPORTING_FX } from './fx.mjs';
export { REPORTING_FX };
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const available = value => value !== null && value !== undefined && Number.isFinite(Number(value));
export function toUSD(value) { return available(value) ? Number((Number(value) * REPORTING_FX.usdPerGbp).toFixed(8)) : null; }
export function money(value, compact = false) {
  if (!available(value)) return 'Unavailable';
  return new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',notation:compact?'compact':'standard',minimumFractionDigits:compact?1:2,maximumFractionDigits:2}).format(toUSD(value));
}
export function sourceGBP(value) { return available(value) ? new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',minimumFractionDigits:2,maximumFractionDigits:4}).format(value) : 'Unavailable'; }
export function unitPrice(value) { return available(value) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:4}).format(toUSD(value)) : 'Unavailable'; }
export function count(value) { return available(value) ? new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}).format(value) : 'Unavailable'; }
export function percent(value, digits=1) { return available(value) ? `${(Number(value)*100).toFixed(digits)}%` : 'Unavailable'; }
export function signedMoney(value, compact = true) { return available(value) ? `${value>0?'+':''}${money(value,compact)}` : 'Unavailable'; }
export function pctChange(current,previous) { return !available(current)||!available(previous)||Number(previous)===0 ? null : (current-previous)/previous; }
export function monthLabel(value, short = false) { const [y,m]=String(value).split('-').map(Number); return new Intl.DateTimeFormat('en-GB',{month:short?'short':'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1))); }
export function csv(rows) { return rows.map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\r\n'); }
export function download(text,filename,type='text/plain') { const blob=new Blob([text],{type}); const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
export function selectComparison(data,period,country) { return data.comparisons[`${period}|${country}`] ?? null; }
export function difference(current,previous) { return available(current)&&available(previous)?Number(current)-Number(previous):null; }
export function normalizeReport(report) {
  if(!report.meta || !Array.isArray(report.periods) || !report.comparisons || !report.quality) throw new Error('The report snapshot has an unsupported structure.');
  const q=report.quality;
  q.dispositions=q.dispositions ?? (q.counts||[]).map(x=>({...x,name:x.disposition}));
  q.duplicateCandidates=q.duplicateCandidates ?? q.duplicates;
  if(!q.dispositions.length || !q.duplicateCandidates) throw new Error('The report snapshot is missing its source audit.');
  return report;
}
