import test from "node:test";
import assert from "node:assert/strict";
import { makeSlide, normalizeSlides } from "../src/model.js";
import {
  captureComponent,
  normalizeComponents,
  insertComponent,
} from "../src/componentsLibrary.js";
import {
  applyLinkedComponents,
  componentStates,
  detachInstance,
} from "../src/componentInstances.js";
import {
  splinePoint,
  splineAngle,
  splitSpline,
  removeSplinePoint,
  moveSplinePoint,
  splinePathData,
} from "../src/splines.js";
import { normalizeAnimation } from "../src/animationModel.js";
import { serializeLibrary, parseLibrary } from "../src/frameTransfer.js";
import { recoveredTheme, themeSourcesFromRow } from "../src/themeRecovery.js";
import { normalizeThemes } from "../src/themes.js";
const path = () => ({
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ],
  closed: false,
});
test("splitting a cubic adds editable anchors without changing its shape", () => {
  const p = path(),
    before = structuredClone(p.points);
  assert.equal(splitSpline(p, 0, 0.5), 3);
  assert.equal(p.points.length, 7);
  for (const t of [0, 0.1, 0.5, 0.8, 1]) {
    const a = splinePoint(before, t),
      b = splinePoint(p.points, t);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-8);
  }
  moveSplinePoint(p, 3, 150, 200);
  assert.deepEqual(p.points[3], { x: 150, y: 200 });
  assert.equal(removeSplinePoint(p, 3), true);
  assert.equal(p.points.length, 4);
  assert.equal(removeSplinePoint(p, 0), false);
});
test("closed multi-segment paths join at the same position and tangent", () => {
  const p = path();
  splitSpline(p);
  p.closed = true;
  assert.deepEqual(
    splinePoint(p.points, 0, true),
    splinePoint(p.points, 1, true),
  );
  assert.ok(
    Math.abs(splineAngle(p.points, 0, true) - splineAngle(p.points, 1, true)) <
      1e-8,
  );
  assert.ok(splinePathData(p).endsWith("Z"));
  const normalized = normalizeAnimation({ paths: [p] }).paths[0];
  assert.equal(normalized.points.length, 7);
  assert.equal(normalized.closed, true);
  assert.deepEqual(
    normalizeAnimation(JSON.parse(JSON.stringify({ paths: [normalized] })))
      .paths[0],
    normalized,
  );
});
function sample() {
  const s = makeSlide("split");
  return normalizeComponents([
    captureComponent(s, ["title", "body"], { x: 100, y: 100 }, "Carte"),
  ])[0];
}
test("master updates reach multiple instances while keeping their placements and keys", () => {
  const c = sample(),
    s = makeSlide("title"),
    keys = insertComponent(s, c);
  keys.forEach((k) => (s.positions[k].x += 300));
  const oldX = s.positions[keys[0]].x,
    c2 = structuredClone(c);
  c2.items[0].element.text = "Nouveau titre";
  const before = JSON.stringify(c2);
  assert.equal(applyLinkedComponents(s, [c2]), true);
  assert.equal(s.elements[keys[0]].text, "Nouveau titre");
  assert.equal(s.positions[keys[0]].x, oldX);
  assert.deepEqual(Object.values(s.componentInstances[0].itemKeys), keys);
  assert.equal(applyLinkedComponents(s, [c2]), false);
  assert.equal(JSON.stringify(c2), before);
});
test("states, native items and instance links survive save/load and switching", () => {
  const c = sample(),
    alt = structuredClone(c.items);
  alt[0].element.text = "Autre état";
  c.states = [
    { id: "default", name: "Normal", items: c.items },
    { id: "alt", name: "Accent", items: alt },
  ];
  c.defaultState = "default";
  const parsed = parseLibrary(serializeLibrary([c]))[0];
  assert.equal(componentStates(parsed).length, 2);
  const s = makeSlide("title"),
    keys = insertComponent(s, parsed);
  s.componentInstances[0].stateId = "alt";
  applyLinkedComponents(s, [parsed], s.componentInstances[0].id);
  assert.equal(s.elements[keys[0]].text, "Autre état");
  const reloaded = normalizeSlides([s])[0];
  assert.equal(reloaded.componentInstances[0].stateId, "alt");
  assert.deepEqual(
    reloaded.componentInstances[0].itemKeys,
    s.componentInstances[0].itemKeys,
  );
});
test("detached and old independent copies are not changed by library updates", () => {
  const c = sample(),
    s = makeSlide("title"),
    keys = insertComponent(s, c);
  detachInstance(s, s.componentInstances[0].id);
  c.items[0].element.text = "Changed";
  applyLinkedComponents(s, [c]);
  assert.notEqual(s.elements[keys[0]].text, "Changed");
  assert.equal(
    normalizeSlides([makeSlide("title")])[0].componentInstances.length,
    0,
  );
});
test("adding and removing items updates linked keys without touching unrelated objects", () => {
  const c = sample(),
    s = makeSlide("title"),
    keys = insertComponent(s, c),
    title = s.title;
  const c2 = structuredClone(c);
  c2.items.splice(1, 1);
  const item = structuredClone(c.items[1]);
  item.id = "new";
  c2.items.push(item);
  applyLinkedComponents(s, [c2]);
  assert.equal(s.title, title);
  assert.ok(!s.positions[keys[1]]);
  assert.equal(Object.keys(s.componentInstances[0].itemKeys).length, 2);
  assert.equal(s.componentInstances[0].itemKeys[c.items[0].id], keys[0]);
});
test("theme recovery keeps actual theme colors plus document palette changes", () => {
  const base = {
      ...normalizeThemes()[0],
      id: "custom-orange",
      name: "Orange",
      accent: "#ed8a35",
    },
    raw = {
      project: "Les Primitives Orangeava",
      projectId: "orange",
      themeId: base.id,
      themes: [base],
      projectColors: { secondary: "#6789ab" },
    };
  const copy = JSON.stringify(raw),
    theme = recoveredTheme(raw);
  assert.equal(theme.accent, "#ed8a35");
  assert.equal(theme.secondary, "#6789ab");
  assert.ok(theme.name.includes("Orangeava"));
  assert.equal(JSON.stringify(raw), copy);
  assert.equal(
    themeSourcesFromRow({
      name: raw.project,
      storage: { "slides:frame-slides-project": JSON.stringify(raw) },
    }).length,
    0,
  );
  raw.slides = [];
  assert.equal(
    themeSourcesFromRow({
      name: raw.project,
      storage: { "slides:frame-slides-project": JSON.stringify(raw) },
    }).length,
    1,
  );
});

test("removed instances never reappear on a subsequent master change", () => {
  const c = sample(),
    scene = makeSlide("title"),
    keys = insertComponent(scene, c);
  for (const key of keys) {
    delete scene.elements[key];
    delete scene.positions[key];
    scene.blockKeys = scene.blockKeys.filter((k) => k !== key);
  }
  c.items[0].element.text = "Later master";
  applyLinkedComponents(scene, [c]);
  assert.equal(scene.componentInstances.length, 0);
  assert.ok(keys.every((k) => !scene.elements[k]));
});
test("splitting the closing segment keeps a closed path and joined endpoints editable", () => {
  const p = path();
  p.closed = true;
  splitSpline(p, 1, 0.5);
  assert.equal(p.closed, true);
  assert.equal(p.points.length, 10);
  assert.deepEqual(
    splinePoint(p.points, 0, true),
    splinePoint(p.points, 1, true),
  );
  moveSplinePoint(p, 0, 5, 8);
  assert.deepEqual(p.points.at(-1), p.points[0]);
});

test("missing orange theme can be reconstructed from named element colors", () => {
  const doc = {
    project: "Primitives Orangeava",
    themeId: "missing",
    slides: [{ elements: { shape123: { type: "shape", fill: "#ee8833" } } }],
  };
  assert.equal(recoveredTheme(doc).accent, "#ee8833");
});
test("substitution colors are explicitly marked when original orange colors are unavailable", () => {
  const t = recoveredTheme({ project: "Primitives Orangeava", slides: [] });
  assert.equal(t.accent, "#d88b4d");
  assert.ok(t.name.includes("à ajuster"));
  assert.ok(t.desc.includes("provisoire"));
});
