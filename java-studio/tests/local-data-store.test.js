import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {createDiskStore} from '../scripts/local-data-store.mjs';
import {catalogPort} from '../scripts/application-config.mjs';
import {videoRepositoryOperations,makeVideoProject,makeCreation,attachCreation} from '../src/videoProjects.js';
const id='59b7e84f-7970-44fc-8fae-903394040764';
test('configured port follows the UUID after renaming and rejects invalid or ambiguous entries',()=>{
 assert.equal(catalogPort({renamed:{id,name:'Autre nom',port:5301}},id),5301);
 assert.equal(catalogPort({renamed:{id,port:null}},id),null);
 for(const port of [true,80,65536,'5301',1.5])assert.throws(()=>catalogPort({a:{id,port}},id),/Port invalide/);
 assert.throws(()=>catalogPort({a:{id},b:{id}},id),/dupliqué/);assert.throws(()=>catalogPort({},id),/absent/);
});
test('two instances share durable videos, workflows, playlists, creations and canvas without loading unrelated bodies',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'frame-data-test-'));try{
 const first=createDiskStore(dir),second=createDiskStore(dir);
 const a=videoRepositoryOperations(async(mode,run)=>(await first.transaction(mode,run)).result);
 const b=videoRepositoryOperations(async(mode,run)=>(await second.transaction(mode,run)).result);
 const p=makeVideoProject('Ports indépendants'),row=makeCreation(p,'slides','Cours');attachCreation(p,row);await a.put(p,[row]);
 assert.equal((await b.get(p.id)).name,p.name);assert.equal((await b.allCreations(p.id))[0].id,row.id);
 assert.equal((await b.list())[0].counts.slides,1);
 await b.editPlaylist('Java','JVM');assert.equal((await a.get(p.id)).playlist,'JVM');
 await a.saveCanvas({nodes:[{id:'n',type:'video',videoId:p.id,x:12,y:24}]});assert.equal((await b.canvas()).nodes[0].videoId,p.id);
 const current=await a.get(p.id);const changed=structuredClone(current.workflow.conductor);changed.draft='Brouillon partagé';
 await a.saveWorkflow(p.id,'conductor',changed,current.workflow.conductor.revision);assert.equal((await b.get(p.id)).notes,'Brouillon partagé');
 await b.removeCreation(p.id,row.id);assert.equal((await a.allCreations(p.id)).length,0);assert.equal((await a.list())[0].counts.slides,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('failed transaction and stale writes preserve the previous manifest',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'frame-data-cas-'));try{
 const disk=createDiskStore(dir);const p=makeVideoProject('Original');
 const initial=await disk.transaction('readwrite',(projects)=>projects.put(p));
 const key=JSON.stringify(['projects',p.id]),previous=await readFile(join(dir,'manifest.json'),'utf8');
 await assert.rejects(disk.transaction('readwrite',(projects)=>projects.put({...p,name:'Stale'}),{expected:{[key]:'incorrect'}}),/autre fenêtre/);
 assert.equal(await readFile(join(dir,'manifest.json'),'utf8'),previous);
 await assert.rejects(disk.transaction('readwrite',(projects,c,set,tx)=>{projects.put({...p,name:'Aborted'});set(Error('Annulé'));tx.abort();}),/Annulé/);
 assert.equal(await readFile(join(dir,'manifest.json'),'utf8'),previous);
 assert.ok(initial.versions[key]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('migration is add-only and preference values survive a new store instance',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'frame-data-migrate-'));try{
 const disk=createDiskStore(dir),p=makeVideoProject('Conservé');await disk.importRows({projects:[p],creations:[],settings:{playlists:['Java']}});
 await disk.importRows({projects:[{...p,name:'Ancienne copie'}],creations:[],settings:{playlists:['Obsolète']}});
 const repository=videoRepositoryOperations(async(mode,run)=>(await disk.transaction(mode,run)).result);assert.equal((await repository.get(p.id)).name,'Conservé');assert.deepEqual(await repository.playlists(),['Java']);
 await disk.transaction('readwrite',(p,c,set,tx,s,settings,store)=>store('preferences').put('my-doc','frame-slides-project'));
 assert.equal((await createDiskStore(dir).values('preferences'))['frame-slides-project'].value,'my-doc');
 }finally{await rm(dir,{recursive:true,force:true});}
});
