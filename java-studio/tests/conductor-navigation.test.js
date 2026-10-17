import test from 'node:test';import assert from 'node:assert/strict';
import {codeExitDirection as exit} from '../src/conductorNavigation.js';
const cursor={collapsed:true,atStart:false,atEnd:false};
test('code arrows leave at boundaries and keep editing in the middle',()=>{
 for(const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'])assert.equal(exit(key,cursor),0);
 for(const key of ['ArrowUp','ArrowLeft'])assert.equal(exit(key,{...cursor,atStart:true}),-1);
 for(const key of ['ArrowDown','ArrowRight'])assert.equal(exit(key,{...cursor,atEnd:true}),1);
 assert.equal(exit('Enter',{...cursor,atEnd:true}),0);
});
test('selection and modifier navigation stay native; explicit shortcut exits either side',()=>{
 assert.equal(exit('ArrowUp',{...cursor,atStart:true,collapsed:false}),0);
 assert.equal(exit('ArrowRight',{...cursor,atEnd:true,shift:true}),0);
 assert.equal(exit('ArrowRight',{...cursor,atEnd:true,ctrl:true}),0);
 assert.equal(exit('Enter',{...cursor,ctrl:true}),1);
 assert.equal(exit('Enter',{...cursor,meta:true,shift:true}),-1);
});
