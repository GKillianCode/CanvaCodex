import test from 'node:test';import assert from 'node:assert/strict';
import {effectScope} from 'vue';
import {createUndoNotifications,useUndoNotifications,undoNotifications} from '../src/undoNotifications.js';
function setup(){let next=0;const timers=new Map();const notices=createUndoNotifications({schedule:(fn,ms)=>{assert.equal(ms,15000);timers.set(++next,fn);return next;},cancel:id=>timers.delete(id)});return {notices,timers};}
test('deletions stack with independent expiry and independent undo actions',async()=>{
 const {notices,timers}=setup();const restored=[];
 const a=notices.push('Partie A',()=>restored.push('a')),b=notices.push('Partie B',()=>restored.push('b'));
 assert.equal(notices.entries.value.length,2);assert.equal(timers.size,2);
 await notices.undo(a);assert.deepEqual(restored,['a']);assert.equal(notices.entries.value[0].id,b);
 [...timers.values()][0]();assert.equal(notices.entries.value.length,0);assert.equal(timers.size,0);
});
test('undo cannot run twice concurrently, failed or unavailable restores remain actionable',async()=>{
 const {notices}=setup();let finish,calls=0;const id=notices.push('A',()=>{calls++;return new Promise(resolve=>finish=resolve);});
 const pending=notices.undo(id);assert.equal(await notices.undo(id),false);finish();await pending;assert.equal(calls,1);
 const denied=notices.push('B',()=>{throw Error('Stockage indisponible');});assert.equal(await notices.undo(denied),false);assert.equal(notices.entries.value[0].error,'Stockage indisponible');
 const disabled=notices.push('C',()=>assert.fail(),()=>false);assert.equal(await notices.undo(disabled),false);
 notices.clear();assert.equal(notices.entries.value.length,0);
});
test('leaving a view cancels its callbacks without removing another view notifications',()=>{
 const first=effectScope(),second=effectScope();let a,b;
 first.run(()=>{a=useUndoNotifications();a.push('A',()=>{});});second.run(()=>{b=useUndoNotifications();b.push('B',()=>{});});
 first.stop();assert.deepEqual(undoNotifications.entries.value.map(e=>e.message),['B']);second.stop();assert.equal(undoNotifications.entries.value.length,0);
});
