import { makeSlide } from "./model.js";
import { normalizeAnimation } from "./animationModel.js";
export function makeAnimationExample(kind = "gc") {
  const s = makeSlide("title");
  s.blockKeys = [];
  s.elements = {};
  s.positions = {};
  s.fragments = {};
  s.title =
    kind === "pool"
      ? "String Pool · chaîne absente"
      : "GC · parcours simplifié";
  s.label = "";
  s.body = "";
  s.code = "";
  function shape(id, name, x, y, w, h, fill) {
    s.elements[id] = {
      type: "shape",
      custom: true,
      shape: "rounded",
      name,
      fill,
      stroke: fill,
      filled: true,
      outlined: false,
      radius: 8,
      opacity: 100,
    };
    s.positions[id] = { x, y, w, h, size: 32 };
    s.fragments[id] = { order: 0, animation: "none" };
    s.blockKeys.push(id);
  }
  function text(id, value, x, y, w = 450, size = 38) {
    s.elements[id] = { type: "text", custom: true, text: value, name: value };
    s.positions[id] = {
      x,
      y,
      w,
      h: 90,
      size,
      font: "inter",
      textStyle: { color: "#e5eaf0", weight: 500, verticalAlign: "middle" },
    };
    s.fragments[id] = { order: 0, animation: "none" };
    s.blockKeys.push(id);
  }
  text("textHeading", s.title, 120, 50, 1600, 58);
  if (kind === "gc") {
    for (const [i, name] of ["Eden", "Survivor", "Old"].entries()) {
      shape(
        "shapeZone" + i,
        name,
        140 + i * 570,
        300,
        500,
        600,
        ["#263c46", "#343650", "#403c2e"][i],
      );
      text("textZone" + i, name, 170 + i * 570, 320);
    }
    shape("shapeObject", "Objet", 220, 520, 140, 140, "#78bca8");
    text(
      "textHint",
      "Illustration simplifiée : les étapes dépendent du collecteur.",
      120,
      950,
      1680,
      30,
    );
    s.animation = normalizeAnimation({
      duration: 8,
      background: "solid",
      color: "#10181e",
      clips: [
        {
          id: "object",
          name: "Promotion de l’objet",
          duration: 8,
          keys: ["shapeObject"],
          frames: [
            { field: "x", time: 0, value: 220, ease: "hold" },
            { field: "x", time: 1, value: 220, ease: "smooth" },
            { field: "x", time: 3, value: 790, ease: "hold" },
            { field: "x", time: 4, value: 790, ease: "smooth" },
            { field: "x", time: 6, value: 1360 },
          ],
        },
      ],
    });
  } else {
    shape("shapePool", "String Pool", 1020, 280, 720, 600, "#30394c");
    text("textPool", "String Pool", 1080, 310);
    text("textValue", '"Java"', 1170, 520);
    text("textVariable", "Référence : message", 150, 500, 650);
    text(
      "textHint",
      "Cas : littéral absent du pool → création, puis référence.",
      120,
      950,
      1680,
      30,
    );
    shape("shapeReference", "Référence", 600, 620, 45, 45, "#78bca8");
    s.animation = normalizeAnimation({
      duration: 8,
      background: "solid",
      color: "#10181e",
      paths: [
        {
          id: "route",
          visible: true,
          points: [
            { x: 600, y: 620 },
            { x: 800, y: 850 },
            { x: 1000, y: 400 },
            { x: 1150, y: 620 },
          ],
        },
      ],
      clips: [
        {
          id: "value",
          name: "Création de la chaîne",
          duration: 8,
          keys: ["textValue"],
          frames: [
            { field: "opacity", time: 0, value: 0, ease: "hold" },
            { field: "opacity", time: 2, value: 0, ease: "smooth" },
            { field: "opacity", time: 3, value: 100 },
          ],
        },
        {
          id: "reference",
          name: "Référence vers la chaîne",
          start: 3,
          duration: 5,
          keys: ["shapeReference"],
          pathId: "route",
        },
      ],
    });
  }
  return s;
}
