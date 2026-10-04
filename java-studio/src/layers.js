// The array is the single source of truth: back to front, with contiguous ranks.
export function reorderLayers(order,selected,action,rank){
 const picked=new Set(selected),keys=order.filter(k=>picked.has(k));if(!keys.length)return order.slice();
 if(action==='forward'||action==='backward'){
  const next=order.slice();if(action==='forward'){for(let i=next.length-2;i>=0;i--)if(picked.has(next[i])&&!picked.has(next[i+1]))[next[i],next[i+1]]=[next[i+1],next[i]];}
  else for(let i=1;i<next.length;i++)if(picked.has(next[i])&&!picked.has(next[i-1]))[next[i],next[i-1]]=[next[i-1],next[i]];
  return next;
 }
 const remaining=order.filter(k=>!picked.has(k));const at=action==='front'?remaining.length:action==='back'?0:Math.max(0,Math.min(remaining.length,Math.round(Number(rank)||1)-1));remaining.splice(at,0,...keys);return remaining;
}
