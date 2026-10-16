import test from 'node:test';import assert from 'node:assert/strict';
import {readAppearance,APPEARANCE_KEY,setAppearance,appearance} from '../src/appearance.js';
import {lightUIColor} from '../src/appearancePalette.js';
test('appearance storage defaults to dark, validates and tolerates unavailable storage',()=>{
 assert.equal(readAppearance({getItem:key=>key===APPEARANCE_KEY?'light':null}),'light');
 assert.equal(readAppearance({getItem:()=> 'unknown'}),'dark');
 assert.equal(readAppearance({getItem:()=> {throw Error('denied')}}),'dark');
 assert.equal(readAppearance(null),'dark');
 setAppearance('light',false);assert.equal(appearance.value,'light');setAppearance('invalid',false);assert.equal(appearance.value,'dark');
});
test('light UI palette distinguishes surfaces, ink and borders, retaining scrims and swatches',()=>{
 assert.notEqual(lightUIColor('#152025','surface'),'#152025');
 assert.equal(lightUIColor('#ffffff','ink'),'#25382e');
 assert.equal(lightUIColor('#0008','surface'),'#0008');
 assert.equal(lightUIColor('#a5f3cf','surface'),'#a5f3cf');
 assert.notEqual(lightUIColor('#2c3039','line'),lightUIColor('#2c3039','surface'));
});
