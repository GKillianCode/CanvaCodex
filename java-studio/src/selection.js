import { MAX_ELEMENTS } from './limits.js';
import { rotatePoint } from './editor.js';
export function enclosingBounds(bounds){
 if(!bounds.length)return null;
 const points=bounds.flatMap(b=>[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]].map(([x,y])=>rotatePoint({x,y},b)));
 const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));return {x,y,w:Math.max(...points.map(p=>p.x))-x,h:Math.max(...points.map(p=>p.y))-y,rotation:0};
}
export function axisDistance(a,b,axis){const size=axis==='x'?'w':'h';if(a[axis]+a[size]<b[axis])return {from:a[axis]+a[size],to:b[axis],gap:b[axis]-a[axis]-a[size]};if(b[axis]+b[size]<a[axis])return {from:b[axis]+b[size],to:a[axis],gap:a[axis]-b[axis]-b[size]};const mid=(Math.max(a[axis],b[axis])+Math.min(a[axis]+a[size],b[axis]+b[size]))/2;return {from:mid,to:mid,gap:0};}
export function normalizeGroups(raw,keys){const used=new Set();return (Array.isArray(raw)?raw:[]).slice(0,MAX_ELEMENTS).flatMap((g,i)=>{const members=[...new Set(Array.isArray(g?.keys)?g.keys:[])].filter(k=>keys.includes(k)&&!used.has(k));if(members.length<2)return [];members.forEach(k=>used.add(k));return [{id:typeof g.id==='string'?g.id.slice(0,100):'group'+i,keys:members}];});}
export function selectionFor(s,key){return s.groups?.find(g=>g.keys.includes(key))?.keys.slice()||[key];}
export function groupSelection(s,keys){if(keys.length<2)return; s.groups=(s.groups||[]).filter(g=>!g.keys.some(k=>keys.includes(k)));s.groups.push({id:crypto.randomUUID(),keys:[...keys]});}
export function ungroupSelection(s,keys){s.groups=(s.groups||[]).filter(g=>!g.keys.some(k=>keys.includes(k)));}
export function translateSelection(positions,b,dx,dy,width=1920,height=1080){dx=Math.max(-b.x,Math.min(width-b.x-b.w,dx));dy=Math.max(-b.y,Math.min(height-b.y-b.h,dy));return Object.fromEntries(Object.entries(positions).map(([k,p])=>[k,{...p,x:p.x+dx,y:p.y+dy}]));}
// Align the visible (rotated) bounds, preserving each object's rotation and size.
export function arrangeSelection(positions,bounds,axis,mode,gap=0){
 const size=axis==='x'?'w':'h',all=enclosingBounds(Object.values(bounds)),entries=Object.entries(bounds).sort((a,b)=>a[1][axis]-b[1][axis]);if(!all)return positions;
 let cursor=all[axis];return Object.fromEntries(entries.map(([key,b])=>{let delta;if(mode==='spacing'){delta=cursor-b[axis];cursor+=b[size]+gap;}else delta=all[axis]+all[size]/2-b[axis]-b[size]/2;return [key,{...positions[key],[axis]:positions[key][axis]+delta}];}));
}
// A selected group is one rigid unit, even if a member was selected via the layers panel.
export function selectionUnits(groups,keys,bounds){
 const wanted=new Set(keys),used=new Set(),units=[];
 for(const g of groups||[]){if(!g.keys.some(k=>wanted.has(k)))continue;const members=g.keys.filter(k=>bounds[k]);if(!members.length)continue;members.forEach(k=>used.add(k));units.push({keys:members,bounds:enclosingBounds(members.map(k=>bounds[k]))});}
 for(const k of keys)if(!used.has(k)&&bounds[k])units.push({keys:[k],bounds:enclosingBounds([bounds[k]])});return units;
}
export function arrangeUnits(positions,units,axis,mode,gap=0){
 if(units.length<2)return {};const all=enclosingBounds(units.map(u=>u.bounds)),size=axis==='x'?'w':'h',changes={};
 const ordered=units.slice().sort((a,b)=>a.bounds[axis]-b.bounds[axis]);let cursor=all[axis];
 for(const unit of ordered){const b=unit.bounds,delta=mode==='spacing'?cursor-b[axis]:all[axis]+all[size]/2-b[axis]-b[size]/2;if(mode==='spacing')cursor+=b[size]+Math.max(0,gap);for(const key of unit.keys)changes[key]={...(changes[key]||positions[key]),[axis]:positions[key][axis]+delta};}
 return changes;
}
export function layoutUnits(positions,units,axis,gap=0){
 // Put whole components on one row/column; initial coincident copies are separated.
 const cross=axis==='x'?'y':'x';const aligned={...positions,...arrangeUnits(positions,units,cross,'center')};return {...arrangeUnits(positions,units,cross,'center'),...arrangeUnits(aligned,units,axis,'spacing',gap)};
}
