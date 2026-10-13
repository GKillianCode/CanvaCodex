// Sample a continuous path; render one translucent ribbon per stroke, never point markers.
export class LaserTrail {
 constructor(lifetime=900){this.lifetime=lifetime;this.points=[];this.active=false;this.stroke=0;}
 begin(point,now,color,size){this.active=true;this.stroke++;this.color=color;this.size=size;this.append(point,now);}
 append(point,now){
  if(!this.active)return;
  const last=this.points.at(-1),distance=last?.stroke===this.stroke?Math.hypot(point.x-last.x,point.y-last.y):0;
  const count=Math.min(800,Math.max(1,Math.ceil(distance/3)));
  for(let i=1;i<=count;i++){const t=i/count;this.points.push({...point,x:distance?last.x+(point.x-last.x)*t:point.x,y:distance?last.y+(point.y-last.y)*t:point.y,now:distance?last.now+(now-last.now)*t:now,stroke:this.stroke,color:this.color,size:this.size});}
  if(this.points.length>2400)this.points.splice(0,this.points.length-2400);
 }
 end(){this.active=false;}clear(){this.end();this.points=[];}
 prune(now){this.points=this.points.filter(p=>now-p.now<this.lifetime);return this.points.length>0;}
 draw(ctx,now){
  this.prune(now);if(this.points.length<2)return;
  if(typeof document==='undefined'){this.drawRibbon(ctx,now);return;}
  // Supersample only the occupied region, then downsample with antialiasing.
  const margin=40,left=Math.max(0,Math.floor(Math.min(...this.points.map(p=>p.x))-margin)),top=Math.max(0,Math.floor(Math.min(...this.points.map(p=>p.y))-margin)),right=Math.min(1920,Math.ceil(Math.max(...this.points.map(p=>p.x))+margin)),bottom=Math.min(1080,Math.ceil(Math.max(...this.points.map(p=>p.y))+margin));
  const w=right-left,h=bottom-top;if(w<=0||h<=0)return;this.layer ||= document.createElement('canvas');
  if(this.layer.width!==w*2||this.layer.height!==h*2){this.layer.width=w*2;this.layer.height=h*2;}const g=this.layer.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,w*2,h*2);g.scale(2,2);g.translate(-left,-top);this.drawRibbon(g,now);ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(this.layer,left,top,w,h);ctx.restore();
 }
 drawRibbon(ctx,now){
  this.prune(now);if(this.points.length<2)return;ctx.save();ctx.lineCap='butt';ctx.lineJoin='round';
  let start=0;while(start<this.points.length){let end=start+1;while(end<this.points.length&&this.points[end].stroke===this.points[start].stroke)end++;
   const points=this.points.slice(start,end);if(points.length>1){
    const edges=points.map((p,i)=>{const a=points[Math.max(0,i-4)],b=points[Math.min(points.length-1,i+4)],angle=Math.atan2(b.y-a.y,b.x-a.x)+Math.PI/2,age=Math.max(0,1-(now-p.now)/this.lifetime),width=p.size*.34*Math.sqrt(age);return {left:{x:p.x+Math.cos(angle)*width,y:p.y+Math.sin(angle)*width},right:{x:p.x-Math.cos(angle)*width,y:p.y-Math.sin(angle)*width}};});
    const first=points[0],last=points.at(-1),axis=Math.hypot(last.x-first.x,last.y-first.y)>1?last:points.reduce((best,p)=>Math.hypot(p.x-first.x,p.y-first.y)>Math.hypot(best.x-first.x,best.y-first.y)?p:best,first),gradient=ctx.createLinearGradient(first.x,first.y,axis.x,axis.y),opacity=p=>Math.round(150*Math.max(0,1-(now-p.now)/this.lifetime)).toString(16).padStart(2,'0');gradient.addColorStop(0,first.color+opacity(first));gradient.addColorStop(1,last.color+opacity(last));ctx.fillStyle=gradient;ctx.shadowColor=last.color;ctx.shadowBlur=3;
    const outline=[...edges.map(e=>e.left),...edges.slice().reverse().map(e=>e.right)];ctx.beginPath();ctx.moveTo(outline[0].x,outline[0].y);for(let i=1;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];ctx.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);}ctx.closePath();ctx.fill();
   }start=end;
  }ctx.restore();
 }
}
