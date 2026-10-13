// Ranges use UTF-16 offsets, matching textarea selections and JSON strings.
const flags=['italic','underline','strike','highlight'];
export function inlineStyle(raw={}){
 const style={};for(const key of flags)if(typeof raw[key]==='boolean')style[key]=raw[key];
 if([100,200,300,400,500,600,700,800,900].includes(raw.weight))style.weight=raw.weight;
 for(const key of ['color','highlightColor'])if(raw[key]===null||/^#[\da-f]{6}$/i.test(raw[key]))style[key]=raw[key];
 if(raw.colorRole===null||typeof raw.colorRole==='string'&&/^[\w-]{1,100}$/.test(raw.colorRole))style.colorRole=raw.colorRole;
 return style;
}
export function normalizeRuns(raw,text=''){
 const length=String(text).length,spans=(Array.isArray(raw)?raw:[]).slice(0,1000).map(r=>({start:Math.max(0,Math.min(length,Math.trunc(Number(r?.start)||0))),end:Math.max(0,Math.min(length,Math.trunc(Number(r?.end)||0))),style:inlineStyle(r?.style)})).filter(r=>r.end>r.start&&Object.keys(r.style).length);
 const points=[...new Set(spans.flatMap(r=>[r.start,r.end]))].sort((a,b)=>a-b),result=[];
 for(let i=0;i<points.length-1;i++){
  const start=points[i],end=points[i+1],style=Object.assign({},...spans.filter(r=>r.start<=start&&r.end>=end).map(r=>r.style));
  if(!Object.keys(style).length)continue;const last=result.at(-1);
  if(last?.end===start&&JSON.stringify(last.style)===JSON.stringify(style))last.end=end;else result.push({start,end,style});
 }
 return result.slice(0,1000);
}
export function applyInlineStyle(text,runs,start,end,patch){
 start=Math.max(0,Math.min(text.length,start));end=Math.max(start,Math.min(text.length,end));if(start===end)return normalizeRuns(runs,text);
 const current=normalizeRuns(runs,text),points=[...new Set([start,end,...current.flatMap(r=>[r.start,r.end])])].sort((a,b)=>a-b),result=[];
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],style={...(current.find(r=>r.start<=a&&r.end>=b)?.style||{})};
  if(a>=start&&b<=end){if(patch===null){for(const key of Object.keys(style))delete style[key];}else{Object.assign(style,inlineStyle(patch));for(const key of Object.keys(patch))if(patch[key]===undefined)delete style[key];}}
  if(Object.keys(style).length)result.push({start:a,end:b,style});
 }
 if(result.length>1000)throw Error("Ce texte atteint la limite de 1 000 passages mis en forme.");
 return normalizeRuns(result,text);
}
export function remapRuns(before,after,runs){
 if(before===after)return normalizeRuns(runs,after);
 let start=0;while(start<before.length&&start<after.length&&before[start]===after[start])start++;
 let end=before.length,nextEnd=after.length;while(end>start&&nextEnd>start&&before[end-1]===after[nextEnd-1]){end--;nextEnd--;}
 const current=normalizeRuns(runs,before),delta=nextEnd-end,kept=current.flatMap(r=>[{...r,end:Math.min(r.end,start)},{...r,start:Math.max(r.start,end)+delta,end:r.end+delta}]);
 const inherited=current.find(r=>r.start<=start&&r.end>start)||current.find(r=>r.end===start);
 if(inherited&&nextEnd>start)kept.push({start,end:nextEnd,style:inherited.style});
 return normalizeRuns(kept,after);
}
export function textSegments(text,runs,start=0,end=text.length){
 const points=[start,end,...runs.flatMap(r=>[r.start,r.end]).filter(p=>p>start&&p<end)].sort((a,b)=>a-b),result=[];
 for(let i=0;i<points.length-1;i++)if(points[i]<points[i+1]){const at=points[i];result.push({start:at,end:points[i+1],text:text.slice(at,points[i+1]),style:runs.find(r=>r.start<=at&&r.end>at)?.style||{}});}
 return result;
}
