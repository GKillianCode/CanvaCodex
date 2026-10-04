import { blockType, visibleBlocks } from './model.js';
import { captureComponent, insertComponent } from './componentsLibrary.js';
import { groupSelection, selectionFor } from './selection.js';

const clone = value => JSON.parse(JSON.stringify(value));
export function selectionType(slide, keys) {
  const types=keys.map(k=>blockType(slide,k)==='shape'?'shape:'+slide.elements[k].shape:blockType(slide,k));
  return keys.length>1&&types.every(t=>t===types[0])?types[0]:null;
}
export function commonValue(values) { return values.every(v=>v===values[0])?values[0]:undefined; }
export function copyObjects(slide, selected) {
  const keys=visibleBlocks(slide).filter(k=>selected.flatMap(k=>selectionFor(slide,k)).includes(k));
  if(!keys.length)return null;
  const component=captureComponent(slide,keys,{x:0,y:0},'Copie');
  return clone({component,groups:(slide.groups||[]).filter(g=>g.keys.every(k=>keys.includes(k))).map(g=>g.keys.map(k=>keys.indexOf(k)))});
}
export function pasteObjects(slide, clipboard, offset=24) {
  if(!clipboard)return [];
  const keys=insertComponent(slide,clipboard.component);
  for(const key of keys){slide.positions[key].x+=offset-128;slide.positions[key].y+=offset-128;}
  for(const indices of clipboard.groups)if(keys.length)groupSelection(slide,indices.map(n=>keys[n]));
  return keys;
}
