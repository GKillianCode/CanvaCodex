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

test('progressive graph shows roots then only direct children of the focused page',async()=>{
 const {noteGraphLevel}=await import('../src/freeNotesGraph.js');
 const tree=[{id:'a',kind:'note',parent:''},{id:'b',kind:'note',parent:'a'},{id:'c',kind:'note',parent:'b'},{id:'other',kind:'note',parent:''}];
 assert.deepEqual(noteGraphLevel(tree).map(n=>n.id),['a','other']);
 assert.deepEqual(noteGraphLevel(tree,'a').map(n=>n.id),['a','b']);
 assert.deepEqual(noteGraphLevel(tree,'b').map(n=>n.id),['b','c']);
 assert.deepEqual(noteGraphLevel(tree,'c').map(n=>n.id),['c']);
 assert.deepEqual(noteGraphLevel(tree,'deleted').map(n=>n.id),['a','other']);
});

test('organic exploration preserves a central focus and label clearance at scale',async()=>{
 const {layoutFocusedNotes}=await import('../src/freeNotesGraph.js');
 const graph=noteGraph(Array.from({length:300},(_,i)=>({id:'n'+i,title:'Note '+i,kind:'note',links:i?['n0']:[]})));
 const result=layoutFocusedNotes(graph,'n0');assert.equal(result.length,300);assert.equal(result[0].id,'n0');assert.equal(result[0].x,0);assert.equal(result[0].y,0);
 for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++)assert(Math.abs(result[i].x-result[j].x)>=235||Math.abs(result[i].y-result[j].y)>=94);
 assert.deepEqual(layoutFocusedNotes(graph,'n0'),result);
 assert.deepEqual(layoutFocusedNotes(noteGraph([])),[]);
});

test('preview reveals exactly the next generation without changing primary nodes',async()=>{
 const {previewNoteLevel}=await import('../src/freeNotesGraph.js');
 const tree=[{id:'a',title:'A',kind:'note',parent:''},{id:'b',title:'B',kind:'note',parent:'a'},{id:'c',title:'C',kind:'note',parent:'b'},{id:'d',title:'D',kind:'note',parent:'c'}];
 const primary=[{id:'a',x:0,y:0}];assert.deepEqual(previewNoteLevel(tree,primary).map(n=>n.id),['b']);
 const second=[{id:'a',x:0,y:0},{id:'b',x:300,y:0}];const preview=previewNoteLevel(tree,second);assert.deepEqual(preview.map(n=>n.id),['c']);assert(preview.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));assert.deepEqual(primary,[{id:'a',x:0,y:0}]);
});

test('next-level previews reuse remembered coordinates rather than recalculating them',async()=>{
 const {previewNoteLevel}=await import('../src/freeNotesGraph.js');
 const tree=[{id:'a',title:'A',kind:'note',parent:''},{id:'b',title:'B',kind:'note',parent:'a'},{id:'c',title:'C',kind:'note',parent:'a'}];
 const primary=[{id:'a',x:0,y:0}], first=previewNoteLevel(tree,primary);
 const saved=new Map(first.map(n=>[n.id,{x:n.x,y:n.y}]));
 assert.deepEqual(previewNoteLevel(tree,[{id:'a',x:300,y:400}],saved).map(n=>({id:n.id,x:n.x,y:n.y})),first.map(n=>({id:n.id,x:n.x,y:n.y})));
 assert(Math.hypot(first[0].x-first[1].x,first[0].y-first[1].y)<350);
});

test('camera centers the explored note without changing zoom or stored positions',async()=>{
 const {centerNoteCamera}=await import('../src/freeNotesGraph.js');
 const point={x:730,y:-210},camera={x:12,y:95,z:.8};
 const next=centerNoteCamera(camera,point,1440,900);
 assert.equal(point.x*next.z+next.x,720);assert.equal(point.y*next.z+next.y,450);assert.equal(next.z,.8);
 assert.deepEqual(point,{x:730,y:-210});assert.deepEqual(camera,{x:12,y:95,z:.8});
});

test('network starts inside the sole root but keeps an overview for several roots',async()=>{
 const {initialNoteGraphLevel,noteGraphLevel}=await import('../src/freeNotesGraph.js');
 const tree=[{id:'java',kind:'note',parent:''},{id:'child',kind:'note',parent:'java'},{id:'deep',kind:'note',parent:'child'}];
 assert.equal(initialNoteGraphLevel(tree),'java');
 assert.deepEqual(noteGraphLevel(tree,initialNoteGraphLevel(tree)).map(n=>n.id),['java','child']);
 assert.equal(initialNoteGraphLevel([...tree,{id:'other',kind:'note',parent:''}]),'');
 assert.equal(initialNoteGraphLevel([]),'');
});
