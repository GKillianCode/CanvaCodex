import { makeSlide } from "./model.js";
import { normalizeAnimation } from "./animationModel.js";
import { normalizeShape } from "./shapes.js";
import { applicationFile } from "./applicationDocuments.js";
import { normalizeThemes } from "./themes.js";
export function makeWorkflowExample() {
  const s = makeSlide("title");
  Object.assign(s, {
    id: "java-reference-scene",
    title: "String · une variable et sa référence",
    label: "",
    body: "",
    code: "",
    blockKeys: [],
    elements: {},
    positions: {},
    fragments: {},
    groups: [],
  });
  function object(key, element, p) {
    s.blockKeys.push(key);
    s.elements[key] = element;
    s.positions[key] = p;
    s.fragments[key] = { order: 0, animation: "none" };
  }
  function shape(key, name, x, y, w, h, fill) {
    object(
      key,
      normalizeShape({
        shape: "rounded",
        name,
        fill,
        stroke: "#a5c1b3",
        outlined: true,
        strokeWidth: 2,
      }),
      { x, y, w, h, size: 30 },
    );
  }
  function text(key, name, text, x, y, w, h, size = 32) {
    object(
      key,
      { type: "text", custom: true, name, text },
      {
        x,
        y,
        w,
        h,
        size,
        font: "inter",
        textStyle: {
          color: "#edf2ed",
          align: "center",
          verticalAlign: "middle",
        },
      },
    );
  }
  shape("shapeVariable", "Variable nom", 250, 480, 300, 150, "#304b47");
  text("textVariable", "Nom de variable", "nom", 250, 480, 300, 150, 42);
  shape("shapeObject", "Objet String", 1180, 180, 360, 150, "#3c475e");
  text("textValue", "Valeur de l’objet", '"Bonjour"', 1180, 180, 360, 150, 38);
  text(
    "textTitle",
    "Titre",
    "String : la variable référence un objet",
    160,
    90,
    1600,
    100,
    48,
  );
  text(
    "textStatus",
    "Explication",
    "La flèche représente la référence.",
    400,
    780,
    1120,
    100,
    32,
  );
  s.positions.textStatus.opacity = 0;
  s.animation = normalizeAnimation({
    duration: 6,
    fps: 30,
    background: "gradient",
    color: "#18272c",
    color2: "#29354a",
    gradientAngle: 35,
    attachments: [
      {
        id: "name-on-variable",
        child: "textVariable",
        parent: "shapeVariable",
      },
      { id: "value-on-object", child: "textValue", parent: "shapeObject" },
    ],
    links: [
      {
        id: "java-reference",
        from: "shapeVariable",
        to: "shapeObject",
        color: "#a5cdbb",
        width: 5,
        visible: false,
      },
    ],
    clips: [
      {
        id: "arrival",
        name: "Arrivée de l’objet",
        keys: ["shapeObject"],
        duration: 2,
        frames: [
          { field: "y", time: 0, value: 180, ease: "smooth" },
          { field: "y", time: 2, value: 480 },
        ],
      },
      {
        id: "explanation",
        name: "Apparition de l’explication",
        keys: ["textStatus"],
        duration: 1,
        frames: [
          { field: "opacity", time: 0, value: 0, ease: "smooth" },
          { field: "opacity", time: 1, value: 100 },
        ],
      },
      {
        id: "camera",
        name: "Caméra · zoom sur la référence",
        keys: [],
        start: 2,
        duration: 3,
        frames: [
          { field: "cameraZoom", time: 0, value: 100, ease: "smooth" },
          { field: "cameraZoom", time: 3, value: 118 },
          { field: "cameraX", time: 0, value: 960, ease: "smooth" },
          { field: "cameraX", time: 3, value: 1020 },
        ],
      },
    ],
    events: [
      {
        id: "show-reference",
        name: "Référence à l’arrivée",
        trigger: "clipEnd",
        source: "arrival",
        action: "show",
        target: "java-reference",
      },
      {
        id: "start-explanation",
        name: "Explication après arrivée",
        trigger: "clipEnd",
        source: "arrival",
        action: "startClip",
        target: "explanation",
      },
      {
        id: "highlight",
        name: "Mettre l’objet en valeur",
        trigger: "time",
        time: 3.5,
        action: "color",
        target: "shapeObject",
        value: "#4b7770",
      },
    ],
  });
  return applicationFile(
    {
      projectId: "java-reference-workflow",
      project: "Java · références et événements",
      slides: [s],
      themes: normalizeThemes(),
      themeId: "terminal",
      resolution: { width: 1920, height: 1080 },
      frame: { header: false, footer: false, gradient: false },
      routeMode: "manual",
      routeStart: s.id,
    },
    "animation",
  );
}
