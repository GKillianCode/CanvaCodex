import { makeSlide } from "./model.js";
import { normalizeShape } from "./shapes.js";
import { animationScene, normalizeAnimation } from "./animationModel.js";
export function extendSlimeWorlds(scenes) {
  const firstColor = "#e9a65c";
  for (const [i, s] of scenes.entries()) {
    const a = s.animation;
    delete s.elements.shapeSky;
    delete s.positions.shapeSky;
    delete s.fragments.shapeSky;
    s.blockKeys = s.blockKeys.filter((k) => k !== "shapeSky");
    a.clips = a.clips.filter((c) => !c.keys.includes("shapeSky"));
    Object.assign(a, {
      background: "gradient",
      color: ["#dcece4", "#efe0cf", "#202e42"][i],
      color2: ["#b7cfb5", "#d9b395", "#101b30"][i],
      gradientAngle: 90,
      transition: 0.7,
      actorKey: "shapeSlime",
      actorId: "slime-player",
    });
    a.clips.push({
      id: "scene-background",
      name: "Fond de scène",
      keys: [],
      duration: 10,
      frames: [
        { field: "backgroundColor", time: 0, value: a.color, ease: "smooth" },
        {
          field: "backgroundColor",
          time: 10,
          value: ["#c1d4e0", "#d4c0cc", "#35445f"][i],
          ease: "smooth",
        },
        { field: "backgroundColor2", time: 0, value: a.color2, ease: "smooth" },
        {
          field: "backgroundColor2",
          time: 10,
          value: ["#d6c6ab", "#aa8182", "#46616c"][i],
          ease: "smooth",
        },
        { field: "backgroundAngle", time: 0, value: 90, ease: "smooth" },
        { field: "backgroundAngle", time: 10, value: 125, ease: "smooth" },
      ],
    });
    const c = a.clips.find((c) => c.id === "slime-motion"),
      g = a.engines.find((e) => e.kind === "gravity"),
      path = a.paths[0];
    s.elements.shapeSlime.fill = firstColor;
    for (const f of c.frames.filter((f) => f.field === "color"))
      f.value = firstColor;
    const start = i === 0 ? 160 : -60,
      end = 1860,
      launch = start + ((end - start) * 3.4) / 10,
      landTime = 3.4 + (2 * 1050) / 900,
      land = start + ((end - start) * landTime) / 10;
    s.positions.shapeSlime.x = start - 52;
    path.points = [
      { x: start, y: 820 },
      { x: start + (launch - start) / 3, y: 820 },
      { x: start + (2 * (launch - start)) / 3, y: 820 },
      { x: launch, y: 820 },
      {
        x: launch + (land - launch) / 3,
        y: 820 - (1050 * (landTime - 3.4)) / 3,
      },
      {
        x: launch + (2 * (land - launch)) / 3,
        y: 820 - (1050 * (landTime - 3.4)) / 3,
      },
      { x: land, y: 820 },
      { x: land + (end - land) / 3, y: 820 },
      { x: land + (2 * (end - land)) / 3, y: 820 },
      { x: end, y: 820 },
    ];
    if (i === 2) {
      // The player does not jump this hole: it drops through it into the lower world.
      path.points = [
        { x: -60, y: 820 },
        { x: 280, y: 820 },
        { x: 620, y: 820 },
        { x: 960, y: 820 },
      ];
      c.frames = c.frames.filter(
        (f) => !["progress", "w", "h"].includes(f.field),
      );
      c.frames.push(
        { field: "progress", time: 0, value: 0, ease: "linear" },
        { field: "progress", time: 10, value: 1, ease: "linear" },
      );
      Object.assign(g, { start: 0, duration: 10, velocityY: 0 });
      s.grid = { x: 2, y: 0 };
      s.exitDirection = "auto";
      s.positions.shapeGroundLeft.x = -300;
      s.positions.shapeGroundLeft.w = 1100;
    }
    s.animation = normalizeAnimation(a);
  }
  const previous = scenes[2],
    fallen = animationScene(previous, previous.animation, 10).scene.positions
      .shapeSlime,
    near = animationScene(previous, previous.animation, 9.99).scene.positions
      .shapeSlime;
  const entryFoot = fallen.y + fallen.h - 1080,
    entryVelocity = (fallen.y - near.y) / 0.01;
  const s = makeSlide("title", { x: 2, y: 1 });
  Object.assign(s, {
    id: "slime-scene-3",
    title: "Gravité · le monde inversé",
    label: "",
    body: "",
    code: "",
    blockKeys: [],
    elements: {},
    positions: {},
    fragments: {},
    groups: [],
  });
  const effects = [],
    engines = [],
    clips = [],
    triggers = [];
  function shape(id, name, kind, x, y, w, h, fill, extra = {}) {
    const key = "shape" + id;
    s.blockKeys.push(key);
    s.elements[key] = normalizeShape({
      shape: kind,
      name,
      fill,
      stroke: fill,
      ...extra,
    });
    s.positions[key] = { x, y, w, h, size: 32 };
    s.fragments[key] = { order: 0, animation: "none" };
    return key;
  }
  const floor = shape(
      "Floor",
      "Sol de gravité",
      "rect",
      0,
      900,
      1920,
      180,
      "#4b596c",
    ),
    ceiling = shape(
      "Ceiling",
      "Plafond · rive droite",
      "rect",
      1120,
      50,
      800,
      80,
      "#4b596c",
    ),
    ceilingLeft = shape(
      "CeilingLeft",
      "Plafond · rive gauche",
      "rect",
      0,
      50,
      850,
      80,
      "#4b596c",
    );
  for (const key of [floor, ceiling, ceilingLeft])
    effects.push({ id: "collider-" + key, kind: "collider", key });
  shape("FloorEdge", "Bord du sol", "rect", 0, 900, 1920, 12, "#b8a0b2");
  shape(
    "CeilingEdge",
    "Bord du plafond",
    "rect",
    1120,
    118,
    800,
    12,
    "#83a6b3",
  );
  shape(
    "CeilingEdgeLeft",
    "Bord du plafond gauche",
    "rect",
    0,
    118,
    850,
    12,
    "#83a6b3",
  );
  for (let i = 0; i < 12; i++) {
    const key = shape(
      "Column" + i,
      "Architecture changeante",
      "rounded",
      i * 180,
      260 + (i % 3) * 60,
      95,
      340,
      "#2d4257",
      { radius: 8 },
    );
    clips.push({
      id: "architecture-" + i,
      name: "Architecture mobile",
      keys: [key],
      duration: 14,
      frames: [
        { field: "h", time: 0, value: 340, ease: "smooth" },
        { field: "h", time: 14, value: 170 + (i % 4) * 65, ease: "smooth" },
        { field: "radius", time: 0, value: 8, ease: "smooth" },
        { field: "radius", time: 14, value: 45, ease: "smooth" },
      ],
    });
  }
  const hero = shape(
    "Slime",
    "Slime · même personnage",
    "circle",
    908,
    entryFoot - 104,
    104,
    104,
    firstColor,
    { outlined: true, stroke: "#e8dccb", strokeWidth: 3 },
  );
  const path = {
    id: "gravity-path",
    name: "Avancée vers les quatre blocs",
    visible: false,
    points: [
      { x: 960, y: entryFoot },
      { x: 1246.6667, y: entryFoot },
      { x: 1533.3333, y: entryFoot },
      { x: 1820, y: entryFoot },
    ],
  };
  clips.push({
    id: "slime-motion",
    name: "Personnage · avancée",
    keys: [hero],
    pathId: path.id,
    constantSpeed: false,
    pivotX: 0.5,
    pivotY: 1,
    duration: 14,
    frames: [
      { field: "progress", time: 0, value: 0, ease: "linear" },
      { field: "progress", time: 14, value: 1, ease: "linear" },
    ],
  });
  const gravityKey = shape(
    "Gravity",
    "Gravité · contacts inversent la force",
    "circle",
    70,
    190,
    48,
    48,
    "#a6b6c7",
    { engineKind: "gravity", filled: false },
  );
  engines.push({
    id: "gravity-player",
    key: gravityKey,
    kind: "gravity",
    targets: [hero],
    followPath: true,
    start: 0,
    duration: 14,
    gravity: 900,
    velocityY: entryVelocity,
    bounce: 0.12,
    drag: 0,
  });
  for (const [i, x, y, gravity, form, color] of [
    [0, 1120, 820, -1100, "square", "#a8c5cc"],
    [1, 1320, 130, 1100, "diamond", "#d6b688"],
    [2, 1520, 820, -1100, "cross", "#c7acd0"],
    [3, 1720, 130, 1100, "star", "#e9a65c"],
  ]) {
    const key = shape(
      "Lucky" + i,
      "Bloc de transformation " + (i + 1),
      "rounded",
      x,
      y,
      80,
      80,
      "#d9b86f",
      { outlined: true, stroke: "#eed8a2", strokeWidth: 4, radius: 12 },
    );
    triggers.push({
      id: "lucky-" + i,
      actor: hero,
      target: key,
      gravity,
      impulse: 0,
      shape: form,
      color,
      targetShape: "circle",
      targetColor: "#6d858e",
    });
    const mark = shape(
      "Mark" + i,
      "Repère du bloc " + (i + 1),
      "diamond",
      x + 29,
      y + 25,
      22,
      30,
      "#685a4f",
    );
    clips.push({
      id: "block-" + i,
      name: "Bloc · pulsation",
      keys: [mark],
      duration: 14,
      frames: Array.from({ length: 8 }, (_, j) => ({
        field: "opacity",
        time: j * 2,
        value: j % 2 ? 40 : 100,
        ease: "smooth",
      })),
    });
  }
  const emitter = shape(
    "Energy",
    "Étincelles liées au personnage",
    "circle",
    940,
    -20,
    48,
    48,
    "#d5b99d",
    { engineKind: "particles", filled: false },
  );
  engines.push({
    id: "energy",
    key: emitter,
    kind: "particles",
    parent: hero,
    offsetX: -40,
    offsetY: 0,
    start: 0,
    duration: 14,
    gravity: 0,
    particles: {
      enabled: true,
      count: 45,
      life: 0.5,
      size: 4,
      speed: 100,
      color: "#c5b5d4",
      direction: "axes",
      xMin: -1,
      xMax: -0.1,
      yMin: -0.5,
      yMax: 0.5,
      shape: { shape: "diamond" },
    },
  });
  clips.push({
    id: "scene-background",
    name: "Fond de scène",
    keys: [],
    duration: 14,
    frames: [
      { field: "backgroundColor", time: 0, value: "#152639", ease: "smooth" },
      { field: "backgroundColor", time: 7, value: "#3c314f", ease: "smooth" },
      { field: "backgroundColor", time: 14, value: "#344f59", ease: "smooth" },
      { field: "backgroundColor2", time: 0, value: "#4c4056", ease: "smooth" },
      { field: "backgroundColor2", time: 14, value: "#172f43", ease: "smooth" },
      { field: "backgroundAngle", time: 0, value: 20, ease: "smooth" },
      { field: "backgroundAngle", time: 14, value: 160, ease: "smooth" },
    ],
  });
  s.animation = normalizeAnimation({
    duration: 14,
    fps: 30,
    background: "gradient",
    color: "#152639",
    color2: "#4c4056",
    gradientAngle: 20,
    actorKey: hero,
    actorId: "slime-player",
    paths: [path],
    effects,
    clips,
    engines,
    triggers,
  });
  scenes.push(s);
  return scenes;
}
