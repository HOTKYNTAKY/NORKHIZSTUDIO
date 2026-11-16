import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import crypto from 'node:crypto';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('support chat receipts reflect actual reads and both sides can reply',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'vortex-chat-'));const probe=net.createServer();const port=await new Promise(r=>probe.listen(0,'127.0.0.1',()=>r(probe.address().port)));await new Promise(r=>probe.close(r));
 const salt=crypto.randomBytes(16),password='admin-password-123';const hash=`scrypt:${salt.toString('base64')}:${crypto.scryptSync(password,salt,64).toString('base64')}`;
 await writeFile(path.join(dir,'config.json'),JSON.stringify({adminPassHash:hash}));
 const child=spawn(process.execPath,[path.join(root,'server/server.mjs')],{env:{...process.env,API_PORT:String(port),DATA_DIR:dir},stdio:'ignore'});const base=`http://127.0.0.1:${port}`;
 const req=async(url,method='GET',body,cookie)=>{let r=await fetch(base+url,{method,headers:{'content-type':'application/json',...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try {
  let ready=false;for(let i=0;i<80;i++){try{if((await req('/healthz')).status===200){ready=true;break;}}catch{}await delay(30);}assert(ready);
  const admin=(await req('/api/admin/login','POST',{password})).cookie,user=(await req('/api/device','POST')).cookie;
  const first=(await req('/api/my/chat','POST',{text:'پیام مشتری'},user)).body.message;assert.equal(first.read,false);
  let list=(await req('/api/admin/chats','GET',undefined,admin)).body;assert.equal(list.totalUnread,1);const id=list.chats[0].userId;
  let customer=(await req('/api/my/chat?peek=1','GET',undefined,user)).body;assert.equal(customer.messages[0].read,false);
  await req(`/api/admin/chats/${id}?peek=1`,'GET',undefined,admin);customer=(await req('/api/my/chat?peek=1','GET',undefined,user)).body;assert.equal(customer.messages[0].read,false);
  await req(`/api/admin/chats/${id}`,'GET',undefined,admin);customer=(await req('/api/my/chat?peek=1','GET',undefined,user)).body;assert.equal(customer.messages[0].read,true);
  let response=(await req(`/api/admin/chats/${id}`,'POST',{text:'پاسخ پشتیبان',replyToId:first.id},admin)).body.message;assert.equal(response.read,false);assert.equal(response.replyTo.id,first.id);assert.equal(response.replyTo.text,'پیام مشتری');
  await req('/api/my/chat?peek=1','GET',undefined,user);let adminThread=(await req(`/api/admin/chats/${id}?peek=1`,'GET',undefined,admin)).body;assert.equal(adminThread.messages[1].read,false);
  await req('/api/my/chat','GET',undefined,user);adminThread=(await req(`/api/admin/chats/${id}?peek=1`,'GET',undefined,admin)).body;assert.equal(adminThread.messages[1].read,true);
  let reply=(await req('/api/my/chat','POST',{text:'پاسخ مجدد',replyToId:response.id},user)).body.message;assert.equal(reply.replyTo.text,'پاسخ پشتیبان');assert.equal(reply.read,false);
 }finally{if(child.exitCode===null){child.kill();await new Promise(r=>child.once('exit',r));}await rm(dir,{recursive:true,force:true});}
});
