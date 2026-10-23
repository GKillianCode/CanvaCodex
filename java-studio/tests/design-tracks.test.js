import test from "node:test";
import assert from "node:assert/strict";
import {
  createDesign,
  normalizeDesign,
  designColumns,
  designRows,
  moveSegmentBoundary,
} from "../src/designModel.js";
test("one separator adjusts adjacent proportions, preserving total and other tracks", () => {
  assert.deepEqual(moveSegmentBoundary([1, 1], 0, 65), [65, 35]);
  const w = moveSegmentBoundary([25, 25, 50], 1, 70);
  assert.deepEqual(w, [25, 45, 30]);
  assert.deepEqual(moveSegmentBoundary([1, 1], 0, 200), [99, 1]);
});
test("layout row guides persist and respect the active page size", () => {
  const d = createDesign("layout");
  d.rows = 3;
  d.rowWeights = [1, 2, 1];
  d.rowGutter = 20;
  d.columns = 2;
  d.columnWeights = [2, 1];
  d.themeId = "paper";
  const saved = normalizeDesign(d),
    r = designRows(saved),
    c = designColumns(saved);
  assert.equal(saved.themeId, "paper");
  assert.equal(r.length, 3);
  assert.equal(r[0].y, saved.margin);
  assert.equal(r[1].h, 2 * r[0].h);
  assert.ok(Math.abs(r[2].y + r[2].h - (saved.height - saved.margin)) < 1e-8);
  assert.equal(c[0].w, 2 * c[1].w);
});

test("very narrow imported tracks never become negative", () => {
  const w = moveSegmentBoundary([0.01, 0.01, 100], 0, 99);
  assert.ok(w.every((v) => v > 0));
  assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 100) < 1e-8);
});
