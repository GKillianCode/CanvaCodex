export const STEP_INTERPOLATION_MS=500;
export function interpolationProgress(progress){const t=Math.max(0,Math.min(1,Number(progress)||0));return t*t*(3-2*t);}
export function interpolatePosition(from,to,progress){const t=interpolationProgress(progress),result={...to};for(const field of ['x','y','w','h','size','wrapWidth','contentScale'])if(Number.isFinite(from[field])&&Number.isFinite(to[field]))result[field]=from[field]+(to[field]-from[field])*t;const a=from.rotation||0,b=to.rotation||0;result.rotation=t===1?b:a+(((b-a+540)%360)-180)*t;return result;}
