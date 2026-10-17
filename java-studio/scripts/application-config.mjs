import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir,platform} from 'node:os';
export const identityPath=new URL('../../application.json',import.meta.url);
export const catalogPath=new URL('../../../applications.json',import.meta.url);
export function catalogPort(catalog,id){
 if(!catalog||Array.isArray(catalog)||typeof catalog!=='object')throw Error('applications.json doit contenir un objet.');
 const matches=Object.values(catalog).filter(row=>typeof row?.id==='string'&&row.id.toLowerCase()===id.toLowerCase());
 if(matches.length>1)throw Error('UUID dupliqué dans applications.json : '+id);
 if(!matches.length)throw Error('UUID absent du catalogue applications.json : '+id);
 const port=matches[0].port;if(port===null||port===undefined||port==='')return null;
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Port invalide dans applications.json (entier de 1024 à 65535 attendu).');
 return port;
}
export function applicationConfig(){
 const {id}=JSON.parse(readFileSync(identityPath,'utf8'));
 if(!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id||''))throw Error('UUID invalide dans application.json.');
 let port=null;
 try{port=catalogPort(JSON.parse(readFileSync(catalogPath,'utf8')),id);}catch(error){if(error.code!=='ENOENT')throw error;}
 return {id,port,dataDirectory:process.env.FRAME_DATA_DIRECTORY||join(process.env.XDG_DATA_HOME||(platform()==='win32'?process.env.LOCALAPPDATA||join(homedir(),'AppData','Local'):join(homedir(),'.local','share')),'frame',id)};
}
