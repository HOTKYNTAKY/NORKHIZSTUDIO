import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises';
import crypto from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const listen=s=>new Promise(r=>s.listen(0,'127.0.0.1',()=>r(s.address().port)));
const close=s=>new Promise(r=>s.close(r));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn, ms=5000){const end=Date.now()+ms;while(Date.now()<end){const v=await fn();if(v)return v;await delay(40);}throw Error('condition timed out');}

test('AI replies are opt-in, private, abortable, and never block human messages',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'vortex-ai-'));let child;let requests=[];let hold=false, fail=false, held=[];
 const mock=http.createServer(async(req,res)=>{let data='';for await(const c of req)data+=c;requests.push({auth:req.headers.authorization,body:JSON.parse(data)});if(hold){held.push(res);return;}if(fail){res.writeHead(401);res.end('{}');return;}res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({choices:[{message:{content:'سلام، چطور می‌توانم کمک کنم؟'}}]}));});
 const mockPort=await listen(mock);const probe=net.createServer(),port=await listen(probe);await close(probe);
 const salt=crypto.randomBytes(16),password='admin-password-123';const hash=`scrypt:${salt.toString('base64')}:${crypto.scryptSync(password,salt,64).toString('base64')}`;
 const key='sk-or-v1-'+ 'a'.repeat(64);
 const panels=[{id:'a',name:'پنل آبی',pricePerGB:7000,enabled:true,baseUrl:'https://private-panel.example',apiKey:'private-panel-key',groupIds:[1],locations:[{id:1,name:'گروه عمومی'},{id:2,name:'گروه خصوصی'}]},{id:'b',name:'پنل خاموش',pricePerGB:9000,enabled:false,baseUrl:'https://hidden.example',apiKey:'hidden-secret'}];
 await writeFile(path.join(dir,'config.json'),JSON.stringify({adminPassHash:hash,panels,minGB:10,planDays:30,cardNumber:'6219861495616921',cardName:'private-card-name'}));
 // Intercept only the fixed OpenRouter URL in this child process. No production endpoint override.
 const preload=path.join(dir,'mock.mjs');await writeFile(preload,`const original=globalThis.fetch;globalThis.fetch=(url,options)=>original(url==='https://openrouter.ai/api/v1/chat/completions'?'http://127.0.0.1:${mockPort}/chat':url,options);`);
 const base=`http://127.0.0.1:${port}`;const req=async(url,method='GET',body,cookie)=>{const r=await fetch(base+url,{method,headers:{'content-type':'application/json',...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const start=async()=>{child=spawn(process.execPath,['--import',preload,path.join(root,'server/server.mjs')],{env:{...process.env,API_PORT:String(port),DATA_DIR:dir},stdio:'ignore'});await until(async()=>{try{return (await req('/healthz')).status===200}catch{return false}})};
 const stop=async()=>{if(child&&child.exitCode===null){child.kill();await new Promise(r=>child.once('exit',r));}};
 try {
  await start();assert.equal((await req('/api/admin/support-ai')).status,401);
  const admin=(await req('/api/admin/login','POST',{password})).cookie;
  const user=(await req('/api/device','POST')).cookie;
  let status=await req('/api/admin/support-ai','GET',undefined,admin);assert.equal(status.body.enabled,false);assert.equal(status.body.configured,false);
  assert.equal((await req('/api/admin/support-ai','POST',{enabled:true},admin)).status,400);
  await req('/api/my/chat','POST',{text:'قبل از فعال شدن'},user);await delay(900);assert.equal(requests.length,0);
  status=await req('/api/admin/support-ai','POST',{key},admin);assert.equal(status.body.configured,true);assert.equal(JSON.stringify(status.body).includes(key),false);
  assert.equal((await stat(path.join(dir,'support-ai.json'))).mode & 0o777,0o600);
  status=await req('/api/admin/support-ai','POST',{enabled:true},admin);assert.equal(status.body.enabled,true);
  await req('/api/my/chat','POST',{text:'سلام، چطور خرید کنم؟'},user);
  await until(async()=>{const t=await req('/api/my/chat','GET',undefined,user);return t.body.messages.some(m=>m.ai)});
  assert.equal(requests.length,1);assert.equal(requests[0].auth,`Bearer ${key}`);assert.equal(requests[0].body.messages.at(-1).content,'سلام، چطور خرید کنم؟');assert.equal(JSON.stringify(requests[0].body).includes('قبل از فعال شدن'),false);
  const snapshot=req=>JSON.parse(req.body.messages[0].content.split('داده عمومی فروشگاه: ')[1]);
  let cat=snapshot(requests[0]);assert.equal(cat.minimum_gb,10);assert.equal(cat.duration_days,30);assert.deepEqual(cat.panels_for_sale,[{name:'پنل آبی',price_per_gb_toman:7000,published_groups:['گروه عمومی'],groups_truncated:false}]);
  for(const secret of ['private-panel-key','private-panel.example','hidden-secret','پنل خاموش','گروه خصوصی','6219861495616921','private-card-name'])assert.equal(JSON.stringify(requests[0].body).includes(secret),false);
  hold=true;await req('/api/my/chat','POST',{text:'پیام در حال بررسی'},user);await until(()=>requests.length===2);
  await req('/api/admin/support-ai','POST',{enabled:false},admin);for(const r of held){r.writeHead(200,{'content-type':'application/json'});r.end(JSON.stringify({choices:[{message:{content:'نباید ارسال شود'}}]}));}await delay(150);
  let thread=await req('/api/my/chat','GET',undefined,user);assert.equal(thread.body.messages.some(m=>m.text==='نباید ارسال شود'),false);
  await stop();await start();status=await req('/api/admin/support-ai','GET',undefined,admin);assert.equal(status.body.enabled,false);assert.equal(status.body.configured,true);assert.equal(JSON.stringify(status.body).includes(key),false);
  await req('/api/my/chat','POST',{text:'بعد از خاموش شدن'},user);await delay(900);assert.equal(requests.length,2);
  assert.equal(JSON.parse(await readFile(path.join(dir,'support-ai.json'))).enabled,false);
  hold=true;held=[];await req('/api/admin/support-ai','POST',{enabled:true},admin);
  await req('/api/my/chat','POST',{text:'کمک انسانی'},user);await until(()=>requests.length===3);
  const chats=await req('/api/admin/chats','GET',undefined,admin);const userId=chats.body.chats[0].userId;
  await req(`/api/admin/chats/${userId}`,'POST',{text:'من جواب می‌دهم'},admin);
  for(const r of held){r.writeHead(200,{'content-type':'application/json'});r.end(JSON.stringify({choices:[{message:{content:'پاسخ دیرهنگام'}}]}));}
  await delay(150);thread=await req('/api/my/chat','GET',undefined,user);assert.equal(thread.body.messages.some(m=>m.text==='پاسخ دیرهنگام'),false);assert.equal(thread.body.messages.some(m=>m.text==='من جواب می‌دهم'),true);
  hold=false;fail=true;await req('/api/my/chat','POST',{text:'خطای سرویس'},user);await until(()=>requests.length===4);
  await until(async()=>Boolean((await req('/api/admin/support-ai','GET',undefined,admin)).body.lastError));
  thread=await req('/api/my/chat','GET',undefined,user);assert.equal(thread.body.messages.at(-1).text,'خطای سرویس');
  fail=false;hold=true;held=[];
  await req('/api/my/chat','POST',{text:'قیمت چند است؟'},user);await until(()=>requests.length===5);
  assert.equal(snapshot(requests[4]).panels_for_sale[0].price_per_gb_toman,7000);
  assert.equal((await req('/api/admin/panels/a/edit','POST',{pricePerGB:8500},admin)).status,200);
  hold=false;for(const r of held){r.writeHead(200,{'content-type':'application/json'});r.end(JSON.stringify({choices:[{message:{content:'قیمت قدیمی'}}]}));}
  await until(()=>requests.length===6);cat=snapshot(requests[5]);assert.equal(cat.panels_for_sale[0].price_per_gb_toman,8500);
  await until(async()=>{let t=await req('/api/my/chat','GET',undefined,user);return t.body.messages.at(-1).ai});
  thread=await req('/api/my/chat','GET',undefined,user);assert.equal(thread.body.messages.some(m=>m.text==='قیمت قدیمی'),false);
 }finally{await stop();for(const r of held)r.destroy();await close(mock);await rm(dir,{recursive:true,force:true});}
});
