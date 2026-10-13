// Align the visible ink, excluding the empty leading after the final line.
export function verticalTextOffset(ctx,rows,size,height,align='middle'){
 if(!Number.isFinite(height)||height<=0||!rows.length)return 0;
 const bounds=rows.map(row=>{const m=row.metrics||ctx.measureText(row.text||'M');return {top:row.y-(Number.isFinite(m.actualBoundingBoxAscent)?m.actualBoundingBoxAscent:0),bottom:row.y+(Number.isFinite(m.actualBoundingBoxDescent)?m.actualBoundingBoxDescent:size)};});
 const top=Math.min(...bounds.map(b=>b.top)),bottom=Math.max(...bounds.map(b=>b.bottom)),free=Math.max(0,height-(bottom-top));
 return -top+(align==='top'?0:align==='bottom'?free:free/2);
}
