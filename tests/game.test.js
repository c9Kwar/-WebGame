import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../src/game.js';
import { RELICS, REGIONS, RESEARCH } from '../src/data.js';

test('first expedition guarantees a new relic, pays rewards and auto equips without mutating input',()=>{
  const state=g.newGame(1000), original=JSON.stringify(state);
  const {state:next,result}=g.explore(state,0,()=>0,2000);
  assert.equal(result.isNew,true);assert.equal(next.runs,1);assert.equal(next.ink,152);assert.equal(next.dust,15);assert.equal(next.equipped.length,2);assert.equal(JSON.stringify(state),original);
});
test('unopened and malformed regions cannot be explored',()=>{
  const state=g.newGame();for(const id of [-1,1,6,NaN,0.5,'0'])assert.throws(()=>g.explore(state,id));
});
test('sixth expedition since last discovery guarantees an unowned relic',()=>{
  let state=g.newGame();state.runs=1;
  for(let i=0;i<5;i++){const result=g.explore(state,0,()=>0);assert.equal(result.result.isNew,false);state=result.state;}
  const result=g.explore(state,0,()=>0);assert.equal(result.result.isNew,true);assert.equal(result.result.guaranteed,true);assert.equal(result.state.pity[0],0);
});
test('completed region continues giving duplicates and never selects empty pool',()=>{
  let state=g.newGame();for(const r of RELICS.filter(r=>r.region===0))state.owned[r.id]={level:1,copies:0,resonance:0};
  for(let i=0;i<30;i++){const r=g.explore(state,0,()=>.9999);assert.equal(r.result.isNew,false);assert.equal(r.result.relic,'r4');state=r.state;}
  assert.equal(state.owned.r4.copies,30);assert.equal(state.pity[0],0);
});
test('duplicate memories give copies and rarity-specific bonus dust',()=>{
  const state=g.newGame();state.runs=1;
  const result=g.explore(state,0,()=>0);assert.equal(result.state.owned.r0.copies,1);assert.equal(result.result.dust,5);
});
test('restoration deducts exactly the displayed cost and increases item strength by nine',()=>{
  const state=g.newGame(), cost=g.upgradeCost(state,'r0'), power=g.power(state);
  const next=g.upgrade(state,'r0');assert.equal(next.ink,state.ink-cost.ink);assert.equal(next.dust,state.dust-cost.dust);assert.equal(g.power(next),power+9);assert.equal(next.upgrades,1);
});
test('insufficient resources and maximum level cannot be bypassed',()=>{
  let state=g.newGame();state.ink=0;assert.throws(()=>g.upgrade(state,'r0'));
  state.ink=100000;state.dust=10000;
  for(let i=1;i<20;i++)state=g.upgrade(state,'r0');
  assert.equal(state.owned.r0.level,20);assert.equal(g.upgradeCost(state,'r0'),null);assert.throws(()=>g.upgrade(state,'r0'));
});
test('resonance consumes increasing duplicate amounts and adds eighteen power',()=>{
  let state=g.newGame();state.owned.r0.copies=9;
  const before=g.power(state);for(let i=0;i<3;i++)state=g.resonate(state,'r0');
  assert.equal(state.owned.r0.copies,0);assert.equal(g.power(state),before+54);assert.throws(()=>g.resonate(state,'r0'));
});
test('three slots enforce explicit replacement and best equipment is deterministic',()=>{
  let state=g.newGame();for(const id of ['r1','r2','r3'])state.owned[id]={level:1,copies:0,resonance:0};
  state=g.equip(g.equip(state,'r1'),'r2');assert.throws(()=>g.equip(state,'r3'));
  state=g.equip(state,'r3','r0');assert.deepEqual(state.equipped,['r3','r1','r2']);assert.throws(()=>g.equip(state,'r20'));
  const next=g.bestEquipment(state);assert.equal(new Set(next.equipped).size,3);assert.ok(next.equipped.includes('r2'));assert.ok(next.equipped.includes('r3'));
});
test('unlocked paths remain open after removing powerful companions',()=>{
  const state=g.newGame();state.owned.r0.level=20;
  const next=g.finish(state);assert.ok(next.unlocked>=1);
  const removed=g.equip(next,'r0');assert.equal(removed.unlocked,next.unlocked);assert.doesNotThrow(()=>g.explore(removed,1));
});
test('each research path respects its maximum and reward effects apply',()=>{
  for(const spec of RESEARCH){let state=g.newGame();state.ink=1e8;for(let i=0;i<spec.max;i++)state=g.research(state,spec.id);assert.equal(g.researchCost(state,spec.id),null);assert.throws(()=>g.research(state,spec.id));}
  const state=g.newGame();state.research.ink=10;state.research.dust=8;
  assert.deepEqual(g.expectedRewards(state,0),{ink:57,dust:5,xp:20});
});
test('milestone rewards require progress and cannot be claimed twice',()=>{
  const state=g.newGame();assert.throws(()=>g.claim(state,'first'));
  const explored=g.explore(state,0,()=>0).state, next=g.claim(explored,'first');
  assert.equal(next.ink,explored.ink+50);assert.equal(next.dust,explored.dust+5);assert.throws(()=>g.claim(next,'first'));assert.throws(()=>g.claim(next,'unknown'));
});
test('offline resources are capped at eight hours, require first expedition, and never pay twice',()=>{
  const now=1e9;let state=g.newGame(now);assert.equal(g.rest(state,now+g.REST_CAP_MS).reward,null);
  state=g.explore(state,0,()=>0,now).state;const {state:next,reward}=g.rest(state,now+g.REST_CAP_MS*10);
  assert.deepEqual(reward,{minutes:480,ink:960,dust:48});assert.equal(g.rest(next,now+g.REST_CAP_MS*10).reward,null);
});
test('clock going backwards never subtracts resources',()=>{
  const state=g.newGame(1000000);state.runs=1;const result=g.rest(state,0);assert.equal(result.reward,null);assert.equal(result.state.ink,state.ink);
});
test('save roundtrip preserves progress and history',()=>{
  let state=g.newGame();for(let i=0;i<10;i++)state=g.explore(state,0,()=>.8).state;
  assert.deepEqual(g.parseSave(g.serialize(state)),state);
});
test('save import rejects corrupt, oversized, negative, duplicate and unknown data',()=>{
  assert.throws(()=>g.parseSave('{broken'));assert.throws(()=>g.parseSave('x'.repeat(250001)));
  for(const edit of [s=>s.version=99,s=>s.ink=-1,s=>s.dust=NaN,s=>s.xp=1e9,s=>s.owned.r0.level=21,s=>s.owned.r0.resonance=4,s=>s.equipped=['r0','r0'],s=>s.equipped=['r20'],s=>s.owned.evil={level:1,copies:0,resonance:0},s=>s.research.focus=11,s=>s.unlocked=6,s=>s.name='',s=>s.visits=[],s=>s.claimed=['evil']]){const s=g.newGame();edit(s);assert.throws(()=>g.parseSave(JSON.stringify(s)));}
});
test('save imports discard unknown fields and prototype-shaped identifiers',()=>{
  const raw=JSON.parse(g.serialize(g.newGame()));raw.extra='not persisted';assert.equal(g.validateSave(raw).extra,undefined);
  const evil=JSON.parse(g.serialize(g.newGame()));evil.owned=JSON.parse('{"__proto__":{"level":1,"copies":0,"resonance":0}}');assert.throws(()=>g.validateSave(evil));
});
test('all relics have unique identities and each area has exact rarity distribution',()=>{
  assert.equal(new Set(RELICS.map(r=>r.id)).size,30);
  for(const region of REGIONS){const pool=RELICS.filter(r=>r.region===region.id);assert.equal(pool.length,5);assert.equal(pool.filter(r=>r.rarity==='epic').length,1);assert.equal(pool.filter(r=>r.rarity==='rare').length,2);}
});
test('collection pity bounds full collection even with worst-case repeated draws',()=>{
  let state=g.newGame();state.unlocked=5;
  for(let region=0;region<6;region++)for(let run=0;run<30;run++)state=g.explore(state,region,()=>0).state;
  assert.equal(Object.keys(state.owned).length,30);
});
test('malformed history is filtered without executing markup or preserving foreign fields',()=>{
  const s=g.newGame();s.history=[{relic:'bad'},{relic:'r0',isNew:true,region:0,at:1,ink:3,dust:2,xp:1,html:'<script>bad</script>'}];
  const result=g.validateSave(s);assert.equal(result.history.length,1);assert.equal(result.history[0].html,undefined);
});

test('older saves migrate without losing progress and notebook survives export',()=>{
  const old=g.newGame(1000);delete old.notebook;old.ink=765;
  const migrated=g.parseSave(JSON.stringify(old));assert.equal(migrated.ink,765);assert.deepEqual(migrated.notebook,{notes:[],exhibits:{},completed:0,active:null});
  const accepted=g.startCommission(migrated,'walk');assert.deepEqual(g.parseSave(g.serialize(accepted)),accepted);
});
test('commissions count only accepted activity, pay once, and cancellation costs nothing',()=>{
  let state=g.newGame();state.visits[0]=20;state.runs=20;
  state=g.startCommission(state,'walk');assert.equal(g.commissionProgress(state).value,0);assert.throws(()=>g.startCommission(state,'survey'));assert.throws(()=>g.claimCommission(state));
  for(let i=0;i<6;i++)state=g.explore(state,0,()=>0).state;
  assert.equal(g.commissionProgress(state).ready,true);const before=structuredClone(state);
  state=g.claimCommission(state);assert.equal(state.ink,before.ink+64);assert.equal(state.dust,before.dust+6);assert.equal(state.notebook.completed,1);assert.throws(()=>g.claimCommission(state));assert.ok(before.notebook.active);
  state=g.startCommission(state,'restore');const cancelled=g.cancelCommission(state);assert.equal(cancelled.ink,state.ink);assert.deepEqual(cancelled.owned,state.owned);assert.equal(cancelled.notebook.active,null);
});
test('restoration commissions use upgrades, region commissions rotate only among open areas',()=>{
  let state=g.newGame();state.unlocked=2;state.notebook.completed=4;
  assert.equal(g.commissionOffer(state,'walk').region,1);assert.equal(g.commissionOffer(state,'walk').ink,116);
  state.ink=10000;state.dust=1000;state=g.startCommission(state,'restore');
  for(let i=0;i<3;i++)state=g.upgrade(state,'r0');
  assert.equal(g.commissionProgress(state).ready,true);state=g.claimCommission(state);assert.equal(state.notebook.completed,5);
});
test('chronicles require sequence, visits, collection and local restoration; claims are one time',()=>{
  let state=g.newGame();assert.throws(()=>g.claimChronicle(state,'note-0-0'));assert.throws(()=>g.claimChronicle(state,'invalid'));
  state.visits[0]=35;for(let i=0;i<5;i++)state.owned[`r${i}`]={level:10,copies:0,resonance:0};
  assert.throws(()=>g.claimChronicle(state,'note-0-1'));
  for(let i=0;i<3;i++){const before=state.ink;state=g.claimChronicle(state,`note-0-${i}`);assert.ok(state.ink>before);assert.throws(()=>g.claimChronicle(state,`note-0-${i}`));}
  assert.equal(state.notebook.notes.length,3);assert.equal(g.chronicleProgress(state,'note-1-0').ready,false);assert.deepEqual(g.parseSave(g.serialize(state)).notebook,state.notebook);
});
test('exhibitions require all three relics at each tier and never consume them',()=>{
  let state=g.newGame();assert.throws(()=>g.claimExhibition(state,'letters'));
  for(const id of ['r1','r20','r25'])state.owned[id]={level:1,copies:2,resonance:0};
  const owned=structuredClone(state.owned);state=g.claimExhibition(state,'letters');assert.deepEqual(state.owned,owned);assert.throws(()=>g.claimExhibition(state,'letters'));
  for(const level of [5,12]){for(const id of ['r1','r20','r25'])state.owned[id].level=level;state=g.claimExhibition(state,'letters');}
  assert.equal(state.notebook.exhibits.letters,3);assert.throws(()=>g.claimExhibition(state,'letters'));assert.deepEqual(g.parseSave(g.serialize(state)).notebook,state.notebook);
});
test('malformed notebook imports are rejected instead of erasing or overpaying progress',()=>{
  const cases=[null,{notes:['unknown'],exhibits:{},completed:0,active:null},{notes:[],exhibits:{letters:4},completed:0,active:null},{notes:[],exhibits:{},completed:-1,active:null}];
  for(const notebook of cases){const state=g.newGame();state.notebook=notebook;assert.throws(()=>g.serialize(state));}
  for(const patch of [{baseline:1},{ink:999999},{region:5},{id:'unknown'}]){const state=g.startCommission(g.newGame(),'walk');Object.assign(state.notebook.active,patch);assert.throws(()=>g.serialize(state));}
});
