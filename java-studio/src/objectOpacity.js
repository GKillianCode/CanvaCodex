export function normalizeOpacity(value,fallback=100){return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(100,value)):fallback;}
export function objectOpacity(slide,key){return normalizeOpacity(slide.positions?.[key]?.opacity,['shape','table'].includes(slide.elements?.[key]?.type)?normalizeOpacity(slide.elements[key].opacity):100);}
export function selectionOpacity(slide,keys){const values=keys.map(key=>objectOpacity(slide,key));return values.every(value=>value===values[0])?values[0]:undefined;}
export function setObjectOpacity(slide,keys,value){if(typeof value!=='number'||!Number.isFinite(value))return;for(const key of keys)if(slide.positions[key])slide.positions[key].opacity=normalizeOpacity(value);}
