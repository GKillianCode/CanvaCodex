import { validColorRole, boundColor } from './colors.js';
import { fontCss, normalizeFont } from './fonts.js';
const number=(n,min,max,fallback)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):fallback;
const integer=(n,min,max,fallback)=>Math.round(number(n,min,max,fallback));
export const headerPositions=[['top','En haut'],['bottom','En bas'],['left','À gauche'],['right','À droite'],['top-left','En haut et à gauche'],['none','Sans en-tête']];
export const tableStyles=[
 {id:'classic',name:'Classique',values:{cornerRadius:0,borderMode:'all',lineStyle:'solid',borderWidth:1,striped:true,stripeAxis:'rows',stripeOpacity:6,headerFillRole:'accent',headerTextRole:'bg',headerSeparatorWidth:0}},
 {id:'rounded',name:'Arrondi',values:{cornerRadius:24,borderMode:'horizontal',lineStyle:'solid',borderWidth:1,striped:true,stripeAxis:'rows',stripeOpacity:8,headerFillRole:'accent',headerTextRole:'bg',headerSeparatorWidth:2}},
 {id:'minimal',name:'Minimal',values:{cornerRadius:0,borderMode:'horizontal',lineStyle:'solid',borderWidth:1,striped:false,headerFillRole:'panel',headerTextRole:'accent',headerSeparatorWidth:3}},
 {id:'contrast',name:'Contraste',values:{cornerRadius:18,borderMode:'all',lineStyle:'solid',borderWidth:2,striped:true,stripeAxis:'rows',stripeOpacity:15,headerFillRole:'deep',headerTextRole:'ink',headerSeparatorWidth:2}},
];
export function applyTableStyle(table,id){const style=tableStyles.find(s=>s.id===id);if(style)Object.assign(table,style.values,{bodyFilled:true,headerFilled:true});}
export function normalizeTable(raw={}) {
 const rows=integer(raw.rows,1,20,4),columns=integer(raw.columns,1,10,3);
 const headerPosition=headerPositions.some(([id])=>id===raw.headerPosition)?raw.headerPosition:raw.header===false?'none':'top';
 const result={type:'table',custom:raw.custom!==false,template:raw.template===true,name:String(raw.name||'Tableau').slice(0,100),rows,columns,
 cells:Array.from({length:rows},(_,r)=>Array.from({length:columns},(_,c)=>String(raw.cells?.[r]?.[c]??(r===0?'Colonne '+(c+1):'')).slice(0,2000))),
 header:headerPosition!=='none',headerPosition,headerCount:integer(raw.headerCount,1,['left','right'].includes(headerPosition)?columns:headerPosition==='top-left'?Math.min(rows,columns):rows,1),headerBold:raw.headerBold!==false,bodyBold:raw.bodyBold===true,headerFilled:raw.headerFilled!==false,bodyFilled:raw.bodyFilled!==false,
 striped:raw.striped!==false,stripeAxis:raw.stripeAxis==='columns'?'columns':'rows',stripeOpacity:number(raw.stripeOpacity,0,100,6),padding:number(raw.padding,0,80,18),fontSize:number(raw.fontSize,10,120,30),headerFontSize:number(raw.headerFontSize,10,120,number(raw.fontSize,10,120,30)),font:normalizeFont(raw.font,'text'),
 borderWidth:number(raw.borderWidth,0,12,1),borderMode:['all','horizontal','vertical','outer','none'].includes(raw.borderMode)?raw.borderMode:'all',lineStyle:['solid','dashed','dotted'].includes(raw.lineStyle)?raw.lineStyle:'solid',headerSeparatorWidth:number(raw.headerSeparatorWidth,0,12,0),cornerRadius:number(raw.cornerRadius,0,120,0),opacity:number(raw.opacity,0,100,100),align:['left','center','right'].includes(raw.align)?raw.align:'left',verticalAlign:['top','middle','bottom'].includes(raw.verticalAlign)?raw.verticalAlign:'middle',
 columnWeights:Array.from({length:columns},(_,i)=>number(raw.columnWeights?.[i],.1,20,1)),rowWeights:Array.from({length:rows},(_,i)=>number(raw.rowWeights?.[i],.1,20,1))};
 for(const [field,role,color] of [['fill','panel','#121e2b'],['headerFill','accent','#35ff91'],['textColor','ink','#f5f9ff'],['headerText','bg','#080d14'],['border','muted','#51606d'],['stripeFill','ink','#f5f9ff'],['headerBorder','muted','#51606d']]){result[field]=/^#[\da-f]{6}$/i.test(raw[field])?raw[field]:color;result[field+'Role']=Object.hasOwn(raw,field+'Role')?validColorRole(raw[field+'Role']):role;}
 return result;
}
export function resizeTable(table,rows,columns){const next=normalizeTable({...table,rows,columns});Object.assign(table,next);return table;}
export function isHeaderCell(e,r,c){const position=e.headerPosition??(e.header===false?'none':'top'),count=e.headerCount||1;return position==='top'?r<count:position==='bottom'?r>=e.rows-count:position==='left'?c<count:position==='right'?c>=e.columns-count:position==='top-left'?(r<count||c<count):false;}
export function tableTracks(e,p){
 const tracks=(weights,total)=>{const sum=weights.reduce((a,b)=>a+b,0);let at=0;return weights.map(weight=>{const size=total*weight/sum,result={at,size};at+=size;return result;});};
 return {columns:tracks(e.columnWeights||Array(e.columns).fill(1),p.w),rows:tracks(e.rowWeights||Array(e.rows).fill(1),p.h||400)};
}
export function drawTable(ctx,e,p,theme,wrapLines) {
 const tracks=tableTracks(e,p),height=p.h||400,radius=Math.min(e.cornerRadius||0,p.w/2,height/2);
 ctx.save();ctx.globalAlpha*=e.opacity===undefined?1:e.opacity/100;ctx.beginPath();ctx.roundRect(p.x,p.y,p.w,height,radius);ctx.clip();ctx.textBaseline='top';ctx.textAlign=e.align;
 for(let r=0;r<e.rows;r++)for(let c=0;c<e.columns;c++){
  const cw=tracks.columns[c].size,ch=tracks.rows[r].size,x=p.x+tracks.columns[c].at,y=p.y+tracks.rows[r].at,head=isHeaderCell(e,r,c);
  if(head?e.headerFilled!==false:e.bodyFilled!==false){ctx.fillStyle=boundColor(e,head?'headerFill':'fill',theme);ctx.fillRect(x,y,cw,ch);}
  const stripe=e.stripeAxis==='columns'?c:r;if(e.striped&&!head&&stripe%2===0){ctx.save();ctx.globalAlpha*=(e.stripeOpacity??6)/100;ctx.fillStyle=boundColor(e,'stripeFill',theme)||theme.ink;ctx.fillRect(x,y,cw,ch);ctx.restore();}
  const pad=Math.min(e.padding,cw/3,ch/3),width=Math.max(1,cw-pad*2),available=Math.max(1,ch-pad*2),size=head?(e.headerFontSize||e.fontSize):e.fontSize;
  ctx.save();ctx.beginPath();ctx.rect(x+pad,y+pad,width,available);ctx.clip();ctx.font=`${(head?e.headerBold!==false:e.bodyBold)?700:400} ${size}px ${fontCss(e.font)}`;ctx.fillStyle=boundColor(e,head?'headerText':'textColor',theme);
  const lines=wrapLines(ctx,e.cells[r][c],width),lineHeight=size*1.3,free=Math.max(0,available-Math.min(available,lines.length*lineHeight)),offset=e.verticalAlign==='top'?0:e.verticalAlign==='bottom'?free:free/2,tx=e.align==='center'?x+cw/2:e.align==='right'?x+cw-pad:x+pad;
  lines.forEach((line,n)=>ctx.fillText(line,tx,y+pad+offset+n*lineHeight));ctx.restore();
 }
 const line=(x,y,ex,ey,width,color)=>{if(width<=0)return;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.setLineDash(e.lineStyle==='dashed'?[width*4,width*3]:e.lineStyle==='dotted'?[width,width*2]:[]);ctx.stroke();};
 const mode=e.borderMode||'all',border=boundColor(e,'border',theme),separator=boundColor(e,'headerBorder',theme)||border;
 for(let r=1;r<e.rows;r++)for(let c=0;c<e.columns;c++){const headerEdge=isHeaderCell(e,r-1,c)!==isHeaderCell(e,r,c),width=mode==='none'?0:headerEdge&&e.headerSeparatorWidth>0?e.headerSeparatorWidth:['all','horizontal'].includes(mode)?e.borderWidth:0;line(p.x+tracks.columns[c].at,p.y+tracks.rows[r].at,p.x+tracks.columns[c].at+tracks.columns[c].size,p.y+tracks.rows[r].at,width,headerEdge&&e.headerSeparatorWidth>0?separator:border);}
 for(let c=1;c<e.columns;c++)for(let r=0;r<e.rows;r++){const headerEdge=isHeaderCell(e,r,c-1)!==isHeaderCell(e,r,c),width=mode==='none'?0:headerEdge&&e.headerSeparatorWidth>0?e.headerSeparatorWidth:['all','vertical'].includes(mode)?e.borderWidth:0;line(p.x+tracks.columns[c].at,p.y+tracks.rows[r].at,p.x+tracks.columns[c].at,p.y+tracks.rows[r].at+tracks.rows[r].size,width,headerEdge&&e.headerSeparatorWidth>0?separator:border);}
 if(mode!=='none'&&e.borderWidth>0){const inset=e.borderWidth/2;ctx.beginPath();ctx.roundRect(p.x+inset,p.y+inset,Math.max(0,p.w-e.borderWidth),Math.max(0,height-e.borderWidth),Math.max(0,radius-inset));ctx.lineWidth=e.borderWidth;ctx.strokeStyle=border;ctx.setLineDash(e.lineStyle==='dashed'?[e.borderWidth*4,e.borderWidth*3]:e.lineStyle==='dotted'?[e.borderWidth,e.borderWidth*2]:[]);ctx.stroke();}
 ctx.restore();
}
