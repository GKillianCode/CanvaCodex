import { rotatePoint } from './editor.js';
import { interiorMargins,frameMargins } from './interiorMargins.js';
// Hit through selected foreground objects; measuring must not use the selection hit test.
export function measurementTarget(point,order,bounds,selected){if(!point)return null;return order.slice().reverse().find(key=>{if(selected.includes(key)||!bounds[key])return false;const b=bounds[key],local=rotatePoint(point,b,-(b.rotation||0));return local.x>=b.x&&local.x<=b.x+b.w&&local.y>=b.y&&local.y<=b.y+b.h;})||null;}
export function measurementMargins(selected,target){
 const direct=interiorMargins(selected,target);if(direct)return {outer:target,margins:direct};
 const reverse=interiorMargins(target,selected);if(reverse)return {outer:selected,margins:reverse};
 const margins=frameMargins(selected,target),a=margins.inner;
 return a.x<=target.x+target.w&&a.x+a.w>=target.x&&a.y<=target.y+target.h&&a.y+a.h>=target.y?{outer:target,margins}:null;
}
