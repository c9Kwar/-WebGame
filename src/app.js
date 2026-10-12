import { SAVE_KEY, REGIONS, RELICS, RARITIES, RESEARCH, MILESTONES, STORIES } from './data.js';
import * as game from './game.js';
import { icon, mark, relicArt, sceneArt } from './art.js';

const $ = (s, root = document) => root.querySelector(s);
const fmt = n => new Intl.NumberFormat('ko-KR').format(n);
const esc = str => String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const root = $('#app'), dialog = $('#detail-dialog');
let storageProblem = '', preservedCorrupt = false, saveTimer, expeditionTimer, tickTimer, audioCtx;
let state;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  try { state = raw ? game.parseSave(raw) : game.newGame(); }
  catch {
    localStorage.setItem(`${SAVE_KEY}.recovery`, raw);
    state = game.newGame(); preservedCorrupt = true;
    storageProblem = '이전 저장을 읽지 못했습니다. 원본을 복구용으로 보관했습니다. 설정에서 내려받을 수 있습니다.';
  }
} catch { state = game.newGame(); storageProblem = '이 브라우저에서 자동 저장을 사용할 수 없습니다. 설정에서 세이브 파일을 내려받아 진행을 보관해 주세요.'; }
const rested = game.rest(state); state = rested.state;
const ui = { tab: 'home', region: 0, filter: 'all', ownedOnly: false, search: '', active: null, auto: 0, latest: null, selected: null, sound: false, saved: false, importing: null };
const tabs = [ ['home','나의 서고','archive'], ['explore','도시 탐사','compass'], ['collection','유물 도감','grid'], ['research','기억 연구','feather'], ['journal','이야기','book'] ];

function persist() {
  if (preservedCorrupt) return;
  try { localStorage.setItem(SAVE_KEY, game.serialize(state)); ui.saved = true; }
  catch { storageProblem = '저장 공간에 접근할 수 없습니다. 설정에서 세이브 백업을 내려받아 주세요.'; ui.saved = false; }
}
function commit(next) { state = next; persist(); render(); }
function toast(text, kind = '') {
  const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = text;
  $('#toasts').append(el); setTimeout(() => el.remove(), 4500);
}
// A separate, non-blocking stage survives page renders during continuous exploration.
let discoveryTimer;
function clearDiscovery() {
  clearTimeout(discoveryTimer);
  document.querySelector('.discovery-stage')?.remove();
}
function revealDiscovery(result) {
  clearDiscovery();
  if (document.hidden) return;
  const relic = RELICS.find(r => r.id === result.relic), rarity = RARITIES[relic.rarity];
  const reduced = state.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count = reduced ? 0 : {common: 6, rare: 16, epic: 28}[relic.rarity];
  const duration = {common: 1600, rare: 2200, epic: 2600}[relic.rarity];
  const stage = document.createElement('section');
  stage.className = `discovery-stage discovery-${relic.rarity}${reduced ? ' discovery-still' : ''}`;
  stage.style.setProperty('--reveal-duration', `${duration}ms`);
  stage.setAttribute('aria-label', `${rarity.name} 유물 발견`);
  stage.innerHTML = `<div class="discovery-veil" aria-hidden="true"></div>
    <div class="discovery-halo" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="discovery-motes" aria-hidden="true">${Array.from({length:count},(_,i)=>`<i style="--angle:${i*137.5}deg;--distance:${110+(i%5)*32}px;--delay:${(i%7)*45}ms"></i>`).join('')}</div>
    <div class="discovery-record">
      <div class="discovery-caption">${relic.rarity==='epic'?'시간이 멈추고, 영원이 남았다':relic.rarity==='rare'?'잊힌 기억이 빛을 되찾았다':'작은 흔적이 서고에 닿았다'}</div>
      <div class="discovery-art" aria-hidden="true">${relicArt(relic,'discovery')}<span class="discovery-seal">${mark}</span></div>
      <p class="discovery-grade">${rarity.label} <span>· ${rarity.name}</span></p>
      <h2>${esc(relic.name)}</h2>
      <p class="discovery-note">${result.isNew?'처음 만난 기록':'다시 닿은 기억 · 중복 유물 획득'}</p>
      <button class="discovery-dismiss" type="button" aria-label="발견 연출 닫기">서고로 돌아가기 <span aria-hidden="true">↗</span></button>
    </div>`;
  stage.querySelector('button').addEventListener('click', clearDiscovery);
  document.body.append(stage);
  discoveryTimer = setTimeout(clearDiscovery, duration);
}
document.addEventListener('keydown', event => { if (event.key === 'Escape') clearDiscovery(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) clearDiscovery(); });
// Any deliberate interaction with the game clears the transient illustration.
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.discovery-stage')) clearDiscovery();
}, true);
function chime(rarity = 'common') {
  if (!ui.sound) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    ({common:[523.25,659.25],rare:[392,523.25,659.25],epic:[261.63,392,523.25,659.25,783.99]}[rarity]).forEach((frequency, i) => {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(), t = audioCtx.currentTime + i * .09;
      osc.type = 'sine'; osc.frequency.value = frequency; gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.035,t+.025); gain.gain.exponentialRampToValueAtTime(.001,t+.7);
      osc.connect(gain); gain.connect(audioCtx.destination); osc.start(t); osc.stop(t+.75);
    });
  } catch { ui.sound = false; }
}
const money = (type, amount, cls = '') => `<span class="resource ${cls}">${icon(type === 'ink' ? 'ink' : 'star')}<span>${fmt(amount)}</span></span>`;
const collectionCount = region => RELICS.filter(r => r.region === region && state.owned[r.id]).length;
function sidebar() {
  const level = game.archiveLevel(state), baseXp = (level - 1) ** 2 * 45, progress = (state.xp - baseXp) / (game.nextLevelXp(state) - baseXp) * 100;
  return `<aside class="sidebar"><a class="brand" href="#home" data-tab="home" aria-label="잔향 서고 홈">${mark}<span>잔향 서고<small>THE STILL ARCHIVE</small></span></a><div class="sidebar-divider"></div><p class="nav-label">YOUR QUIET JOURNEY</p><nav aria-label="주 메뉴">${tabs.map(([id,label,img]) => `<button class="nav-item ${ui.tab===id?'active':''}" data-tab="${id}" ${ui.tab===id?'aria-current="page"':''}>${icon(img)}<span>${label}</span>${id==='collection'?`<small>${Object.keys(state.owned).length}<i>/30</i></small>`:''}</button>`).join('')}</nav><div class="sidebar-note"><span class="small-star">✧</span><p>잊힌 것들에게<br>돌아갈 곳을.</p><span>EST. IN A TIMELESS CITY</span></div><div class="profile"><div class="profile-top"><span class="avatar">${icon('feather')}</span><div><strong>${esc(state.name)}</strong><small>서고지기 · Lv. ${level}</small></div><button class="icon-button" data-action="settings" aria-label="설정">${icon('settings')}</button></div><div class="progress thin" role="progressbar" aria-label="서고지기 성장" aria-valuenow="${Math.floor(progress)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div><div class="profile-xp"><span>다음 기록까지</span><span>${fmt(game.nextLevelXp(state)-state.xp)} XP</span></div></div></aside>`;
}
function header() {
  return `<header class="topbar"><div class="breadcrumb"><span>서고</span>${icon('chevron')}<strong>${tabs.find(t=>t[0]===ui.tab)[1]}</strong></div><div class="balances"><span class="balance" title="복원과 연구에 사용하는 잉크">${icon('ink')}<span><small>잉크</small><b data-balance="ink">${fmt(state.ink)}</b></span></span><span class="balance dust" title="유물을 복원하는 기억의 잔향">${icon('star')}<span><small>잔향</small><b data-balance="dust">${fmt(state.dust)}</b></span></span><button class="power-chip" data-action="power" title="공명력 구성 보기">${icon('focus')}<span>${fmt(game.power(state))}</span></button><button class="icon-button help-button" data-action="help" aria-label="플레이 안내">${icon('help')}</button><button class="icon-button mobile-settings" data-action="settings" aria-label="설정">${icon('settings')}</button></div></header>`;
}
function heading(kicker, title, subtitle, extra = '') {
  return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${subtitle}</p></div>${extra}</div>`;
}
function expeditionButton() {
  if (ui.active) return `<button class="button primary explore-button" disabled>${icon('compass','turning')}<span>기억을 찾는 중…</span></button><button class="auto-button" data-action="stop-auto">${ui.auto>0?`연속 탐사 중 · ${ui.auto}회 남음 · 멈추기`:'이번 탐사 후 돌아옵니다'}</button>`;
  return `<button class="button primary explore-button" data-action="explore">${icon('compass')}<span>탐사 떠나기</span>${icon('arrow')}</button><button class="auto-button" data-action="auto">5회 이어서 탐사 ${icon('chevron')}</button>`;
}
function hero() {
  const region = REGIONS[ui.region], reward = game.expectedRewards(state, ui.region);
  const complete = collectionCount(ui.region) === 5;
  return `<section class="hero" aria-labelledby="hero-title">${sceneArt(ui.region)}<div class="hero-frame"></div><div class="hero-topline"><span>CHAPTER ${region.chapter} <i></i> CITY EXPLORATION</span><span>${String(ui.region+1).padStart(2,'0')} / 06</span></div><div class="hero-copy"><p class="hero-subtitle">${region.subtitle}</p><h2 id="hero-title">${region.name}</h2><p class="hero-description">${region.description}</p><div class="hero-rewards"><span>탐사 보상</span>${money('ink',reward.ink)}${money('dust',reward.dust)}<span class="xp-label">+${reward.xp} XP</span></div><div class="hero-actions">${expeditionButton()}</div></div><div class="hero-bottom"><span class="expedition-status">${ui.active?REGIONS[ui.active.region].lines[0]:'어떤 발견이 기다릴까요. 가벼운 마음으로 떠나세요.'}</span><span>${complete?'수집 완료':`발견한 유물 ${collectionCount(ui.region)} / 5`}</span></div><div class="expedition-progress"><i style="width:${ui.active?Math.min(100,(Date.now()-ui.active.started)/game.EXPEDITION_MS*100):0}%"></i></div></section>`;
}
function journeyPanel() {
  const next = REGIONS[state.unlocked + 1], owned=Object.keys(state.owned).length;
  const progress = next ? Math.min(100, game.power(state)/next.power*100) : 100;
  return `<aside class="journey-panel"><div class="section-label"><span>서고의 발자취</span>${icon('leaf')}</div><h3>당신의 속도로,<br><em>오래도록.</em></h3><div class="journey-stats"><div><span>수집한 기록</span><strong>${owned}<small> / 30</small></strong></div><div><span>다녀온 탐사</span><strong>${fmt(state.runs)}<small> 회</small></strong></div></div><div class="next-region"><span class="eyebrow">${next?'NEXT DESTINATION':'ALL PATHS ARE OPEN'}</span><p>${next?`${icon('lock')} ${next.name}`:'모든 길이 열렸습니다'}</p><div class="progress"><i style="width:${progress}%"></i></div><small>${next?`공명력 ${fmt(game.power(state))} / ${fmt(next.power)}`:'남은 기억을 천천히 모아 보세요.'}</small></div><button class="text-button" data-tab="explore">도시 지도 살펴보기 ${icon('arrow')}</button></aside>`;
}
function relicCard(relic, where='collection') {
  const item = state.owned[relic.id], rarity=RARITIES[relic.rarity], equipped=state.equipped.includes(relic.id);
  return `<button class="relic-card ${item?'':'undiscovered'}" data-relic="${relic.id}" aria-label="${esc(relic.name)}${item?`, 레벨 ${item.level}${equipped?', 동행 중':''}`:', 미발견'}"><div class="card-art-wrap">${relicArt(relic,`${where}-${relic.id}`,!item)}<div class="card-top"><span class="rarity ${relic.rarity}">${item?rarity.name:'미발견'}</span>${item?`<span class="card-level">Lv. ${item.level}</span>`:icon('lock')}</div>${equipped?`<span class="equipped-tag">${icon('check')} 동행 중</span>`:''}${item&&item.resonance?`<span class="resonance-stars">${'✦'.repeat(item.resonance)}</span>`:''}</div><div class="card-info"><span class="card-catalog">NO. ${relic.number} <i>·</i> ${REGIONS[relic.region].chapter}</span><h3>${item?relic.name:'아직 닿지 않은 기억'}</h3><div class="card-bottom"><span>${icon('focus')}${item?game.relicPower(state,relic.id):'—'}</span><span>${item?'자세히 보기':'발견을 기다리는 중'} ${icon('chevron')}</span></div></div></button>`;
}
function resultBanner() {
  const r = ui.latest;
  if (!r) return '';
  const relic = RELICS.find(x=>x.id===r.relic);
  return `<section class="result-banner ${r.isNew?'new-discovery':''}" aria-label="탐사 결과"><div class="result-icon">${icon(r.isNew?'star':'check')}</div><div><span class="eyebrow">${r.isNew?'A NEW MEMORY':'EXPLORATION COMPLETE'}</span><p><strong>${relic.name}</strong>${r.isNew?' — 새로운 기억을 발견했어요.':' — 중복 기억을 모았어요.'}</p></div><div class="result-rewards">${money('ink',r.ink)}${money('dust',r.dust)}</div><button class="text-button" data-relic="${r.relic}">살펴보기 ${icon('arrow')}</button><button class="icon-button" data-action="dismiss-result" aria-label="탐사 결과 닫기">${icon('close')}</button></section>`;
}
function tutorial() {
  if (state.tutorialDismissed || state.runs > 8) return '';
  const step=state.runs===0?0:state.upgrades===0?1:2;
  return `<div class="tutorial"><span class="tutorial-number">0${step+1}</span><div><strong>${['첫 번째 기억을 찾아볼까요?','찾아온 기억에 온기를 더해요.','이제, 당신만의 속도로.'][step]}</strong><p>${['아래 ‘탐사 떠나기’를 누르면 유물과 성장 재료를 얻어요.','유물 카드를 눌러 복원해 보세요. 실패 없이 공명력이 올라갑니다.','공명력이 오르면 새로운 거리가 열립니다. 여정 보상도 받아 보세요.'][step]}</p></div><button class="icon-button" data-action="dismiss-tutorial" aria-label="시작 안내 닫기">${icon('close')}</button></div>`;
}
function milestones(compact=false) {
  let items=MILESTONES.filter(m=>!compact||!state.claimed.includes(m.id));
  if(compact)items=items.slice(0,3);
  if(!items.length)return '<div class="empty-state compact">모든 여정의 책갈피를 모았습니다. 이제 나머지 기억을 완전히 복원해 보세요.</div>';
  return `<div class="milestones ${compact?'compact':''}">${items.map(m=>{
    const value=game.metric(state,m.metric), claimed=state.claimed.includes(m.id), ready=value>=m.goal;
    return `<div class="milestone ${claimed?'claimed':''}"><span class="milestone-icon">${icon(claimed?'check':'crown')}</span><div class="milestone-info"><h3>${m.name}</h3><p>${m.description}<span>${Math.min(value,m.goal)} / ${m.goal}</span></p><div class="progress thin"><i style="width:${Math.min(100,value/m.goal*100)}%"></i></div></div><div class="milestone-reward">${money('ink',m.ink)}${money('dust',m.dust)}</div><button class="button small ${ready&&!claimed?'primary':'subtle'}" data-claim="${m.id}" ${!ready||claimed?'disabled':''}>${claimed?'기록 완료':ready?'보상 받기':'진행 중'}</button></div>`;
  }).join('')}</div>`;
}
function home() {
  const owned = Object.keys(state.owned).map(id=>RELICS.find(r=>r.id===id));
  const cards=[...owned].sort((a,b)=>Number(state.equipped.includes(b.id))-Number(state.equipped.includes(a.id))).slice(0,5);
  while(cards.length<5) { const next=RELICS.find(r=>!cards.includes(r));cards.push(next); }
  return `${heading('A LITTLE MORE, AT YOUR OWN PACE',`돌아오셨군요, ${esc(state.name)}님.`, '서두르지 않아도, 기억은 조금씩 쌓입니다.',`<span class="date-stamp"><i></i> 오늘도 서고는 열려 있어요</span>`)}${tutorial()}<div class="hero-grid">${hero()}${journeyPanel()}</div>${resultBanner()}<section class="section"><div class="section-heading"><div><span class="eyebrow">YOUR LITTLE WONDERS</span><h2>곁에 두고 싶은 기억</h2></div><button class="text-button" data-tab="collection">도감 모두 보기 <span class="count">${Object.keys(state.owned).length}/30</span>${icon('arrow')}</button></div><div class="relic-grid home-relics">${cards.map(r=>relicCard(r,'home')).join('')}</div></section><section class="section"><div class="section-heading"><div><span class="eyebrow">SMALL STEPS, LASTING MEMORIES</span><h2>여정의 책갈피</h2></div><span class="muted-text">작은 성취에도, 작은 선물.</span></div>${milestones(true)}</section><div class="quiet-note">${icon('leaf')}잠시 자리를 비워도 괜찮아요. 서고가 최대 8시간 동안 잉크를 모아 둘게요.</div>`;
}
function exploration() {
  return `${heading('SIX PLACES. COUNTLESS MEMORIES.', '도시가 품은 여섯 가지 이야기', '공명력이 높아지면 새로운 길이 열립니다. 열린 길은 언제든 다시 찾아갈 수 있어요.')}<div class="region-map">${REGIONS.map(r=>{
    const unlocked=r.id<=state.unlocked;
    return `<button class="region-card ${r.id===ui.region?'selected':''} ${unlocked?'':'locked'}" data-region="${r.id}" aria-disabled="${!unlocked}"><div class="region-thumb">${sceneArt(r.id,`map-${r.id}`)}<span>${r.chapter}</span>${unlocked?'':`<i>${icon('lock')}</i>`}</div><div class="region-info"><small>${r.english}</small><h3>${r.name}</h3><p>${unlocked?`${collectionCount(r.id)} / 5종 발견 · 탐사 ${state.visits[r.id]}회`:`공명력 ${fmt(r.power)}에 열립니다`}</p></div>${r.id===ui.region?'<span class="region-selected">탐사 중인 지역</span>':''}</button>`;
  }).join('')}</div>${hero()}${resultBanner()}<section class="section"><div class="section-heading"><div><span class="eyebrow">WAITING TO BE FOUND</span><h2>이 거리의 기억들</h2></div><span class="muted-text">${collectionCount(ui.region)===5?'모든 기억을 찾았어요. 중복 유물은 공명에 사용합니다.':`앞으로 최대 ${6-state.pity[ui.region]}회 안에 새로운 유물 확정`}</span></div><div class="relic-grid">${RELICS.filter(r=>r.region===ui.region).map(r=>relicCard(r,'region')).join('')}</div><p class="probability-note">매 탐사 유물 1개 확정 · 개별 등장 확률: 흔적 각 31.6%, 기억 각 15.8%, 영원 5.3%. 새로운 유물을 5회 연속 얻지 못하면 다음에는 미발견 유물 중 확정 발견합니다.</p></section>`;
}
function collection() {
  const sorted=RELICS.filter(r=>(ui.filter==='all'||r.region===Number(ui.filter))&&(!ui.ownedOnly||state.owned[r.id])&&(!ui.search||r.name.includes(ui.search)));
  return `${heading('EVERY MEMORY DESERVES A HOME', '당신의 작은 경이들', '유물을 복원하고 세 가지 기억과 동행하세요. 같은 유물은 더 깊은 공명이 됩니다.',`<div class="collection-total"><strong>${Object.keys(state.owned).length}</strong><span>/ 30<small>발견한 기록</small></span></div>`)}<section class="equipped-panel"><div class="equipped-heading"><div><span class="eyebrow">YOUR COMPANIONS</span><h2>함께하는 기억 <small>${state.equipped.length} / 3</small></h2></div><button class="text-button" data-action="best">${icon('focus')} 가장 강한 유물 동행</button></div><div class="equipped-slots">${Array.from({length:3},(_,i)=>{
    const r=RELICS.find(r=>r.id===state.equipped[i]);
    return r?`<button class="equipped-slot" data-relic="${r.id}"><div>${relicArt(r,`equip-${r.id}`)}</div><span><small>${RARITIES[r.rarity].name} · Lv. ${state.owned[r.id].level}</small><strong>${r.name}</strong><em>${icon('focus')}${game.relicPower(state,r.id)}</em></span>${icon('chevron')}</button>`:`<div class="equipped-slot empty-slot">${icon('plus')}<span>유물을 발견하면<br>함께할 수 있어요.</span></div>`;
  }).join('')}</div></section><div class="collection-controls"><div class="filter-tabs" role="group" aria-label="탐사지별 도감"><button data-filter="all" class="${ui.filter==='all'?'selected':''}">전체 기록</button>${REGIONS.map(r=>`<button data-filter="${r.id}" class="${ui.filter===String(r.id)?'selected':''}">${r.chapter}. ${r.name}</button>`).join('')}</div><div class="search-row"><label class="check-label"><input type="checkbox" id="owned-only" ${ui.ownedOnly?'checked':''}> 발견한 유물만</label><input class="search-input" id="relic-search" type="search" placeholder="기억의 이름 검색" aria-label="유물 이름 검색" maxlength="40" value="${esc(ui.search)}"></div></div><div class="relic-grid collection-grid">${sorted.length?sorted.map(r=>relicCard(r)).join(''):'<div class="empty-state">이 조건에 맞는 기록은 아직 없어요.</div>'}</div>`;
}
function researchPage() {
  return `${heading('THE ART OF REMEMBERING', '기억을 더 선명하게', '차곡차곡 쌓인 잉크로 서고를 연구하세요. 연구 효과는 모든 탐사에 영구 적용됩니다.')}<div class="research-intro"><div class="research-seal">${mark}</div><div><span class="eyebrow">KNOWLEDGE STAYS WITH YOU</span><h2>아는 만큼, 더 깊이 발견하는 세계.</h2><p>동행 유물의 복원과 공명, 서고의 연구가 함께 당신의 힘이 됩니다.</p></div><span class="research-total">${RESEARCH.reduce((s,r)=>s+state.research[r.id],0)}<small>/ 34 연구</small></span></div><div class="research-grid">${RESEARCH.map(spec=>{
    const level=state.research[spec.id], cost=game.researchCost(state,spec.id), affordable=cost!==null&&state.ink>=cost;
    return `<article class="research-card"><div class="research-card-top"><span class="research-icon">${icon(spec.icon)}</span><span>STUDY ${String(RESEARCH.indexOf(spec)+1).padStart(2,'0')}</span></div><h2>${spec.name}</h2><p>${spec.description}</p><div class="research-level"><span>연구 단계 <strong>${level}</strong> / ${spec.max}</span><span>${Math.round(level/spec.max*100)}%</span></div><div class="segmented-progress">${Array.from({length:spec.max},(_,i)=>`<i class="${i<level?'filled':''}"></i>`).join('')}</div><button class="button ${affordable?'primary':'subtle'}" data-research="${spec.id}" ${!affordable?'disabled':''}>${cost===null?`${icon('check')} 연구 완료`:`연구하기 ${money('ink',cost)}`}</button>${cost!==null&&!affordable?`<small class="shortfall">잉크 ${fmt(cost-state.ink)}개가 더 필요해요.</small>`:'<small class="shortfall">모든 효과가 영구적으로 유지됩니다.</small>'}</article>`;
  }).join('')}</div><section class="section"><div class="section-heading"><div><span class="eyebrow">THE BOOKMARKS OF YOUR JOURNEY</span><h2>여정 보상</h2></div></div>${milestones()}</section>`;
}
function journal() {
  return `${heading('THINGS THAT TIME COULD NOT ERASE', '시간이 남겨 둔 문장들', '각 거리의 유물 3종을 모으면, 잊혀 있던 이야기가 한 장씩 열립니다.')}<div class="story-grid">${STORIES.map((story,i)=>{
    const open=story.region<0||collectionCount(story.region)>=3;
    return `<button class="story-card ${open?'':'locked'}" data-story="${i}" aria-disabled="${!open}"><span class="story-number">${String(i).padStart(2,'0')}</span><span class="story-tag">${i===0?'PROLOGUE':`CHAPTER ${REGIONS[story.region].chapter}`}</span><h2>${story.title}</h2><p>${open?story.text.split('\n')[0]:story.condition}</p><span class="story-bottom">${open?'기록 읽기':'아직 펼쳐지지 않은 페이지'}${icon(open?'arrow':'lock')}</span></button>`;
  }).join('')}</div><section class="section"><div class="section-heading"><div><span class="eyebrow">RECENT FINDINGS</span><h2>최근 탐사 기록</h2></div><span class="muted-text">최근 30회의 발견</span></div><div class="history-list">${state.history.length?state.history.map(h=>`<div class="history-row"><span class="history-symbol">${icon(h.isNew?'star':'compass')}</span><div><strong>${RELICS.find(r=>r.id===h.relic).name}${h.isNew?'<small>첫 발견</small>':''}</strong><span>${REGIONS[h.region].name} · ${new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(h.at)}</span></div>${money('ink',h.ink)}${money('dust',h.dust)}</div>`).join(''):`<div class="empty-state">아직 적힌 발자국이 없어요. 첫 탐사를 떠나 볼까요?<button class="text-button" data-tab="explore">도시 탐사 ${icon('arrow')}</button></div>`}</div></section>`;
}
function render() {
  document.documentElement.classList.toggle('reduce-motion',state.reducedMotion);
  const pages={home,explore:exploration,collection,research:researchPage,journal};
  root.innerHTML=`${sidebar()}<div class="workspace">${header()}${storageProblem?`<div class="storage-warning" role="alert">${esc(storageProblem)}<button class="text-button" data-action="settings">저장 설정</button></div>`:''}<main id="main" tabindex="-1">${pages[ui.tab]()}</main><footer><span>${mark}THE STILL ARCHIVE</span><span>오늘의 작은 발견이, 내일의 당신에게.</span><button data-action="settings" class="save-status">${icon(ui.saved?'check':'download')}${ui.saved?'이 기기에 저장됨':'저장 설정'}</button></footer></div>`;
}
function openDialog(content, cls='') {
  dialog.className=cls; dialog.innerHTML=`<button class="dialog-close icon-button" data-action="close-dialog" aria-label="닫기">${icon('close')}</button>${content}`;
  if(!dialog.open) dialog.showModal();
}
function showRelic(id) {
  ui.selected=id; const relic=RELICS.find(r=>r.id===id), item=state.owned[id], cost=game.upgradeCost(state,id), equipped=state.equipped.includes(id);
  const affordable=cost&&state.ink>=cost.ink&&state.dust>=cost.dust;
  const canResonate=item&&item.resonance<game.MAX_RESONANCE&&item.copies>=2+item.resonance;
  openDialog(`<div class="relic-detail"><div class="detail-art">${relicArt(relic,'dialog')}<span>${REGIONS[relic.region].english}</span></div><div class="detail-copy"><span class="eyebrow">NO. ${relic.number} <i>·</i> ${RARITIES[relic.rarity].label}</span><h2 id="dialog-title">${relic.name}</h2><p class="relic-quote">“${relic.quote}”</p>${item?`<div class="detail-stats"><div><small>복원 단계</small><strong>${item.level}<span> / ${game.MAX_LEVEL}</span></strong></div><div><small>유물 공명력</small><strong>${game.relicPower(state,id)}</strong></div><div><small>공명</small><strong class="detail-stars">${'✦'.repeat(item.resonance)}${'✧'.repeat(game.MAX_RESONANCE-item.resonance)}</strong></div></div><div class="detail-upgrade"><div><h3>기억 복원 <span>확정 성공</span></h3><p>${cost?`공명력 ${game.relicPower(state,id)} → <b>${game.relicPower(state,id)+9}</b>`:'모든 기억을 완전히 복원했습니다.'}</p></div><button class="button primary" data-upgrade="${id}" ${!affordable?'disabled':''}>${cost?'복원하기':'복원 완료'}${cost?`${money('ink',cost.ink)}${money('dust',cost.dust)}`:icon('check')}</button>${cost&&!affordable?'<small>재료가 모자라요. 도시에서 기억을 조금 더 모아 주세요.</small>':''}</div><div class="detail-resonate"><div><strong>기억 공명 <small>공명력 +18</small></strong><p>${item.resonance===game.MAX_RESONANCE?'모든 공명이 깨어났습니다.':`중복 기억 ${item.copies} / ${2+item.resonance}개`}</p></div><button class="button small outlined" data-resonate="${id}" ${canResonate?'':'disabled'}>${item.resonance===game.MAX_RESONANCE?'공명 완료':'공명하기'}</button></div><button class="button full ${equipped?'outlined':'dark'}" data-equip="${id}">${icon(equipped?'check':'plus')}${equipped?'동행 해제':'이 기억과 동행하기'}</button>`:`<div class="locked-detail">${icon('lock')}<h3>아직 닿지 않은 기억</h3><p>${REGIONS[relic.region].name}에서 찾을 수 있습니다.</p><button class="button dark" data-find="${relic.region}" ${relic.region>state.unlocked?'disabled':''}>${relic.region>state.unlocked?`공명력 ${REGIONS[relic.region].power}에 탐사지 해금`:'이 거리 탐사하기'}</button></div>`}</div></div>`,'relic-dialog');
}
function showSettings() {
  openDialog(`<div class="settings-content"><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2 id="dialog-title">서고의 작은 설정</h2><label class="field-label" for="player-name">기록가의 이름</label><form id="name-form"><input id="player-name" maxlength="16" value="${esc(state.name)}" required autocomplete="nickname"><button class="button dark" type="submit">이름 저장</button></form><div class="setting-row"><div><strong>발견의 소리</strong><p>유물을 찾으면 짧은 종소리가 울려요.</p></div><button class="toggle ${ui.sound?'on':''}" data-action="toggle-sound" role="switch" aria-checked="${ui.sound}" aria-label="발견의 소리">${ui.sound?'켜짐':'꺼짐'}</button></div><div class="setting-row"><div><strong>잔잔한 움직임</strong><p>화면 애니메이션을 줄입니다.</p></div><button class="toggle ${state.reducedMotion?'on':''}" data-action="toggle-motion" role="switch" aria-checked="${state.reducedMotion}" aria-label="움직임 줄이기">${state.reducedMotion?'켜짐':'꺼짐'}</button></div><div class="save-info">${icon('download')}<p>진행은 이 브라우저에 자동 저장됩니다. 기기를 옮기거나 브라우저 데이터를 지우기 전, 세이브 파일을 백업해 주세요. 계정이나 서버 동기화는 사용하지 않습니다.</p></div><div class="settings-actions"><button class="button outlined" data-action="export">${icon('download')} 세이브 내보내기</button><label class="button outlined import-label">${icon('upload')} 세이브 가져오기<input id="import-save" type="file" accept=".json,application/json"></label></div>${preservedCorrupt?'<div class="recovery-actions"><button class="text-button" data-action="export-recovery">이전 원본 내려받기</button><button class="button outlined" data-action="accept-new">원본 보관 후 현재 진행 저장</button></div>':''}<button class="text-button help-link" data-action="help">${icon('help')} 플레이 방법과 확률 안내</button><p class="version-label">잔향 서고 · v1.0.0 · 오리지널 세계관과 일러스트</p></div>`,'settings-dialog');
}
function showHelp() {
  openDialog(`<div class="settings-content"><span class="eyebrow">A QUIET GUIDE</span><h2 id="dialog-title">천천히, 이 세 단계를.</h2><ol class="help-steps"><li><strong>탐사하고</strong><p>매 탐사마다 유물 하나와 잉크, 잔향을 얻어요. 탐사는 약 3초가 걸리고, 입장료나 실패는 없습니다.</p></li><li><strong>기억을 모으고</strong><p>유물 세 가지와 동행할 수 있어요. 새 유물은 빈 동행 칸에 자동으로 들어갑니다. 모은 유물은 동행하지 않아도 종당 공명력 +4를 줍니다.</p></li><li><strong>조금 더 선명하게</strong><p>잉크와 잔향으로 유물을 복원하면 공명력 +9. 중복 유물 2·3·4개로 공명하면 단계마다 +18. 모든 강화는 100% 성공합니다.</p></li></ol><h3>발견 확률</h3><p class="help-text">각 거리에는 흔적 2종, 기억 2종, 영원 1종이 있어요. 일반 탐사에서는 각 유물의 가중치가 6:6:3:3:1로, 개별 확률은 31.58%·31.58%·15.79%·15.79%·5.26%입니다. 새 유물이 없는 탐사를 5회 연속 했다면, 6회째에는 미발견 유물만 같은 가중치로 추첨합니다. 첫 탐사도 미발견 유물을 확정 발견해요.</p><h3>자리를 비운 동안</h3><p class="help-text">첫 탐사 후부터 서고가 쉬는 시간에 분당 잉크 2개, 10분당 잔향 1개를 모읍니다. 최대 8시간까지 쌓이고 창가의 시간 연구로 잉크가 늘어나요. 5회 연속 탐사는 숨긴 탭에서는 잠시 멈추며, 돌아오면 이어갑니다.</p><button class="button dark full" data-action="close-dialog">좋아요, 내 속도로 해 볼게요 ${icon('arrow')}</button></div>`,'settings-dialog');
}
function showStory(index) {
  const story=STORIES[index];
  if(story.region>=0&&collectionCount(story.region)<3){toast(story.condition+'하면 열립니다.');return;}
  openDialog(`<article class="story-detail"><span class="eyebrow">${index===0?'PROLOGUE':`CHAPTER ${REGIONS[story.region].chapter}`} · THE STILL ARCHIVE</span><div class="story-flourish">${mark}</div><h2 id="dialog-title">${story.title}</h2><div class="story-body">${story.text.split('\n\n').map(p=>`<p>${esc(p).replaceAll('\n','<br>')}</p>`).join('')}</div><div class="story-end">✧</div><button class="text-button" data-action="close-dialog">서고로 돌아가기 ${icon('arrow')}</button></article>`,'story-dialog');
}
function startExploration(auto=false) {
  if(ui.active)return;
  if(ui.region>state.unlocked)return;
  if(auto)ui.auto=5;
  if(ui.auto>0)ui.auto--;
  ui.active={region:ui.region,started:Date.now()}; render();
  expeditionTimer=setTimeout(completeExploration,game.EXPEDITION_MS);
  tickTimer=setInterval(()=>{
    if(!ui.active)return;
    const progress=Math.min(100,(Date.now()-ui.active.started)/game.EXPEDITION_MS*100);
    const bar=$('.expedition-progress i');if(bar)bar.style.width=`${progress}%`;
    const text=$('.expedition-status');if(text)text.textContent=REGIONS[ui.active.region].lines[Math.min(3,Math.floor(progress/25))];
  },100);
}
function completeExploration() {
  if(!ui.active)return;
  clearInterval(tickTimer);
  const before=state.unlocked;
  const {state:next,result}=game.explore(state,ui.active.region);
  ui.active=null; ui.latest=result; commit(next); revealDiscovery(result); chime(RELICS.find(r=>r.id===result.relic).rarity);
  if(result.isNew)toast(`새로운 기억 · ${RELICS.find(r=>r.id===result.relic).name}`,'discovery');
  if(state.unlocked>before)toast(`새로운 길이 열렸어요 · ${REGIONS[state.unlocked].name}`,'discovery');
  if(ui.auto>0&&!document.hidden)startExploration();
}
function changeTab(tab) {
  ui.tab=tab; render(); window.scrollTo({top:0,behavior:'instant'}); $('#main').focus({preventScroll:true});
}
function download(text,name) {
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function stopTimers() { clearDiscovery();clearTimeout(expeditionTimer);clearInterval(tickTimer);ui.active=null;ui.auto=0; }
function safeAction(fn) { try{fn();}catch(e){toast(e.message||'작업을 마치지 못했습니다.');} }
document.addEventListener('click',event=>{
  const button=event.target.closest('button,[data-tab],label');if(!button||button.disabled)return;
  const d=button.dataset;
  if(d.tab){event.preventDefault();changeTab(d.tab);return;}
  safeAction(()=>{
    if(d.relic)showRelic(d.relic);
    if(d.filter!==undefined){ui.filter=d.filter;render();}
    if(d.region!==undefined){const id=Number(d.region);if(id>state.unlocked){toast(`공명력 ${REGIONS[id].power}에 이 거리가 열립니다.`);return;}if(ui.active){toast('현재 탐사가 끝나면 다른 거리로 이동할 수 있어요.');return;}ui.region=id;render();}
    if(d.find!==undefined){dialog.close();ui.region=Number(d.find);changeTab('explore');}
    if(d.story!==undefined)showStory(Number(d.story));
    if(d.upgrade){const before=state.unlocked;commit(game.upgrade(state,d.upgrade));showRelic(d.upgrade);toast('기억이 선명해졌어요. 유물 공명력 +9');if(state.unlocked>before)toast(`${REGIONS[state.unlocked].name}의 길이 열렸어요.`);}
    if(d.resonate){commit(game.resonate(state,d.resonate));showRelic(d.resonate);toast('기억이 깊어졌어요. 유물 공명력 +18');}
    if(d.equip){
      if(!state.equipped.includes(d.equip)&&state.equipped.length===3){
        openDialog(`<div class="settings-content"><span class="eyebrow">MAKE ROOM FOR A MEMORY</span><h2 id="dialog-title">누구와 자리를 바꿀까요?</h2><p class="help-text">동행을 해제해도 유물의 성장은 그대로 남습니다.</p><div class="replacement-list">${state.equipped.map(id=>`<button class="button outlined" data-replace="${id}" data-new="${d.equip}">${RELICS.find(r=>r.id===id).name}<span>공명력 ${game.relicPower(state,id)}</span></button>`).join('')}</div></div>`,'settings-dialog');
      }else{commit(game.equip(state,d.equip));showRelic(d.equip);}
    }
    if(d.replace){commit(game.equip(state,d.new,d.replace));showRelic(d.new);}
    if(d.research){commit(game.research(state,d.research));toast('연구를 마쳤어요. 새로운 효과가 적용됩니다.');}
    if(d.claim){const m=MILESTONES.find(m=>m.id===d.claim);commit(game.claim(state,d.claim));toast(`${m.name} · 잉크 +${m.ink}, 잔향 +${m.dust}`);}
    if(d.action){switch(d.action){
      case 'explore':startExploration();break;
      case 'auto':startExploration(true);break;
      case 'stop-auto':ui.auto=0;render();toast('이번 탐사를 마치고 돌아올게요.');break;
      case 'dismiss-result':ui.latest=null;render();break;
      case 'dismiss-tutorial':commit({...state,tutorialDismissed:true});break;
      case 'best':commit(game.bestEquipment(state));toast('가장 공명력이 높은 세 유물과 동행합니다.');break;
      case 'settings':showSettings();break;
      case 'help':showHelp();break;
      case 'close-dialog':dialog.close();break;
      case 'toggle-sound':ui.sound=!ui.sound;if(ui.sound)chime();showSettings();break;
      case 'toggle-motion':commit({...state,reducedMotion:!state.reducedMotion});showSettings();break;
      case 'export':download(game.serialize(state),`잔향서고-${new Date().toISOString().slice(0,10)}.json`);toast('세이브 백업을 내려받았습니다.');break;
      case 'export-recovery':download(localStorage.getItem(`${SAVE_KEY}.recovery`)||'{}','잔향서고-복구원본.json');break;
      case 'accept-new':preservedCorrupt=false;storageProblem='';persist();render();showSettings();toast('기존 원본을 보관하고 현재 진행의 자동 저장을 시작합니다.');break;
      case 'confirm-import':if(ui.importing){stopTimers();state=game.rest(ui.importing).state;ui.importing=null;ui.latest=null;ui.region=0;preservedCorrupt=false;storageProblem='';persist();render();dialog.close();toast('이전의 기억을 불러왔습니다.');}break;
      case 'power':openDialog(`<div class="settings-content"><span class="eyebrow">RESONANCE</span><h2 id="dialog-title">기억이 모여 만드는 힘</h2><div class="power-breakdown"><p>기본 공명 <b>35</b></p><p>동행 유물 <b>${state.equipped.reduce((s,id)=>s+game.relicPower(state,id),0)}</b></p><p>도감 수집 (${Object.keys(state.owned).length}종 × 4) <b>${Object.keys(state.owned).length*4}</b></p><p>기억의 초점 연구 <b>${state.research.focus*12}</b></p><p>서고지기 성장 <b>${(game.archiveLevel(state)-1)*3}</b></p><p class="total">전체 공명력 <b>${game.power(state)}</b></p></div><p class="help-text">공명력이 쌓이면 새로운 탐사지가 열립니다. 한 번 열린 탐사지는 동행 유물이 바뀌어도 닫히지 않아요.</p></div>`,'settings-dialog');break;
    }}
  });
});
document.addEventListener('change',async event=>{
  if(event.target.id==='owned-only'){ui.ownedOnly=event.target.checked;render();$('#owned-only').focus();}
  if(event.target.id==='import-save'){
    const file=event.target.files[0];if(!file)return;
    try{if(file.size>250000)throw new Error('세이브 파일이 너무 큽니다.');ui.importing=game.parseSave(await file.text());
      openDialog(`<div class="settings-content"><span class="eyebrow">RESTORE YOUR MEMORIES</span><h2 id="dialog-title">이 기록을 불러올까요?</h2><p class="help-text">${esc(ui.importing.name)}님의 서고 · 유물 ${Object.keys(ui.importing.owned).length}종 · 탐사 ${ui.importing.runs}회</p><p class="help-text">현재 진행을 이 파일로 교체합니다. 먼저 현재 세이브를 내보내 보관할 수 있어요.</p><div class="settings-actions"><button class="button outlined" data-action="export">현재 세이브 백업</button><button class="button dark" data-action="confirm-import">이 기록으로 교체</button></div></div>`,'settings-dialog');
    }catch(e){toast(e.message);event.target.value='';}
  }
});
document.addEventListener('input',event=>{
  if(event.target.id==='relic-search'){const pos=event.target.selectionStart;ui.search=event.target.value;render();const input=$('#relic-search');input.focus();try{input.setSelectionRange(pos,pos);}catch{}}
});
document.addEventListener('submit',event=>{
  if(event.target.id==='name-form'){event.preventDefault();const name=$('#player-name').value.trim();if(!name){toast('이름을 한 글자 이상 적어 주세요.');return;}commit({...state,name:name.slice(0,16)});showSettings();toast('새 이름을 기록했어요.');}
});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{ui.importing=null;});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){state.lastSeen=Date.now();persist();}
  else {const paused=game.rest(state);state=paused.state;persist();render();if(paused.reward)toast(`기다리는 동안 잉크 ${paused.reward.ink}개, 잔향 ${paused.reward.dust}개를 모았어요.`);if(ui.auto>0&&!ui.active)startExploration();}
});
window.addEventListener('pagehide',()=>{state.lastSeen=Date.now();persist();});
window.addEventListener('storage',event=>{
  if(event.key!==SAVE_KEY||!event.newValue)return;
  try{const incoming=game.parseSave(event.newValue);stopTimers();state=incoming;ui.latest=null;ui.region=Math.min(ui.region,state.unlocked);if(dialog.open)dialog.close();render();toast('다른 탭의 최신 기록을 반영했습니다.');}catch{/* Preserve this valid save when another tab writes invalid data. */}
});
saveTimer=setInterval(()=>{if(!document.hidden){state.lastSeen=Date.now();persist();}},15000);
persist();render();
if(rested.reward)setTimeout(()=>toast(`돌아오셨군요. 서고가 잉크 ${rested.reward.ink}개와 잔향 ${rested.reward.dust}개를 모아 두었어요.`,'discovery'),500);
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
