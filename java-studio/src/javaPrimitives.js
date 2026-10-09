// Java Language Specification §4.2 and §4.12.5; numeric width, not object/stack footprint.
export const primitiveSource='https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html';
export const javaPrimitives=[
 {id:'byte',bytes:1,min:'−128',max:'127',initial:'0',note:'Entier signé · complément à deux'},
 {id:'short',bytes:2,min:'−32 768',max:'32 767',initial:'0',note:'Entier signé · complément à deux'},
 {id:'int',bytes:4,min:'−2 147 483 648',max:'2 147 483 647',initial:'0',note:'Entier signé · complément à deux'},
 {id:'long',bytes:8,min:'−9 223 372 036 854 775 808',max:'9 223 372 036 854 775 807',initial:'0L',note:'Entier signé · complément à deux'},
 {id:'char',bytes:2,min:'0 · \\u0000',max:'65 535 · \\uffff',initial:"'\\u0000'",note:'Unité de code UTF-16 · non signé'},
 {id:'float',bytes:4,min:'≈ −3,4028235 × 10³⁸',max:'≈ +3,4028235 × 10³⁸',initial:'0.0f',note:'Bornes finies · IEEE 754 · ±∞ et NaN possibles\nPlus petit positif non nul ≈ 1,4 × 10⁻⁴⁵'},
 {id:'double',bytes:8,min:'≈ −1,7976931348623157 × 10³⁰⁸',max:'≈ +1,7976931348623157 × 10³⁰⁸',initial:'0.0d',note:'Bornes finies · IEEE 754 · ±∞ et NaN possibles\nPlus petit positif non nul ≈ 4,9 × 10⁻³²⁴'},
 {id:'boolean',bytes:null,min:'Non applicable',max:'Non applicable',initial:'false',note:'Valeurs : false ou true · aucune taille de stockage\nuniverselle imposée par le langage Java'},
];
export function setPrimitive(slide,id){const type=javaPrimitives.find(t=>t.id===id);if(!type)return;slide.primitiveType=id;const values={textType:id,textMinimum:type.min,textMaximum:type.max,textWidth:type.bytes?`${type.bytes} octet${type.bytes>1?'s':''} · ${type.bytes*8} bits`:'Stockage selon la JVM',textDefault:type.initial,textTypeNote:type.note,textDefaultNote:'Défaut pour les champs et les éléments de tableaux.\nLes variables locales doivent être initialisées.'};for(const [key,value] of Object.entries(values))if(slide.elements[key])slide.elements[key].text=value;}
