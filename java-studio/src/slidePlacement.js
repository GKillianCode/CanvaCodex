import { enclosingBounds, selectionUnits } from './selection.js';

export const slideAnchors = [
 ['left','top','En haut à gauche','↖'], ['center','top','Centré en haut','↑'], ['right','top','En haut à droite','↗'],
 ['left','center','Centré à gauche','←'], ['center','center','Au centre de la diapo','⊙'], ['right','center','Centré à droite','→'],
 ['left','bottom','En bas à gauche','↙'], ['center','bottom','Centré en bas','↓'], ['right','bottom','En bas à droite','↘'],
];
export function placeOnSlide(positions,bounds,groups,keys,xAnchor,yAnchor,margin=0,width=1920,height=1080){
 const units=selectionUnits(groups,keys,bounds),b=enclosingBounds(units.map(u=>u.bounds));
 if(!b)return {};
 const edge=Math.max(0,Number(margin)||0);
 const mx=Math.min(edge,Math.max(0,(width-b.w)/2)),my=Math.min(edge,Math.max(0,(height-b.h)/2));
 const x=({left:mx,center:(width-b.w)/2,right:width-b.w-mx})[xAnchor];
 const y=({top:my,center:(height-b.h)/2,bottom:height-b.h-my})[yAnchor];
 if(!Number.isFinite(x)||!Number.isFinite(y))return {};
 return Object.fromEntries(units.flatMap(u=>u.keys).map(k=>[k,{...positions[k],x:positions[k].x+x-b.x,y:positions[k].y+y-b.y}]));
}
