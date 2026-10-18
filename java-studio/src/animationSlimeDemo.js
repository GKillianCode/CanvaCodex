import { enrichSlimeWorkflow } from "./animationSlimeWorkflow.js";
import {extendSlimeWorlds} from "./animationSlimeWorlds.js";
import { makeSlide } from "./model.js";
import { normalizeAnimation } from "./animationModel.js";
import { normalizeShape } from "./shapes.js";
import { normalizeThemes } from "./themes.js";
import { applicationFile } from "./applicationDocuments.js";

const palettes = [
  {
    name: "Prairie · du matin au soir",
    sky: "#dcece4",
    end: "#b7c9dc",
    earth: "#516d58",
    top: "#8eb781",
    far: "#b4cbb2",
    detail: "#719e85",
    hero: "#e9a65c",
    ink: "#304c45",
  },
  {
    name: "Canyon · passage suspendu",
    sky: "#efe0cf",
    end: "#d3bfc7",
    earth: "#8e675a",
    top: "#c79a72",
    far: "#d4b59c",
    detail: "#b18170",
    hero: "#80b4be",
    ink: "#694c48",
  },
  {
    name: "Atelier nocturne · énergie",
    sky: "#202e42",
    end: "#39465d",
    earth: "#35475b",
    top: "#789ba8",
    far: "#2b3c53",
    detail: "#527282",
    hero: "#d6a6c9",
    ink: "#e1e8eb",
  },
];
export function makeSlimeDemo() {
  const scenes = palettes.map((p, n) => {
    const s = makeSlide("title", { x: n, y: 0 });
    Object.assign(s, {
      id: "slime-scene-" + n,
      title: p.name,
      label: "",
      body: "",
      code: "",
      blockKeys: [],
      elements: {},
      positions: {},
      fragments: {},
      groups: [],
    });
    const clips = [],
      effects = [],
      engines = [];
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
    function animate(key, name, values) {
      clips.push({
        id: "clip-" + key,
        name,
        keys: [key],
        duration: 10,
        frames: values.flatMap(([field, points]) =>
          points.map(([time, value, ease = "smooth"]) => ({
            field,
            time,
            value,
            ease,
          })),
        ),
      });
    }
    const sky = shape("Sky", "Ciel animé", "rect", 0, 0, 1920, 1080, p.sky);
    animate(sky, "Couleur du ciel", [
      [
        "color",
        [
          [0, p.sky],
          [10, p.end],
        ],
      ],
    ]);
    if (n === 0) {
      for (let i = 0; i < 5; i++) {
        const hill = shape(
          "Hill" + i,
          "Colline " + (i + 1),
          "ellipse",
          -220 + i * 450,
          460 + (i % 2) * 100,
          760,
          540,
          p.far,
        );
        animate(hill, "Parallaxe des collines", [
          [
            "x",
            [
              [0, -220 + i * 450],
              [10, -360 + i * 450],
            ],
          ],
        ]);
      }
      for (let i = 0; i < 4; i++) {
        const cloud = shape(
          "Cloud" + i,
          "Nuage " + (i + 1),
          "rounded",
          180 + i * 450,
          170 + (i % 2) * 80,
          220,
          58,
          "#f4f6eb",
          { radius: 50 },
        );
        animate(cloud, "Dérive des nuages", [
          [
            "x",
            [
              [0, 180 + i * 450],
              [10, 90 + i * 450],
            ],
          ],
          [
            "w",
            [
              [0, 220],
              [10, 290],
            ],
          ],
        ]);
      }
      shape("Sun", "Soleil", "circle", 1490, 120, 130, 130, "#edcc88");
      for (let i = 0; i < 6; i++) {
        shape(
          "Trunk" + i,
          "Tronc",
          "rounded",
          80 + i * 320,
          650,
          24,
          170,
          p.earth,
        );
        const tree = shape(
          "Tree" + i,
          "Feuillage",
          "circle",
          26 + i * 320,
          560,
          132,
          132,
          p.detail,
        );
        animate(tree, "Croissance du feuillage", [
          [
            "w",
            [
              [0, 132],
              [10, 155],
            ],
          ],
          [
            "color",
            [
              [0, p.detail],
              [10, "#b09a72"],
            ],
          ],
        ]);
      }
    } else if (n === 1) {
      for (let i = 0; i < 6; i++) {
        const peak = shape(
          "Peak" + i,
          "Mesa lointaine",
          "trapezoid",
          -90 + i * 370,
          310 + (i % 3) * 80,
          470,
          610,
          p.far,
        );
        animate(peak, "Relief en transformation", [
          [
            "x",
            [
              [0, -90 + i * 370],
              [10, -180 + i * 370],
            ],
          ],
          [
            "h",
            [
              [0, 610],
              [10, 530 + (i % 2) * 100],
            ],
          ],
        ]);
      }
      shape("Sun", "Soleil bas", "circle", 1380, 170, 190, 190, "#edc49c");
      for (let i = 0; i < 7; i++)
        shape(
          "Stone" + i,
          "Strate rocheuse",
          "rounded",
          50 + i * 290,
          710 + (i % 2) * 40,
          130,
          110,
          p.detail,
          { radius: 5 },
        );
      for (let i = 0; i < 3; i++) {
        const flag = shape(
          "Flag" + i,
          "Fanion mobile",
          "triangle",
          240 + i * 620,
          480,
          45,
          55,
          "#c37761",
        );
        animate(flag, "Fanion au vent", [
          [
            "skewX",
            [
              [0, -12],
              [2, 12],
              [4, -12],
              [6, 12],
              [8, -12],
              [10, 12],
            ],
          ],
        ]);
      }
    } else {
      for (let i = 0; i < 9; i++) {
        const tower = shape(
          "Tower" + i,
          "Bâtiment lointain",
          "rect",
          i * 235,
          340 + (i % 3) * 70,
          160,
          500,
          p.far,
        );
        animate(tower, "Architecture mobile", [
          [
            "h",
            [
              [0, 500],
              [10, 430 + (i % 3) * 55],
            ],
          ],
          [
            "x",
            [
              [0, i * 235],
              [10, i * 235 - 85],
            ],
          ],
        ]);
        for (let j = 0; j < 3; j++)
          shape(
            "Window" + i + "-" + j,
            "Fenêtre",
            "rounded",
            i * 235 + 28 + j * 37,
            400 + (i % 3) * 70,
            18,
            55,
            p.detail,
            { radius: 12 },
          );
      }
      shape("Moon", "Lune", "circle", 1490, 100, 125, 125, "#cdd7da");
      for (let i = 0; i < 10; i++) {
        const star = shape(
          "Star" + i,
          "Étoile",
          "diamond",
          100 + i * 175,
          100 + (i % 3) * 50,
          12,
          18,
          "#a6bcc8",
        );
        animate(star, "Scintillement", [
          [
            "opacity",
            [
              [0, 30],
              [2 + (i % 3), 95],
              [7, 35],
              [10, 80],
            ],
          ],
        ]);
      }
    }
    // Actual collider blocks on both sides of the hole. No invisible continuous floor.
    const left = shape(
      "GroundLeft",
      "Sol · rive gauche",
      "rect",
      0,
      820,
      800,
      260,
      p.earth,
    );
    const right = shape(
      "GroundRight",
      "Sol · rive droite",
      "rect",
      1080,
      820,
      840,
      260,
      p.earth,
    );
    for (const key of [left, right])
      effects.push({ id: "floor-" + key, kind: "collider", key });
    shape("TurfLeft", "Bord du sol gauche", "rect", 0, 820, 800, 22, p.top);
    shape("TurfRight", "Bord du sol droit", "rect", 1080, 820, 840, 22, p.top);
    for (let i = 0; i < 12; i++) {
      const x = i < 5 ? 55 + i * 155 : 1110 + (i - 5) * 115;
      shape(
        "GroundDetail" + i,
        "Texture du sol",
        "rounded",
        x,
        880 + (i % 3) * 48,
        55,
        12,
        p.detail,
        { radius: 20 },
      );
    }
    const portal = shape(
      "Portal",
      "Portique final",
      "rounded",
      1730,
      610,
      100,
      210,
      p.detail,
      { filled: false, outlined: true, strokeWidth: 12, radius: 25 },
    );
    animate(portal, "Portique qui se transforme", [
      [
        "color",
        [
          [0, p.detail],
          [10, p.hero],
        ],
      ],
      [
        "strokeColor",
        [
          [0, p.detail],
          [10, p.hero],
        ],
      ],
      [
        "w",
        [
          [0, 100],
          [10, 140],
        ],
      ],
      [
        "radius",
        [
          [0, 25],
          [10, 48],
        ],
      ],
    ]);
    const hero = shape(
      "Slime",
      "Slime · personnage",
      "circle",
      108,
      716,
      104,
      104,
      p.hero,
      { outlined: true, stroke: p.ink, strokeWidth: 3 },
    );
    const start = 3.4,
      land = start + (2 * 1050) / 900,
      launch = 160 + 158 * start,
      landing = 160 + 158 * land;
    const path = {
      id: "slime-path",
      name: "Marche · saut · reprise",
      visible: false,
      points: [
        { x: 160, y: 820 },
        { x: 160 + (launch - 160) / 3, y: 820 },
        { x: 160 + (2 * (launch - 160)) / 3, y: 820 },
        { x: launch, y: 820 },
        {
          x: launch + (landing - launch) / 3,
          y: 820 - (1050 * (land - start)) / 3,
        },
        {
          x: launch + (2 * (landing - launch)) / 3,
          y: 820 - (1050 * (land - start)) / 3,
        },
        { x: landing, y: 820 },
        { x: landing + (1740 - landing) / 3, y: 820 },
        { x: landing + (2 * (1740 - landing)) / 3, y: 820 },
        { x: 1740, y: 820 },
      ],
    };
    clips.push({
      id: "slime-motion",
      name: "Slime · trajectoire et déformations",
      keys: [hero],
      duration: 10,
      pathId: path.id,
      pivotX: 0.5,
      pivotY: 1,
      constantSpeed: false,
      frames: [
        ...[
          [0, 0],
          [start, 1 / 3],
          [land, 2 / 3],
          [10, 1],
        ].map(([time, value]) => ({
          field: "progress",
          time,
          value,
          ease: "linear",
        })),
        ...[
          [0, 104],
          [0.35, 112],
          [0.7, 104],
          [1.05, 112],
          [1.4, 104],
          [1.75, 112],
          [2.1, 104],
          [2.45, 112],
          [2.8, 104],
          [3.23, 140],
          [start, 80],
          [start + 0.4, 96],
          [land - 0.12, 92],
          [land, 146],
          [land + 0.22, 104],
          [6.4, 112],
          [6.8, 104],
          [7.2, 112],
          [7.6, 104],
          [8, 112],
          [8.4, 104],
          [8.8, 112],
          [9.2, 104],
          [10, 104],
        ].map(([time, value]) => ({ field: "w", time, value, ease: "smooth" })),
        ...[
          [0, 104],
          [3.0, 104],
          [3.23, 72],
          [start, 132],
          [start + 0.4, 108],
          [land - 0.12, 118],
          [land, 66],
          [land + 0.22, 104],
          [10, 104],
        ].map(([time, value]) => ({ field: "h", time, value, ease: "smooth" })),
        { field: "color", time: 0, value: p.hero, ease: "smooth" },
        {
          field: "color",
          time: 10,
          value: n === 0 ? "#edb87d" : n === 1 ? "#aed0cb" : "#c2bbe3",
          ease: "smooth",
        },
      ],
    });
    function emitter(id, kind, x, y, color, settings, parent = "") {
      const key = shape(
        id,
        kind === "gravity" ? "Gravité du slime" : "Émetteur · " + id,
        "circle",
        x - 24,
        y - 24,
        48,
        48,
        color,
        { engineKind: kind, filled: false },
      );
      engines.push({
        id: "engine-" + id,
        key,
        kind,
        parent,
        duration: 10,
        gravity: 0,
        offsetY: parent ? 48 : 0,
        particles: {
          enabled: true,
          color,
          direction: "axes",
          seed: 20 + n,
          shape: { shape: "circle" },
          count: 35,
          life: 0.45,
          size: 4,
          speed: 70,
          xMin: -1,
          xMax: -0.2,
          yMin: -0.4,
          yMax: 0.1,
          ...settings,
        },
      });
      return engines.at(-1);
    }
    const g = emitter("Gravity", "gravity", 110, 150, p.ink, {});
    Object.assign(g, {
      targets: [hero],
      start,
      duration: 10 - start,
      gravity: 900,
      velocityY: -1050,
      followPath: true,
      bounce: 0,
      drag: 0,
    });
    const dustColor = n === 2 ? "#a8c4ca" : "#cbb79b";
    emitter(
      "Dust",
      "particles",
      160,
      820,
      dustColor,
      { count: 32, life: 0.38, size: 4, speed: 65 },
      hero,
    ).duration = 3.23;
    const resumed = emitter(
      "DustAfter",
      "particles",
      160,
      820,
      dustColor,
      { count: 32, life: 0.38, size: 4, speed: 65 },
      hero,
    );
    resumed.start = land + 0.22;
    resumed.duration = 10 - resumed.start;
    emitter(
      "Atmosphere",
      "particles",
      n === 0 ? 350 : n === 1 ? 950 : 1480,
      n === 0 ? 450 : n === 1 ? 930 : 300,
      n === 0 ? "#b4bb83" : n === 1 ? "#d0a67e" : "#91bbc5",
      {
        count: 28,
        life: 2,
        size: n === 1 ? 3 : 4,
        speed: n === 1 ? 110 : 35,
        xMin: -0.5,
        xMax: 0.5,
        yMin: n === 1 ? -1 : -0.1,
        yMax: n === 1 ? -0.4 : 0.5,
        shape: { shape: n === 2 ? "diamond" : "circle" },
      },
    );
    const title = "textScene";
    s.blockKeys.push(title);
    s.elements[title] = {
      type: "text",
      custom: true,
      text: ["01  PRAIRIE", "02  CANYON", "03  ATELIER NOCTURNE"][n],
      name: "Nom du décor",
    };
    s.positions[title] = {
      x: 80,
      y: 54,
      w: 1400,
      h: 70,
      size: 32,
      font: "inter",
      textStyle: { color: p.ink, weight: 600 },
    };
    s.fragments[title] = { order: 0, animation: "none" };
    s.animation = normalizeAnimation({
      duration: 10,
      fps: 30,
      background: "solid",
      color: p.sky,
      paths: [path],
      clips,
      effects,
      engines,
    });
    return s;
  });
  extendSlimeWorlds(scenes);
  enrichSlimeWorkflow(scenes);
  return applicationFile(
    {
      projectId: "slime-platform-demo",
      project: "Slime · cinq mondes",
      slides: scenes,
      themes: normalizeThemes(),
      themeId: "terminal",
      resolution: { width: 1920, height: 1080 },
      frame: { header: false, footer: false, gradient: false },
      routeMode: "manual",
      routeStart: scenes[0].id,
      transitionMs: 0,
    },
    "animation",
  );
}
