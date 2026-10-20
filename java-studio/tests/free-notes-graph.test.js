import test from 'node:test';
import assert from 'node:assert/strict';
import {noteGraph,layoutNoteGraph} from '../src/freeNotesGraph.js';
test('note graph includes isolated notes and deduplicates existing bidirectional links',()=>{
 const tree=[{id:'a',kind:'note',title:'A',links:['b','b','missing','a']},{id:'b',kind:'note',title:'B',parent:'a',links:['a']},{id:'c',kind:'note',title:'C',links:[]}];
 const graph=noteGraph(tree);assert.equal(graph.nodes.length,3);assert.equal(graph.edges.length,1);assert.equal(graph.nodes[2].degree,0);
 assert.equal(noteGraph(tree,true).edges.filter(e=>e.kind==='parent').length,1);
 assert.equal(noteGraph(tree).edges.filter(e=>e.kind==='parent').length,0);
 const positions=layoutNoteGraph(graph);assert(positions.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));assert.deepEqual(layoutNoteGraph(graph),positions);assert.deepEqual(layoutNoteGraph(noteGraph([])),[]);
 assert.equal(tree[0].x,undefined);
});
