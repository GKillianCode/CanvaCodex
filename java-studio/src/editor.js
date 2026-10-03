import { WIDTH, HEIGHT, blockText, blockType, visibleBlocks } from './model.js';
export function nudgePosition(p, dx, dy, outputWidth) { const unit=WIDTH/outputWidth;return {...p,x:Math.max(0,Math.min(WIDTH-p.w,p.x+dx*unit)),y:Math.max(0,Math.min(HEIGHT-(p.h||40),p.y+dy*unit))}; }
export function resizePosition(origin,handle,dx,dy,type) {
 const minW=type==='code'?240:type==='shape'?8:80,minH=type==='code'?180:type==='shape'?8:40;
 const west=handle.includes('w'),east=handle.includes('e'),north=handle.includes('n'),south=handle.includes('s');
 const x=west?Math.max(0,Math.min(origin.x+origin.w-minW,origin.x+dx)):origin.x;
 const y=north?Math.max(0,Math.min(origin.y+origin.h-minH,origin.y+dy)):origin.y;
 const w=west?origin.x+origin.w-x:east?Math.max(minW,Math.min(WIDTH-x,origin.w+dx)):origin.w;
 const h=north?origin.y+origin.h-y:south?Math.max(minH,Math.min(HEIGHT-y,origin.h+dy)):origin.h;
 // Side handles change one dimension without shrinking type on the untouched axis.
 const ratio=(west||east)&&(north||south)?Math.min(w/origin.w,h/origin.h):1;
 return {...origin,x,y,w,h,size:['image','shape'].includes(type)?origin.size:Math.max(10,Math.min(260,origin.size*ratio))};
}
export function duplicateElement(s,key) {
 if(!visibleBlocks(s).includes(key)||Object.keys(s.elements).length>=40)return null;
 const type=blockType(s,key),copyKey=type+crypto.randomUUID().replaceAll('-','').slice(0,8),source=s.elements[key];
 s.elements[copyKey]=source?JSON.parse(JSON.stringify(source)):{type,text:blockText(s,key),weight:key==='title'?700:400,label:key==='title'?s.label:'',caption:key==='code'?s.codeTitle:''};
 s.elements[copyKey].custom=true;s.elements[copyKey].name=(source?.name||({title:'Titre',body:'Texte',code:'Code Java'})[key]||'Élément')+' · copie';
 const p=s.positions[key];s.positions[copyKey]={...p,x:Math.min(WIDTH-p.w,p.x+24),y:Math.min(HEIGHT-(p.h||40),p.y+24)};s.fragments[copyKey]={...s.fragments[key]};return copyKey;
}
