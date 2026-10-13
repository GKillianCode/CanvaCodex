const superscripts={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','−':'⁻','=':'⁼','(':'⁽',')':'⁾','n':'ⁿ','i':'ⁱ'};
export function toSuperscript(value){const chars=[...String(value)];if(!chars.length||chars.some(c=>!superscripts[c]&&!Object.values(superscripts).includes(c)))return null;return chars.map(c=>superscripts[c]||c).join('');}
export function powerText(base,exponent){const sup=toSuperscript(exponent);return String(base).trim()&&sup?String(base).trim()+sup:null;}
export function replaceSelection(value,start,end,insertion,max=100000){const result=value.slice(0,start)+insertion+value.slice(end);return result.length<=max?{text:result,cursor:start+insertion.length}:null;}
