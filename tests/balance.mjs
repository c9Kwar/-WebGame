import assert from 'node:assert/strict';
import * as g from '../src/game.js';
import { RELICS, MILESTONES, REGIONS } from '../src/data.js';
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const summaries=[];
for(let seed=1;seed<=100;seed++){
  let state=g.newGame(), unlockedAt=[0], completeAt=null;const random=rng(seed);
  for(let run=1;run<=1600;run++){
    const missing=REGIONS.filter(r=>r.id<=state.unlocked&&RELICS.some(item=>item.region===r.id&&!state.owned[item.id]));
    const region=missing.length&&run%3===0?missing[0].id:state.unlocked;
    state=g.explore(state,region,random).state;
    for(const m of MILESTONES)if(!state.claimed.includes(m.id)&&g.metric(state,m.metric)>=m.goal)state=g.claim(state,m.id);
    for(const id of Object.keys(state.owned))while(state.owned[id].resonance<3&&state.owned[id].copies>=2+state.owned[id].resonance)state=g.resonate(state,id);
    state=g.bestEquipment(state);
    for(let attempt=0;attempt<30;attempt++){
      const options=state.equipped.map(id=>({id,cost:g.upgradeCost(state,id),value:9})).filter(o=>o.cost&&state.ink>=o.cost.ink&&state.dust>=o.cost.dust);
      const focus=g.researchCost(state,'focus');if(focus!==null&&state.ink>=focus)options.push({id:'focus',cost:{ink:focus},value:12});
      options.sort((a,b)=>a.cost.ink/a.value-b.cost.ink/b.value);if(!options.length)break;
      state=options[0].id==='focus'?g.research(state,'focus'):g.upgrade(state,options[0].id);
    }
    state=g.bestEquipment(state);
    for(let i=1;i<=state.unlocked;i++)if(!unlockedAt[i])unlockedAt[i]=run;
    if(Object.keys(state.owned).length===30){completeAt=run;break;}
  }
  assert.equal(state.unlocked,5,`seed ${seed}: final region inaccessible`);
  assert.equal(Object.keys(state.owned).length,30,`seed ${seed}: collection never completed`);
  assert.ok(state.ink>=0&&state.dust>=0);assert.ok(unlockedAt[5]<=150,'Final region creates a progression wall');assert.ok(completeAt<=180,'Collection completion takes too long');assert.ok(unlockedAt[5]>20,'Entire game progression is too fast');
  summaries.push({unlockedAt,completeAt});
}
const median=values=>values.toSorted((a,b)=>a-b)[Math.floor(values.length/2)];
console.log('100 deterministic simulated playthroughs passed. Strategy: cheapest power upgrades, claim rewards, occasionally revisit incomplete areas.');
console.table(REGIONS.map(r=>({region:r.name,median_expeditions:median(summaries.map(s=>s.unlockedAt[r.id])),earliest:Math.min(...summaries.map(s=>s.unlockedAt[r.id])),latest:Math.max(...summaries.map(s=>s.unlockedAt[r.id]))})));
console.log('Full collection expedition counts:',{median:median(summaries.map(s=>s.completeAt)),min:Math.min(...summaries.map(s=>s.completeAt)),max:Math.max(...summaries.map(s=>s.completeAt))});
