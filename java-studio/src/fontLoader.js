import { fonts } from './fonts.js';
import { usedFontFaces } from './textStyles.js';
export function createFontLoader(fontSet=()=>document.fonts){
const loaded=new Map();
return async function prepareFonts(slides){
 await Promise.all(usedFontFaces(slides).map(request=>{const {id,weight,italic}=request,cacheKey=JSON.stringify(request);
  const f=fonts.find(item=>item.id===id);if(f.local)return Promise.resolve();
  if(!loaded.has(cacheKey)){let timer;const promise=Promise.race([fontSet().load(`${italic?'italic ':''}${weight} 24px "${f.name}"`).then(faces=>{if(!faces.length)throw Error('Police indisponible');}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Délai de chargement de police dépassé')),8000);})]).finally(()=>clearTimeout(timer)).catch(error=>{loaded.delete(cacheKey);throw error;});loaded.set(cacheKey,promise);}
  return loaded.get(cacheKey);
 }));
};
}
