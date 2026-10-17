import {visibleBlocks} from './model.js';
import {sceneAt} from './pedagogicalSteps.js';
import {STEP_INTERPOLATION_MS} from './stepInterpolation.js';
export function overlayKeys(slide){return [...new Set([slide,...(slide.pedagogicalSteps||[]).map(step=>step.scene)].flatMap(visibleBlocks))];}
export function overlayStates(slide,clip){
 const steps=slide.pedagogicalSteps||[],count=steps.length+1,gap=Math.min(.05,clip.duration/count/2);
 const rows=[{id:'initial',name:'État initial',index:0,start:0}];
 steps.forEach((step,i)=>{const start=Math.max(rows.at(-1).start+gap,Math.min(clip.duration-gap*(steps.length-i),clip.stepStarts?.[step.id]??clip.duration*(i+1)/count));rows.push({id:step.id,name:step.name,index:i+1,start});});
 return rows.map((row,i)=>({...row,end:rows[i+1]?.start??clip.duration}));
}
export function overlayStateAt(slide,clip,time){
 const rows=overlayStates(slide,clip);let index=0;for(let i=1;i<rows.length;i++)if(time>=rows[i].start)index=i;
 const row=rows[index],scene=sceneAt(slide,row.index),duration=Math.min(STEP_INTERPOLATION_MS/1000,row.end-row.start);
 return {row,scene,previous:index?sceneAt(slide,rows[index-1].index):null,progress:index?Math.max(0,Math.min(1,(time-row.start)/duration)):1};
}
