import test from 'node:test';
import assert from 'node:assert/strict';
import {verticalTextOffset} from '../src/textVerticalAlignment.js';
import {normalizeTextStyle} from '../src/textStyles.js';
import {makeThumbnail} from '../src/thumbnails.js';
import {normalizeSlide} from '../src/model.js';
const ctx={measureText:()=>({actualBoundingBoxAscent:-5,actualBoundingBoxDescent:25})};
test('centers actual visible ink with independent top and bottom alignment',()=>{const rows=[{text:'Java',y:0},{text:'Cours',y:40}];assert.equal(verticalTextOffset(ctx,rows,30,200,'top'),-5);assert.equal(verticalTextOffset(ctx,rows,30,200,'middle'),65);assert.equal(verticalTextOffset(ctx,rows,30,200,'bottom'),135);assert.equal(verticalTextOffset(ctx,rows,30,null,'middle'),0);assert.equal(verticalTextOffset(ctx,rows,30,10,'bottom'),-5);});
test('default center and explicit alignments survive normalization and copying',()=>{assert.equal(normalizeTextStyle().verticalAlign,'middle');for(const verticalAlign of ['top','middle','bottom']){const s=makeThumbnail();s.positions.textPlaylistLabel.textStyle.verticalAlign=verticalAlign;assert.equal(normalizeSlide(JSON.parse(JSON.stringify(s)),0).positions.textPlaylistLabel.textStyle.verticalAlign,verticalAlign);}assert.equal(normalizeTextStyle({verticalAlign:'invalid'}).verticalAlign,'middle');});
