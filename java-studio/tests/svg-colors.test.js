import test from 'node:test';
import assert from 'node:assert/strict';
import {svgColors,normalizeSvgColors,svgImageSource} from '../src/svgColors.js';
import {validSvgSource} from '../src/svg.js';
import {makeOverlay,normalizeOverlay} from '../src/overlays.js';
import {captureComponent,normalizeComponents} from '../src/componentsLibrary.js';
const src=markup=>'data:image/svg+xml;base64,'+Buffer.from(markup).toString('base64');
const xml=source=>Buffer.from(source.split(',')[1],'base64').toString();
test('SVG palette includes fills, strokes, inline styles, gradient stops and implicit black',()=>{
 const source=src('<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop stop-color="#123456"/><stop style="stop-color:rgb(1, 2, 3)"/></linearGradient></defs><rect fill="url(#g)" stroke="#abcdef"/><path style="fill:red;stroke:none"/><circle/></svg>');
 assert.deepEqual(svgColors(source),['#123456','rgb(1, 2, 3)','#abcdef','red','#000000']);
 assert.deepEqual(svgColors(src('<svg><g fill="red"><path d="M0 0"/></g></svg>')),['red']);
 assert.deepEqual(svgColors(src('<svg fill="none"><path stroke="currentColor"/></svg>')),['currentcolor']);
});
test('recolor changes paints only, preserves gradient references, text and opacity, and follows themes',()=>{
 const source=src('<svg xmlns="http://www.w3.org/2000/svg"><!-- fill="#123456" --><defs><linearGradient id="g"><stop stop-color="#123456"/></linearGradient></defs><path id="keep123456" fill="url(#g)" stroke="rgba(1, 2, 3, 0.4)" opacity="0.6" style="color:#fff;fill:#123456 !important"/><text>#123456</text></svg>');
 const image={src:source,svgColors:{'#123456':{color:'#00ff00',colorRole:'accent'},'rgba(1, 2, 3, 0.4)':{color:'#ff0000'},'#fff':{color:'#112233'}}};
 const output=xml(svgImageSource(image,{accent:'#2266aa'}));
 assert.match(output,/stop-color="#2266aa"/);assert.match(output,/fill:#2266aa !important/);assert.match(output,/stroke="rgb\(255 0 0 \/ 0.4\)"/);assert.match(output,/opacity="0.6"/);assert.match(output,/fill="url\(#g\)"/);assert.match(output,/<text>#123456<\/text>/);assert.match(output,/<!-- fill="#123456" -->/);assert.ok(validSvgSource(svgImageSource(image)));
 assert.equal(svgImageSource({...image,svgColors:{}}),source);assert.equal(image.src,source);
});
test('invalid replacement data and non SVG images cannot inject markup',()=>{
 const source=src('<svg><path fill="#123456"/></svg>');
 assert.deepEqual(normalizeSvgColors({'#123456':{color:'url(https://evil.invalid)'}},source),{});
 assert.deepEqual(normalizeSvgColors({'#invalid':{color:'#aabbcc'},'#123456':{color:'#ABCDEF',colorRole:'bad role'}},source),{'#123456':{color:'#abcdef',colorRole:null}});
 const image={src:'data:image/png;base64,AA==',svgColors:{red:{color:'#abcdef'}}};assert.equal(svgImageSource(image),image.src);
 assert.deepEqual(svgColors(src('<svg><script/></svg>')),[]);
});
test('SVG edits and global opacity survive overlay states, JSON and reusable components',()=>{
 const slide=makeOverlay('video-thumbnail');slide.elements.imageMiniature.src=src('<svg><path fill="#123456"/></svg>');slide.elements.imageMiniature.svgColors={'#123456':{color:'#abcdef',colorRole:'accent'}};slide.positions.imageMiniature.opacity=45;
 const restored=normalizeOverlay(JSON.parse(JSON.stringify({type:'video-thumbnail',slide}))).slide;
 assert.equal(restored.positions.imageMiniature.opacity,45);assert.deepEqual(restored.elements.imageMiniature.svgColors,slide.elements.imageMiniature.svgColors);
 const component=normalizeComponents([captureComponent(restored,['imageMiniature'],{x:0,y:0},'SVG')])[0];assert.deepEqual(component.items[0].element.svgColors,slide.elements.imageMiniature.svgColors);
});
