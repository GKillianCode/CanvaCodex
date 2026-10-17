import test from 'node:test';import assert from 'node:assert/strict';
import {createServer} from 'vite';import {mkdtemp,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import net from 'node:net';
import {localDataPlugin} from '../scripts/local-data-plugin.mjs';
import {makeVideoProject} from '../src/videoProjects.js';
const appId='59b7e84f-7970-44fc-8fae-903394040764';
async function freePort(){const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
test('HTTP store is shared on different ports, configured port wins, other origins and tokenless writes are rejected',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'frame-http-test-'));let one,two;
 try{
 const chosen=await freePort();one=await createServer({root:dir,cacheDir:join(dir,'vite-cache'),configFile:false,logLevel:'silent',server:{host:'127.0.0.1',port:0},plugins:[localDataPlugin({id:appId,port:chosen,dataDirectory:dir})]});await one.listen();assert.equal(one.httpServer.address().port,chosen);
 two=await createServer({root:dir,cacheDir:join(dir,'vite-cache'),configFile:false,logLevel:'silent',server:{host:'127.0.0.1',port:0},plugins:[localDataPlugin({id:appId,port:null,dataDirectory:dir})]});await two.listen();
 const first='http://127.0.0.1:'+one.httpServer.address().port+'/__frame_local__',second='http://127.0.0.1:'+two.httpServer.address().port+'/__frame_local__';
 const a=await (await fetch(first+'/session')).json(),b=await (await fetch(second+'/session')).json();assert.equal(a.id,b.id);
 const request=(base,token,method,args,extra={})=>fetch(base+'/rpc',{method:'POST',headers:{'Content-Type':'application/json','X-Frame-Token':token,...extra},body:JSON.stringify({method,args})});
 const p=makeVideoProject('Port partagé');assert.equal((await request(first,a.token,'put',[p])).status,200);
 assert.equal((await (await request(second,b.token,'get',[p.id])).json()).result.name,p.name);
 assert.equal((await request(first,'','put',[p])).status,403);
 assert.equal((await request(first,a.token,'get',[p.id],{Origin:'https://example.invalid'})).status,403);
 assert.equal((await request(first,a.token,'getSetting',['video-folder-root'])).status,400);
 const pref=await fetch(first+'/preferences',{method:'POST',headers:{'Content-Type':'application/json','X-Frame-Token':a.token},body:JSON.stringify({key:'frame-slides-project',value:'document'})});assert.equal(pref.status,200);
 const session=await (await fetch(second+'/session')).json();assert.equal(session.preferences['frame-slides-project'].value,'document');
 }finally{await one?.close();await two?.close();await rm(dir,{recursive:true,force:true});}
});
