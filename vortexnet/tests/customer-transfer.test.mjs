import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const listen=s=>new Promise(r=>s.listen(0,'127.0.0.1',()=>r(s.address().port)));
const close=s=>new Promise(r=>s.close(r));
const gib=1024**3;
async function fixture(failure='') {
 const dir=await mkdtemp(path.join(os.tmpdir(),'vortex-transfer-')); const srcUsers=new Map(), dstUsers=new Map();let sourceDeletes=0, targetCreates=0, failed=false, afterCreateGetFailures=0;
 const expiry=Math.floor(Date.now()/1000)+7*86400+37;
 srcUsers.set('vx_abcdef',{id:111,username:'vx_abcdef',status:'active',data_limit:10*gib,used_traffic:3*gib+12345,expire:expiry,group_ids:[1],note:'existing',subscription_url:'/sub/old'});
 function makePanel(users,isTarget) {return http.createServer(async(req,res)=>{const u=new URL(req.url,'http://mock');res.setHeader('Content-Type','application/json');
  if(u.pathname==='/api/groups/simple')return res.end(JSON.stringify({groups:[{id:1,name:'Germany'},{id:2,name:'France'}]}));
  if(u.pathname==='/api/user'&&req.method==='POST'){let raw='';for await(const c of req)raw+=c;const d=JSON.parse(raw);if(users.has(d.username)){res.statusCode=409;return res.end('{}');}if(d.status!=='active'){res.statusCode=422;return res.end('{}');}const v={...d,id:222,used_traffic:0,subscription_url:'/sub/new-'+d.username};users.set(d.username,v);targetCreates++;if(failure==='change-usage')srcUsers.get('vx_abcdef').used_traffic += 4096;if(failure==='create-lost'&&!failed){failed=true;req.socket.destroy();return;}return res.end(JSON.stringify(v));}
  const m=/^\/api\/user\/([^/]+)$/.exec(u.pathname);if(!m){res.statusCode=404;return res.end('{}');}const name=decodeURIComponent(m[1]);let v=users.get(name);
  if(isTarget && failure==='verify-lost' && targetCreates && afterCreateGetFailures++===0){req.socket.destroy();return;}
  if(!v){res.statusCode=404;return res.end('{}');}
  if(req.method==='GET') {if(!isTarget && failure==='concurrent')await new Promise(r=>setTimeout(r,80));return res.end(JSON.stringify(v));}
  if(req.method==='PUT'){let raw='';for await(const c of req)raw+=c;v={...v,...JSON.parse(raw)};users.set(name,v);return res.end(JSON.stringify(v));}
  if(req.method==='DELETE'){if(failure==='delete-forbidden'){res.statusCode=403;return res.end('{}');}sourceDeletes++;users.delete(name);if(failure==='delete-lost'&&!failed){failed=true;req.socket.destroy();return;}res.statusCode=204;return res.end();}
  res.statusCode=405;res.end('{}');});}
 const src=makePanel(srcUsers,false),dst=makePanel(dstUsers,true);const sp=await listen(src),dp=await listen(dst);const probe=net.createServer(),port=await listen(probe);await close(probe);
 const token='a'.repeat(64), other='b'.repeat(64), user={id:'owner',username:'owner',usernameKey:'owner'},otherUser={id:'other',username:'other',usernameKey:'other'};
 const panels=[{id:'source',name:'Source',enabled:true,baseUrl:`http://127.0.0.1:${sp}`,apiKey:'source-key',groupIds:[1],pricePerGB:4500},{id:'dest',name:'Destination',enabled:true,baseUrl:`http://127.0.0.1:${dp}`,apiKey:'dest-key',groupIds:[1,2],pricePerGB:6000,locations:[{id:1,name:'Germany'},{id:2,name:'France'}]}];
 const order={code:'VX-ABCDEF',userId:user.id,status:'approved',gb:10,days:30,panelId:'source',panelName:'Source',pg:{username:'vx_abcdef',userId:111,subUrl:`http://127.0.0.1:${sp}/sub/old`,panelId:'source',expire:expiry,dataLimit:10*gib}};
 await writeFile(path.join(dir,'config.json'),JSON.stringify({panels}));await writeFile(path.join(dir,'orders.json'),JSON.stringify([order]));await writeFile(path.join(dir,'users.json'),JSON.stringify([user,otherUser]));await writeFile(path.join(dir,'sessions.json'),JSON.stringify({admin:{['c'.repeat(64)]:Date.now()+1e8},user:{[token]:{userId:user.id,exp:Date.now()+1e8},[other]:{userId:otherUser.id,exp:Date.now()+1e8}}}));
 let child; const start=()=>{child=spawn(process.execPath,[path.join(root,'server/server.mjs')],{env:{...process.env,API_PORT:String(port),DATA_DIR:dir},stdio:'ignore'});};
 const stop=async()=>{if(child&&child.exitCode===null){child.kill();await new Promise(r=>child.once('exit',r));}};const base=`http://127.0.0.1:${port}`;
 const req=async(url,method='GET',body,cookie=token)=>{const r=await fetch(base+url,{method,headers:{'content-type':'application/json',cookie:'nk_user='+cookie},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 const wait=async()=>{for(let i=0;i<60;i++){try{if((await req('/healthz')).status===200)return;}catch{} await new Promise(r=>setTimeout(r,40));}throw Error('server not ready');};
 start();await wait();
 return {req,start,stop,wait,base,expiry,token,other,srcUsers,dstUsers,counts:()=>({sourceDeletes,targetCreates}),readOrders:async()=>JSON.parse(await readFile(path.join(dir,'orders.json'))),cleanup:async()=>{await stop();await close(src);await close(dst);await rm(dir,{recursive:true,force:true});}};
}
const url='/api/my/services/VX-ABCDEF/transfer', body={toPanelId:'dest',groupId:2,confirm:true};
for(const failure of ['', 'create-lost','delete-lost','verify-lost','concurrent']) test('customer transfer '+(failure||'success'),async()=>{
 const f=await fixture(failure);try{
  assert.equal((await f.req(url,'POST',body,f.other)).status,404);
  assert.equal((await f.req(url,'POST',{...body,confirm:false})).status,400);
  assert.equal((await f.req(url,'POST',{...body,groupId:99})).status,400);
  assert.equal((await f.req(url,'POST',{...body,toPanelId:'source'})).status,400);
  let first;
  if(failure==='concurrent'){const a=f.req(url,'POST',body),b=f.req(url,'POST',body);const both=await Promise.all([a,b]);assert.deepEqual(both.map(x=>x.status).sort(),[200,409]);first=both.find(x=>x.status===200);}
  else first=await f.req(url,'POST',body);
  if(['create-lost','delete-lost','verify-lost'].includes(failure)){
   assert.equal(first.status,503);assert.ok((await f.readOrders())[0].customerTransfer);assert.equal((await f.req('/api/my/services/VX-ABCDEF/toggle','POST',{on:true})).status,409);
   const services=await f.req('/api/my/services');assert.equal(services.body.services[0].subUrl,'');assert.ok(services.body.services[0].transferPending);
   await f.stop();f.start();await f.wait();first=await f.req(url,'POST',body);
  }
  assert.equal(first.status,200,JSON.stringify(first.body));assert.equal(f.srcUsers.size,0);assert.equal(f.dstUsers.size,1);assert.deepEqual(f.counts(),{sourceDeletes:1,targetCreates:1});
  const dst=[...f.dstUsers.values()][0];assert.equal(dst.data_limit,7*gib-12345);assert.equal(dst.expire,f.expiry);assert.deepEqual(dst.group_ids,[2]);assert.equal(dst.status,'active');
  const order=(await f.readOrders())[0];assert.equal(order.panelId,'dest');assert.equal(order.customerTransfer,undefined);assert.equal(order.migrations[0].sourceDeleted,true);assert.ok(order.pg.subUrl.includes('/sub/new-'));
  assert.equal((await f.req(url,'POST',body)).status,400);
 }finally{await f.cleanup();}
});

test('a denied deletion keeps a resumable transfer without revealing a duplicate',async()=>{
 const f=await fixture('delete-forbidden');try{
  const r=await f.req(url,'POST',body); assert.equal(r.status,503);
  assert.equal(f.srcUsers.get('vx_abcdef').status,'disabled');assert.equal(f.dstUsers.size,1);
  const order=(await f.readOrders())[0];assert.equal(order.panelId,'source');assert.equal(order.customerTransfer.phase,'deleting');
  const services=await f.req('/api/my/services');assert.equal(services.body.services[0].subUrl,'');
  assert.equal((await f.req(url,'POST',body)).status,503);assert.equal(f.counts().targetCreates,1);
 }finally{await f.cleanup();}
});
test('insufficient live usage and inactive service do not begin a transfer',async()=>{
 const f=await fixture();try{
  let src=f.srcUsers.get('vx_abcdef');src.used_traffic=null;
  assert.equal((await f.req(url,'POST',body)).status,400);assert.equal(src.status,'active');assert.equal(f.dstUsers.size,0);
  src.used_traffic=0;src.status='disabled';assert.equal((await f.req(url,'POST',body)).status,400);assert.equal((await f.readOrders())[0].customerTransfer,undefined);
 }finally{await f.cleanup();}
});

test('usage changes reported after the source is paused are reconciled before deletion',async()=>{
 const f=await fixture('change-usage');try{
  const result=await f.req(url,'POST',body);assert.equal(result.status,200,JSON.stringify(result.body));
  const target=[...f.dstUsers.values()][0];assert.equal(target.data_limit,7*gib-12345-4096);assert.equal(target.expire,f.expiry);assert.equal(f.srcUsers.size,0);
 }finally{await f.cleanup();}
});
test('admin can resume an interrupted customer transfer',async()=>{
 const f=await fixture('create-lost');try{
  assert.equal((await f.req(url,'POST',body)).status,503);
  const r=await fetch(f.base+'/api/admin/orders/VX-ABCDEF/transfer-resume',{method:'POST',headers:{cookie:'nk_admin='+ 'c'.repeat(64)}});
  assert.equal(r.status,200);assert.equal(f.srcUsers.size,0);assert.equal(f.counts().targetCreates,1);
 }finally{await f.cleanup();}
});
