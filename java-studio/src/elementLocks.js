export function lockedSelection(scene,keys){return keys.some(key=>scene.positions[key]?.locked===true||(scene.groups||[]).some(g=>g.keys.includes(key)&&g.keys.some(k=>scene.positions[k]?.locked===true)));}
export function setElementLocks(scene,keys,locked){for(const key of keys)if(scene.positions[key])scene.positions[key].locked=locked===true;}

export function lockedTransform(scene,transform){if(!transform)return false;return lockedSelection(scene,Object.keys(transform.origins||transform.positions||{[transform.key]:transform.position}).filter(k=>k&&k!=='undefined'));}
