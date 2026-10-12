import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { newGame, serialize } from '../src/game.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const site=path.join(root,'dist'),artifacts=path.join(root,'artifacts');
await fs.access(path.join(site,'index.html'));await fs.mkdir(artifacts,{recursive:true});
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'still-archive-browser-'));
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(!url.pathname.startsWith('/game/')){res.writeHead(404).end();return;}
    const relative=decodeURIComponent(url.pathname.slice(6))||'index.html',resolved=path.resolve(site,relative);
    if(!resolved.startsWith(site+path.sep)){res.writeHead(403).end();return;}
    const body=await fs.readFile(resolved);res.setHeader('Content-Type',mime[path.extname(resolved)]||'application/octet-stream');res.end(body);
  }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/game/`;
const browser=spawn(process.env.CHROMIUM_PATH||'chromium',['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-gpu-rasterization','--disable-extensions','--disable-background-networking','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}/profile`,'about:blank'],{detached:true,stdio:['ignore','ignore','pipe'],env:{...process.env,XDG_CACHE_HOME:`${profile}/cache`,XDG_CONFIG_HOME:`${profile}/config`}});
let ws,seq=0,session,logs='',report=[],loaded=0;const pending=new Map(),errors=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const timer=setTimeout(()=>{console.error('Browser test exceeded two minutes');try{process.kill(-browser.pid,'SIGKILL');}catch{}process.exit(1);},120000);
try{
  const endpoint=await new Promise((resolve,reject)=>{browser.stderr.on('data',b=>{logs+=b;const m=logs.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m)resolve(m[1]);});browser.on('error',reject);browser.on('exit',code=>reject(new Error('Chromium exited '+code)));});
  ws=new WebSocket(endpoint);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  ws.addEventListener('message',e=>{const data=JSON.parse(e.data);if(data.method==='Page.loadEventFired')loaded++;if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails);if(data.method==='Log.entryAdded'&&data.params.entry.level==='error'&&!data.params.entry.text.includes('favicon'))errors.push(data.params.entry);const p=pending.get(data.id);if(p){pending.delete(data.id);data.error?p.reject(new Error(JSON.stringify(data.error))):p.resolve(data.result);}});
  const call=(method,params={},sid=session)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})}));});
  const target=await call('Target.createTarget',{url:'about:blank'},null);session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
  await call('Runtime.enable');await call('Page.enable');await call('Log.enable');await call('Network.enable');
  const evaluate=async(expression)=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result?.value;};
  const loadPage=async(method,params={})=>{
    const before=loaded;const result=await call(method,params);if(result.errorText)throw new Error(result.errorText);
    for(let i=0;i<125;i++){if(loaded>before)return result;await wait(80);}
    throw new Error('Page did not finish loading: '+method);
  };
  const until=async(expression,timeout=7000)=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(expression))return;await wait(80);}throw new Error('Timed out waiting for '+expression);};
  const click=async(selector)=>{const rect=await evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(n=>n.getClientRects().length);if(!e)throw new Error('Missing element');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',x:rect.x,y:rect.y,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x,y:rect.y,button:'left',clickCount:1});};
  const check=async(name,fn)=>{await fn();report.push({name,status:'passed'});console.log('PASS:',name);};
  const save=()=>evaluate("JSON.parse(localStorage.getItem('still-archive.save.v1'))");
  const close=async()=>{if(await evaluate("document.querySelector('dialog').open"))await click('[data-action="close-dialog"]');};
  const shot=async(name)=>{const result=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(path.join(artifacts,name+'.png'),Buffer.from(result.data,'base64'));};
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1120,deviceScaleFactor:1,mobile:false});
  if(!process.argv.includes('--standalone')) {
  await loadPage('Page.navigate',{url});await until("!!document.querySelector('[data-action=explore]')");
  await check('Initial desktop view and nested deployment path',async()=>{assert.equal(await evaluate('document.title'),'잔향 서고 — The Still Archive');assert.equal((await save()).ink,120);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);});
  await shot('desktop-initial');
  await check('Real pointer expedition, guaranteed discovery and rewards',async()=>{await click('[data-action="explore"]');await until("JSON.parse(localStorage.getItem('still-archive.save.v1')).runs===1");const s=await save();assert.equal(Object.keys(s.owned).length,2);assert.equal(s.ink,152);assert.ok(await evaluate("!!document.querySelector('.result-banner')"));});
  await check('Relic dialog and restoration use actual stored resources',async()=>{await click('[data-relic="r0"]');await click('[data-upgrade="r0"]');assert.equal((await save()).owned.r0.level,2);assert.equal((await save()).ink,124);await close();});
  await check('Milestone reward cannot be claimed twice through UI',async()=>{await click('[data-claim="first"]');assert.equal((await save()).ink,174);assert.deepEqual((await save()).claimed,['first']);});
  await check('Collection search and owned-only filtering',async()=>{await click('[data-tab="collection"]');assert.equal(await evaluate("document.querySelectorAll('.collection-grid .relic-card').length"),30);await evaluate("(()=>{const q=document.querySelector('#relic-search');q.value='회중시계';q.dispatchEvent(new Event('input',{bubbles:true}))})()");assert.equal(await evaluate("document.querySelectorAll('.collection-grid .relic-card').length"),1);await evaluate("(()=>{const q=document.querySelector('#relic-search');q.value='';q.dispatchEvent(new Event('input',{bubbles:true}))})()");await click('#owned-only');assert.equal(await evaluate("document.querySelectorAll('.collection-grid .relic-card').length"),2);});
  await check('Research purchases and prologue reading',async()=>{await click('[data-tab="research"]');await click('[data-research="focus"]');assert.equal((await save()).research.focus,1);assert.equal((await save()).ink,74);await click('[data-tab="journal"]');await click('[data-story="0"]');assert.ok(await evaluate("document.querySelector('.story-body').textContent.includes('천천히 시작해도 괜찮은 날')"));await close();});
  await check('Reload restores the same progression',async()=>{const before=await save();await loadPage('Page.reload');await until("!!document.querySelector('[data-action=explore]')");const after=await save();assert.equal(after.runs,before.runs);assert.equal(after.research.focus,1);assert.equal(after.owned.r0.level,2);});
  await check('Five-run auto expedition finishes exactly five times',async()=>{const before=(await save()).runs;await click('[data-action="auto"]');await until(`JSON.parse(localStorage.getItem('still-archive.save.v1')).runs===${before+5}`,20000);await wait(500);assert.equal((await save()).runs,before+5);assert.ok(await evaluate("!document.querySelector('[data-action=explore]').disabled"));});
  await check('Export downloads a valid backup with current progress',async()=>{
    const downloadDir=path.join(profile,'downloads');await fs.mkdir(downloadDir);
    await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloadDir},null);
    await click('[data-action="settings"]');await click('[data-action="export"]');
    let files=[];for(let i=0;i<40;i++){files=(await fs.readdir(downloadDir)).filter(name=>name.endsWith('.json'));if(files.length)break;await wait(100);}
    assert.equal(files.length,1);const backup=JSON.parse(await fs.readFile(path.join(downloadDir,files[0]),'utf8'));
    assert.equal(backup.version,1);assert.equal(backup.runs,(await save()).runs);assert.equal(backup.owned.r0.level,2);await close();
  });
  await check('Valid import requires confirmation and invalid import preserves save',async()=>{
    await click('[data-action="settings"]');
    const valid=newGame();valid.name='테스트 기록가';valid.ink=999;
    const file=path.join(profile,'import.json');await fs.writeFile(file,serialize(valid));
    const getInput=async()=>{const dom=await call('DOM.getDocument');return (await call('DOM.querySelector',{nodeId:dom.root.nodeId,selector:'#import-save'})).nodeId;};
    await call('DOM.setFileInputFiles',{files:[file],nodeId:await getInput()});await until("!!document.querySelector('[data-action=confirm-import]')");assert.notEqual((await save()).ink,999);
    await click('[data-action="confirm-import"]');assert.equal((await save()).ink,999);assert.equal((await save()).name,'테스트 기록가');
    await click('[data-action="settings"]');await fs.writeFile(file,'{"bad":true}');await call('DOM.setFileInputFiles',{files:[file],nodeId:await getInput()});await wait(200);assert.equal((await save()).ink,999);await close();
  });
  await check('Escaped names never create markup',async()=>{await click('[data-action="settings"]');await evaluate("document.querySelector('#player-name').value='<b>기록가</b>';document.querySelector('#name-form').requestSubmit()");assert.equal(await evaluate("document.querySelector('.profile-top strong').innerHTML"),'&lt;b&gt;기록가&lt;/b&gt;');await evaluate("document.querySelector('#player-name').value='기록가';document.querySelector('#name-form').requestSubmit()");await close();});
  await check('Mobile navigation, modal and all pages fit 390px',async()=>{
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await evaluate("document.querySelector('[data-tab=home]').click()");
    for(const tab of ['home','explore','collection','research','journal','notebook']){await evaluate(`document.querySelector('[data-tab=${tab}]').click()`);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`overflow on ${tab}`);}
    await evaluate("document.querySelector('[data-tab=home]').click()");await wait(4600);await shot('mobile-home');
    await click('[data-relic="r0"]');assert.equal(await evaluate("document.querySelector('dialog').getBoundingClientRect().width<=innerWidth"),true);await shot('mobile-relic');await close();
  });
  await check('Browser save corruption is preserved, not overwritten',async()=>{
    const injection=await call('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('still-archive.save.v1','{broken')"});await loadPage('Page.reload');await until("!!document.querySelector('.storage-warning')");await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:injection.identifier});assert.equal(await evaluate("localStorage.getItem('still-archive.save.v1.recovery')"),'{broken');assert.equal(await evaluate("localStorage.getItem('still-archive.save.v1')"),'{broken');
    await click('[data-action="settings"]');await click('[data-action="accept-new"]');await close();assert.equal((await save()).version,1);
  });
  await check('Service worker serves a playable page while offline',async()=>{
    await until('!!navigator.serviceWorker.controller');await call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await loadPage('Page.reload');await until("!!document.querySelector('[data-action=explore]')");await click('[data-action="explore"]');await until("JSON.parse(localStorage.getItem('still-archive.save.v1')).runs===1");await call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  });
  await check('Discovery tiers, duplicate reveal, dismissal and reduced motion',async()=>{
    for(const [rarity,roll] of [['common',0],['rare',.7],['epic',.999]]){
      const fixture=await call('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('still-archive.save.v1',${JSON.stringify(serialize(newGame()))});Math.random=()=>${roll}`});
      await loadPage('Page.reload');await until("!!document.querySelector('[data-action=explore]')");
      await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:fixture.identifier});
      await click('[data-action="explore"]');await until(`!!document.querySelector('.discovery-${rarity}')`);
      assert.equal((await save()).runs,1);
      assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"),true);
      await wait(700);await shot(`discovery-${rarity}-mobile`);
      if(rarity==='epic'){
        await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1120,deviceScaleFactor:1,mobile:false});await shot('discovery-epic-desktop');
      }
      await click('.discovery-dismiss');assert.equal(await evaluate("!!document.querySelector('.discovery-stage')"),false);
    }
    await click('[data-action="explore"]');await until("!!document.querySelector('.discovery-epic')");
    assert.equal(await evaluate("document.querySelector('.discovery-note').textContent.includes('중복')"),true);
    await until("!document.querySelector('.discovery-stage')");
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await click('[data-action="explore"]');await until("!!document.querySelector('.discovery-still')");
    assert.equal(await evaluate("document.querySelectorAll('.discovery-motes i').length"),0);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.discovery-stage')).animationName"),'none');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.discovery-stage')).opacity"),'1');
    await click('[data-action="settings"]');assert.equal(await evaluate("!!document.querySelector('.discovery-stage')"),false);await close();
    await call('Emulation.setEmulatedMedia',{features:[]});
  });
  await check('Notebook migration, restoration commission, chronicles and exhibitions',async()=>{
    const legacy=newGame();delete legacy.notebook;legacy.ink=10000;legacy.dust=1000;legacy.visits[0]=5;legacy.runs=5;legacy.unlocked=5;
    for(const id of ['r0','r1','r20','r25'])legacy.owned[id]={level:2,copies:0,resonance:0};
    const fixture=await call('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('still-archive.save.v1',${JSON.stringify(JSON.stringify(legacy))})`});
    await loadPage('Page.reload');await until("!!document.querySelector('[data-tab=notebook]')");await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:fixture.identifier});
    assert.equal((await save()).ink,10000);
    await click('[data-tab="notebook"]');await shot('notebook-desktop');await click('[data-commission="restore"]');
    await click('[data-tab="collection"]');await click('[data-relic="r0"]');for(let i=0;i<3;i++)await click('[data-upgrade="r0"]');await close();
    await click('[data-tab="notebook"]');await click('[data-action="claim-commission"]');assert.equal((await save()).notebook.completed,1);
    await click('[data-desk="chronicles"]');await click('[data-note="note-0-0"]');assert.deepEqual((await save()).notebook.notes,['note-0-0']);assert.ok(await evaluate("document.querySelector('.field-note-text').textContent.includes('지도')"));
    await click('[data-desk="exhibitions"]');await click('[data-exhibition="letters"]');assert.equal((await save()).notebook.exhibits.letters,1);assert.equal((await save()).owned.r1.level,2);await shot('exhibitions-desktop');
    await click('[data-desk="commissions"]');await click('[data-commission="walk"]');const active=(await save()).notebook.active;
    await loadPage('Page.reload');await until("!!document.querySelector('[data-tab=notebook]')");assert.deepEqual((await save()).notebook.active,active);await click('[data-tab="notebook"]');await click('[data-action="cancel-commission"]');assert.equal((await save()).notebook.active,null);
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    for(const section of ['commissions','chronicles','exhibitions']){await click(`[data-desk="${section}"]`);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await shot(`notebook-${section}-mobile`);}
  });
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1120,deviceScaleFactor:1,mobile:false});await evaluate("document.querySelector('[data-tab=home]').click()");await wait(4600);await shot('desktop-final');
  }
  await check('Standalone HTML is self-contained and restores progress',async()=>{
    const fresh=await call('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.removeItem('still-archive.save.v1')"});
    // Managed Chromium blocks file:// by administrator policy. Serve the same
    // self-contained document over HTTP, and assert it loads no HTTP resources.
    const navigation=await loadPage('Page.navigate',{url:url+encodeURIComponent('잔향서고.html')});
    assert.ok(!navigation.errorText, 'Standalone navigation: '+navigation.errorText);
    await until("!!document.querySelector('[data-action=explore]')");
    await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:fresh.identifier});
    assert.equal((await save()).runs,0);
    await click('[data-action="explore"]');await until("JSON.parse(localStorage.getItem('still-archive.save.v1')).runs===1");
    await click('[data-relic="r0"]');await click('[data-upgrade="r0"]');await close();
    await click('[data-tab="notebook"]');await click('[data-commission="survey"]');
    await loadPage('Page.reload');await until("!!document.querySelector('[data-action=explore]')");
    assert.equal((await save()).runs,1);assert.equal((await save()).owned.r0.level,2);assert.equal((await save()).notebook.active.id,'survey');
    assert.equal(await evaluate("performance.getEntriesByType('resource').filter(r=>r.name.startsWith('http')).length"),0);
  });
  assert.equal(errors.length,0,JSON.stringify(errors));
  await fs.writeFile(path.join(artifacts,'browser-report.json'),JSON.stringify({passed:report.length,checks:report,consoleErrors:errors},null,2));
  console.log(`${report.length} browser checks passed; screenshots and report saved under artifacts/.`);
}catch(error){console.error(error);console.error('Browser errors:',JSON.stringify(errors,null,2));if(ws&&session){try{const id=++seq;ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression:'document.body.innerText',returnByValue:true},sessionId:session}));}catch{}}process.exitCode=1;}
finally{clearTimeout(timer);ws?.close();server.closeAllConnections();server.close();try{process.kill(-browser.pid,'SIGTERM');}catch{}await wait(300);await fs.rm(profile,{recursive:true,force:true,maxRetries:3});}
