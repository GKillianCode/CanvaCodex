import {normalizeAnimation,resolvedAnimation,motionState} from './motion.js';
const bound=(v,min,max,fallback)=>v!==''&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
export function normalizeClip(raw={},keys=[]){
 raw=raw&&typeof raw==='object'?raw:{};
 const duration=bound(raw.duration,2,20,6),entry=bound(raw.entry,.1,3,.6),exit=bound(raw.exit,.1,3,.6),tracks={};
 for(const key of keys){const t=raw.tracks?.[key];if(!t)continue;tracks[key]={start:bound(t.start,0,duration-.1,0),end:bound(t.end,.1,duration,duration),entry:bound(t.entry,.1,3,entry),exit:bound(t.exit,.1,3,exit),animation:normalizeAnimation(t.animation,'up'),exitAnimation:normalizeAnimation(t.exitAnimation,'fade')};}
 return {duration,entry,exit,stagger:bound(raw.stagger,0,.5,.08),animation:normalizeAnimation(raw.animation,'up'),exitAnimation:normalizeAnimation(raw.exitAnimation,'fade'),background:raw.background==='chroma'?'chroma':'transparent',chroma:/^#[\da-f]{6}$/i.test(raw.chroma)?raw.chroma:'#00ff00',tracks};
}
export function clipTrack(clip,key,row=0){
 const t=clip.tracks[key]||{start:Math.min(row*clip.stagger,Math.max(0,clip.duration-clip.entry-clip.exit-.1)),end:clip.duration,entry:clip.entry,exit:clip.exit,animation:clip.animation,exitAnimation:clip.exitAnimation};
 const start=Math.min(t.start,clip.duration-.1),end=Math.max(start+.1,Math.min(clip.duration,t.end)),span=end-start;
 // Preserve an actual hold when possible, even after reducing the clip duration.
 const ratio=Math.min(1,span/(t.entry+t.exit));return {...t,start,end,entry:t.entry*ratio,exit:t.exit*ratio};
}
export function clipMotion(slide,clip,time,rows){
 const result={};rows.forEach((row,n)=>row.keys.forEach(key=>{const t=clipTrack(clip,row.keys[0],n);if(time<t.start||time>=t.end){result[key]={visible:false,alpha:0,x:0,y:0,scale:1};return;}const exiting=time>=t.end-t.exit,progress=exiting?(time-t.end+t.exit)/t.exit:Math.min(1,(time-t.start)/t.entry);const animation=resolvedAnimation(exiting?t.exitAnimation:t.animation,slide,n);result[key]={visible:true,...motionState(animation,progress,exiting)};}));return result;
}
