import { VERSION, REGIONS, RELICS, RARITIES, RESEARCH, MILESTONES, CHRONICLES, EXHIBITIONS, EXHIBITION_LEVELS, COMMISSIONS } from './data.js';

export const MAX_LEVEL = 20;
export const MAX_RESONANCE = 3;
export const EXPEDITION_MS = 2800;
export const MAX_READINESS = 10;
export const READINESS_INTERVAL_MS = 2 * 60 * 1000;
export const REST_CAP_MS = 8 * 60 * 60 * 1000;
const clone = state => structuredClone(state);
const bounded = (n, max = 1e9) => Number.isSafeInteger(n) && n >= 0 && n <= max;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

export function newGame(now = Date.now()) {
  return { version: VERSION, name: '기록가', ink: 120, dust: 12, xp: 0, runs: 0, upgrades: 0,
    readiness: { amount: MAX_READINESS, updatedAt: now },
    owned: { r0: { level: 1, copies: 0, resonance: 0 } }, equipped: ['r0'],
    research: { focus: 0, ink: 0, dust: 0, rest: 0 }, visits: [0, 0, 0, 0, 0, 0], pity: [0, 0, 0, 0, 0, 0],
    notebook: { notes: [], exhibits: {}, completed: 0, active: null }, unlocked: 0, claimed: [], history: [], createdAt: now, lastSeen: now, tutorialDismissed: false, reducedMotion: false };
}
export function readiness(state, now = Date.now()) {
  const saved = state.readiness, time = Math.max(saved.updatedAt,now);
  const recovered = Math.floor((time-saved.updatedAt)/READINESS_INTERVAL_MS);
  const amount = Math.min(MAX_READINESS,saved.amount+recovered);
  const updatedAt = amount === MAX_READINESS ? time : saved.updatedAt + recovered*READINESS_INTERVAL_MS;
  return { amount, updatedAt, nextIn: amount === MAX_READINESS ? 0 : READINESS_INTERVAL_MS-(time-updatedAt) };
}
export function restockCost(state, now = Date.now()) {
  const amount = Math.min(3,MAX_READINESS-readiness(state,now).amount);
  return amount ? {amount,ink:REGIONS[state.unlocked].ink*3*amount} : null;
}
export function restock(state, now = Date.now()) {
  const cost=restockCost(state,now), supply=readiness(state,now);
  assert(cost, '준비도가 이미 가득 찼습니다.');
  assert(state.ink>=cost.ink, '보급에 필요한 잉크가 부족합니다. 자연 회복을 기다려 주세요.');
  const next=clone(state);next.ink-=cost.ink;
  next.readiness={amount:supply.amount+cost.amount,updatedAt:supply.amount+cost.amount===MAX_READINESS?Math.max(now,supply.updatedAt):supply.updatedAt};
  return finish(next,now);
}
export function relicPower(state, id) {
  const item = state.owned[id];
  const relic = RELICS.find(r => r.id === id);
  return item && relic ? RARITIES[relic.rarity].base + (item.level - 1) * 9 + item.resonance * 18 : 0;
}
export const archiveLevel = state => 1 + Math.floor(Math.sqrt(state.xp / 45));
export const nextLevelXp = state => archiveLevel(state) ** 2 * 45;
export function power(state) {
  return 35 + state.equipped.reduce((n, id) => n + relicPower(state, id), 0) + Object.keys(state.owned).length * 4 + state.research.focus * 12 + (archiveLevel(state) - 1) * 3;
}
export function finish(state, now = Date.now()) {
  state.ink = Math.min(1e9, state.ink); state.dust = Math.min(1e9, state.dust); state.xp = Math.min(1e7, state.xp);
  for (const r of REGIONS) if (power(state) >= r.power) state.unlocked = Math.max(state.unlocked, r.id);
  state.lastSeen = now;
  return state;
}
export function upgradeCost(state, id) {
  const relic = RELICS.find(r => r.id === id), item = state.owned[id];
  if (!relic || !item || item.level >= MAX_LEVEL) return null;
  return { ink: Math.floor(28 * 1.18 ** (item.level - 1) * RARITIES[relic.rarity].factor), dust: Math.max(1, Math.floor(item.level * .65)) };
}
export function upgrade(state, id) {
  const cost = upgradeCost(state, id);
  assert(cost, '이미 완전히 복원한 유물입니다.');
  assert(state.ink >= cost.ink && state.dust >= cost.dust, '잉크 또는 잔향이 부족합니다. 탐사를 다녀와 주세요.');
  const next = clone(state);
  next.ink -= cost.ink; next.dust -= cost.dust; next.owned[id].level++; next.upgrades++;
  return finish(next);
}
export function resonate(state, id) {
  const item = state.owned[id];
  assert(item && item.resonance < MAX_RESONANCE, '공명을 더 높일 수 없습니다.');
  const cost = 2 + item.resonance;
  assert(item.copies >= cost, `같은 유물의 기억 ${cost}개가 필요합니다.`);
  const next = clone(state); next.owned[id].copies -= cost; next.owned[id].resonance++;
  return finish(next);
}
export function equip(state, id, replaceId = null) {
  assert(state.owned[id], '아직 발견하지 못한 유물입니다.');
  const next = clone(state);
  if (next.equipped.includes(id)) next.equipped = next.equipped.filter(x => x !== id);
  else if (next.equipped.length < 3) next.equipped.push(id);
  else {
    assert(replaceId && next.equipped.includes(replaceId), '교체할 유물을 선택해 주세요.');
    next.equipped[next.equipped.indexOf(replaceId)] = id;
  }
  return finish(next);
}
export function bestEquipment(state) {
  const next = clone(state);
  next.equipped = Object.keys(next.owned).sort((a, b) => relicPower(next, b) - relicPower(next, a) || a.localeCompare(b)).slice(0, 3);
  return finish(next);
}
export function researchCost(state, id) {
  const spec = RESEARCH.find(r => r.id === id);
  return !spec || state.research[id] >= spec.max ? null : Math.floor(spec.cost * spec.growth ** state.research[id]);
}
export function research(state, id) {
  const cost = researchCost(state, id);
  assert(cost !== null, '연구를 모두 마쳤습니다.');
  assert(state.ink >= cost, '연구에 필요한 잉크가 부족합니다.');
  const next = clone(state); next.ink -= cost; next.research[id]++;
  return finish(next);
}
export function expectedRewards(state, regionId) {
  const region = REGIONS[regionId];
  assert(region, '알 수 없는 탐사지입니다.');
  return { ink: Math.floor(region.ink * (1 + state.research.ink * .08)), dust: Math.floor(region.dust * (1 + state.research.dust * .1)), xp: region.xp };
}
function pick(items, rng) {
  const weight = r => ({ common: 6, rare: 3, epic: 1 }[r.rarity]);
  const total = items.reduce((sum, r) => sum + weight(r), 0);
  let draw = Math.max(0, Math.min(.999999999, Number(rng()) || 0)) * total;
  return items.find(r => (draw -= weight(r)) < 0) || items.at(-1);
}
export function explore(state, regionId, rng = Math.random, now = Date.now()) {
  assert(Number.isInteger(regionId) && regionId >= 0 && regionId <= state.unlocked && REGIONS[regionId], '아직 열리지 않은 탐사지입니다.');
  const supplies = readiness(state,now);
  assert(supplies.amount > 0, '탐사 준비도가 부족합니다. 2분마다 1씩 회복돼요.');
  const next = clone(state), pool = RELICS.filter(r => r.region === regionId), missing = pool.filter(r => !next.owned[r.id]);
  next.readiness = { amount: supplies.amount-1, updatedAt: supplies.updatedAt };
  const guaranteed = missing.length > 0 && (next.pity[regionId] >= 5 || next.runs === 0);
  const relic = pick(guaranteed ? missing : pool, rng), isNew = !next.owned[relic.id];
  const rewards = expectedRewards(state, regionId);
  const duplicateDust = isNew ? 0 : { common: 2, rare: 4, epic: 8 }[relic.rarity];
  next.ink += rewards.ink; next.dust += rewards.dust + duplicateDust; next.xp += rewards.xp;
  next.runs++; next.visits[regionId]++;
  next.pity[regionId] = isNew || !missing.length ? 0 : Math.min(5, next.pity[regionId] + 1);
  if (isNew) {
    next.owned[relic.id] = { level: 1, copies: 0, resonance: 0 };
    if (next.equipped.length < 3) next.equipped.push(relic.id);
  } else next.owned[relic.id].copies = Math.min(1e6, next.owned[relic.id].copies + 1);
  const result = { relic: relic.id, isNew, guaranteed, ink: rewards.ink, dust: rewards.dust + duplicateDust, xp: rewards.xp, region: regionId, at: now };
  next.history = [result, ...next.history].slice(0, 30);
  return { state: finish(next, now), result };
}
export const metric = (state, type) => type === 'collection' ? Object.keys(state.owned).length : state[type];
export function claim(state, id) {
  const milestone = MILESTONES.find(m => m.id === id);
  assert(milestone && !state.claimed.includes(id) && metric(state, milestone.metric) >= milestone.goal, '아직 받을 수 없는 보상입니다.');
  const next = clone(state); next.claimed.push(id); next.ink += milestone.ink; next.dust += milestone.dust;
  return finish(next);
}
export function rest(state, now = Date.now()) {
  const next = clone(state);
  const elapsed = Math.max(0, Math.min(REST_CAP_MS, now - state.lastSeen));
  const minutes = Math.floor(elapsed / 60000);
  const reward = state.runs > 0 && minutes >= 1 ? { minutes, ink: Math.floor(minutes * 2 * (1 + state.research.rest * .2)), dust: Math.floor(minutes / 10) } : null;
  if (reward) { next.ink += reward.ink; next.dust += reward.dust; }
  return { state: finish(next, now), reward };
}
export function chronicleProgress(state, id) {
  const note = CHRONICLES.find(n => n.id === id);
  assert(note, '알 수 없는 답사록입니다.');
  const items = RELICS.filter(r => r.region === note.region).map(r => state.owned[r.id]).filter(Boolean);
  const values = [state.visits[note.region], items.length, items.reduce((n,item) => n + item.level, 0)];
  const goals = [note.visits, note.owned, note.levels];
  const previous = note.tier === 0 || state.notebook.notes.includes(`note-${note.region}-${note.tier-1}`);
  return { values, goals, ready: previous && values.every((n,i) => n >= goals[i]) };
}
export function claimChronicle(state, id) {
  assert(!state.notebook.notes.includes(id) && chronicleProgress(state,id).ready, '앞선 기록과 답사 조건을 먼저 완성해 주세요.');
  const note = CHRONICLES.find(n => n.id === id), next = clone(state);
  next.notebook.notes.push(id);next.ink += note.ink;next.dust += note.dust;
  return finish(next);
}
export function exhibitionProgress(state, id) {
  const exhibit = EXHIBITIONS.find(e => e.id === id);
  assert(exhibit, '알 수 없는 전시입니다.');
  const tier = state.notebook.exhibits[id] || 0, level = EXHIBITION_LEVELS[tier];
  return { tier, level, ready: tier < 3 && exhibit.relics.every(id => (state.owned[id]?.level || 0) >= level), ink: [300,900,2400][tier] || 0, dust: [20,60,150][tier] || 0 };
}
export function claimExhibition(state, id) {
  const progress = exhibitionProgress(state,id);
  assert(progress.ready, '전시할 유물을 모으고 필요한 레벨까지 복원해 주세요.');
  const next = clone(state);next.notebook.exhibits[id] = progress.tier + 1;
  next.ink += progress.ink;next.dust += progress.dust;
  return finish(next);
}
export function commissionOffer(state, id) {
  const spec = COMMISSIONS.find(c => c.id === id);
  assert(spec, '알 수 없는 의뢰입니다.');
  const region = state.notebook.completed % (state.unlocked + 1);
  // Reward is fixed on acceptance; an easy old district never pays late-game rates.
  const rewardRegion = spec.metric === 'visits' ? region : state.unlocked;
  return { id, region, baseline: spec.metric === 'visits' ? state.visits[region] : state[spec.metric],
    ink: REGIONS[rewardRegion].ink * spec.multiplier, dust: REGIONS[rewardRegion].dust * spec.multiplier };
}
export function startCommission(state, id) {
  assert(!state.notebook.active, '받아 둔 의뢰를 마치거나 내려놓아 주세요.');
  assert(state.notebook.completed < 1e6, '모든 의뢰 기록을 채웠습니다.');
  if(id === 'restore') assert(Object.values(state.owned).some(item => item.level < MAX_LEVEL), '복원할 수 있는 유물이 없습니다. 다른 의뢰를 골라 주세요.');
  const next = clone(state);next.notebook.active = commissionOffer(state,id);return finish(next);
}
export function commissionProgress(state) {
  const active = state.notebook.active;
  if(!active) return null;
  const spec = COMMISSIONS.find(c => c.id === active.id);
  const value = (spec.metric === 'visits' ? state.visits[active.region] : state[spec.metric]) - active.baseline;
  return { value: Math.max(0,Math.min(spec.goal,value)), goal: spec.goal, ready: value >= spec.goal };
}
export function claimCommission(state) {
  assert(commissionProgress(state)?.ready, '의뢰를 마치면 보상을 받을 수 있어요.');
  const next = clone(state), active = next.notebook.active;
  next.ink += active.ink;next.dust += active.dust;next.notebook.completed++;next.notebook.active = null;
  return finish(next);
}
export function cancelCommission(state) {
  const next = clone(state);next.notebook.active = null;return finish(next);
}
export function validateSave(raw) {
  assert(raw && typeof raw === 'object' && raw.version === VERSION, '지원하지 않는 세이브 파일입니다.');
  const state = newGame();
  for (const key of ['ink', 'dust', 'xp', 'runs', 'upgrades', 'createdAt', 'lastSeen']) {
    assert(bounded(raw[key], ['createdAt', 'lastSeen'].includes(key) ? 1e14 : key === 'xp' ? 1e7 : 1e9), '저장 데이터의 숫자가 올바르지 않습니다.');
    state[key] = raw[key];
  }
  assert(typeof raw.name === 'string' && raw.name.trim().length > 0 && raw.name.length <= 16, '기록가 이름은 1~16자여야 합니다.');
  state.name = raw.name.trim();
  assert(raw.owned && typeof raw.owned === 'object' && Object.keys(raw.owned).length > 0 && Object.keys(raw.owned).length <= RELICS.length, '유물 데이터가 올바르지 않습니다.');
  state.owned = {};
  for (const [id, item] of Object.entries(raw.owned)) {
    assert(RELICS.some(r => r.id === id) && item && bounded(item.level, MAX_LEVEL) && item.level >= 1 && bounded(item.copies, 1e6) && bounded(item.resonance, MAX_RESONANCE), '유물의 성장 데이터가 올바르지 않습니다.');
    state.owned[id] = { level: item.level, copies: item.copies, resonance: item.resonance };
  }
  assert(Array.isArray(raw.equipped) && raw.equipped.length <= 3 && new Set(raw.equipped).size === raw.equipped.length && raw.equipped.every(id => Object.hasOwn(state.owned, id)), '동행 유물 데이터가 올바르지 않습니다.');
  state.equipped = [...raw.equipped];
  for (const spec of RESEARCH) { assert(raw.research && bounded(raw.research[spec.id], spec.max), '연구 데이터가 올바르지 않습니다.'); state.research[spec.id] = raw.research[spec.id]; }
  for (const key of ['visits', 'pity']) {
    assert(Array.isArray(raw[key]) && raw[key].length === REGIONS.length && raw[key].every(n => bounded(n, key === 'pity' ? 5 : 1e9)), '탐사 기록이 올바르지 않습니다.');
    state[key] = [...raw[key]];
  }
  assert(bounded(raw.unlocked, REGIONS.length - 1), '탐사지 데이터가 올바르지 않습니다.'); state.unlocked = raw.unlocked;
  assert(Array.isArray(raw.claimed) && new Set(raw.claimed).size === raw.claimed.length && raw.claimed.every(id => MILESTONES.some(m => m.id === id)), '여정 보상 기록이 올바르지 않습니다.');
  state.claimed = [...raw.claimed];
  state.history = (Array.isArray(raw.history) ? raw.history : []).filter(h => h && RELICS.some(r => r.id === h.relic) && typeof h.isNew === 'boolean' && bounded(h.region, 5) && bounded(h.at, 1e14) && ['ink','dust','xp'].every(k => bounded(h[k]))).slice(0, 30).map(h => ({ relic:h.relic, isNew:h.isNew, guaranteed:!!h.guaranteed, region:h.region, at:h.at, ink:h.ink, dust:h.dust, xp:h.xp }));
  if(raw.readiness !== undefined) {
    assert(raw.readiness && bounded(raw.readiness.amount,MAX_READINESS) && bounded(raw.readiness.updatedAt,1e14), '탐사 준비도 기록이 올바르지 않습니다.');
    state.readiness = {amount:raw.readiness.amount,updatedAt:raw.readiness.updatedAt};
  }
  // Additive migration: version-1 saves from before the notebook keep all progress.
  if (raw.notebook !== undefined) {
    const book = raw.notebook;
    assert(book && typeof book === 'object' && Array.isArray(book.notes) && new Set(book.notes).size === book.notes.length && book.notes.every(id => CHRONICLES.some(n => n.id === id)), '답사록 데이터가 올바르지 않습니다.');
    assert(book.exhibits && typeof book.exhibits === 'object' && !Array.isArray(book.exhibits) && Object.entries(book.exhibits).every(([id,tier]) => EXHIBITIONS.some(e => e.id === id) && bounded(tier,3)), '전시 기록이 올바르지 않습니다.');
    assert(bounded(book.completed,1e6), '의뢰 기록이 올바르지 않습니다.');
    state.notebook = {notes:[...book.notes],exhibits:{...book.exhibits},completed:book.completed,active:null};
    if (book.active !== null) {
      const a = book.active, spec = COMMISSIONS.find(c => c.id === a?.id);
      assert(spec && bounded(a.region,state.unlocked) && bounded(a.baseline) && bounded(a.ink,930) && bounded(a.dust,48), '진행 중인 의뢰가 올바르지 않습니다.');
      assert(a.baseline <= (spec.metric === 'visits' ? state.visits[a.region] : state[spec.metric]), '의뢰의 시작 기록이 올바르지 않습니다.');
      state.notebook.active = {id:a.id,region:a.region,baseline:a.baseline,ink:a.ink,dust:a.dust};
    }
  }
  state.tutorialDismissed = !!raw.tutorialDismissed; state.reducedMotion = !!raw.reducedMotion;
  return state;
}
export const serialize = state => JSON.stringify(validateSave(state));
export function parseSave(text) {
  assert(typeof text === 'string' && text.length <= 250000, '세이브 파일이 너무 큽니다.');
  let raw;
  try { raw = JSON.parse(text); } catch { throw new Error('JSON 형식의 세이브 파일을 선택해 주세요.'); }
  return validateSave(raw);
}
