import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {growth,usd,interval,comparison} from '../web/market-model.mjs';

test('Current USD levels, growth, and uncertainty preserve units and missingness',()=>{
  assert.equal(usd(1,false),'$1,000,000');
  assert.equal(growth(null,10),null);
  assert.equal(growth(10,0),null);
  assert.equal(growth(120,100),20);
  const band=interval({momPct:.2,momHalfWidth:.4});
  assert.equal(band.includesZero,true);
  assert.ok(Math.abs(band.low+.2)<1e-12&&Math.abs(band.high-.6)<1e-12);
  assert.equal(interval(null),null);
});

test('Every current report period, industry and basis renders from real source values',async()=>{
  const data=JSON.parse(await readFile(new URL('../dist/data/market.json',import.meta.url),'utf8'));
  const handlers={};const app={innerHTML:'',contains:()=>false};
  const dialog={innerHTML:'',open:false,showModal(){this.open=true;},close(){this.open=false;},addEventListener(){}};
  const toast={classList:{add(){},remove(){}}};
  globalThis.document={querySelector:s=>s==='#app'?app:s==='#detail-dialog'?dialog:s==='#toast'?toast:null,querySelectorAll:()=>[],addEventListener:(type,fn)=>{handlers[type]=fn;},title:''};
  globalThis.window={scrollTo(){},print(){}};
  globalThis.location={href:'http://localhost/',search:''};
  globalThis.history={replaceState(){}};
  globalThis.fetch=async()=>({ok:true,json:async()=>data});
  await import('../web/market.js');await new Promise(resolve=>setImmediate(resolve));
  assert.ok(app.innerHTML.includes('The US retail picture'),app.innerHTML.slice(0,600));
  assert.ok(app.innerHTML.includes('October 2026'));
  assert.ok(app.innerHTML.includes('$748.22B'));
  const click=dataset=>handlers.click({target:{closest:()=>({dataset})}});
  const change=(id,value)=>handlers.change({target:{id,value}});
  let renders=0;
  for(const basis of ['sa','nsa']){
    change('market-basis',basis);
    for(const month of data.periods){
      change('market-month',month);
      for(const sector of data.categories){
        change('market-category',sector.id);
        for(const view of ['overview','trends','memo']){
          click({view});
          assert.ok(app.innerHTML.includes('id="page-content"'),`${month}/${sector.id}/${basis}/${view}`);
          assert.ok(!/NaN|undefined/.test(app.innerHTML),`${month}/${sector.id}/${basis}/${view}`);
          renders++;
        }
      }
      click({view:'drivers'});renders++;
    }
  }
  click({view:'trust'});assert.ok(app.innerHTML.includes('Reconcile the latest national total'));
  change('market-month','2026-10');change('market-category','total');change('market-basis','sa');click({view:'trends'});
  assert.ok(app.innerHTML.includes('The interval contains zero'));
  change('market-basis','nsa');
  assert.ok(app.innerHTML.includes('matching published confidence interval is not included'));
  assert.ok(!app.innerHTML.includes('Official rounded month-over-month estimate'));
  const c=comparison(data,'total','2026-10','sa');
  assert.equal(c.value,748220);assert.equal(c.previous,746637);
  // The audit has a fixed scope even after another industry/month was selected.
  change('market-month','2025-10');change('market-category','447');change('market-basis','nsa');click({view:'trust'});
  assert.ok(app.innerHTML.includes('aria-label="Download source audit"'));
  click({action:'source'});
  assert.ok(dialog.innerHTML.includes('2026-10')&&dialog.innerHTML.includes('748,220')&&dialog.innerHTML.includes('column J'));
  assert.ok(!dialog.innerHTML.includes('Gasoline stations'));
  click({action:'close'});
  let capturedBlob;
  globalThis.document.createElement=()=>({click(){}});
  URL.createObjectURL=blob=>{capturedBlob=blob;return 'blob:report-test';};
  URL.revokeObjectURL=()=>{};
  click({action:'audit'});
  const audit=JSON.parse(await capturedBlob.text());
  assert.equal(audit.points['total|2026-10'].sa,748220);
  assert.equal(audit.points['total|2026-10'].source.sa.column,'J');
  click({view:'overview'});click({action:'export'});
  const exported=await capturedBlob.text();
  const source=data.points['447|2025-10'].source.nsa;
  assert.ok(exported.includes(`"Source worksheet","${source.sheet}"`));
  assert.ok(exported.includes(`"Source row",${source.row}`));
  assert.ok(exported.includes(`"Source column","${source.column}"`));
  console.log(`Rendered ${renders+1} current-market route/filter combinations.`);
});
