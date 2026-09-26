import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {ipc,routeCommand} from '../services/gateway/src/ipc.ts';
import {TokenBucket} from '../services/gateway/src/limits.ts';
const root=fileURLToPath(new URL('..',import.meta.url)),dir=mkdtempSync(join(tmpdir(),'travelsetu-smoke-'));process.env.COMPUTE_SOCKET=join(dir,'engine.sock');let engine,gateway;
const ready=(command,args,cwd,env,pattern)=>new Promise((resolve,reject)=>{const p=spawn(command,args,{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});let output='';const timer=setTimeout(()=>{p.kill();reject(new Error('Service startup timeout: '+output));},10000);p.stdout.on('data',chunk=>{output+=chunk;if(pattern.test(output)){clearTimeout(timer);resolve(p);}});p.stderr.on('data',c=>output+=c);p.once('exit',code=>{clearTimeout(timer);reject(new Error('Service exited '+code+': '+output));});});
try{
 engine=await ready(root+'/services/compute/build/travelsetu-compute',[],root,{},/compute ready/);
 assert.equal((await ipc('PING')).ok,true);assert.equal((await ipc('DOT 3 1 2 3 4 5 6')).value,32);
 const route=await ipc(routeCommand([{latitude:0,longitude:0},{latitude:0,longitude:2},{latitude:0,longitude:1}]));assert.deepEqual(route.order,[0,2,1]);assert.equal(route.navigation,false);await assert.rejects(()=>ipc('ROUTE 2 999 0 0 0'));await assert.rejects(()=>ipc('DOT_GPU 1 1 1'),/CUDA/);
 const bucket=new TokenBucket(20,100),now=Date.now();for(let n=0;n<100;n++)assert.equal(bucket.take(now),true);assert.equal(bucket.take(now),false);assert.equal(bucket.take(now+1000),true);
 gateway=await ready(process.execPath,['--experimental-strip-types','src/server.ts'],root+'/services/gateway',{PORT:'34912',GATEWAY_ALLOW_ANONYMOUS:'true',ALLOWED_ORIGIN:'http://localhost:3000'},/Gateway listening/);
 const health=await fetch('http://127.0.0.1:34912/health');assert.equal((await health.json()).ok,true);
 // Use ws from the installed native package's dev-free environment via Node's WebSocket + explicit Origin from HTTP handshake below.
 const {createConnection}=await import('node:net');const {randomBytes}=await import('node:crypto');
 function wsSession(){return new Promise((resolve,reject)=>{const socket=createConnection(34912,'127.0.0.1'),key=randomBytes(16).toString('base64');let buf=Buffer.alloc(0),upgraded=false,stage=0;const timer=setTimeout(()=>{socket.destroy();reject(new Error('WebSocket timed out'));},7000);socket.on('connect',()=>socket.write(`GET /ws HTTP/1.1\r\nHost: 127.0.0.1:34912\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\nOrigin: http://localhost:3000\r\n\r\n`));const send=value=>{const text=Buffer.from(JSON.stringify(value)),mask=randomBytes(4);assert.ok(text.length<126);const frame=Buffer.alloc(6+text.length);frame[0]=0x81;frame[1]=0x80|text.length;mask.copy(frame,2);for(let i=0;i<text.length;i++)frame[6+i]=text[i]^mask[i%4];socket.write(frame);};socket.on('data',chunk=>{buf=Buffer.concat([buf,chunk]);if(!upgraded){const end=buf.indexOf('\r\n\r\n');if(end<0)return;assert.match(buf.subarray(0,end).toString(),/101 Switching Protocols/);buf=buf.subarray(end+4);upgraded=true;}while(buf.length>=2){let length=buf[1]&127,offset=2;if(length===126){if(buf.length<4)return;length=buf.readUInt16BE(2);offset=4;}if(buf.length<offset+length)return;const opcode=buf[0]&15,text=buf.subarray(offset,offset+length).toString();buf=buf.subarray(offset+length);if(opcode!==1)continue;const value=JSON.parse(text);if(value.type==='hello')send({type:'auth'});else if(value.type==='ready')send({type:'search',query:'Manali',requestId:'1'});else if(value.type==='search'){assert.equal(value.results[0].name,'Manali');stage++;send({type:'route-order',points:[{latitude:0,longitude:0},{latitude:0,longitude:1}]});}else if(value.type==='route-order'){assert.equal(value.result.order.length,2);assert.equal(stage,1);clearTimeout(timer);socket.destroy();resolve();}else if(value.type==='error'){clearTimeout(timer);socket.destroy();reject(new Error(value.error));}}});socket.on('error',reject);});}
 await wsSession();
 const denied=await fetch('http://127.0.0.1:34912/v1/plan',{method:'POST',headers:{Origin:'http://evil.invalid'},body:'{}'});assert.equal(denied.status,403);
 console.log('PASS: native IPC, SIMD dispatch result, route order, malformed request, CUDA-unavailable state, rate limits, gateway health, WebSocket auth/search/compute and rejected origin.');
}finally{gateway?.kill();engine?.kill();await new Promise(resolve=>setTimeout(resolve,100));rmSync(dir,{recursive:true,force:true});}
