import test from "node:test";
import assert from "node:assert/strict";
import { animationScene, normalizeAnimation } from "../src/animationModel.js";
import {
  normalizeAttachments,
  attachmentCycle,
  eventSchedule,
  projectCameraPose,
} from "../src/animationWorkflow.js";
import {
  captureMotion,
  applyMotion,
  builtinMotions,
} from "../src/animationPresets.js";
import { moveKeySelection, copyKeySelection } from "../src/animationEditing.js";
import {
  resizeRotated,
  rotatePoint,
  rotationFromPointer,
  rotateObjects,
} from "../src/editor.js";
import { normalizeAssetFile } from "../scripts/asset-library-plugin.mjs";
const scene = () => ({
  blockKeys: ["parent", "child"],
  elements: {
    parent: { type: "shape", shape: "rounded", fill: "#ffffff" },
    child: { type: "text", text: "Bonjour" },
  },
  positions: {
    parent: { x: 100, y: 200, w: 200, h: 100 },
    child: { x: 600, y: 500, w: 100, h: 40, size: 30 },
  },
  fragments: {},
});
test("anchors follow animated parent and chained attachments without mutating source", () => {
  const s = scene(),
    before = structuredClone(s),
    cfg = normalizeAnimation({
      attachments: [
        {
          child: "child",
          parent: "parent",
          parentX: 1,
          parentY: 1,
          childX: 0,
          childY: 0,
          offsetX: 10,
        },
      ],
      clips: [
        {
          keys: ["parent"],
          duration: 2,
          frames: [
            { field: "x", time: 0, value: 100, ease: "linear" },
            { field: "x", time: 2, value: 500 },
          ],
        },
      ],
    });
  const p = animationScene(s, cfg, 2).scene.positions.child;
  assert.equal(p.x, 710);
  assert.equal(p.y, 300);
  assert.deepEqual(s, before);
  const links = normalizeAttachments([
    { child: "a", parent: "b" },
    { child: "b", parent: "a" },
  ]);
  assert.ok(attachmentCycle(links, "a", "b"));
  const cyclic = animationScene(
    s,
    {
      attachments: [
        { child: "child", parent: "parent" },
        { child: "parent", parent: "child" },
      ],
    },
    1,
  );
  assert.ok(cyclic.warnings.length);
});
test("events sequence clips and reveal a live reference at arrival", () => {
  const s = scene(),
    cfg = normalizeAnimation({
      links: [{ id: "reference", from: "parent", to: "child" }],
      clips: [
        { id: "move", keys: ["parent"], duration: 2 },
        {
          id: "next",
          keys: ["child"],
          start: 0,
          duration: 2,
          frames: [
            { field: "x", time: 0, value: 600, ease: "linear" },
            { field: "x", time: 2, value: 800 },
          ],
        },
      ],
      events: [
        {
          id: "reveal",
          trigger: "clipEnd",
          source: "move",
          action: "show",
          target: "reference",
        },
        {
          id: "chain",
          trigger: "clipEnd",
          source: "move",
          action: "startClip",
          target: "next",
        },
      ],
    });
  assert.equal(animationScene(s, cfg, 1).config.links[0].visible, false);
  const at = animationScene(s, cfg, 3);
  assert.equal(at.config.links[0].visible, true);
  assert.equal(at.scene.positions.child.x, 700);
  assert.equal(cfg.clips[1].start, 0);
});
test("cyclic event dependencies disable their clips and report a warning", () => {
  const cfg = normalizeAnimation({
    clips: [
      { id: "a", duration: 1 },
      { id: "b", duration: 1 },
    ],
    events: [
      {
        id: "a-after-b",
        trigger: "clipEnd",
        source: "b",
        action: "startClip",
        target: "a",
      },
      {
        id: "b-after-a",
        trigger: "clipEnd",
        source: "a",
        action: "startClip",
        target: "b",
      },
    ],
  });
  const schedule = eventSchedule(cfg);
  assert.ok(schedule.warnings.length);
  assert.ok(cfg.clips.every((c) => !c.enabled));
});
test("camera keys interpolate and project the viewed center exactly", () => {
  const s = scene(),
    cfg = {
      camera: { x: 960, y: 540, zoom: 100 },
      clips: [
        {
          keys: [],
          duration: 2,
          frames: [
            { field: "cameraZoom", time: 0, value: 100, ease: "linear" },
            { field: "cameraZoom", time: 2, value: 200 },
            { field: "cameraX", time: 0, value: 960, ease: "linear" },
            { field: "cameraX", time: 2, value: 1200 },
          ],
        },
      ],
    };
  const c = animationScene(s, cfg, 1).config.camera;
  assert.equal(c.zoom, 150);
  assert.equal(c.x, 1080);
  const p = projectCameraPose({ x: c.x - 50, y: c.y - 25, w: 100, h: 50 }, c);
  assert.equal(p.x + p.w / 2, 960);
  assert.equal(p.y + p.h / 2, 540);
});
test("motion presets adapt placement, dimensions and duration and are disk-serializable", () => {
  const clip = normalizeAnimation({
    clips: [
      {
        keys: ["a"],
        duration: 2,
        frames: [
          { field: "x", time: 0, value: 100 },
          { field: "x", time: 2, value: 300 },
          { field: "w", time: 2, value: 200 },
        ],
      },
    ],
  }).clips[0];
  const preset = captureMotion(
    clip,
    { x: 100, y: 100, w: 100, h: 100 },
    null,
    "Mon mouvement",
  );
  const restored = normalizeAssetFile("motions", {
    format: "frame-motion-library",
    version: 1,
    motions: [preset],
  }).motions[0];
  const result = applyMotion(
    restored,
    { x: 500, y: 200, w: 200, h: 200 },
    "new",
    3,
    4,
  );
  assert.equal(
    result.clip.frames.find((f) => f.field === "x" && f.time === 4).value,
    900,
  );
  assert.equal(result.clip.frames.find((f) => f.field === "w").value, 400);
  assert.equal(result.clip.start, 3);
  assert.ok(builtinMotions.length >= 3);
  assert.throws(() => applyMotion(preset, { w: 100, h: 100 }, "a", 119, 4));
});
test("multiple keys move together, preserve curves, and reject collisions atomically", () => {
  const c = {
      start: 1,
      duration: 5,
      frames: [
        { field: "x", time: 0, value: 0, curve: [0, 0, 1, 1] },
        { field: "y", time: 1, value: 20 },
        { field: "x", time: 3, value: 30 },
      ],
    },
    entries = c.frames.slice(0, 2).map((key) => ({ clip: c, key }));
  assert.ok(moveKeySelection(entries, 1));
  assert.equal(entries[0].key.time, 1);
  assert.equal(entries[1].key.time, 2);
  assert.equal(copyKeySelection(entries)[1].time, 1);
  assert.equal(moveKeySelection(entries, 2), false);
  assert.equal(entries[0].key.time, 1);
});
test("Shift resize keeps aspect and the opposite anchor for all eight handles including rotated objects", () => {
  const b = { x: 200, y: 300, w: 100, h: 50, size: 30, rotation: 30 };
  for (const handle of ["n", "s", "e", "w", "nw", "ne", "sw", "se"]) {
    const r = resizeRotated(b, handle, 40, 25, "image", true);
    assert.ok(Math.abs(r.w / r.h - 2) < 1e-9);
    const local = {
        x: handle.includes("w")
          ? b.x + b.w
          : handle.includes("e")
            ? b.x
            : b.x + b.w / 2,
        y: handle.includes("n")
          ? b.y + b.h
          : handle.includes("s")
            ? b.y
            : b.y + b.h / 2,
      },
      before = rotatePoint(local, b),
      after = rotatePoint(
        {
          x: handle.includes("w")
            ? r.x + r.w
            : handle.includes("e")
              ? r.x
              : r.x + r.w / 2,
          y: handle.includes("n")
            ? r.y + r.h
            : handle.includes("s")
              ? r.y
              : r.y + r.h / 2,
        },
        r,
      );
    assert.ok(Math.hypot(before.x - after.x, before.y - after.y) < 1e-8);
  }
  const center = { x: 250, y: 325 };
  const angle = rotationFromPointer(
    b,
    { x: 350, y: 325 },
    { x: 250, y: 425 },
    true,
  );
  assert.equal(angle % 90, 0);
  const result = rotateObjects({ a: b }, { x: 200, y: 300, w: 100, h: 50 }, 90);
  assert.ok(Math.abs(result.a.x - b.x) < 1e-8);
});
test("events on physical contacts fire at the simulated time and survive replay", async () => {
  const { makeSlimeDemo } = await import("../src/animationSlimeDemo.js");
  const s = makeSlimeDemo().slides[3];
  s.elements.label = { type: "text", text: "Touché" };
  s.positions.label = { x: 10, y: 10, w: 100, h: 40 };
  s.blockKeys.push("label");
  s.animation.events = [
    {
      id: "contact-message",
      trigger: "contact",
      source: "lucky-0",
      action: "show",
      target: "label",
      enabled: true,
    },
  ];
  assert.equal(
    animationScene(s, s.animation, 0).scene.positions.label.opacity,
    0,
  );
  assert.equal(
    animationScene(s, s.animation, 4).scene.positions.label.opacity,
    100,
  );
  assert.equal(
    animationScene(s, s.animation, 0).scene.positions.label.opacity,
    0,
  );
});
test("image fill and independent stroke survive shape normalization and component capture", async () => {
  const { normalizeShape } = await import("../src/shapes.js"),
    { normalizeSlides, makeSlide } = await import("../src/model.js"),
    { imageFitRect } = await import("../src/shapeImages.js");
  const src = "data:image/png;base64,AAAA";
  const e = normalizeShape({
    shape: "star",
    imageSrc: src,
    outlined: true,
    stroke: "#123456",
    strokeWidth: 8,
  });
  assert.equal(e.imageSrc, src);
  assert.equal(e.strokeWidth, 8);
  assert.equal(
    normalizeShape({ imageSrc: "https://example.com/a.png" }).imageSrc,
    "",
  );
  const s = makeSlide();
  s.elements.shapePicture = e;
  s.positions.shapePicture = { x: 0, y: 0, w: 200, h: 100 };
  s.blockKeys.push("shapePicture");
  assert.equal(normalizeSlides([s])[0].elements.shapePicture.imageSrc, src);
  const { captureComponent, normalizeComponents } =
    await import("../src/componentsLibrary.js");
  const component = captureComponent(
    s,
    ["shapePicture"],
    { x: 0, y: 0, w: 200, h: 100 },
    "Image",
  );
  assert.equal(
    normalizeComponents([component])[0].items[0].element.imageSrc,
    src,
  );
  const rect = imageFitRect(
    { x: 0, y: 0, w: 100, h: 100 },
    { width: 200, height: 100 },
    "cover",
  );
  assert.equal(rect.w, 200);
  assert.equal(rect.x, -50);
});
test('non-centered child anchor remains attached when both objects rotate',async()=>{const {anchorPoint}=await import('../src/animationWorkflow.js');const s=scene();s.positions.parent.rotation=90;s.positions.child.rotation=15;const cfg={attachments:[{child:'child',parent:'parent',parentX:1,parentY:1,childX:0,childY:0,rotate:true}]};const result=animationScene(s,cfg,0).scene,p=anchorPoint(result.positions.parent,1,1),q=anchorPoint(result.positions.child,0,0);assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<1e-8);});
