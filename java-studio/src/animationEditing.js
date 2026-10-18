export function editableClip(clips,selectedId,key,time){
 const selected=clips.find(c=>c.id===selectedId&&c.keys.length===1&&c.keys[0]===key);
 return selected || clips.filter(c=>c.keys.length===1&&c.keys[0]===key&&time>=c.start&&time<=c.start+c.duration).sort((a,b)=>b.start-a.start)[0];
}
