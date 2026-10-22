import {
  createDesign,
  designElement,
  designPage,
  designId,
  normalizeDesign,
} from "./designModel.js";

// Native Frame documents: every label, path, table and panel remains editable.
const C = {
  paper: "#f6f4ed",
  white: "#ffffff",
  ink: "#162d35",
  muted: "#5b7279",
  line: "#ced8d4",
  teal: "#226d68",
  mint: "#dcebe3",
  orange: "#b65a33",
  sand: "#f1dfcb",
  blue: "#315e8a",
  ice: "#e2ecf4",
  dark: "#173b40",
};
export const advancedDesignExamples = {
  vector: {
    title: "Atlas JVM",
    subtitle: "Un système d’illustrations techniques",
    detail: "4 plans · schémas, Bézier, découpes et identité visuelle",
    preview: "/examples/atlas-jvm.svg",
  },
  layout: {
    title: "Dans la mémoire de Java",
    subtitle: "Un dossier de cours prêt à explorer",
    detail: "7 pages · code, tableaux, exercices et poster paysage",
    preview: "/examples/memoire-java.svg",
  },
};
function builder(kind, name) {
  const d = createDesign(kind, name);
  d.pages = [];
  d.themeId = "paper";
  d.transparent = false;
  d.pageNumbers = false;
  d.margin = 54;
  d.header = "";
  d.footer = "";
  d.styles = {
    title: {
      name: "Titre de page",
      font: "inter",
      size: kind === "vector" ? 64 : 38,
      weight: 700,
      leading: 1.06,
    },
    heading: {
      name: "Intertitre",
      font: "inter",
      size: kind === "vector" ? 26 : 23,
      weight: 600,
      leading: 1.2,
    },
    body: {
      name: "Texte courant",
      font: "inter",
      size: kind === "vector" ? 18 : 14,
      weight: 400,
      leading: 1.55,
    },
    caption: {
      name: "Légende",
      font: "inter",
      size: kind === "vector" ? 14 : 10.5,
      weight: 400,
      leading: 1.4,
    },
    label: {
      name: "Repère de rubrique",
      font: "inter",
      size: kind === "vector" ? 12 : 10,
      weight: 600,
      leading: 1.4,
    },
    display: {
      name: "Grand titre",
      font: "space-grotesk",
      size: kind === "vector" ? 84 : 66,
      weight: 600,
      leading: 1.06,
    },
    code: {
      name: "Code Java",
      font: "jetbrains-mono",
      size: kind === "vector" ? 18 : 12.5,
      weight: 400,
      leading: 1.6,
    },
  };
  d.styles.mono = { ...d.styles.code, name: "Libellé monospace" };
  let page;
  const add = (type, o) => {
    const e = designElement(type, o);
    page.elements.push(e);
    return e;
  };
  const shape = (x, y, w, h, fill = C.mint, o = {}) =>
    add("shape", {
      x,
      y,
      w,
      h,
      shape: "rect",
      fill,
      stroke: C.line,
      strokeWidth: 1,
      outlined: false,
      ...o,
    });
  const text = (value, x, y, w, h, style = "body", o = {}) => {
    if (style === "code" && o.code !== true) style = "mono";
    return add("text", {
      x,
      y,
      w,
      h,
      text: value,
      style,
      ...d.styles[style],
      fill: C.ink,
      name: value.replaceAll("\n", " ").slice(0, 65),
      ...o,
    });
  };
  const rule = (x, y, w, color = C.line) =>
    curve(
      [
        { x, y },
        { x: x + w, y },
      ],
      color,
      1,
      { name: "Filet de séparation" },
    );
  const label = (value, x, y, w = 600, o = {}) =>
    text(value, x, y, w, 24, "label", {
      fill: C.teal,
      letterSpacing: 0.12,
      ...o,
    });
  const dot = (x, y, r = 4, fill = C.teal, o = {}) =>
    shape(x - r, y - r, r * 2, r * 2, fill, { shape: "ellipse", ...o });
  const curve = (points, color = C.teal, width = 2, o = {}) => {
    const xs = points.flatMap((p) => [p.x, p.inX ?? p.x, p.outX ?? p.x]),
      ys = points.flatMap((p) => [p.y, p.inY ?? p.y, p.outY ?? p.y]);
    const x = Math.min(...xs),
      y = Math.min(...ys),
      w = Math.max(4, Math.max(...xs) - x),
      h = Math.max(4, Math.max(...ys) - y);
    return shape(x, y, w, h, color, {
      name: "Trajet Bézier",
      shape: "freeform",
      closed: false,
      filled: false,
      outlined: true,
      stroke: color,
      strokeWidth: width,
      nodes: points.map((p) => ({
        x: ((p.x - x) / w) * 100,
        y: ((p.y - y) / h) * 100,
        inX: (((p.inX ?? p.x) - x) / w) * 100,
        inY: (((p.inY ?? p.y) - y) / h) * 100,
        outX: (((p.outX ?? p.x) - x) / w) * 100,
        outY: (((p.outY ?? p.y) - y) / h) * 100,
      })),
      ...o,
    });
  };
  const code = (value, x, y, w, h, o = {}) =>
    text(value, x, y, w, h, "code", {
      code: true,
      language: "java",
      codeBackground: C.ice,
      ...o,
    });
  const panel = (x, y, w, h, fill = C.white, o = {}) =>
    shape(x, y, w, h, fill, {
      shape: "rounded",
      radius: 3,
      outlined: true,
      ...o,
    });
  function newPage(name, w, h, bg = C.paper) {
    page = {
      ...designPage(name.replace(/^\d{2}\s*[·—-]\s*/, "")),
      width: w,
      height: h,
      background: bg,
    };
    d.pages.push(page);
    return page;
  }
  function stamp(index, name, w, h) {
    rule(54, 45, w - 108);
    label("FRAME / JAVA EN PROFONDEUR", 54, 23, w / 2);
    text(name, w - 300, 23, 246, 20, "label", {
      align: "right",
      fill: C.muted,
    });
    rule(54, h - 49, w - 108);
    text(
      "ATLAS 01     /     MÉMOIRE & RÉFÉRENCES",
      54,
      h - 35,
      w - 190,
      18,
      "caption",
      { fill: C.muted },
    );
    text(String(index).padStart(2, "0"), w - 105, h - 38, 51, 22, "label", {
      align: "right",
    });
  }
  function block(title, description, x, y, w, number) {
    label(number, x, y, w);
    text(title, x, y + 33, w, 42, "heading");
    text(description, x, y + 85, w, 110, "body", { fill: C.muted });
  }
  return {
    d,
    add,
    shape,
    text,
    rule,
    label,
    dot,
    curve,
    code,
    panel,
    newPage,
    stamp,
    block,
    get page() {
      return page;
    },
  };
}
function stackDiagram(b, x, y, scale = 1) {
  const { shape, text, label, curve, dot, panel } = b,
    S = (v) => v * scale;
  panel(x, y, S(300), S(310), C.white, { name: "Pile du thread" });
  label("THREAD / MAIN", x + S(22), y + S(20), S(260), {
    size: S(12),
    h: S(23),
  });
  ["main()", "traiter()", "afficher()"].forEach((v, i) => {
    const g = designId();
    shape(
      x + S(20),
      y + S(70 + i * 70),
      S(260),
      S(53),
      i === 2 ? C.mint : C.paper,
      { group: g, name: "Frame " + v },
    );
    text(v, x + S(34), y + S(82 + i * 70), S(220), S(30), "body", {
      size: S(18),
      group: g,
    });
  });
}
function heapDiagram(b, x, y, scale = 1) {
  const { shape, text, label, dot, panel, curve } = b,
    S = (v) => v * scale;
  panel(x, y, S(820), S(310), C.white, { name: "Tas partagé" });
  label("HEAP / PARTAGÉ", x + S(24), y + S(20), S(400), { size: S(12) });
  shape(x + S(24), y + S(68), S(460), S(215), C.mint, {
    name: "Objets accessibles",
  });
  label("OBJETS ACCESSIBLES", x + S(44), y + S(85), S(350), { size: S(11) });
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 6; c++) {
      shape(
        x + S(45 + c * 67),
        y + S(123 + r * 45),
        S(50),
        S(29),
        (r + c) % 4 === 0 ? C.teal : "#afd0bf",
        { name: `Objet ${r * 6 + c + 1}`, shape: "rounded", radius: 6 },
      );
    }
  shape(x + S(504), y + S(68), S(292), S(215), C.sand, {
    name: "Objets hors graphe",
  });
  label("À RÉÉVALUER PAR LE GC", x + S(524), y + S(85), S(270), {
    size: S(10),
  });
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      shape(x + S(526 + c * 82), y + S(123 + r * 45), S(64), S(29), "#d6baa0", {
        shape: "rounded",
        radius: 6,
        name: "Objet sans chemin depuis les racines",
        opacity: 60 + (r + c) * 6,
      });
}
function poolDiagram(b, x, y, s = 1) {
  const S = (v) => v * s,
    { panel, shape, text, label, curve, dot } = b;
  panel(x, y, S(330), S(252), C.white);
  label("RÉFÉRENCES", x + S(20), y + S(18), S(290), { size: S(11) });
  ["a", "b", "c", "d"].forEach((v, i) => {
    text(v, x + S(25), y + S(64 + i * 44), S(35), S(30), "code", {
      size: S(18),
    });
    ruleLocal(x + S(70), y + S(83 + i * 44), S(225));
  });
  function ruleLocal(xx, yy, w) {
    curve(
      [
        { x: xx, y: yy },
        { x: xx + w, y: yy },
      ],
      C.line,
      S(1),
    );
  }
  panel(x + S(550), y, S(600), S(252), C.white);
  label("OBJETS STRING", x + S(574), y + S(18), S(420), { size: S(11) });
  panel(x + S(590), y + S(62), S(240), S(74), C.mint);
  text('"Java"', x + S(607), y + S(81), S(205), S(39), "heading", {
    size: S(28),
    align: "center",
  });
  panel(x + S(870), y + S(150), S(240), S(74), C.sand);
  text('"Java"', x + S(889), y + S(167), S(200), S(39), "heading", {
    size: S(28),
    align: "center",
  });
  [
    [0, 96, C.teal],
    [1, 96, C.teal],
    [2, 188, C.orange],
    [3, 96, C.blue],
  ].forEach(([i, target, color]) => {
    const dest = i === 2 ? 870 : 590;
    curve(
      [
        {
          x: x + S(302),
          y: y + S(80 + i * 44),
          outX: x + S(440),
          outY: y + S(80 + i * 44),
        },
        {
          x: x + S(dest),
          y: y + S(target),
          inX: x + S(490),
          inY: y + S(target),
        },
      ],
      color,
      S(2),
    );
    dot(x + S(dest), y + S(target), S(4), color);
  });
}
function vectorAtlas() {
  const b = builder("vector", "Atlas JVM · Système visuel"),
    {
      d,
      shape,
      text,
      label,
      dot,
      curve,
      code,
      panel,
      newPage,
      stamp,
      rule,
      block,
    } = b;
  d.width = 1600;
  d.height = 1000;
  newPage("01 · Cartographie de la mémoire", 1600, 1000);
  stamp(1, "CARTOGRAPHIE", 1600, 1000);
  label("LIRE LES MÉCANISMES, PAS LES ADRESSES.", 80, 99, 1000);
  text("La mémoire,\nsans boîte noire.", 80, 145, 1050, 210, "display");
  text(
    "Un atlas pour expliquer la JVM.\nDes relations visibles, des objets\nqui restent éditables.",
    1210,
    172,
    310,
    135,
    "body",
    { size: 20, fill: C.muted },
  );
  stackDiagram(b, 80, 382, 1.08);
  heapDiagram(b, 570, 382, 1.08);
  curve(
    [
      { x: 405, y: 624, outX: 485, outY: 624 },
      { x: 618, y: 543, inX: 493, inY: 543 },
    ],
    C.teal,
    3,
  );
  dot(618, 543, 6);
  label("UNE RÉFÉRENCE", 433, 579, 180, { size: 10 });
  [
    [
      "01",
      "Une pile par thread",
      "Les frames suivent les appels. Les variables locales peuvent contenir des références.",
    ],
    [
      "02",
      "Un tas partagé",
      "Des objets reliés entre eux. Le schéma représente des relations logiques, pas une disposition physique.",
    ],
    [
      "03",
      "La portée ne suffit pas",
      "Le ramasse-miettes raisonne sur l’accessibilité. Le moment de la collecte n’est pas garanti.",
    ],
  ].forEach(([n, t, p], i) => {
    const x = 80 + i * 490;
    rule(x, 772, 455);
    label(n, x, 791, 45);
    text(t, x + 50, 788, 405, 40, "heading", { size: 23 });
    text(p, x + 50, 837, 395, 78, "body", { size: 16, fill: C.muted });
  });
  newPage("02 · Identité et String pool", 1600, 1000);
  stamp(2, "IDENTITÉ / CONTENU", 1600, 1000);
  label("EXPLIQUER UNE DISTINCTION", 80, 102);
  text(
    "Même texte.\nPas forcément le même objet.",
    80,
    145,
    1440,
    160,
    "title",
    { size: 64 },
  );
  poolDiagram(b, 80, 370, 1.25);
  code(
    'String a = "Java";\nString b = "Java";\nString c = new String("Java");\nString d = c.intern();',
    80,
    742,
    720,
    166,
  );
  const outcomes = [
    ["a == b", "true", C.teal],
    ["a == c", "false", C.orange],
    ["a.equals(c)", "true", C.teal],
    ["a == d", "true", C.blue],
  ];
  outcomes.forEach(([expr, result, color], i) => {
    const x = 850 + (i % 2) * 345,
      y = 750 + Math.floor(i / 2) * 82;
    rule(x, y, 315);
    text(expr, x, y + 12, 230, 34, "code", { size: 19 });
    text(result, x + 230, y + 12, 85, 34, "body", {
      size: 19,
      weight: 600,
      fill: color,
      align: "right",
    });
  });
  newPage("03 · Fabrique de signes", 1440, 1000);
  stamp(3, "SYSTÈME GRAPHIQUE", 1440, 1000);
  label("LE MÊME LANGAGE VISUEL, À TOUTES LES ÉCHELLES", 80, 102, 1200);
  text("Des pièces.\nUn système.", 80, 150, 900, 210, "display");
  label("01 / UNE DÉCOUPE RÉELLE", 80, 365, 600);
  const g = designId();
  const ring = shape(100, 425, 230, 230, C.teal, {
    shape: "ellipse",
    group: g,
    name: "Anneau · soustraction",
  });
  const hole = shape(158, 483, 114, 114, C.white, {
    shape: "ellipse",
    group: g,
    name: "Découpe centrale",
  });
  ring.cutouts = [hole.id];
  [0, 1, 2].forEach((i) =>
    shape(348, 439 + i * 71, 156 - i * 25, 36, [C.teal, C.blue, C.orange][i], {
      group: g,
      name: "Barre du signe " + (i + 1),
      shape: "rounded",
      radius: 15,
    }),
  );
  text(
    "Soustraction non destructive.\nDéplace les deux formes pour\nchanger la silhouette du signe.",
    80,
    706,
    450,
    100,
    "body",
    { fill: C.muted },
  );
  label("02 / COURBES & POINTS", 550, 365, 500);
  for (let i = 0; i < 6; i++)
    curve(
      [
        { x: 560, y: 460 + i * 23, outX: 650, outY: 325 + i * 30 },
        { x: 850, y: 600 + i * 17, inX: 750, inY: 770 - i * 10 },
      ],
      i % 2 ? C.teal : C.blue,
      2,
      { name: "Courbe de construction " + i, opacity: 35 + i * 10 },
    );
  text(
    "Chaque courbe conserve ses points\net ses tangentes. Aucune image\nfigée derrière cette construction.",
    550,
    706,
    380,
    105,
    "body",
    { fill: C.muted },
  );
  label("03 / IMAGE DANS UNE FORME", 1000, 365, 390);
  const motif =
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#e2ecf4"/>' +
    Array.from(
      { length: 12 },
      (_, i) =>
        `<path d="M ${-250 + i * 55} 0 L ${150 + i * 55} 400" fill="none" stroke="${i % 2 ? "#226d68" : "#315e8a"}" stroke-width="22"/>`,
    ).join("") +
    "</svg>";
  shape(1020, 430, 295, 240, C.ice, {
    shape: "hexagon",
    imageSrc: "data:image/svg+xml;base64," + btoa(motif),
    outlined: true,
    stroke: C.ink,
    strokeWidth: 3,
    name: "Hexagone · image vectorielle masquée",
  });
  text(
    "Un motif SVG autonome, masqué\ndans un hexagone avec un contour\nindépendant.",
    1000,
    706,
    365,
    105,
    "body",
    { fill: C.muted },
  );
  const colors = [C.ink, C.teal, C.blue, C.orange, C.mint, C.sand];
  colors.forEach((c, i) => {
    shape(80 + i * 215, 865, 190, 22, c, { name: "Nuance " + c });
    text(c.toUpperCase(), 80 + i * 215, 899, 190, 24, "caption", {
      font: "jetbrains-mono",
      size: 13,
    });
  });
  newPage("04 · La vie d’une référence", 1600, 1000);
  stamp(4, "SÉQUENCE VISUELLE", 1600, 1000);
  label("UN SCÉNARIO, TROIS ÉTATS", 80, 105);
  text(
    "Copier une référence\nne copie pas l’objet.",
    80,
    150,
    1430,
    170,
    "title",
    { size: 68 },
  );
  const stages = [
    ["A", "Créer", "Une référence désigne\nun nouvel objet."],
    ["B", "Partager", "Deux références désignent\nle même objet."],
    ["C", "Détacher", "Une référence change ;\nl’autre conserve son objet."],
  ];
  stages.forEach(([letter, title, desc], i) => {
    const x = 80 + i * 495;
    panel(x, 390, 450, 405);
    label("ÉTAT " + letter, x + 28, 413, 300);
    text(title, x + 28, 450, 390, 50, "heading", { size: 32 });
    text(desc, x + 28, 517, 385, 72, "body", { size: 18, fill: C.muted });
    const gy = 650;
    shape(x + 32, gy, 84, 52, C.ice, { shape: "rounded", radius: 8 });
    text("a", x + 32, gy + 8, 84, 33, "code", { align: "center", size: 24 });
    shape(x + 305, gy - 6, 92, 68, i === 2 ? C.sand : C.mint, {
      shape: "rounded",
      radius: 8,
    });
    text(i === 2 ? "O2" : "O1", x + 305, gy + 6, 92, 40, "code", {
      align: "center",
      size: 24,
    });
    curve(
      [
        { x: x + 116, y: gy + 26, outX: x + 200, outY: gy + 26 },
        { x: x + 305, y: gy + 26, inX: x + 235, inY: gy + 26 },
      ],
      C.teal,
      2,
    );
    if (i) {
      shape(x + 32, gy + 75, 84, 52, C.ice, { shape: "rounded", radius: 8 });
      text("b", x + 32, gy + 82, 84, 35, "code", { align: "center", size: 24 });
      if (i === 1)
        curve(
          [
            { x: x + 116, y: gy + 101, outX: x + 220, outY: gy + 101 },
            { x: x + 305, y: gy + 26, inX: x + 220, inY: gy + 26 },
          ],
          C.blue,
          2,
        );
      else {
        shape(x + 305, gy + 76, 92, 60, C.mint, {
          shape: "rounded",
          radius: 8,
        });
        text("O1", x + 305, gy + 87, 92, 36, "code", {
          align: "center",
          size: 24,
        });
        curve(
          [
            { x: x + 116, y: gy + 101 },
            { x: x + 305, y: gy + 101 },
          ],
          C.blue,
          2,
        );
      }
    }
  });
  code(
    "Object a = new Object();       Object b = a;       a = new Object();",
    80,
    838,
    1440,
    70,
    { size: 22 },
  );
  return normalizeDesign(d);
}
function layoutDossier() {
  const b = builder("layout", "Dans la mémoire de Java · Dossier atelier"),
    {
      d,
      shape,
      text,
      label,
      dot,
      curve,
      code,
      panel,
      newPage,
      stamp,
      rule,
      block,
    } = b;
  const W = d.width,
    H = d.height;
  d.columns = 2;
  d.columnWeights = [1, 1];
  d.gutter = 28;
  d.rows = 3;
  d.rowWeights = [1, 1, 1];
  d.rowGutter = 22;
  const section = (n, kicker, title, intro) => {
    newPage(
      String(n).padStart(2, "0") + " · " + title.replaceAll("\n", " "),
      W,
      H,
    );
    stamp(n, "DOSSIER / JAVA", W, H);
    label(kicker, 54, 91, W - 108);
    text(title, 54, 131, W - 108, 108, "title");
    if (intro) text(intro, 54, 258, W - 108, 90, "body", { fill: C.muted });
  };
  // 01 Cover: editorial composition, negative space, a native vector network.
  newPage("01 · Couverture", W, H);
  stamp(1, "ÉDITION / 01", W, H);
  label("LES CARNETS TECHNIQUES", 54, 112, W - 108);
  text("Dans la\nmémoire\nde Java.", 54, 165, W - 108, 246, "display");
  text(
    "Références, identité et objets partagés.\nUn dossier pour lire le code autrement.",
    58,
    443,
    650,
    65,
    "body",
    { size: 19, fill: C.muted },
  );
  shape(54, 556, W - 108, 342, C.dark, {
    name: "Fond de l’illustration",
    gradient: true,
    fill2: "#24564f",
  });
  for (let i = 0; i < 7; i++)
    curve(
      [
        { x: 70, y: 600 + i * 36, outX: 250, outY: 510 + i * 28 },
        { x: 730, y: 622 + i * 32, inX: 520, inY: 960 - i * 25 },
      ],
      i % 2 ? "#6b9a91" : "#aacac0",
      1.2,
      { opacity: 25 + i * 9 },
    );
  [
    [200, 677, 31],
    [420, 720, 46],
    [607, 646, 24],
  ].forEach(([x, y, r], i) => {
    dot(x, y, r, [C.mint, C.sand, C.ice][i]);
    dot(x, y, r / 2, C.dark);
  });
  label("COMPRENDRE / REPRÉSENTER / PRATIQUER", 54, 945, W - 108);
  text(
    "Un parcours en sept pages, avec un poster et un laboratoire.\nTous les schémas et blocs de ce document restent éditables.",
    54,
    983,
    W - 108,
    55,
    "body",
    { fill: C.muted },
  );
  // 02 Reading model.
  section(
    2,
    "01 / MODÈLE MENTAL",
    "La variable\nn’est pas l’objet.",
    "Affecter une référence crée un nouvel accès à un objet. Cela ne construit pas une copie de cet objet.",
  );
  code(
    'var a = new StringBuilder("A");\nvar b = a;\nb.append("B");\nSystem.out.println(a); // AB',
    54,
    379,
    W - 108,
    135,
  );
  label("DEUX NOMS, UN SEUL OBJET", 54, 553, W - 108);
  const graphY = 613;
  panel(54, graphY, 238, 170, C.white);
  text("a\n\nb", 78, graphY + 25, 55, 125, "code", { size: 20 });
  panel(462, graphY + 34, 276, 101, C.mint);
  text('StringBuilder\n"AB"', 482, graphY + 52, 235, 75, "heading", {
    size: 23,
    align: "center",
  });
  [43, 112].forEach((yy, i) => {
    curve(
      [
        { x: 143, y: graphY + yy, outX: 300, outY: graphY + yy },
        { x: 462, y: graphY + 84, inX: 335, inY: graphY + 84 },
      ],
      i ? C.blue : C.teal,
      2,
    );
    dot(462, graphY + 84, 4, i ? C.blue : C.teal);
  });
  rule(54, 831, W - 108);
  label("POINT DE VIGILANCE", 54, 854, 300);
  text(
    "La référence est copiée ; le contenu ne l’est pas.",
    54,
    894,
    W - 108,
    38,
    "heading",
    { size: 22 },
  );
  text(
    "Une réaffectation de a ne change pas b. En revanche, une mutation de l’objet partagé est observable depuis les deux références. Ce sont deux opérations différentes.",
    54,
    947,
    W - 108,
    96,
    "body",
    { fill: C.muted },
  );
  // 03 identity and strings
  section(
    3,
    "02 / COMPARER",
    "Identité ou\ncontenu ?",
    "L’opérateur == compare les références. Pour String, equals compare le contenu de la chaîne.",
  );
  poolDiagram(b, 54, 382, 0.59);
  code(
    'String a = "Java";\nString b = "Java";\nString c = new String("Java");\nString d = c.intern();',
    54,
    569,
    W - 108,
    133,
  );
  label("LIRE LES RÉSULTATS", 54, 737, W - 108);
  const tw = W - 108,
    tableY = 782;
  shape(54, tableY, tw, 37, C.dark);
  text("EXPRESSION", 68, tableY + 10, 280, 20, "label", { fill: C.white });
  text("RÉSULTAT", 54 + tw / 2 + 14, tableY + 10, 260, 20, "label", {
    fill: C.white,
  });
  b.add("table", {
    x: 54,
    y: tableY + 37,
    w: tw,
    h: 160,
    rows: 4,
    columns: 2,
    text: "a == b\ttrue\na == c\tfalse\na.equals(c)\ttrue\na == d\ttrue",
    font: "jetbrains-mono",
    size: 13,
    fill: C.white,
    cellColor: C.ink,
    filled: true,
    outlined: true,
    stroke: C.line,
    strokeWidth: 1,
    name: "Tableau identité et contenu",
  });
  text(
    "intern() retourne la référence canonique d’une chaîne de même contenu.\nLe dessin est logique : il ne décrit ni adresses ni implantation physique.",
    54,
    1005,
    W - 108,
    50,
    "caption",
    { fill: C.muted },
  );
  // 04 collection and reachability
  section(
    4,
    "03 / ACCESSIBILITÉ",
    "Ce qui reste\naccessible.",
    "Un objet devenu inaccessible peut être récupéré. Cela ne dit pas quand le ramasse-miettes interviendra.",
  );
  label("UNE VUE LOGIQUE DU GRAPHE", 54, 373, W - 108);
  const nodes = [
    [94, 450, "Racine", C.ice],
    [308, 450, "Objet A", C.mint],
    [548, 450, "Objet B", C.mint],
    [308, 630, "Objet C", C.mint],
    [548, 630, "Isolé", C.sand],
  ];
  [
    [0, 1],
    [1, 2],
    [1, 3],
  ].forEach(([a, z]) => {
    const n = nodes[a],
      m = nodes[z];
    curve(
      [
        { x: n[0] + 63, y: n[1] + 35, outX: m[0] + 63, outY: n[1] + 35 },
        { x: m[0] + 63, y: m[1] + 35, inX: m[0] + 63, inY: n[1] + 35 },
      ],
      C.teal,
      2,
    );
  });
  nodes.forEach(([x, y, t, c]) => {
    panel(x, y, 126, 70, c, { name: t });
    text(t, x + 8, y + 22, 110, 30, "body", {
      align: "center",
      weight: 600,
      size: 14,
    });
  });
  label("SANS CHEMIN DEPUIS LES RACINES", 444, 728, 300, {
    size: 9,
    fill: C.orange,
  });
  rule(54, 788, W - 108);
  [
    [
      "01",
      "Portée",
      "La fin d’une portée et l’inaccessibilité ne sont pas des synonymes.",
    ],
    [
      "02",
      "Graphe",
      "Un cycle d’objets sans accès depuis les racines peut aussi devenir collectable.",
    ],
    [
      "03",
      "Collecte",
      "La stratégie et le calendrier dépendent de l’implémentation.",
    ],
  ].forEach(([n, t, p], i) => {
    const x = 54 + i * 238;
    label(n, x, 822, 200);
    text(t, x, 854, 210, 40, "heading");
    text(p, x, 910, 210, 120, "body", { fill: C.muted, size: 13 });
  });
  // 05 Landscape poster: reuse diagram builders with editable scaled geometry.
  newPage("05 · Poster — pile et tas", H, W);
  stamp(5, "POSTER / VUE D’ENSEMBLE", H, W);
  label("UNE AUTRE ÉCHELLE DE LECTURE", 54, 90, H - 108);
  text("Suivre les références.", 54, 130, H - 108, 80, "title", { size: 48 });
  text(
    "Pile, tas et accessibilité : un schéma logique à annoter, à déplacer ou à exporter séparément.",
    54,
    228,
    H - 108,
    45,
    "body",
    { fill: C.muted },
  );
  stackDiagram(b, 54, 327, 0.82);
  heapDiagram(b, 365, 327, 0.82);
  curve(
    [
      { x: 286, y: 511, outX: 331, outY: 511 },
      { x: 405, y: 459, inX: 332, inY: 459 },
    ],
    C.teal,
    2,
  );
  label("LES APPELS STRUCTURENT LES FRAMES", 54, 618, 470, { size: 10 });
  label("LES LIENS STRUCTURENT L’ACCESSIBILITÉ", 585, 618, 470, { size: 10 });
  text(
    "La pile est propre au thread. Le tas est partagé.\nCe modèle explique les relations ; il ne fige pas la mémoire physique.",
    54,
    663,
    H - 108,
    62,
    "body",
    { size: 16 },
  );
  // 06 exercises
  section(
    6,
    "04 / LABORATOIRE",
    "Lire. Prédire.\nPuis vérifier.",
    "Avant d’exécuter les extraits, dessine les références et justifie chaque résultat.",
  );
  label("EXERCICE 01 / ALIASING", 54, 373, W - 108);
  code(
    'var a = new StringBuilder("J");\nvar b = a;\na = new StringBuilder("K");\nb.append("ava");',
    54,
    409,
    W - 108,
    126,
  );
  text(
    "Que contiennent a et b ? Combien de StringBuilder as-tu représentés ?",
    54,
    558,
    W - 108,
    43,
    "body",
  );
  for (let i = 0; i < 3; i++) rule(54, 623 + i * 29, W - 108);
  label("EXERCICE 02 / IDENTITÉ", 54, 742, W - 108);
  code(
    'String x = new String("JVM");\nString y = "JVM";\nboolean p = x == y;\nboolean q = x.intern() == y;',
    54,
    778,
    W - 108,
    126,
  );
  text(
    "Prédis p et q, puis explique pourquoi equals ne répond pas à la même question que ==.",
    54,
    930,
    W - 108,
    50,
    "body",
  );
  for (let i = 0; i < 2; i++) rule(54, 1017 + i * 29, W - 108);
  // 07 answer key and provenance
  section(
    7,
    "05 / CORRIGÉ & PROLONGEMENTS",
    "Revenir\nau raisonnement.",
    "Les résultats ont du sens lorsqu’on les relie au graphe d’objets, et pas seulement à une sortie de console.",
  );
  const boxes = [
    [
      "01",
      "Deux objets, deux contenus",
      "a désigne le nouveau StringBuilder contenant K. b conserve le premier, qui contient Java. Réaffecter une variable ne redirige pas les autres références.",
    ],
    [
      "02",
      "Deux références distinctes",
      "p vaut false. q vaut true : intern() retourne la référence canonique correspondant au contenu JVM. x.equals(y) vaut true.",
    ],
  ];
  boxes.forEach(([n, t, p], i) => {
    const y = 371 + i * 202;
    panel(54, y, W - 108, 172, i ? C.ice : C.mint, { outlined: false });
    label(n, 75, y + 18, 70);
    text(t, 120, y + 18, W - 190, 40, "heading", { size: 22 });
    text(p, 75, y + 69, W - 150, 90, "body");
  });
  label("SOURCES / POUR VÉRIFIER", 54, 811, W - 108);
  text(
    "Java Virtual Machine Specification · §2.5 et §2.6\nJava Language Specification · §15.21.3\nAPI String · equals(Object) et intern()",
    54,
    851,
    W - 108,
    88,
    "body",
    { size: 13, fill: C.muted },
  );
  text(
    "docs.oracle.com/javase/specs/jvms/se25/html/jvms-2.html\ndocs.oracle.com/javase/specs/jls/se25/html/jls-15.html\ndocs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/String.html",
    54,
    954,
    W - 108,
    76,
    "caption",
    { font: "jetbrains-mono", size: 9.3, fill: C.muted },
  );
  return normalizeDesign(d);
}
export function advancedDesign(kind) {
  return kind === "layout" ? layoutDossier() : vectorAtlas();
}
