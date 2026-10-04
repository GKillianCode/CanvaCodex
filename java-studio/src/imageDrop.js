import { MAX_ELEMENTS } from './limits.js';
import { WIDTH, HEIGHT } from './model.js';
export async function insertDroppedImages(slide, files, point, load, isActive = () => true) {
  const keys=[]; let failed=0;
  for(const [n,file] of files.entries()) {
    if(Object.keys(slide.elements).length>=MAX_ELEMENTS)break;
    try {
      const src=await load(file);if(!isActive())break;
      const key='image'+crypto.randomUUID().replaceAll('-','').slice(0,8);
      slide.elements[key]={type:'image',custom:true,name:file.name,src,fit:'contain',roundedCorners:false,cornerRadius:10};
      slide.positions[key]={x:Math.max(0,Math.min(WIDTH-600,point.x-300+n*24)),y:Math.max(0,Math.min(HEIGHT-400,point.y-200+n*24)),w:600,h:400,size:38};
      slide.fragments[key]={order:0,animation:'fade'};keys.push(key);
    }catch{failed++;}
  }
  return {keys,failed};
}
