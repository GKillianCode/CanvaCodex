import { makeSlide } from "./model.js";
import { normalizeAnimation } from "./animationModel.js";
import { normalizeShape } from "./shapes.js";
import { normalizeEffect } from "./animationEffects.js";
export function effectSample(kind) {
  const s = makeSlide("title");
  Object.assign(s, {
    title: "",
    label: "",
    body: "",
    code: "",
    blockKeys: ["sample", "target"],
    elements: {
      sample: normalizeShape({
        shape: "rounded",
        fill: "#82c8ad",
        name: "Objet",
        outlined: true,
        stroke: "#e2f3ea",
        strokeWidth: 3,
      }),
      target: normalizeShape({
        shape: "star",
        fill: "#e8bf7a",
        name: "Arrivée",
      }),
    },
    positions: {
      sample: { x: 700, y: 300, w: 520, h: 480, size: 48, opacity: 100 },
      target: { x: 700, y: 300, w: 520, h: 480, size: 48, opacity: 100 },
    },
    fragments: { sample: { order: 0 }, target: { order: 0 } },
    hiddenKeys: ["target"],
  });
  s.elements.sample.type = "shape";
  s.elements.target.type = "shape";
  if (["neon", "metallic", "shine", "revealText"].includes(kind)) {
    s.elements.sample = {
      type: "text",
      custom: true,
      text: "Frame",
      name: "Texte",
    };
    s.positions.sample = {
      ...s.positions.sample,
      w: 920,
      x: 500,
      size: 210,
      font: "inter",
      textStyle: { weight: 700, verticalAlign: "center", align: "center" },
    };
  }
  s.animation = normalizeAnimation({
    duration: 3,
    effects: [
      {
        id: "demo-effect",
        kind,
        key: "sample",
        target: "target",
        duration: 2,
        gravity: ["shatter", "collapse", "rebuild"].includes(kind) ? 100 : 0,
        color: kind === "metallic" ? "#e9c66b" : "#9fe5cf",
        color2: "#805418",
      },
    ],
  });
  if (kind === "pathDeform") {
    s.animation.paths = normalizeAnimation({
      paths: [
        {
          id: "effect-path",
          points: [
            { x: 500, y: 600 },
            { x: 850, y: 150 },
            { x: 1100, y: 850 },
            { x: 1450, y: 400 },
          ],
        },
      ],
    }).paths;
    s.animation.effects[0].pathId = "effect-path";
  }
  if (kind === "trail")
    s.animation.clips = normalizeAnimation({
      clips: [
        {
          keys: ["sample"],
          duration: 3,
          frames: [
            { field: "x", time: 0, value: 500, ease: "smooth" },
            { field: "x", time: 3, value: 1000 },
          ],
        },
      ],
    }).clips;
  return s;
}
export function makeEffectsDemo() {
  const scenes = [];
  const groups = [
    [
      "Révéler et transformer",
      ["transition", "morph", "dissolve", "mosaic", "wipe", "radial"],
    ],
    [
      "Décomposer et reconstruire",
      ["shatter", "scatter", "collapse", "rebuild"],
    ],
    [
      "Matières et mouvement",
      ["sway", "wave", "bend", "twist", "glitch", "trail"],
    ],
    [
      "Typographie et lumière",
      ["neon", "metallic", "shine", "revealText", "glow", "blur"],
    ],
  ];
  for (const [name, kinds] of groups) {
    const scene = effectSample(kinds[0]);
    scene.title = name;
    scene.blockKeys = [];
    scene.elements = {};
    scene.positions = {};
    scene.fragments = {};
    scene.hiddenKeys = [];
    scene.animation = normalizeAnimation({
      duration: 6,
      background: "solid",
      color: "#10191e",
    });
    for (let i = 0; i < kinds.length; i++) {
      const source = effectSample(kinds[i]),
        key = "shapeEffectObject" + i,
        target = "shapeEffectTarget" + i,
        x = 150 + (i % 3) * 580,
        y = 160 + Math.floor(i / 3) * 440;
      scene.blockKeys.push(key, target);
      scene.elements[key] = {
        ...source.elements.sample,
        name: kinds[i],
        custom: true,
      };
      scene.elements[target] = { ...source.elements.target, custom: true };
      scene.positions[key] = {
        ...source.positions.sample,
        x,
        y,
        w: 420,
        h: 250,
        size: 90,
      };
      scene.positions[target] = { ...scene.positions[key] };
      scene.fragments[key] = { order: 0 };
      scene.fragments[target] = { order: 0 };
      scene.hiddenKeys.push(target);
      scene.animation.effects.push(
        normalizeEffect({
          ...source.animation.effects[0],
          id: "demo-" + i,
          key,
          target,
          duration: 3,
          amount: ["shatter", "scatter", "collapse", "rebuild"].includes(
            kinds[i],
          )
            ? 65
            : source.animation.effects[0].amount,
          gravity: 30,
          loop: true,
        }),
      );
      const label = "textEffectLabel" + i;
      scene.blockKeys.push(label);
      scene.elements[label] = {
        type: "text",
        custom: true,
        text: source.animation.effects[0].name || kinds[i],
      };
      scene.positions[label] = {
        x,
        y: y + 265,
        w: 450,
        h: 48,
        size: 25,
        font: "inter",
        textStyle: { color: "#c4d2d1", verticalAlign: "center" },
      };
      scene.fragments[label] = { order: 0 };
    }
    const trail = scene.animation.effects.find((e) => e.kind === "trail");
    if (trail)
      scene.animation.clips = normalizeAnimation({
        clips: [
          {
            keys: [trail.key],
            duration: 6,
            frames: [
              {
                field: "x",
                time: 0,
                value: scene.positions[trail.key].x - 70,
                ease: "smooth",
              },
              {
                field: "x",
                time: 3,
                value: scene.positions[trail.key].x + 70,
                ease: "smooth",
              },
              { field: "x", time: 6, value: scene.positions[trail.key].x - 70 },
            ],
          },
        ],
      }).clips;
    scene.id = crypto.randomUUID();
    scene.grid = { x: scenes.length, y: 0 };
    scenes.push(scene);
  }
  return scenes;
}
