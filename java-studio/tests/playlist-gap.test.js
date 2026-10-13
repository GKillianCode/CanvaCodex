import test from 'node:test';
import assert from 'node:assert/strict';
import {makeThumbnail} from '../src/thumbnails.js';
import {normalizeSlide} from '../src/model.js';
import {shapePath} from '../src/shapes.js';
test('playlist label has no opaque patch and its border is actually open',()=>{const s=normalizeSlide(JSON.parse(JSON.stringify(makeThumbnail())),0);assert.equal(s.elements.shapePlaylistLabel.filled,false);assert.equal(s.elements.shapePlaylistLabel.outlined,false);const border=s.elements.shapePlaylistBorder;assert.equal(border.topGap.length,2);assert.ok(!shapePath(border).includes('Z'));assert.equal(s.elements.textPlaylistLabel.text,'Java');});
test('existing white label is upgraded without changing images or text',()=>{const s=makeThumbnail();s.elements.shapePlaylistLabel.name='Fond du repère de playlist';s.elements.shapePlaylistLabel.filled=true;delete s.elements.shapePlaylistBorder.topGap;s.elements.textPlaylistLabel.text='Mon Java';const saved=normalizeSlide(s,0);assert.equal(saved.elements.shapePlaylistLabel.filled,false);assert.equal(saved.elements.textPlaylistLabel.text,'Mon Java');assert.ok(saved.elements.shapePlaylistBorder.topGap[1]>saved.elements.shapePlaylistBorder.topGap[0]);});
