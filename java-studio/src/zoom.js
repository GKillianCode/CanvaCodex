export const MIN_ZOOM=25,MAX_ZOOM=300;
export function clampZoom(value){return Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,Math.round(Number(value)||100)));}
export function wheelZoom(value,event){const unit=event.deltaMode===1?16:event.deltaMode===2?240:1;return clampZoom(value*Math.exp(-Math.max(-240,Math.min(240,event.deltaY*unit))*.002));}
