import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises';
import crypto from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const listen=s=>new Promise(r=>s.listen(0,'127.0.0.1',()=>r(s.address().port)));
const close=s=>new Promise(r=>s.close(r));
test('group selection persists per panel and is applied to provisioning without leaking credentials',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'vortex-groups-'));let child;const calls=[];let created;
 function mock(label){return http.createServer(async(req,res)=>{calls.push({label,path:req.url,key:req.headers['x-api-key']});res.setHeader('content-type','application/json');
  if(req.url.startsWith('/api/groups/simple'))return res.end(JSON.stringify({groups:[{id:1,name:'مستقیم'},{id:2,name:'تانل'},{id:3,name:'<script>alert(1)</script>'}]}));
  if(req.url==='/api/user'&&req.method==='POST'){let raw='';for await(const c of req)raw+=c;created=JSON.parse(raw);return res.end(JSON.stringify({...created,id:77,subscription_url:'/sub/new'}));}
  res.statusCode=404;res.end('{}');});}
 const a=mock('a'),b=mock('b');const ap=await listen(a),bp=await listen(b);const probe=net.createServer(),port=await listen(probe);await close(probe);
 const salt=crypto.randomBytes(16),password='admin-password-123',hash=`scrypt:${salt.toString('base64')}:${crypto.scryptSync(password,salt,64).toString('base64')}`;
 const panels=[{id:'a',name:'A',enabled:true,baseUrl:`http://127.0.0.1:${ap}`,apiKey:'saved-key-a',groupIds:[1],pricePerGB:4000},{id:'b',name:'B',enabled:true,baseUrl:`http://127.0.0.1:${bp}`,apiKey:'saved-key-b',groupIds:[3],pricePerGB:5000}];
 await writeFile(path.join(dir,'config.json'),JSON.stringify({adminPassHash:hash,panels}));child=spawn(process.execPath,[path.join(root,'server/server.mjs')],{env:{...process.env,API_PORT:String(port),DATA_DIR:dir},stdio:'ignore'});
 const base=`http://127.0.0.1:${port}`;const req=async(url,method='GET',body,cookie)=>{let r=await fetch(base+url,{method,headers:{'content-type':'application/json',...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try {for(let i=0;i<80;i++){try{if((await req('/healthz')).status===200)break}catch{}await new Promise(r=>setTimeout(r,30));}
  assert.equal((await req('/api/admin/test-pg','POST',{panelId:'a'})).status,401);
  const admin=await req('/api/admin/login','POST',{password});assert.equal(admin.status,200);
  const fetched=await req('/api/admin/test-pg','POST',{panelId:'a',pgBaseUrl:panels[0].baseUrl},admin.cookie);assert.equal(fetched.status,200);assert.deepEqual(fetched.body.groups.map(x=>x.id),[1,2,3]);assert.equal(calls.at(-1).key,'saved-key-a');
  const previous=calls.length;assert.equal((await req('/api/admin/test-pg','POST',{panelId:'a',pgBaseUrl:panels[1].baseUrl},admin.cookie)).status,502);assert.equal(calls.length,previous);
  const newCred=await req('/api/admin/test-pg','POST',{panelId:'a',pgBaseUrl:panels[1].baseUrl,pgApiKey:'fresh-key'},admin.cookie);assert.equal(newCred.status,200);assert.equal(calls.at(-1).key,'fresh-key');
  let updated=await req('/api/admin/panels/a/edit','POST',{groupIds:[1,2]},admin.cookie);assert.equal(updated.status,200);assert.deepEqual(updated.body.panels.find(x=>x.id==='a').groupIds,[1,2]);assert.deepEqual(updated.body.panels.find(x=>x.id==='b').groupIds,[3]);
  const user=await req('/api/device','POST');const order=await req('/api/orders','POST',{panelId:'a',gb:10,last4:'1234'},user.cookie);assert.equal(order.status,201);const approved=await req(`/api/admin/orders/${order.body.code}/approve`,'POST',{},admin.cookie);assert.equal(approved.status,200);assert.deepEqual(created.group_ids,[1,2]);
  updated=await req('/api/admin/panels/a/edit','POST',{name:'Renamed'},admin.cookie);assert.deepEqual(updated.body.panels.find(x=>x.id==='a').groupIds,[1,2]);
  updated=await req('/api/admin/panels/a/edit','POST',{groupIds:[]},admin.cookie);assert.deepEqual(updated.body.panels.find(x=>x.id==='a').groupIds,[]);
  const config=JSON.parse(await readFile(path.join(dir,'config.json')));assert.equal(config.panels[0].apiKey,'saved-key-a');assert.deepEqual(config.panels[1].groupIds,[3]);
 } finally {if(child&&child.exitCode===null){child.kill();await new Promise(r=>child.once('exit',r));}await close(a);await close(b);await rm(dir,{recursive:true,force:true});}
});
