import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {once} from 'node:events';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
test('real Node HTTP server: retry without another hook, concurrent dedupe, restart recovery', {timeout:20000},async()=>{
 const dir=mkdtempSync(tmpdir()+'/restock-http-');let qty=0,fail=1,accepted=new Map(),attempts=0,child;
 const mock=http.createServer(async(req,res)=>{if(req.url.startsWith('/stock')){res.setHeader('content-type','application/json');res.end(JSON.stringify({quantity:qty,in_stock:qty>0}));return;}for await(const c of req){}attempts++;if(fail-->0){res.writeHead(500);res.end('{}');return;}const key=req.headers['idempotency-key'];if(!accepted.has(key))accepted.set(key,crypto.randomUUID());res.setHeader('content-type','application/json');res.end(JSON.stringify({id:accepted.get(key)}));});
 mock.listen(0,'127.0.0.1');await once(mock,'listening');const upstream='http://127.0.0.1:'+mock.address().port;
 async function start(){child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0',DATA_DIR:dir,STOCK_API_URL:upstream+'/stock',STOCK_API_KEY:'test',RESEND_API_KEY:'test',RESEND_BASE_URL:upstream,WEBHOOK_SECRET:'secret',ADMIN_PASSWORD:'test-admin'},stdio:['ignore','pipe','pipe']});return new Promise((resolve,reject)=>{let logs='';child.stdout.on('data',b=>{logs+=b;const m=logs.match(/listening on (\d+)/);if(m)resolve('http://127.0.0.1:'+m[1])});child.on('error',reject);child.on('exit',c=>{if(c)reject(Error('Server exited '+c))});});}
 async function stop(){const p=once(child,'exit');child.kill('SIGTERM');await p;child=null;}
 async function waitFor(fn){for(let i=0;i<60;i++){if(await fn())return;await pause(150)}throw Error('Condition timed out')}
 let base;const post=(path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});const rows=async()=>{const r=await fetch(base+'/api/admin/requests',{headers:{authorization:'Basic '+btoa('admin:test-admin')}});return r.json()};
 try{
  base=await start();assert.equal((await fetch(base+'/healthz')).status,200);
  await Promise.all(Array.from({length:8},()=>post('/api/requests',{email:'runtime@example.com',sku:'HTTP-TEST'})));
  assert.equal((await rows()).length,1);qty=5;
  await Promise.all(Array.from({length:8},()=>post('/webhooks/stock',{event_id:'runtime-event',sku:'HTTP-TEST',quantity:5},{'x-webhook-secret':'secret'})));
  await waitFor(async()=>(await rows())[0].status==='notified');assert.equal(accepted.size,1);assert.equal(attempts,2);
  qty=0;await post('/api/requests',{email:'restart@example.com',sku:'HTTP-TEST'});await stop();qty=5;base=await start();
  // Waiting stock check is scheduled 15s out; a repeated authenticated event expedites it after restart.
  await post('/webhooks/stock',{event_id:'runtime-event-2',sku:'HTTP-TEST',quantity:5},{'x-webhook-secret':'secret'});
  await waitFor(async()=>(await rows()).every(r=>r.status==='notified'));assert.equal(accepted.size,2);
 }finally{if(child)await stop();await new Promise(r=>mock.close(r));rmSync(dir,{recursive:true});}
});
