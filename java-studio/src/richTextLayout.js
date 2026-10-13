import {textSegments} from './richText.js';
import {styleFont} from './textStyles.js';
import {normalizeList,listMarker} from './textLists.js';
import {applyLetterSpacing,textLeading} from './textSpacing.js';
export function measureRich(ctx,value,runs,start,end,size,font,base){
 let width=0,top=0,bottom=0;
 for(const part of textSegments(value,runs,start,end)){
  ctx.font=styleFont(size,font,{...base,...part.style});applyLetterSpacing(ctx,base,size);
  const m=ctx.measureText(part.text);width+=m.width;top=Math.min(top,Number.isFinite(m.actualBoundingBoxAscent)?-m.actualBoundingBoxAscent:0);bottom=Math.max(bottom,Number.isFinite(m.actualBoundingBoxDescent)?m.actualBoundingBoxDescent:size);
 }
 ctx.font=styleFont(size,font,base);return {width,actualBoundingBoxAscent:-top,actualBoundingBoxDescent:bottom};
}
export function layoutRichText(ctx,value,width,size,leading,style,font,runs){
 const segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'});
 const list=normalizeList(style.list),rows=[],paragraphs=String(value).split('\n');leading=textLeading(style,leading);let source=0,y=0;
 ctx.font=styleFont(size,font,style);applyLetterSpacing(ctx,style,size);
 const markers=paragraphs.map((p,i)=>list.type!=='none'&&p.trim()?listMarker(list,i):''),markerWidth=Math.max(0,...markers.map(m=>ctx.measureText(m).width));
 const indent=list.type==='none'?0:Math.min(Math.max(list.indent,markerWidth+list.gap),Math.max(0,width-8)),available=Math.max(8,width-indent);
 const measure=(a,b)=>measureRich(ctx,value,runs,a,b,size,font,style).width;
 for(let n=0;n<paragraphs.length;n++){
  const paragraph=paragraphs[n],end=source+paragraph.length;let lineStart=source,lineEnd=source,first=true;
  const add=(last)=>{
   let trimEnd=lineEnd;while(trimEnd>lineStart&&/\s/.test(value[trimEnd-1]))trimEnd--;
   const measured=measure(lineStart,trimEnd),free=Math.max(0,available-measured),words=[...value.slice(lineStart,trimEnd).matchAll(/\S+/gu)].map(m=>({text:m[0],start:lineStart+m.index,end:lineStart+m.index+m[0].length})),justify=style.align==='justify'&&!last&&words.length>1;
   rows.push({text:value.slice(lineStart,trimEnd),start:lineStart,end:trimEnd,x:indent+(style.align==='center'?free/2:style.align==='right'?free:0),y,marker:first?markers[n]:'',markerX:Math.max(0,indent-list.gap-ctx.measureText(markers[n]).width),metrics:lineStart===trimEnd?ctx.measureText('M'):measureRich(ctx,value,runs,lineStart,trimEnd,size,font,style),richWords:justify?words:null,wordGap:justify?Math.max(0,(available-words.reduce((sum,w)=>sum+measure(w.start,w.end),0))/(words.length-1)):0});y+=size*leading;first=false;
  };
  for(const token of paragraph.matchAll(/\S+\s*|\s+/gu)){
   const tokenStart=source+token.index,tokenEnd=tokenStart+token[0].length;
   if(lineEnd>lineStart&&measure(lineStart,tokenEnd)>available){add(false);lineStart=tokenStart;lineEnd=tokenStart;}
   // Segment by grapheme so emoji and combining characters are never cut in half.
   for(const item of segmenter.segment(token[0])){
    const charStart=tokenStart+item.index,charEnd=charStart+item.segment.length;
    if(lineEnd>lineStart&&measure(lineStart,charEnd)>available){add(false);lineStart=charStart;}
    lineEnd=charEnd;
   }
  }
  add(true);source=end+1;if(list.type!=='none'&&n<paragraphs.length-1)y+=list.spacing;
 }
 return {rows,height:y};
}
