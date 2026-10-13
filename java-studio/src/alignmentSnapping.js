import { translateSelection } from './selection.js';

// Tolerance is supplied in design units, so the editor can keep a constant screen distance.
export function snapTranslation(positions, bounds, targets, dx, dy, tolerance=6, width=1920, height=1080) {
  const translated=translateSelection(positions,bounds,dx,dy,width,height),first=Object.keys(positions)[0];
  if(!first)return {positions:translated,guides:[]};
  const shift={x:translated[first].x-positions[first].x,y:translated[first].y-positions[first].y},guides=[];
  for(const [axis,size,limit] of [['x','w',width],['y','h',height]]){
    const start=bounds[axis]+shift[axis],anchors=[start,start+bounds[size]/2,start+bounds[size]];
    let best=null;
    for(const target of [{x:0,y:0,w:width,h:height},...targets]){
      for(const line of [target[axis],target[axis]+target[size]/2,target[axis]+target[size]])for(const anchor of anchors){
        const delta=line-anchor,distance=Math.abs(delta),next=start+delta;
        if(distance<=tolerance&&next>=-1e-8&&next+bounds[size]<=limit+1e-8&&(!best||distance<best.distance))best={delta,distance,line};
      }
    }
    if(best){shift[axis]+=best.delta;guides.push({axis,value:best.line});}
  }
  return {positions:Object.fromEntries(Object.entries(positions).map(([key,p])=>[key,{...p,x:p.x+shift.x,y:p.y+shift.y}])),guides};
}
