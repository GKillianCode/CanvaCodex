import test from 'node:test';
import assert from 'node:assert/strict';
import {imageFitRect} from '../src/shapeImages.js';
import {normalizeShape} from '../src/shapes.js';
test('cover offsets traverse cropped image without exposing the background',()=>{
 const p={x:10,y:20,w:100,h:100},image={width:300,height:100};
 for(const offset of [-100,0,100]){
  const r=imageFitRect(p,image,'cover',offset,100);
  assert.equal(r.x,offset===-100?-190:offset===0?-90:10);
  assert.equal(r.y,20);assert(r.x<=p.x&&r.x+r.w>=p.x+p.w);
 }
 const vertical=imageFitRect(p,{width:100,height:300},'cover',100,100);
 assert.equal(vertical.x,10);assert.equal(vertical.y,20);
});
test('contain offsets position the full image and normalized offsets survive serialization',()=>{
 assert.deepEqual(imageFitRect({x:0,y:0,w:100,h:100},{width:200,height:100},'contain',0,-100),{x:0,y:0,w:100,h:50});
 const shape=normalizeShape({shape:'circle',imageOffsetX:45,imageOffsetY:-70});
 const restored=normalizeShape(JSON.parse(JSON.stringify(shape)));
 assert.equal(restored.imageOffsetX,45);assert.equal(restored.imageOffsetY,-70);
 assert.equal(normalizeShape({imageOffsetX:Infinity,imageOffsetY:-900}).imageOffsetX,0);
 assert.equal(normalizeShape({imageOffsetY:-900}).imageOffsetY,-100);
 assert.equal(normalizeShape({}).imageOffsetX,0);
});
