export const listTypes=[['none','Aucune'],['bullet','Puces rondes'],['circle','Cercles'],['square','Carrés'],['dash','Tirets'],['decimal','Numéros'],['alpha','Lettres'],['roman','Chiffres romains'],['check','Coches'],['custom','Symbole personnalisé']];
const number=(v,f,min,max)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):f;
export function normalizeList(raw={}) {
 return {type:listTypes.some(([id])=>id===raw?.type)?raw.type:'none',start:Math.round(number(raw?.start,1,1,999)),symbol:String(raw?.symbol||'→').slice(0,8),indent:number(raw?.indent,48,0,240),gap:number(raw?.gap,12,0,80),spacing:number(raw?.spacing,10,0,120),color:/^#[\da-f]{6}$/i.test(raw?.color)?raw.color:null,colorRole:typeof raw?.colorRole==='string'&&/^[\w-]{1,100}$/.test(raw?.colorRole)?raw.colorRole:null};
}
function roman(n){let result='';for(const [value,symbol] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=value){result+=symbol;n-=value;}return result;}
function alpha(n){let result='';while(n>0){n--;result=String.fromCharCode(97+n%26)+result;n=Math.floor(n/26);}return result;}
export function listMarker(list,n){const index=list.start+n;return ({bullet:'•',circle:'○',square:'▪',dash:'–',check:'✓',custom:list.symbol})[list.type]??(list.type==='decimal'?index+'.':list.type==='alpha'?alpha(index)+'.':list.type==='roman'?roman(index).toLowerCase()+'.':'');}
// Shared by drawing, fitting and auto-sized frames: wrapped lines retain a hanging indent.
export function layoutText(ctx,value,width,size,leading,style,wrap){
 const list=normalizeList(style?.list),rows=[];let y=0;
 if(list.type==='none'){for(const line of wrap(ctx,value,width)){rows.push({text:line,x:0,y,marker:''});y+=size*leading;}return {rows,height:y};}
 const items=String(value).split('\n'),markers=items.map((item,n)=>item.trim()?listMarker(list,n):''),markerWidth=Math.max(0,...markers.map(m=>ctx.measureText(m).width));
 const indent=Math.min(Math.max(list.indent,markerWidth+list.gap),Math.max(0,width-8));
 items.forEach((item,n)=>{const lines=wrap(ctx,item,Math.max(8,width-indent));lines.forEach((line,i)=>{rows.push({text:line,x:indent,y,marker:i===0?markers[n]:'',markerX:Math.max(0,indent-list.gap-ctx.measureText(markers[n]).width)});y+=size*leading;});if(n<items.length-1)y+=list.spacing;});
 return {rows,height:y};
}
