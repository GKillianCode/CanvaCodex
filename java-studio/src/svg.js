// SVG stays vector-based. Only self-contained drawing markup is accepted.
export function safeSvg(value){
 if(typeof value!=='string'||value.length>=2000000||!/^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(value))return false;
 const markup=value.replace(/xmlns(?::[\w-]+)?\s*=\s*(["'])[^"']*\1/gi,'');
 if(/<\s*(?:script|foreignObject|iframe|object|embed|image|audio|video|style|animate\w*|set)\b|<!DOCTYPE|<!ENTITY|\bon\w+\s*=|@import|javascript:|data:|https?:|file:|&#|\\/i.test(markup))return false;
 for(const m of markup.matchAll(/(?:href|src)\s*=\s*(["'])(.*?)\1/gi))if(!m[2].trim().startsWith('#'))return false;
 for(const m of markup.matchAll(/url\((.*?)\)/gi))if(!m[1].trim().replace(/^["']|["']$/g,'').trim().startsWith('#'))return false;
 return true;
}
export function svgSource(value){if(!safeSvg(value))throw Error('SVG non autonome');const doc=new DOMParser().parseFromString(value,'image/svg+xml');if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('SVG invalide');if(!doc.documentElement.getAttribute('xmlns'))doc.documentElement.setAttribute('xmlns','http://www.w3.org/2000/svg');const clean=new XMLSerializer().serializeToString(doc);return 'data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(clean)));}
export function validSvgSource(src){try{return /^data:image\/svg\+xml;base64,[a-zA-Z0-9+/=]+$/.test(src)&&safeSvg(decodeURIComponent(escape(atob(src.split(',')[1]))));}catch{return false;}}
