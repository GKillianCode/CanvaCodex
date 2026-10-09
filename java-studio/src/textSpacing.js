// Relative units keep spacing proportional when a text block or group is scaled.
const bounded=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
export function normalizeTextSpacing(raw={}) {
 return {lineHeight:bounded(raw?.lineHeight,.5,3,null),letterSpacing:bounded(raw?.letterSpacing,-.1,1,0)};
}
export function textLeading(style,fallback){return normalizeTextSpacing(style).lineHeight??fallback;}
export function applyLetterSpacing(ctx,style,size){ctx.letterSpacing=`${normalizeTextSpacing(style).letterSpacing*size}px`;}
