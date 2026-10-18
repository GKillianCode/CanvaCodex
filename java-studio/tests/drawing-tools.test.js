import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePathNodes,
  frameFreeform,
  worldNodes,
  localPoint,
  reframeFreeform,
  splitFreeform,
  freeformPath,
} from "../src/freeform.js";
import { selectRegion, canvasPoint } from "../src/regionSelection.js";
import { normalizeShape } from "../src/shapes.js";
import { normalizeSlides } from "../src/model.js";
import {
  captureComponent,
  normalizeComponents,
} from "../src/componentsLibrary.js";
const p = (x, y) => ({ x, y, inX: x, inY: y, outX: x, outY: y });
test("freeform shapes preserve curves, styling and image fills in documents and reusable components", () => {
  const { position, nodes } = frameFreeform(
    [{ ...p(20, 50), outX: 120, outY: -40 }, p(300, 70), p(200, 250)],
    true,
  );
  const e = normalizeShape({
    shape: "freeform",
    pathNodes: nodes,
    closed: true,
    outlined: true,
    stroke: "#112233",
    imageSrc: "data:image/png;base64,YQ==",
  });
  const scene = normalizeSlides([
    {
      id: "test",
      layout: "title",
      title: "",
      body: "",
      code: "",
      blockKeys: ["shapePen"],
      elements: { shapePen: e },
      positions: { shapePen: position },
    },
  ])[0];
  assert.equal(scene.elements.shapePen.shape, "freeform");
  assert.deepEqual(scene.elements.shapePen.pathNodes, nodes);
  assert.match(freeformPath(nodes, true), /C .* Z$/);
  const c = normalizeComponents([
    captureComponent(scene, ["shapePen"], position, "Courbe"),
  ])[0];
  assert.deepEqual(c.items[0].element.pathNodes, nodes);
  assert.equal(c.items[0].element.imageSrc, e.imageSrc);
  assert.equal(c.items[0].element.stroke, "#112233");
});
test("reframing a rotated path preserves every anchor and handle in world coordinates", () => {
  const nodes = [
      { ...p(-10, 20), outX: 30, outY: -60 },
      p(140, 90),
      p(10, 160),
    ],
    position = {
      x: 300,
      y: -40,
      w: 400,
      h: 250,
      rotation: 65,
      skewX: 20,
      skewY: -8,
    };
  const before = worldNodes(nodes, position),
    next = reframeFreeform(nodes, true, position),
    after = worldNodes(next.nodes, next.position);
  const local = localPoint(before[0], position);
  assert.ok(
    Math.abs(local.x - nodes[0].x) < 1e-7 &&
      Math.abs(local.y - nodes[0].y) < 1e-7,
  );
  for (let i = 0; i < before.length; i++)
    for (const k of Object.keys(before[i]))
      assert.ok(Math.abs(before[i][k] - after[i][k]) < 1e-7);
});
test("inserting a Bezier point splits the exact curve without changing its shape", () => {
  const nodes = [
      { ...p(0, 0), outX: 0, outY: 100 },
      { ...p(100, 0), inX: 100, inY: 100 },
    ],
    copy = JSON.stringify(nodes),
    split = splitFreeform(nodes, 0, false);
  assert.equal(split.length, 3);
  assert.equal(split[1].x, 50);
  assert.equal(split[1].y, 75);
  assert.equal(JSON.stringify(nodes), copy);
  const at = (a, b, t) => ({
    x:
      (1 - t) ** 3 * a.x +
      3 * (1 - t) ** 2 * t * a.outX +
      3 * (1 - t) * t * t * b.inX +
      t ** 3 * b.x,
    y:
      (1 - t) ** 3 * a.y +
      3 * (1 - t) ** 2 * t * a.outY +
      3 * (1 - t) * t * t * b.inY +
      t ** 3 * b.y,
  });
  for (const t of [0.1, 0.3, 0.7, 0.9]) {
    const a = at(nodes[0], nodes[1], t),
      b =
        t < 0.5
          ? at(split[0], split[1], t * 2)
          : at(split[1], split[2], t * 2 - 1);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-7);
  }
  assert.equal(
    normalizePathNodes(Array.from({ length: 150 }, () => p(10, 10))).length,
    128,
  );
});
test("selection shapes and set operations preserve whole component groups", () => {
  const bounds = {
      a: { x: 10, y: 10, w: 10, h: 10 },
      b: { x: 40, y: 40, w: 10, h: 10 },
      c: { x: 70, y: 70, w: 10, h: 10 },
    },
    groups = [{ keys: ["b", "c"] }],
    region = { type: "rect", points: [p(0, 0), p(60, 60)] };
  assert.deepEqual(selectRegion(bounds, groups, region), ["a"]);
  assert.deepEqual(selectRegion(bounds, groups, region, ["b", "c"], "add"), [
    "a",
    "b",
    "c",
  ]);
  assert.deepEqual(
    selectRegion(bounds, groups, region, ["a", "b", "c"], "subtract"),
    ["b", "c"],
  );
  assert.deepEqual(
    selectRegion(bounds, groups, region, ["a", "b", "c"], "intersect"),
    ["a"],
  );
  assert.deepEqual(
    selectRegion(bounds, [], {
      type: "ellipse",
      points: [p(0, 0), p(100, 100)],
    }),
    ["b", "c"],
  );
  assert.deepEqual(canvasPoint(p(-100, 2000)), { x: 0, y: 1080 });
});
test("concave lasso rejects objects whose edges cross a notch even with corners inside", () => {
  const polygon = [
    p(0, 0),
    p(100, 0),
    p(100, 100),
    p(60, 100),
    p(60, 30),
    p(40, 30),
    p(40, 100),
    p(0, 100),
  ];
  assert.deepEqual(
    selectRegion(
      {
        wide: { x: 10, y: 50, w: 80, h: 20 },
        small: { x: 10, y: 10, w: 10, h: 10 },
      },
      [],
      { type: "polygon", points: polygon },
    ),
    ["small"],
  );
});
