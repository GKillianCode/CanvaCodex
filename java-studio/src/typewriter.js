const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
const segmenter=new Intl.Segmenter('fr',{granularity:'grapheme'});
export const graphemes=value=>Array.from(segmenter.segment(String(value)),part=>part.segment);
export function normalizeTypewriter(raw={}){return {enabled:raw?.enabled===true,mode:raw?.mode==='word'?'word':'character',speed:clamp(raw?.speed,1,120,30),delay:clamp(raw?.delay,0,10,0),cursor:['bar','block'].includes(raw?.cursor)?raw.cursor:'none'};}
export function typewriterState(value,raw,elapsed){
 const config=normalizeTypewriter(raw);
 if(!config.enabled||!Number.isFinite(elapsed))return {count:Infinity,done:true,cursor:''};
 const chars=graphemes(value),units=config.mode==='word'?(String(value).match(/\s*\S+\s*/gu)||[]):chars;
 const passed=Math.max(0,elapsed-config.delay*1000),count=Math.min(units.length,Math.floor(passed*config.speed/1000)),done=count===units.length;
 return {count:done?Infinity:graphemes(units.slice(0,count).join('')).length,done,cursor:!done&&elapsed>=config.delay*1000&&Math.floor(passed/500)%2===0?({bar:'▏',block:'▌'}[config.cursor]||''):''};
}
export function typewriterDuration(value,raw){const c=normalizeTypewriter(raw);return c.enabled?c.delay*1000+(c.mode==='word'?(String(value).match(/\s*\S+\s*/gu)||[]).length:graphemes(value).length)/c.speed*1000:0;}
