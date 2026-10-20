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

test('large networks reserve disjoint label cells and separate disconnected groups', async()=>{
 const {graphNoteLabel}=await import('../src/freeNotesGraph.js');
 for(const count of [1,30,300,1000]) {
  const tree=Array.from({length:count},(_,i)=>({id:'n'+i,title:i%2?'Titre très long '.repeat(6):'Court',kind:'note',links:i%7&&i?['n'+(i-1)]:[]}));
  const result=layoutNoteGraph(noteGraph(tree));
  assert.equal(result.length,count);
  for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++)assert(Math.abs(result[i].x-result[j].x)>=220 || Math.abs(result[i].y-result[j].y)>=90);
 }
 const label=graphNoteLabel('Long '.repeat(30));assert(label.text.length<=28);assert.equal(label.size,10);
});
