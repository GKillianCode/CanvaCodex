import test from 'node:test';import assert from 'node:assert/strict';import {documentDropSlot} from '../src/conductorDrop.js';
const blocks=[{top:100,bottom:140},{top:180,bottom:580},{top:620,bottom:660}];
test('drop preview uses gaps around complete blocks, including a tall code block',()=>{
 for(const y of [100,145,210,300,380,500,600,650])assert.ok([90,160,600,670].includes(documentDropSlot(blocks,y).top));
 assert.deepEqual(documentDropSlot(blocks,170),{index:1,top:160});assert.deepEqual(documentDropSlot(blocks,590),{index:2,top:600});
});
test('outside drops clamp to the document ends and empty documents have no target',()=>{assert.deepEqual(documentDropSlot(blocks,-100),{index:0,top:90});assert.deepEqual(documentDropSlot(blocks,2000),{index:3,top:670});assert.equal(documentDropSlot([],100),null);});
