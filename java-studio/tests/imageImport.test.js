import test from 'node:test';
import assert from 'node:assert/strict';
import { imageSource, imageImportError } from '../src/imageImport.js';
import { validImageSource } from '../src/model.js';

function fixture(encode) {
  const calls = []; let closed = false;
  const bitmap = {width: 3000, height: 2000, close() {closed = true;}};
  const canvas = {getContext: () => ({drawImage() {}}), toDataURL(type, quality) {
    calls.push({type, quality, width: this.width, height: this.height});
    return encode(type, calls.length);
  }};
  return {calls, get closed() {return closed;}, runtime: {decode: async () => bitmap, canvas: () => canvas}};
}
test('1.6 MB JPEG remains JPEG instead of inflating to PNG', async () => {
  const f = fixture(type => `data:${type};base64,YQ==`);
  const src = await imageSource({type:'image/jpeg',size:1600000}, f.runtime);
  assert.equal(f.calls[0].type, 'image/jpeg');assert.equal(f.calls[0].width,1600);
  assert.ok(validImageSource(src)); assert.ok(f.closed);
});
test('transparent formats stay PNG and oversized encoded images shrink proportionally', async () => {
  for (const type of ['image/png','image/webp']) {
    const f = fixture((output, n) => `data:${output};base64,` + (n === 1 ? 'a'.repeat(3000000) : 'YQ=='));
    assert.ok(validImageSource(await imageSource({type,size:1600000}, f.runtime)));
    assert.equal(f.calls[1].type,'image/png'); assert.equal(f.calls[1].width,1280);
    assert.ok(Math.abs(f.calls[1].height / f.calls[1].width - 2/3)<0.001);assert.ok(f.closed);
  }
});
test('file size, format and decoding failures have distinct messages', async () => {
  await assert.rejects(imageSource({type:'image/jpeg',size:21*1024*1024}), /20 Mo/);
  await assert.rejects(imageSource({type:'text/plain',size:10}), /Format/);
  assert.match(imageImportError(new Error('decode')), /Impossible de lire/);
  const f=fixture(()=>{throw new Error('canvas');});
  await assert.rejects(imageSource({type:'image/png',size:10},f.runtime), /canvas/);assert.ok(f.closed);
});
