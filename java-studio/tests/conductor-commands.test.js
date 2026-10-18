import test from 'node:test';
import assert from 'node:assert/strict';
import {conductorCommands,findConductorCommands} from '../src/conductorCommands.js';
test('document slash commands expose unique actions and all expected content kinds',()=>{
 assert.equal(new Set(conductorCommands.map(row=>row[0])).size,conductorCommands.length);
 for(const id of ['p','h1','h2','h3','ul','ol','blockquote','code','hr','image','table'])assert.ok(conductorCommands.some(row=>row[0]===id));
});
test('slash filtering accepts titles, shorthand and accents without changing the catalog',()=>{
 assert.equal(findConductorCommands('H2')[0][0],'h2');
 assert.equal(findConductorCommands('separateur')[0][0],'hr');
 assert.equal(findConductorCommands('photo')[0][0],'image');
 assert.deepEqual(findConductorCommands('inexistant'),[]);
 assert.equal(findConductorCommands().length,conductorCommands.length);
});
