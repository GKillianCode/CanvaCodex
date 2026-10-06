import { validColorRole, boundColor } from './colors.js';
import { fontCss, normalizeFont } from './fonts.js';
const integer=(n,min,max,fallback)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Math.round(Number(n)))):fallback;
export function normalizeTable(raw={}) {
 const rows=integer(raw.rows,1,20,4),columns=integer(raw.columns,1,10,3);
 const result={type:'table',custom:raw.custom!==false,template:raw.template===true,name:String(raw.name||'Tableau').slice(0,100),rows,columns,
 cells:Array.from({length:rows},(_,r)=>Array.from({length:columns},(_,c)=>String(raw.cells?.[r]?.[c]??(r===0?'Colonne '+(c+1):'')).slice(0,2000))),
 header:raw.header!==false,striped:raw.striped!==false,padding:integer(raw.padding,0,80,18),fontSize:integer(raw.fontSize,10,120,30),font:normalizeFont(raw.font,'text'),borderWidth:integer(raw.borderWidth,0,12,1),align:['left','center','right'].includes(raw.align)?raw.align:'left'};
 for(const [field,role,color] of [['fill','panel','#121e2b'],['headerFill','accent','#35ff91'],['textColor','ink','#f5f9ff'],['headerText','bg','#080d14'],['border','muted','#51606d']]){result[field]=/^#[\da-f]{6}$/i.test(raw[field])?raw[field]:color;result[field+'Role']=Object.hasOwn(raw,field+'Role')?validColorRole(raw[field+'Role']):role;}
 return result;
}
export function resizeTable(table,rows,columns){const next=normalizeTable({...table,rows,columns});Object.assign(table,next);return table;}
export function drawTable(ctx,e,p,theme,wrapLines) {
 const cw=p.w/e.columns,ch=(p.h||400)/e.rows;ctx.save();ctx.font=`400 ${e.fontSize}px ${fontCss(e.font)}`;ctx.textBaseline='top';ctx.textAlign=e.align;
 for(let r=0;r<e.rows;r++)for(let c=0;c<e.columns;c++){
  const x=p.x+c*cw,y=p.y+r*ch,head=e.header&&r===0;
  ctx.fillStyle=boundColor(e,head?'headerFill':'fill',theme);ctx.fillRect(x,y,cw,ch);
  if(e.striped&&!head&&r%2===0){ctx.save();ctx.globalAlpha*=.06;ctx.fillStyle=theme.ink;ctx.fillRect(x,y,cw,ch);ctx.restore();}
  if(e.borderWidth){ctx.strokeStyle=boundColor(e,'border',theme);ctx.lineWidth=e.borderWidth;ctx.strokeRect(x,y,cw,ch);}
  const pad=Math.min(e.padding,cw/3,ch/3),width=Math.max(1,cw-pad*2),height=Math.max(1,ch-pad*2);
  ctx.save();ctx.beginPath();ctx.rect(x+pad,y+pad,width,height);ctx.clip();ctx.font=`${head?700:400} ${e.fontSize}px ${fontCss(e.font)}`;ctx.fillStyle=boundColor(e,head?'headerText':'textColor',theme);
  const lines=wrapLines(ctx,e.cells[r][c],width),lineHeight=e.fontSize*1.3,offset=Math.max(0,(height-Math.min(height,lines.length*lineHeight))/2),tx=e.align==='center'?x+cw/2:e.align==='right'?x+cw-pad:x+pad;
  lines.forEach((line,n)=>ctx.fillText(line,tx,y+pad+offset+n*lineHeight));ctx.restore();
 }ctx.restore();
}
