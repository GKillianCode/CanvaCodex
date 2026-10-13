import {normalizeTextSpacing,applyLetterSpacing,textLeading} from './textSpacing.js';
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
 const result={...normalizeTextSpacing(raw),type:'table',custom:raw.custom!==false,template:raw.template===true,name:String(raw.name||'Tableau').slice(0,100),rows,columns,
 cellStyles:normalizeCellStyles(raw.cellStyles,rows,columns),
 cells:Array.from({length:rows},(_,r)=>Array.from({length:columns},(_,c)=>String(raw.cells?.[r]?.[c]??(r===0?'Colonne '+(c+1):'')).slice(0,2000))),
 header:headerPosition!=='none',headerPosition,headerCount:integer(raw.headerCount,1,['left','right'].includes(headerPosition)?columns:headerPosition==='top-left'?Math.min(rows,columns):rows,1),headerBold:raw.headerBold!==false,bodyBold:raw.bodyBold===true,headerFilled:raw.headerFilled!==false,bodyFilled:raw.bodyFilled!==false,
 striped:raw.striped!==false,stripeAxis:raw.stripeAxis==='columns'?'columns':'rows',stripeOpacity:number(raw.stripeOpacity,0,100,6),padding:number(raw.padding,0,80,18),fontSize:number(raw.fontSize,10,120,30),headerFontSize:number(raw.headerFontSize,10,120,number(raw.fontSize,10,120,30)),font:normalizeFont(raw.font,'text'),
 borderWidth:number(raw.borderWidth,0,12,1),borderMode:['all','horizontal','vertical','outer','none'].includes(raw.borderMode)?raw.borderMode:'all',lineStyle:['solid','dashed','dotted'].includes(raw.lineStyle)?raw.lineStyle:'solid',headerSeparatorWidth:number(raw.headerSeparatorWidth,0,12,0),cornerRadius:number(raw.cornerRadius,0,120,0),opacity:number(raw.opacity,0,100,100),align:['left','center','right'].includes(raw.align)?raw.align:'left',autoFitText:raw.autoFitText!==false,verticalAlign:['top','middle','bottom'].includes(raw.verticalAlign)?raw.verticalAlign:'middle',
 columnWeights:Array.from({length:columns},(_,i)=>number(raw.columnWeights?.[i],.0001,20,1)),rowWeights:Array.from({length:rows},(_,i)=>number(raw.rowWeights?.[i],.0001,20,1))};
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
 const sizes=tableTextSizes(ctx,e,p,wrapLines);
 for(let r=0;r<e.rows;r++)for(let c=0;c<e.columns;c++){
  const cw=tracks.columns[c].size,ch=tracks.rows[r].size,x=p.x+tracks.columns[c].at,y=p.y+tracks.rows[r].at,head=isHeaderCell(e,r,c),style=e.cellStyles?.[r+':'+c]||{},cell={...e,...style};
  if(head?e.headerFilled!==false:e.bodyFilled!==false){ctx.fillStyle=boundColor(e,head?'headerFill':'fill',theme);ctx.fillRect(x,y,cw,ch);}
  const stripe=e.stripeAxis==='columns'?c:r;if(e.striped&&!head&&stripe%2===0){ctx.save();ctx.globalAlpha*=(e.stripeOpacity??6)/100;ctx.fillStyle=boundColor(e,'stripeFill',theme)||theme.ink;ctx.fillRect(x,y,cw,ch);ctx.restore();}
  ctx.save();ctx.beginPath();ctx.rect(x,y,cw,ch);ctx.clip();if(style.fill||style.fillRole){ctx.fillStyle=boundColor(style,'fill',theme);ctx.fillRect(x,y,cw,ch);}ctx.fillStyle=style.textColor||style.textColorRole?boundColor(style,'textColor',theme):boundColor(e,head?'headerText':'textColor',theme);
  const layout=tableCellLayout(ctx,cell,cw,ch,head,wrapLines,e.cells[r][c],style.fontSize??sizes[head?'header':'body']),tx=cell.align==='center'?x+cw/2:cell.align==='right'?x+cw-layout.padX:x+layout.padX;ctx.textAlign=cell.align;
  ctx.textBaseline='alphabetic';layout.lines.forEach((line,n)=>ctx.fillText(line,tx,y+layout.top+layout.ascent+n*layout.lineHeight));ctx.restore();
 }
 const line=(x,y,ex,ey,width,color)=>{if(width<=0)return;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.setLineDash(e.lineStyle==='dashed'?[width*4,width*3]:e.lineStyle==='dotted'?[width,width*2]:[]);ctx.stroke();};
 const mode=e.borderMode||'all',border=boundColor(e,'border',theme),separator=boundColor(e,'headerBorder',theme)||border;
 for(let r=1;r<e.rows;r++)for(let c=0;c<e.columns;c++){const headerEdge=isHeaderCell(e,r-1,c)!==isHeaderCell(e,r,c),width=mode==='none'?0:headerEdge&&e.headerSeparatorWidth>0?e.headerSeparatorWidth:['all','horizontal'].includes(mode)?e.borderWidth:0;line(p.x+tracks.columns[c].at,p.y+tracks.rows[r].at,p.x+tracks.columns[c].at+tracks.columns[c].size,p.y+tracks.rows[r].at,width,headerEdge&&e.headerSeparatorWidth>0?separator:border);}
 for(let c=1;c<e.columns;c++)for(let r=0;r<e.rows;r++){const headerEdge=isHeaderCell(e,r,c-1)!==isHeaderCell(e,r,c),width=mode==='none'?0:headerEdge&&e.headerSeparatorWidth>0?e.headerSeparatorWidth:['all','vertical'].includes(mode)?e.borderWidth:0;line(p.x+tracks.columns[c].at,p.y+tracks.rows[r].at,p.x+tracks.columns[c].at,p.y+tracks.rows[r].at+tracks.rows[r].size,width,headerEdge&&e.headerSeparatorWidth>0?separator:border);}
 if(mode!=='none'&&e.borderWidth>0){const inset=e.borderWidth/2;ctx.beginPath();ctx.roundRect(p.x+inset,p.y+inset,Math.max(0,p.w-e.borderWidth),Math.max(0,height-e.borderWidth),Math.max(0,radius-inset));ctx.lineWidth=e.borderWidth;ctx.strokeStyle=border;ctx.setLineDash(e.lineStyle==='dashed'?[e.borderWidth*4,e.borderWidth*3]:e.lineStyle==='dotted'?[e.borderWidth,e.borderWidth*2]:[]);ctx.stroke();}
 ctx.restore();
}

export function setTableRowHeight(table,position,index,value){
 if(!Number.isFinite(value)||value<=0)return false;
 if(index===null){position.h=Math.min(10000,value*table.rows);table.rowWeights=Array(table.rows).fill(1);return true;}
 if(!Number.isInteger(index)||index<0||index>=table.rows)return false;
 const heights=tableTracks(table,position).rows.map(row=>row.size);heights[index]=value;
 const largest=Math.max(...heights);table.rowWeights=heights.map(h=>Math.max(.1,h/largest*20));position.h=Math.min(10000,heights.reduce((sum,h)=>sum+h,0));return true;
}
export function tableCellLayout(ctx,e,width,height,header,wrap,value,forcedSize){
 ctx.textBaseline='alphabetic';const requested=forcedSize??(header?(e.headerFontSize||e.fontSize):e.fontSize),inset=Math.max(e.borderWidth||0,e.headerSeparatorWidth||0)/2,padX=Math.min(Math.max(e.padding,inset),width/3),padY=Math.min(Math.max(e.padding,inset),height/4);
 const measure=size=>{ctx.font=`${(e.bold??(header?e.headerBold!==false:e.bodyBold))?700:400} ${size}px ${fontCss(e.font)}`;applyLetterSpacing(ctx,e,size);const metrics=ctx.measureText('Mg'),ascent=Number.isFinite(metrics.actualBoundingBoxAscent)?Math.max(0,metrics.actualBoundingBoxAscent):size*.8,descent=Number.isFinite(metrics.actualBoundingBoxDescent)?Math.max(0,metrics.actualBoundingBoxDescent):size*.2,lines=wrap(ctx,value||'',Math.max(1,width-padX*2)),lineHeight=size*textLeading(e,1.3),contentHeight=Math.max(.5,ascent+descent)+(lines.length-1)*lineHeight;return {size,lines,lineHeight,ascent,descent,contentHeight};};
 const fits=l=>l.contentHeight<=Math.max(.5,height-padY*2)&&l.lines.every(line=>ctx.measureText(line).width<=Math.max(1,width-padX*2));
 let layout=measure(requested);
 if(e.autoFitText!==false&&forcedSize===undefined&&!fits(layout)){let low=.5,high=requested;for(let i=0;i<24;i++){const mid=(low+high)/2;if(fits(measure(mid)))low=mid;else high=mid;}layout=measure(low);}
 const free=Math.max(0,height-padY*2-layout.contentHeight),top=padY+(e.verticalAlign==='top'?0:e.verticalAlign==='bottom'?free:free/2);return {...layout,padX,top};
}
// A single fitted size per role keeps identical cells typographically consistent.
export function tableTextSizes(ctx,e,p,wrap){const tracks=tableTracks(e,p),sizes={header:e.headerFontSize||e.fontSize,body:e.fontSize};if(e.autoFitText===false)return sizes;for(let r=0;r<e.rows;r++)for(let c=0;c<e.columns;c++){if(e.cellStyles?.[r+':'+c]?.fontSize!==undefined||!e.cells[r][c])continue;const head=isHeaderCell(e,r,c),role=head?'header':'body',cell={...e,...e.cellStyles?.[r+':'+c]};sizes[role]=Math.min(sizes[role],tableCellLayout(ctx,cell,tracks.columns[c].size,tracks.rows[r].size,head,wrap,e.cells[r][c]).size);}return sizes;}
export function normalizeCellStyles(raw,rows,columns){const result={};if(!raw||typeof raw!=='object')return result;for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){const style=raw[r+':'+c];if(!style||typeof style!=='object')continue;const next={};if(style.font!==undefined)next.font=normalizeFont(style.font,'text');if(style.fontSize!==undefined)next.fontSize=number(style.fontSize,10,120,30);if(typeof style.bold==='boolean')next.bold=style.bold;if(['left','center','right'].includes(style.align))next.align=style.align;if(['top','middle','bottom'].includes(style.verticalAlign))next.verticalAlign=style.verticalAlign;for(const field of ['fill','textColor']){if(/^#[\da-f]{6}$/i.test(style[field]))next[field]=style[field];if(Object.hasOwn(style,field+'Role'))next[field+'Role']=validColorRole(style[field+'Role']);}if(Object.keys(next).length)result[r+':'+c]=next;}return result;}
export function resizeTableDivider(table,position,axis,index,delta){const field=axis==='columns'?'columnWeights':'rowWeights',tracks=tableTracks(table,position)[axis];if(!tracks[index]||!tracks[index+1]||!Number.isFinite(delta))return null;const sizes=tracks.map(t=>t.size),pair=sizes[index]+sizes[index+1],minimum=Math.min(8,pair/4);sizes[index]=Math.max(minimum,Math.min(pair-minimum,sizes[index]+delta));sizes[index+1]=pair-sizes[index];const largest=Math.max(...sizes);return {[field]:sizes.map(size=>size/largest*20)};}

export function cellTextStyle(e,r,c){const head=isHeaderCell(e,r,c);return {...e,fontSize:head?(e.headerFontSize||e.fontSize):e.fontSize,bold:head?e.headerBold!==false:!!e.bodyBold,fill:head?e.headerFill:e.fill,fillRole:head?e.headerFillRole:e.fillRole,textColor:head?e.headerText:e.textColor,textColorRole:head?e.headerTextRole:e.textColorRole,...e.cellStyles?.[r+':'+c]};}
