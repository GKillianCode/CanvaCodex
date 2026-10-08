import { normalizeAnimation } from './motion.js';
import { visibleBlocks, blockLabel } from './model.js';
import { selectionFor } from './selection.js';
const common=values=>values.every(v=>v===values[0])?values[0]:undefined;
export function appearanceRows(slide){
 const keys=visibleBlocks(slide),used=new Set(),rows=[];
 for(const key of keys){if(used.has(key))continue;const members=selectionFor(slide,key).filter(k=>keys.includes(k));members.forEach(k=>used.add(k));const grouped=members.length>1;
 rows.push({id:grouped?slide.groups.find(g=>g.keys.includes(key)).id:key,keys:members,label:grouped?'Groupe · '+members.length+' éléments':blockLabel(slide,key),members:members.map(k=>blockLabel(slide,k)).join(', '),order:common(members.map(k=>slide.fragments[k]?.order??0)),animation:common(members.map(k=>slide.fragments[k]?.animation??'fade')),exitAnimation:common(members.map(k=>slide.fragments[k]?.exitAnimation??'none'))});}
 return rows;
}
export function setAppearance(slide,keys,field,value){
 if(!['order','animation','exitAnimation'].includes(field))return;
 if(field==='order'){if(value===''||!Number.isFinite(Number(value)))return;value=Math.max(0,Math.min(20,Math.round(Number(value))));}
 else if(normalizeAnimation(value,null)===null)return;
 const visible=visibleBlocks(slide),members=[...new Set(keys.flatMap(k=>selectionFor(slide,k)))].filter(k=>visible.includes(k));
 for(const key of members){slide.fragments[key]||={order:0,animation:'fade'};slide.fragments[key][field]=value;}
}
