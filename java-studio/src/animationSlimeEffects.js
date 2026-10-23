import { normalizeAnimation } from "./animationModel.js";
import { normalizeEffect } from "./animationEffects.js";
import { normalizeShape } from "./shapes.js";
import { effectField, effectCatalog } from "./animationEffectCatalog.js";
import { createDesign, designElement } from "./designModel.js";
import { designAnimationScene } from "./designAnimationBridge.js";

// A staged story, not a second renderer. All objects/effects remain native and editable.
export function slimeEffectCues(scenes) {
  return scenes.flatMap((s, i) =>
    s.animation.effects
      .filter((e) => e.id.startsWith("slime-fx-"))
      .map((e) => ({
        scene: i + 1,
        kind: e.kind,
        key: e.key,
        id: e.id,
        start: e.start,
        duration: e.duration,
        label: e.name,
        object: s.elements[e.key]?.name || e.key,
      })),
  );
}
export function enrichSlimeEffects(scenes) {
  const cues = [];
  for (const [i, s] of scenes.entries()) {
    const a = s.animation,
      d = a.duration,
      ink = ["#304c45", "#694c48", "#e1e8eb", "#e8dccb", "#e5e4db"][i];
    function add(key, e, p, { behind = false } = {}) {
      if (s.positions[key]) throw Error("Duplicate Slime object: " + key);
      const at = behind
        ? s.blockKeys.indexOf("shapeSlime")
        : s.blockKeys.length;
      s.blockKeys.splice(at, 0, key);
      s.elements[key] = e;
      s.positions[key] = { size: 30, ...p };
      s.fragments[key] = { order: 0, animation: "none" };
      return key;
    }
    function shape(
      key,
      name,
      kind,
      x,
      y,
      w,
      h,
      fill,
      extra = {},
      behind = true,
    ) {
      return add(
        key,
        normalizeShape({ name, shape: kind, fill, stroke: fill, ...extra }),
        { x, y, w, h },
        { behind },
      );
    }
    function text(key, name, value, x, y, w, h, size, color = ink) {
      return add(
        key,
        { type: "text", custom: true, name, text: value },
        {
          x: Math.max(x, 200),
          y: Math.max(y, 158),
          w,
          h,
          size,
          font: "inter",
          textStyle: { color, weight: 500, verticalAlign: "center" },
        },
      );
    }
    function fx(kind, key, start = 0, duration = d, settings = {}) {
      const id = `slime-fx-${i}-${kind}-${a.effects.filter((e) => e.kind === kind).length}`,
        name = effectCatalog.find((e) => e.id === kind).name,
        e = normalizeEffect({
          id,
          kind,
          key,
          start,
          duration,
          seed: 410 + i * 37,
          gravity: 0,
          ...settings,
          name: settings.name || name,
        });
      a.effects.push(e);
      cues.push({
        scene: i + 1,
        kind,
        key,
        id,
        start,
        duration,
        label: e.name,
      });
      return e;
    }
    function keyed(effect, property, points) {
      a.clips.push({
        id: effect.id + "-" + property,
        name: effect.name + " · " + property,
        keys: [effect.key],
        duration: d,
        collapsed: true,
        frames: points.map(([time, value, ease = "smooth"]) => ({
          field: effectField(effect.id, property),
          time,
          value,
          ease,
        })),
      });
    }
    function show(key, at, end = d) {
      a.clips.push({
        id: "visibility-" + key,
        name: s.elements[key].name + " · présence",
        keys: [key],
        duration: d,
        collapsed: true,
        frames: [
          [0, at > 0 ? 0 : 100],
          [at, 100],
          [end, 100],
          ...(end < d ? [[Math.min(d, end + 0.2), 0]] : []),
        ].map(([time, value]) => ({
          field: "opacity",
          time,
          value,
          ease: "hold",
        })),
      });
    }
    for (const link of a.links) {
      link.width = 1.5;
      link.color = i < 2 ? "#9eaa8d" : "#7d929d";
    }
    a.events.push({
      id: "relay-link-rest",
      name: "Le signal est transmis",
      trigger: "time",
      time: 4.8,
      action: "hide",
      target: "relay-link",
    });
    // Consistent typography, restrained camera and quiet helper graphics.
    if (s.positions.textScene) {
      s.positions.textScene.x = 200;
      s.positions.textScene.y = 86;
      s.positions.textScene.w = 1450;
      s.positions.textScene.size = 30;
      s.positions.textScene.textStyle = {
        ...s.positions.textScene.textStyle,
        weight: 600,
        color: ink,
      };
    }
    for (const c of a.clips) c.collapsed = true;
    if (i === 0) {
      fx("fade", "textScene", 0, 0.9);
      const subtitle = text(
        "textOpening",
        "Ouverture · texte rythmé",
        "Un seul voyage. Cinq mondes en mouvement.",
        80,
        112,
        1100,
        46,
        25,
      );
      fx("revealText", subtitle, 0.35, 2.2, {
        unit: "word",
        stagger: 0.55,
        amount: 12,
        disperse: true,
      });
      show(subtitle, 0, 3);
      // The same Vectoriel → Animation adapter used by the application imports the grass.
      const doc = createDesign("vector", "Herbier vectoriel", 3);
      doc.id = "slime-herbier";
      doc.pages[0].elements = [];
      for (let j = 0; j < 9; j++) {
        const x = j < 4 ? 255 + j * 133 : 1180 + (j - 4) * 117;
        doc.pages[0].elements.push(
          designElement("shape", {
            id: "Grass" + j,
            name: "Herbe vectorielle " + (j + 1),
            shape: "freeform",
            nodes: [
              { x: 36, y: 100 },
              { x: 47, y: 8, outX: 60, outY: 14 },
              { x: 66, y: 100 },
            ],
            closed: true,
            x,
            y: 750 - (j % 2) * 12,
            w: 30,
            h: 70 + (j % 2) * 12,
            fill: j % 2 ? "#648d72" : "#7b9d78",
            group: "grass-" + (j < 4 ? "left" : "right"),
          }),
        );
      }
      const native = designAnimationScene(doc);
      for (const key of native.blockKeys) {
        add(key, native.elements[key], native.positions[key], { behind: true });
        fx("sway", key, 0, d, {
          amount: 5 + (Number(key.at(-1)) % 3),
          frequency: 0.35,
          pivotY: 1,
          pivotX: 0.5,
        });
      }
      s.groups.push(...native.groups);
      fx("wave", "shapeCloud2", 0, d, { amount: 4, frequency: 0.12 });
      fx("blur", "shapeHill3", 0, d, { amount: 3 });
      fx("shadow", "shapeSlime", 0, d, { amount: 7, color: "#385748" });
      const sign = shape(
        "shapeTrailSign",
        "Sentier qui se dessine",
        "freeform",
        340,
        695,
        200,
        35,
        ink,
        {
          filled: false,
          outlined: true,
          strokeWidth: 3,
          pathNodes: [
            { x: 0, y: 60, outX: 30, outY: 0 },
            { x: 52, y: 40, inX: 30, inY: 10, outX: 70, outY: 80 },
            { x: 100, y: 30, inX: 83, inY: 60 },
          ],
          closed: false,
        },
      );
      fx("drawPath", sign, 0.8, 2.4);
      show(sign, 0.8, 5.8);
    } else if (i === 1) {
      // Fragments are scenery, never colliders: the jump remains physically unchanged.
      const rock = shape(
        "shapeFracture",
        "Cristal · explosion au départ du saut",
        "hexagon",
        680,
        692,
        94,
        110,
        "#b79a82",
        { outlined: true, stroke: "#ead7b8", strokeWidth: 2 },
      );
      fx("shatter", rock, 3.05, 1.1, {
        amount: 120,
        gravity: 150,
        rotation: 240,
        cells: 5,
        pieces: "triangles",
        stagger: 0.16,
      });
      const dust = shape(
        "shapeSandVeil",
        "Voile de sable emporté",
        "rounded",
        410,
        740,
        200,
        32,
        "#d4b38d",
        { radius: 35 },
      );
      fx("scatter", dust, 2.1, 1.6, {
        amount: 55,
        wind: 80,
        gravity: -15,
        cells: 14,
        rotation: 80,
        stagger: 0.25,
      });
      const loose = shape(
        "shapeLooseArch",
        "Fragments suspendus · effondrement",
        "rounded",
        900,
        438,
        145,
        42,
        "#b38a76",
        { radius: 6 },
      );
      fx("collapse", loose, 4.3, 1.25, {
        amount: 28,
        gravity: 360,
        cells: 6,
        rotation: 60,
        stagger: 0.2,
      });
      const gateway = shape(
        "shapeRebuiltArch",
        "Portique reconstruit après le saut",
        "rounded",
        1650,
        590,
        116,
        225,
        "#d6bb94",
        {
          filled: false,
          outlined: true,
          stroke: "#d6bb94",
          strokeWidth: 9,
          radius: 35,
        },
      );
      fx("rebuild", gateway, 6.1, 1.8, {
        amount: 75,
        gravity: 40,
        cells: 6,
        rotation: 100,
        stagger: 0.2,
      });
      fx("bend", "shapeFlag1", 0, 4, { amount: 13 });
      const tablet = shape(
        "shapeMosaicTablet",
        "Stèle révélée en mosaïque",
        "rounded",
        1260,
        670,
        108,
        116,
        "#a67f71",
        { outlined: true, stroke: "#d9bf9c", strokeWidth: 2, radius: 8 },
      );
      fx("mosaic", tablet, 5.7, 1.3, { cells: 8 });
    } else if (i === 2) {
      fx("neon", "textScene", 0, d, {
        amount: 5,
        color: "#8dcbd1",
        frequency: 0.18,
      });
      for (const j of [1, 4, 7])
        fx("flicker", "shapeWindow" + j + "-1", 0, d, {
          amount: 24,
          frequency: 0.65,
          seed: 321 + j,
        });
      const circuit = shape(
        "shapeCircuit",
        "Circuit dessiné · énergie instable",
        "freeform",
        510,
        230,
        680,
        130,
        "#89bac5",
        {
          filled: false,
          outlined: true,
          stroke: "#89bac5",
          strokeWidth: 4,
          pathNodes: [
            { x: 0, y: 70 },
            { x: 24, y: 70 },
            { x: 24, y: 25 },
            { x: 55, y: 25 },
            { x: 55, y: 75 },
            { x: 100, y: 75 },
          ],
          closed: false,
        },
      );
      fx("dashFlow", circuit, 0, d, { amount: 35 });
      const glitch = fx("glitch", "shapeRelay", 0, d, {
        amount: 0,
        frequency: 1.3,
      });
      keyed(glitch, "amount", [
        [0, 0],
        [4.9, 0],
        [5.1, 14],
        [5.35, 0],
        [7.2, 0],
        [7.32, 10],
        [7.55, 0],
        [10, 0],
      ]);
      const warning = text(
        "textSignalLost",
        "Signal qui disparaît",
        "SIGNAL INTERROMPU",
        80,
        116,
        700,
        42,
        23,
        "#99bac9",
      );
      fx("dissolve", warning, 4.8, 2.1, { reverse: true, cells: 22 });
      const gray = fx("grayscale", "shapeTower4", 0, d, { amount: 0 });
      keyed(gray, "amount", [
        [0, 0],
        [4, 0],
        [8, 75],
        [10, 75],
      ]);
      const hue = fx("hue", "shapeSignal", 0, d, { amount: 0 });
      keyed(hue, "amount", [
        [0, 0],
        [3.8, 0],
        [7.8, 65],
        [10, 65],
      ]);
    } else if (i === 3) {
      const rune = shape(
        "shapeMorphRune",
        "Rune · cercle vers étoile",
        "circle",
        270,
        410,
        135,
        135,
        "#93b9c7",
        { outlined: true, stroke: "#d9e4dd", strokeWidth: 2 },
      );
      const runeTarget = shape(
        "shapeMorphTarget",
        "Rune · forme d’arrivée",
        "star",
        270,
        410,
        135,
        135,
        "#d8b4c4",
        { outlined: true, stroke: "#f2d9bd", strokeWidth: 2 },
      );
      fx("morph", rune, 1.8, 3.2, { target: runeTarget, hideTarget: true });
      fx("twist", "shapeColumn1", 0, d, { amount: 18, frequency: 0.13 });
      fx("trail", "shapeSlime", 0, d, { amount: 22, count: 4 });
      fx("pulse", "shapeMark2", 0, d, {
        amount: 4,
        frequency: 0.45,
        pivotY: 0.5,
      });
      const aura = shape(
        "shapeGravityAura",
        "Onde autour du bloc de gravité",
        "circle",
        1475,
        765,
        170,
        170,
        "#bb9fc9",
        { filled: false, outlined: true, stroke: "#bb9fc9", strokeWidth: 2 },
      );
      fx("radial", aura, 6.6, 1.5);
      show(aura, 6.6, 9.2);
      const ribbon = shape(
        "shapeRibbon",
        "Ruban · déformation sur spline",
        "rounded",
        230,
        250,
        620,
        13,
        "#819eae",
        { gradient: true, fill2: "#c9adc6", radius: 40 },
      );
      a.paths.push({
        id: "slime-ribbon",
        name: "Ruban de gravité · courbe libre",
        visible: false,
        closed: false,
        points: [
          { x: 210, y: 300 },
          { x: 420, y: 180 },
          { x: 650, y: 430 },
          { x: 840, y: 290 },
          { x: 1050, y: 150 },
          { x: 1230, y: 430 },
          { x: 1430, y: 290 },
        ],
      });
      fx("pathDeform", ribbon, 0.3, 2.5, { pathId: "slime-ribbon" });
      const title = text(
        "textGravityTitle",
        "Titre métallique",
        "LA GRAVITÉ CHANGE LES RÈGLES",
        80,
        180,
        1400,
        50,
        30,
        "#dec8a4",
      );
      fx("metallic", title, 0, d, { color: "#e6d3a0", color2: "#9c835d" });
    } else {
      const base = (night) =>
        `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect x="2" y="2" width="316" height="196" rx="24" fill="${night ? "#263c53" : "#829b90"}" stroke="#a6bbb5" stroke-width="2"/><circle cx="${night ? 238 : 90}" cy="65" r="25" fill="${night ? "#d7d9ce" : "#e4c288"}"/><path d="M 18 175 L 90 90 L 155 150 L 220 85 L 302 175 Z" fill="${night ? "#637b87" : "#b5c4ac"}"/><path d="M 18 175 L 125 120 L 195 174 L 268 135 L 302 175 Z" fill="${night ? "#42616e" : "#648776"}"/></svg>`;
      const image = (key, name, src) =>
        add(
          key,
          {
            type: "image",
            custom: true,
            name,
            src:
              "data:image/svg+xml;base64," +
              btoa(unescape(encodeURIComponent(src))),
            fit: "contain",
            background: false,
          },
          { x: 1130, y: 365, w: 300, h: 190 },
          { behind: true },
        );
      const imageA = image(
          "imageMemoryDay",
          "Souvenir du voyage · image de départ",
          base(false),
        ),
        imageB = image(
          "imageMemoryNight",
          "Souvenir du voyage · image d’arrivée",
          base(true),
        );
      fx("transition", imageA, 3.2, 3.2, { target: imageB, hideTarget: true });
      fx("shine", "textScene", 1, 3.4, { amount: 45 });
      fx("glow", "shapeProbe", 0, d, { amount: 10, color: "#c6b4d0" });
      const summary = text(
        "textFinalLine",
        "Conclusion · balayage",
        "Chaque transformation raconte le même voyage.",
        80,
        124,
        1250,
        48,
        27,
        "#e5e4db",
      );
      fx("wipe", summary, 0.5, 2.4, { direction: "right" });
    }
    s.animation = normalizeAnimation(a);
    const own = cues.filter((c) => c.scene === i + 1);
    s.notes =
      `## ${s.title}\n\nMême personnage, trajectoire et collisions conservées.\n\n` +
      own
        .map(
          (c) =>
            `- ${c.start.toFixed(1)}–${(c.start + c.duration).toFixed(1)} s · **${c.label}** sur ${s.elements[c.key]?.name || c.key}`,
        )
        .join("\n");
  }
  const used = new Set(cues.map((c) => c.kind));
  if (effectCatalog.some((e) => !used.has(e.id)))
    throw Error("The Slime film must exercise every visual effect.");
  // Exported cue sheet is deterministic and useful to tests and documentation builders.

  return scenes;
}
