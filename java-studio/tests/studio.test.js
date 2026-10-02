import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSlide, normalizeSlides, neighbor, nextFreeGrid, fragmentOrders, memorySlides, transitionDirection } from '../src/model.js';
import { javaLines } from '../src/code.js';
import { formatJava } from '../src/formatter.js';

test('old projects retain their text and positions and gain a collision-free grid', () => {
  const old = makeSlide(); old.positions.title.x = 487;
  delete old.grid; delete old.fragments;
  const migrated = normalizeSlides([old, { ...old, id: 'second' }]);
  assert.equal(migrated[0].title, old.title);
  assert.equal(migrated[0].positions.title.x, 487);
  assert.deepEqual(migrated.map(s => s.grid), [{ x: 0, y: 0 }, { x: 1, y: 0 }]);
  assert.deepEqual(fragmentOrders(migrated[0]), []);
  assert.throws(() => normalizeSlides([{ ...old, title: 42 }]));
});

test('all four directions choose the nearest slide on the matching axis', () => {
  const slides = [[0, 0], [2, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]].map(([x, y]) => makeSlide('split', { x, y }));
  assert.equal(neighbor(slides, 0, 'right'), 2);
  assert.equal(neighbor(slides, 0, 'left'), 3);
  assert.equal(neighbor(slides, 0, 'down'), 4);
  assert.equal(neighbor(slides, 0, 'up'), 5);
  assert.deepEqual(nextFreeGrid(slides, slides[0].grid, 'right'), { x: 3, y: 0 });
  assert.equal(neighbor(slides, 5, 'left'), -1);
});

test('fragment ordering groups equal steps and ignores hidden layout blocks', () => {
  const s = makeSlide();
  s.fragments.title.order = 0; s.fragments.body.order = 5; s.fragments.code.order = 5;
  assert.deepEqual(fragmentOrders(s), [5]);
  s.fragments.code.order = 2;
  assert.deepEqual(fragmentOrders(s), [2, 5]);
  s.layout = 'title';
  assert.deepEqual(fragmentOrders(s), [5]);
});

test('memory sequence descends, uses decimal units, and explains binary units separately', () => {
  const s = memorySlides({ x: 4, y: -1 });
  assert.deepEqual(s.map(s => s.grid), [{ x: 4, y: -1 }, { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }]);
  assert.match(s[0].body, /1 Go = 1 000 Mo/);
  assert.match(s[2].body, /1 Ko = 1 000 octets/);
  assert.match(s[3].body, /1 octet = 8 bits/);
  assert.match(s[3].body, /GiB, MiB et KiB/);
  assert.deepEqual(transitionDirection(s[0], s[1]), { x: 0, y: 1 });
  assert.deepEqual(transitionDirection(s[1], s[0]), { x: 0, y: -1 });
});

test('Java tokenization distinguishes strings, keywords, numbers, and multiline comments', () => {
  const code = '/* class\ncomment */\npublic class Demo { String s = "class 42"; int n = 42; }';
  const lines = javaLines(code), tokens = lines.flat();
  assert.equal(lines.length, 3);
  assert.ok(lines[1].some(t => t.type === 'comment'));
  assert.ok(tokens.some(t => t.type === 'keyword' && t.text === 'public'));
  assert.ok(tokens.some(t => t.type === 'string' && t.text === '"class 42"'));
  assert.ok(tokens.some(t => t.type === 'number' && t.text === '42'));
});

test('Java formatter indents classes and snippets but preserves incomplete pasted input', async () => {
  const whole = await formatJava('public class Demo{public void run(){int n=42;System.out.println("{ text }");}}');
  assert.equal(whole.ok, true);
  assert.match(whole.code, /\n {4}public void run\(\) \{/);
  assert.match(whole.code, /\n {8}int n = 42;/);
  assert.match(whole.code, /"\{ text \}"/);
  const snippet = await formatJava('int n=42;System.out.println(n);');
  assert.equal(snippet.code, 'int n = 42;\nSystem.out.println(n);');
  const incomplete = 'public class Demo {\nint value =';
  assert.deepEqual(await formatJava(incomplete), { ok: false, code: incomplete });
});
