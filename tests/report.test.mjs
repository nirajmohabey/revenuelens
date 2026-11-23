import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {available,difference,money,toUSD,sourceGBP,unitPrice,REPORTING_FX,pctChange,normalizeReport} from '../web/model.mjs';

test('Missing observations remain unavailable instead of becoming arithmetic zero',()=>{
  assert.equal(available(null),false);
  assert.equal(difference(200,null),null);
  assert.equal(pctChange(200,0),null);
  assert.equal(money(null),'Unavailable');
  assert.equal(difference(200,0),200);
  assert.equal(pctChange(0,200),-1);
});

test('USD reporting converts amounts while preserving source evidence',()=>{
  assert.equal(toUSD(100),157.05);
  assert.equal(toUSD(null),null);
  assert.equal(money(100),'$157.05');
  assert.equal(sourceGBP(100),'£100.00');
  assert.equal(unitPrice(0.001),'$0.0016');
  assert.equal(REPORTING_FX.referenceDate,'2011-11-30');
  assert.ok(Math.abs(pctChange(toUSD(120),toUSD(100))-pctChange(120,100))<1e-12);
});

test('Every application route consumes the final real-data schema',async()=>{
  const report=JSON.parse(await readFile(new URL('../dist/data/dashboard.json',import.meta.url),'utf8'));
  normalizeReport(report);
  const handlers={};
  const app={innerHTML:''};
  const dialog={innerHTML:'',showModal(){this.open=true;},close(){this.open=false;},addEventListener(){}};
  const toast={textContent:'',classList:{add(){},remove(){}}};
  globalThis.document={querySelector(selector){return selector==='#app'?app:selector==='#detail-dialog'?dialog:selector==='#toast'?toast:null;},querySelectorAll(){return [];},addEventListener(type,handler){handlers[type]=handler;},title:''};
  globalThis.window={scrollTo(){},print(){}};
  globalThis.location={href:'http://localhost/',search:''};
  globalThis.history={replaceState(){}};
  globalThis.fetch=async()=>({ok:true,json:async()=>report});
  await import('../web/app.js');
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(app.innerHTML.includes('Business overview'));
  assert.ok(!app.innerHTML.includes('could not be opened'));
  const click=dataset=>handlers.click({target:{closest:()=>({dataset})}});
  for(const page of ['drivers','cohorts','trust','memo','overview']){
    click({page});
    assert.ok(app.innerHTML.includes('id="page-content"'),`${page} failed to render`);
    assert.ok(!app.innerHTML.includes('NaN'),`${page} contains invalid arithmetic`);
  }
  click({action:'dictionary'});
  assert.ok(dialog.open && dialog.innerHTML.includes('90-day repurchase rate'));
  click({action:'close-dialog'});
  handlers.change({target:{id:'period-filter',value:'2010-12'}});
  handlers.change({target:{id:'country-filter',value:'Bahrain'}});
  click({page:'drivers'});
  assert.ok(app.innerHTML.includes('A fair comparison needs observations'));
  assert.ok(!app.innerHTML.includes('All contributions reconcile to'));
  click({page:'memo'});
  assert.ok(app.innerHTML.includes('A fair comparison needs observations'));
  click({page:'overview'});
  assert.ok(app.innerHTML.includes('period has no eligible observations'));
});
