import { WIDTH, HEIGHT, blockText, blockType, visibleBlocks } from './model.js';
export function nudgePosition(p, dx, dy, outputWidth) { const unit=WIDTH/outputWidth;return {...p,x:Math.max(0,Math.min(WIDTH-p.w,p.x+dx*unit)),y:Math.max(0,Math.min(HEIGHT-(p.h||40),p.y+dy*unit))}; }
export function resizePosition(origin, corner, dx, dy, type) {
 const minW=type==='code'?240:80,minH=type==='code'?180:40;
 const left=corner.includes('w'),top=corner.includes('n');
 const x=left?Math.max(0,Math.min(origin.x+origin.w-minW,origin.x+dx)):origin.x;
 const y=top?Math.max(0,Math.min(origin.y+origin.h-minH,origin.y+dy)):origin.y;
 const w=left?origin.x+origin.w-x:Math.max(minW,Math.min(WIDTH-x,origin.w+dx));
 const h=top?origin.y+origin.h-y:Math.max(minH,Math.min(HEIGHT-y,origin.h+dy));
 return {...origin,x,y,w,h,size:type==='image'?origin.size:Math.max(10,Math.min(260,origin.size*Math.min(w/origin.w,h/origin.h)))};
}
export function duplicateElement(s,key) {
 if(!visibleBlocks(s).includes(key)||Object.keys(s.elements).length>=40)return null;
 const type=blockType(s,key),copyKey=type+crypto.randomUUID().replaceAll('-','').slice(0,8),source=s.elements[key];
 s.elements[copyKey]=source?JSON.parse(JSON.stringify(source)):{type,text:blockText(s,key),weight:key==='title'?700:400,label:key==='title'?s.label:'',caption:key==='code'?s.codeTitle:''};
 s.elements[copyKey].custom=true;s.elements[copyKey].name=(source?.name||({title:'Titre',body:'Texte',code:'Code Java'})[key]||'Élément')+' · copie';
 const p=s.positions[key];s.positions[copyKey]={...p,x:Math.min(WIDTH-p.w,p.x+24),y:Math.min(HEIGHT-(p.h||40),p.y+24)};s.fragments[copyKey]={...s.fragments[key]};return copyKey;
}
