// Slots sit in the gaps between complete blocks, never on a text baseline.
export function documentDropSlot(rects, y){
 if(!rects.length)return null;
 const positions=[rects[0].top-10,...rects.map((r,i)=>rects[i+1]?(r.bottom+rects[i+1].top)/2:r.bottom+10)];
 let index=0;for(let i=1;i<positions.length;i++)if(Math.abs(y-positions[i])<Math.abs(y-positions[index]))index=i;
 return {index,top:positions[index]};
}

export function sequenceDropIndex(ids, source, target, after=false){
 const from=ids.indexOf(source),at=ids.indexOf(target);if(from<0||at<0)return -1;
 const slot=at+(after?1:0);return slot-(from<slot?1:0);
}
