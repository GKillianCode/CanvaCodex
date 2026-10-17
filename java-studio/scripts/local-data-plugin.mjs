import {randomBytes,createHash} from 'node:crypto';
import {videoRepositoryOperations} from '../src/videoProjects.js';
import {createDiskStore} from './local-data-store.mjs';
const methods=new Set(['getSetting','setSetting','canvas','saveCanvas','playlists','editPlaylist','preview','list','moveVideo','cover','get','creation','put','saveWorkflow','removeCreation','saveCreation','allCreations']);
export function localDataPlugin(settings){
 const disk=createDiskStore(settings.dataDirectory),token=randomBytes(32).toString('hex');
 function install(server){server.middlewares.use('/__frame_local__',async(req,res,next)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const send=(status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
  try{
   if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return send(403,{error:'Accès local uniquement.'});
   const host=req.headers.host||'',hostname=new URL('http://'+host).hostname;
   if(!['localhost','127.0.0.1','[::1]'].includes(hostname))return send(403,{error:'Stockage réservé à cet ordinateur.'});
   if(req.headers.origin&&req.headers.origin!=='http://'+host&&req.headers.origin!=='https://'+host)return send(403,{error:'Origine refusée.'});
   if(req.headers['sec-fetch-site']==='cross-site')return send(403,{error:'Origine refusée.'});
   if(req.method==='GET'&&req.url==='/session'){
    const values=await disk.values('settings');return send(200,{id:settings.id,token,initialized:!!values['local-data-ready']?.value,preferences:await disk.values('preferences')});
   }
   if(req.method!=='POST')return send(404,{error:'Route inconnue.'});
   if(req.headers['x-frame-token']!==token||!req.headers['content-type']?.startsWith('application/json'))return send(403,{error:'Session locale invalide. Recharge la page.'});
   let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>256*1024*1024)return send(413,{error:'Données trop volumineuses (256 Mo par écriture).'});chunks.push(chunk);}
   const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));chunks=null;
   if(req.url==='/rpc'){
    if(!methods.has(input.method)||!Array.isArray(input.args))return send(400,{error:'Opération inconnue.'});
    if(['getSetting','setSetting'].includes(input.method)&&['video-folder-root','video-folder-pending'].includes(input.args[0]))return send(400,{error:'Les autorisations de dossier restent dans le navigateur.'});
    const expected={};const guard=input.method==='put'?['projects',input.args[0]?.id]:input.method==='saveCreation'?['creations',input.args[0]?.id]:null;
    if(guard){const key=JSON.stringify(guard);expected[key]=input.expected?.[key]??null;}
    let versions={};const repository=videoRepositoryOperations(async(mode,run)=>{const r=await disk.transaction(mode,run,{expected});versions=r.versions;return r.result;});
    const result=await repository[input.method](...input.args);return send(200,{result,versions});
   }
   if(req.url==='/preferences'){
    const {key,value,expected,importOnly=false}=input;
    if(typeof key!=='string'||!(/^(frame-|slides:frame-|banners:frame-)/.test(key))||!(value===null||typeof value==='string'))throw Error('Préférence invalide.');
    const result=await disk.transaction('readwrite',(p,c,set,tx,s,settings,store)=>{const prefs=store('preferences');prefs.get(key).onsuccess=e=>{if((!importOnly||e.target.result===undefined)&&e.target.result!==value){if(value===null)prefs.delete(key);else prefs.put(value,key);}};},{expected:importOnly||!(/-project$|frame-themes$|^frame-shared-library-draft$/.test(key))?{}:{[JSON.stringify(['preferences',key])]:expected||null}});
    return send(200,result);
   }
   if(req.url==='/recoveries')return send(200,await disk.values('recovery'));
   if(req.url==='/migrate'){
    const origin=String(input.origin||'').slice(0,300),data=input.data;
    if(!data||!Array.isArray(data.projects)||!Array.isArray(data.creations))throw Error('Copie navigateur invalide.');
    const id=createHash('sha256').update(origin+'\n'+(data.projects[0]?.id||'settings')).digest('hex');
    await disk.transaction('readwrite',(p,c,set,tx,s,settings,store)=>{const recovery=store('recovery');recovery.get(id).onsuccess=e=>{if(!e.target.result)recovery.put({origin,date:Date.now(),data},id);};});
    const imported=await disk.importRows(data);return send(200,{ok:true,conflicts:imported.result});
   }
   return send(404,{error:'Route inconnue.'});
  }catch(error){send(500,{error:error.message||'Stockage local indisponible.'});}
 });}
 return {name:'frame-local-data',configResolved(config){if(settings.port!==null){config.server.port=settings.port;config.preview.port=settings.port;}config.server.strictPort=true;config.preview.strictPort=true;},configureServer:install,configurePreviewServer:install};
}
