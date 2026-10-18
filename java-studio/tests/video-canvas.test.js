import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeVideoCanvas,
  connectVideoCanvas,
  removeCanvasNode,
  canvasEdgePath,
} from "../src/videoCanvas.js";
test("learning canvas normalizes positions, independent video references and valid links", () => {
  const c = normalizeVideoCanvas({
    nodes: [
      { id: "a", type: "note", x: -10, y: Infinity, title: "Bases" },
      { id: "b", type: "video", videoId: "java", x: 99999, y: 500 },
      { id: "a" },
    ],
    edges: [
      { from: "a", to: "b" },
      { from: "a", to: "b" },
      { from: "b", to: "b" },
      { from: "a", to: "missing" },
    ],
  });
  assert.equal(c.nodes.length, 2);
  assert.equal(c.nodes[0].x, -10);
  assert.equal(c.nodes[0].y, 0);
  assert.equal(c.nodes[1].x, 99999);
  assert.equal(c.nodes[1].videoId, "java");
  assert.equal(c.edges.length, 1);
  assert.equal(c.nodes[1].playlist, undefined);
  assert.deepEqual(normalizeVideoCanvas(JSON.parse(JSON.stringify(c))), c);
});
test("canvas supports branches and merges without altering video or playlist order", () => {
  const original = normalizeVideoCanvas({
    nodes: ["base", "project", "path-a", "path-b", "end"].map((id) => ({ id })),
  });
  let c = connectVideoCanvas(original, "base", "project");
  c = connectVideoCanvas(c, "project", "path-a");
  c = connectVideoCanvas(c, "project", "path-b");
  c = connectVideoCanvas(c, "path-a", "end");
  c = connectVideoCanvas(c, "path-b", "end");
  assert.equal(c.edges.length, 5);
  assert.equal(original.edges.length, 0);
  assert.equal(connectVideoCanvas(c, "base", "project"), c);
  assert.throws(() => connectVideoCanvas(c, "base", "base"));
  assert.throws(() => connectVideoCanvas(c, "missing", "end"));
  const removed = removeCanvasNode(c, "project");
  assert.equal(removed.edges.length, 2);
  assert.equal(removed.nodes.length, 4);
  assert.equal(c.nodes.length, 5);
});
test("attached connectors follow moved cards in either direction", () => {
  const a = { x: 100, y: 200 },
    b = { x: 500, y: 600 };
  assert.match(canvasEdgePath(a, b), /^M 380 320 C/);
  assert.match(canvasEdgePath(a, b), /500 720$/);
  assert.match(canvasEdgePath(b, a), /^M 780 720 C/);
  assert.match(canvasEdgePath(b, a), /100 320$/);
  assert.notEqual(
    canvasEdgePath(a, b),
    canvasEdgePath(a, { ...b, x: 700, y: 800 }),
  );
});

test("groups keep members and clean dangling memberships on deletion", async () => {
  const {
    groupCanvasNodes,
    canvasGroupBounds,
    snapCanvasPosition,
    freeCanvasPosition,
  } = await import("../src/videoCanvas.js");
  const c = normalizeVideoCanvas({
    nodes: [
      { id: "a", x: 240, y: 240 },
      { id: "b", x: 600, y: 500 },
    ],
  });
  const grouped = groupCanvasNodes(c, ["a", "b", "b", "missing"], "group");
  assert.deepEqual(grouped.groups[0].members, ["a", "b"]);
  assert.equal(canvasGroupBounds(grouped, grouped.groups[0]).x, 216);
  assert.equal(canvasGroupBounds(grouped, grouped.groups[0]).height, 580);
  assert.equal(removeCanvasNode(grouped, "a").groups[0].members[0], "b");
  assert.throws(() => groupCanvasNodes(c, ["a"], "bad"));
  assert.equal(snapCanvasPosition(251, 11720), 240);
  assert.equal(snapCanvasPosition(251, 11720, false), 251);
  const place = freeCanvasPosition(c.nodes, 240, 240);
  assert.ok(
    !c.nodes.some(
      (n) => Math.abs(n.x - place.x) < 300 && Math.abs(n.y - place.y) < 260,
    ),
  );
  assert.equal(normalizeVideoCanvas({ ...grouped, snap: false }).snap, false);
});
test("canvas expands around negative or distant coordinates and marquee is direction independent", async () => {
  const { canvasWorldBounds, nodesInCanvasRect } =
    await import("../src/videoCanvas.js");
  const nodes = [
    { id: "a", x: -12000, y: -9000 },
    { id: "b", x: 240, y: 240 },
  ];
  const bounds = canvasWorldBounds(nodes);
  assert.ok(bounds.x < -12000);
  assert.ok(bounds.y < -9000);
  assert.deepEqual(
    nodesInCanvasRect(nodes, { x1: 200, y1: 200, x2: 600, y2: 600 }),
    ["b"],
  );
  assert.deepEqual(
    nodesInCanvasRect(nodes, { x1: 600, y1: 600, x2: 200, y2: 200 }),
    ["b"],
  );
  assert.deepEqual(
    nodesInCanvasRect(nodes, { x1: 200, y1: 200, x2: 300, y2: 300 }),
    [],
  );
  const expanded = canvasWorldBounds([], {
    x: -16000,
    y: -10000,
    right: 20000,
    bottom: 12000,
  });
  assert.ok(expanded.width >= 36000);
  assert.ok(expanded.height >= 22000);
});

test("panning preserves world position when the canvas origin grows", async () => {
  const { panCanvasScroll } = await import("../src/videoCanvas.js");
  const start = { x: 500, y: 300 },
    delta = { x: -100, y: 50 },
    zoom = 0.8;
  const first = panCanvasScroll(start, delta, zoom, { x: -6000, y: -4000 });
  const grown = panCanvasScroll(start, delta, zoom, { x: -10000, y: -8000 });
  assert.equal(grown.left - first.left, 3200);
  assert.equal(grown.top - first.top, 3200);
  assert.equal(first.left / zoom - 6000, grown.left / zoom - 10000);
  assert.equal(first.top / zoom - 4000, grown.top / zoom - 8000);
});

test("resizable group frames survive reload and accept or release dropped cards", async () => {
  const { assignCanvasGroups, canvasGroupBounds } =
    await import("../src/videoCanvas.js");
  let c = normalizeVideoCanvas({
    nodes: [
      { id: "a", x: 24, y: 72 },
      { id: "b", x: 360, y: 72 },
    ],
    groups: [
      {
        id: "g",
        members: ["a"],
        bounds: { x: 0, y: 0, width: 720, height: 360 },
      },
    ],
  });
  c = assignCanvasGroups(c, ["b"]);
  assert.deepEqual(c.groups[0].members, ["a", "b"]);
  assert.deepEqual(canvasGroupBounds(c, c.groups[0]), {
    x: 0,
    y: 0,
    width: 720,
    height: 360,
  });
  assert.deepEqual(normalizeVideoCanvas(JSON.parse(JSON.stringify(c))), c);
  c.nodes[1].x = 800;
  c = assignCanvasGroups(c, ["b"]);
  assert.deepEqual(c.groups[0].members, ["a"]);
  c.nodes[0].x = 900;
  c = assignCanvasGroups(c, ["a"]);
  assert.equal(c.groups.length, 1);
  assert.equal(normalizeVideoCanvas(c).groups.length, 1);
});

test("video picker excludes existing and archived videos without hiding reusable steps", async () => {
  const { availableCanvasVideos } = await import("../src/videoCanvas.js");
  const c = normalizeVideoCanvas({
    nodes: [
      { id: "n", type: "video", videoId: "a" },
      { id: "step", type: "note", title: "b" },
    ],
  });
  const videos = [{ id: "a" }, { id: "b" }, { id: "c", archived: true }];
  assert.deepEqual(availableCanvasVideos(c, videos), [videos[1]]);
  assert.deepEqual(
    availableCanvasVideos(removeCanvasNode(c, "n"), videos),
    videos.slice(0, 2),
  );
});

test("canvas file roundtrip preserves edited groups and rejects other application documents", async () => {
  const { canvasDocument, readCanvasDocument } =
    await import("../src/videoCanvas.js");
  const c = normalizeVideoCanvas({
    nodes: [
      { id: "a", type: "note", title: "Cours", text: "Édité", x: -500, y: 240 },
    ],
    groups: [
      {
        id: "g",
        title: "Socle",
        members: ["a"],
        bounds: { x: -600, y: 150, width: 600, height: 360 },
      },
    ],
  });
  assert.deepEqual(
    readCanvasDocument(JSON.parse(JSON.stringify(canvasDocument(c)))),
    c,
  );
  assert.throws(() =>
    readCanvasDocument({ format: "frame-application", version: 1, canvas: c }),
  );
  assert.throws(() =>
    readCanvasDocument({
      format: "frame-learning-canvas",
      version: 2,
      canvas: c,
    }),
  );
});
test('thread projects preserve their distinct type, links and groups through export/import',async()=>{
 const {canvasDocument,readCanvasDocument}=await import('../src/videoCanvas.js');
 const canvas=normalizeVideoCanvas({nodes:[{id:'intro',type:'note'},{id:'project',type:'project',title:'API Java',text:'Début du projet fil rouge',x:-24,y:48},{id:'video',type:'video',videoId:'lesson'}],edges:[{from:'intro',to:'project'},{from:'project',to:'video'}],groups:[{id:'group',title:'Pratique',members:['project','video']}]});
 assert.equal(canvas.nodes[1].type,'project');assert.equal(canvas.nodes[1].title,'API Java');
 const restored=readCanvasDocument(JSON.parse(JSON.stringify(canvasDocument(canvas))));assert.deepEqual(restored,canvas);assert.equal(restored.edges.length,2);assert.deepEqual(restored.groups[0].members,['project','video']);
 assert.equal(normalizeVideoCanvas({nodes:[{id:'p',type:'project'}]}).nodes[0].title,'Projet fil rouge');
});

test('group color choices survive file roundtrips, invalid and historical colors use sage', async () => {
  const { CANVAS_GROUP_COLORS, canvasGroupColorStyle, canvasDocument, readCanvasDocument } = await import('../src/videoCanvas.js');
  const raw = {nodes:[{id:'a'}],groups:[{id:'g',members:['a']}]};
  assert.equal(normalizeVideoCanvas(raw).groups[0].color,'sage');
  for (const color of CANVAS_GROUP_COLORS) {
    raw.groups[0].color = color.id;
    const restored=readCanvasDocument(JSON.parse(JSON.stringify(canvasDocument(normalizeVideoCanvas(raw)))));
    assert.equal(restored.groups[0].color,color.id);
    assert.notEqual(canvasGroupColorStyle(color.id)['--group-dark'],canvasGroupColorStyle(color.id)['--group-light']);
  }
  raw.groups[0].color='invalid';
  assert.equal(normalizeVideoCanvas(raw).groups[0].color,'sage');
});
