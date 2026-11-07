import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import app,{processQueue} from './worker/index.js';
const dir=process.env.DATA_DIR||'./data'; mkdirSync(dir,{recursive:true});
const sqlite=new DatabaseSync(dir+'/restock.sqlite');
sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='requests'").get()) sqlite.exec(readFileSync(new URL('./drizzle/0000_restock.sql',import.meta.url),'utf8'));
export const DB={prepare(sql){return {bind(...args){return {async all(){return {results:sqlite.prepare(sql).all(...args)}},async first(){return sqlite.prepare(sql).get(...args)||null},async run(){return sqlite.prepare(sql).run(...args)}}}}}};
const env={...process.env,DB};
const portFlag=process.argv.indexOf('--port');
if(portFlag>=0) env.PORT=process.argv[portFlag+1];
for(const key of ['STOCK_API_URL','STOCK_API_KEY','RESEND_API_KEY','RESEND_BASE_URL','WEBHOOK_SECRET']) if(!env[key]) throw new Error('Missing required environment variable: '+key);
if(!env.ADMIN_PASSWORD){env.ADMIN_PASSWORD=randomBytes(18).toString('base64url'); console.log('Generated admin password (username: admin): '+env.ADMIN_PASSWORD);}
const jobs=new Set(); const ctx={waitUntil(p){jobs.add(p);p.catch(()=>{}).finally(()=>jobs.delete(p))}};
const timer=setInterval(()=>ctx.waitUntil(processQueue(env)),1000); timer.unref();
const server=http.createServer(async(req,res)=>{
 try{
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>16384){res.writeHead(413);res.end('Request too large');return;} chunks.push(chunk);}
  const body=Buffer.concat(chunks); const request=new Request('http://localhost'+req.url,{method:req.method,headers:req.headers,...(body.length?{body}: {})});
  const response=await app.fetch(request,env,ctx);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Internal server error');}
});
server.listen(Number(env.PORT||3000),'0.0.0.0',()=>console.log('Restock listening on '+server.address().port));
async function shutdown(){clearInterval(timer);server.close();await Promise.allSettled([...jobs]);sqlite.close();process.exit(0)}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
