import { fonts, usedFonts } from './fonts.js';
export function createFontLoader(fontSet=()=>document.fonts){
const loaded=new Map();
return async function prepareFonts(slides){
 await Promise.all(usedFonts(slides).map(id=>{
  const f=fonts.find(item=>item.id===id);if(f.local)return Promise.resolve();
  if(!loaded.has(id)){let timer;const promise=Promise.race([Promise.all([400,700].map(weight=>fontSet().load(`${weight} 24px "${f.name}"`).then(faces=>{if(!faces.length)throw Error('Police indisponible');}))),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Délai de chargement de police dépassé')),8000);})]).finally(()=>clearTimeout(timer)).catch(error=>{loaded.delete(id);throw error;});loaded.set(id,promise);}
  return loaded.get(id);
 }));
};
}
