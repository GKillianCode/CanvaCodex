// Shared metadata for the effect picker, normalization, presets and timeline labels.
export const effectCatalog = [
  ["fade", "Fondu", "Révéler", "Apparition ou disparition douce.", 100],
  [
    "transition",
    "Image vers image",
    "Transformer",
    "Fondre vers un autre objet, sans modifier les originaux.",
    100,
  ],
  [
    "morph",
    "Morphing vectoriel",
    "Transformer",
    "Transformer deux contours fermés simples.",
    100,
  ],
  ["wipe", "Balayage", "Révéler", "Révélation directionnelle.", 100],
  [
    "radial",
    "Ouverture circulaire",
    "Révéler",
    "Un masque grandit depuis le centre.",
    100,
  ],
  [
    "dissolve",
    "Dissolution",
    "Révéler",
    "Petits fragments dans un ordre reproductible.",
    100,
  ],
  [
    "mosaic",
    "Mosaïque",
    "Révéler",
    "Révélation en carrés avec une légère mise à l’échelle.",
    100,
  ],
  [
    "shatter",
    "Explosion",
    "Fragments",
    "L’image se brise en fragments qui tournent.",
    180,
  ],
  [
    "scatter",
    "Poussière",
    "Fragments",
    "Désintégration et dispersion vers le vent.",
    140,
  ],
  [
    "collapse",
    "Effondrement",
    "Fragments",
    "Les fragments tombent sous la gravité.",
    100,
  ],
  [
    "rebuild",
    "Reconstruction",
    "Fragments",
    "Les morceaux se rassemblent.",
    180,
  ],
  [
    "sway",
    "Balancement",
    "Déformer",
    "Pivoter depuis la base, comme une herbe.",
    8,
  ],
  [
    "wave",
    "Ondulation",
    "Déformer",
    "Déformer par bandes, comme un drapeau.",
    16,
  ],
  [
    "bend",
    "Courbure",
    "Déformer",
    "Courber progressivement depuis la base.",
    25,
  ],
  [
    "twist",
    "Torsion 2D",
    "Déformer",
    "Faire pivoter les bandes autour du centre.",
    15,
  ],
  [
    "pathDeform",
    "Déformer sur une spline",
    "Déformer",
    "Étirer la silhouette le long d’un chemin.",
    100,
  ],
  [
    "drawPath",
    "Dessiner le tracé",
    "Révéler",
    "Le contour se dessine progressivement.",
    100,
  ],
  [
    "dashFlow",
    "Contour en mouvement",
    "Graphisme",
    "Faire circuler les pointillés.",
    20,
  ],
  [
    "glitch",
    "Glitch",
    "Graphisme",
    "Bandes décalées et séparation des couleurs.",
    12,
  ],
  ["blur", "Flou", "Graphisme", "Flou réglable et animable.", 5],
  ["shadow", "Ombre", "Graphisme", "Ombre douce décalée.", 14],
  ["glow", "Halo", "Graphisme", "Lueur colorée autour de l’objet.", 18],
  [
    "trail",
    "Traînée",
    "Graphisme",
    "Échos derrière le mouvement réel de l’objet.",
    30,
  ],
  ["pulse", "Pulsation", "Graphisme", "Respiration douce autour du centre.", 5],
  [
    "flicker",
    "Scintillement",
    "Graphisme",
    "Variations de lumière reproductibles.",
    20,
  ],
  [
    "grayscale",
    "Désaturation",
    "Graphisme",
    "Retirer progressivement les couleurs.",
    100,
  ],
  ["hue", "Rotation de teinte", "Graphisme", "Faire évoluer les couleurs.", 45],
  [
    "neon",
    "Néon",
    "Typographie",
    "Texte lumineux avec halo et scintillement.",
    16,
  ],
  [
    "metallic",
    "Doré / métallique",
    "Typographie",
    "Un dégradé métallique dans la silhouette.",
    100,
  ],
  [
    "shine",
    "Reflet mobile",
    "Typographie",
    "Un reflet traverse la silhouette.",
    60,
  ],
  [
    "revealText",
    "Texte rythmé",
    "Typographie",
    "Apparition ou dispersion par lettre, mot ou ligne.",
    30,
  ],
].map(([id, name, group, description, amount]) => ({
  id,
  name,
  group,
  description,
  amount,
}));
export const visualEffectKinds = effectCatalog.map((e) => e.id);
export const timedEffectKinds = [
  "fade",
  "transition",
  "morph",
  "wipe",
  "radial",
  "dissolve",
  "mosaic",
  "shatter",
  "scatter",
  "collapse",
  "rebuild",
  "bend",
  "shine",
  "revealText",
  "drawPath",
  "pathDeform",
];
export const effectProperties = {
  progress: "Progression",
  amount: "Intensité",
  frequency: "Fréquence",
  gravity: "Gravité",
  wind: "Vent",
  rotation: "Rotation",
  stagger: "Décalage",
};
export const effectField = (id, property) => `effect:${id}:${property}`;
export function parseEffectField(field) {
  const m =
    /^effect:([\w-]{1,100}):(progress|amount|frequency|gravity|wind|rotation|stagger)$/.exec(
      field || "",
    );
  return m ? { id: m[1], property: m[2] } : null;
}
export function effectFieldLabel(field, effects = []) {
  const p = parseEffectField(field);
  if (!p) return field;
  const e = effects.find((e) => e.id === p.id);
  return `${e?.name || effectCatalog.find((c) => c.id === e?.kind)?.name || "Effet"} · ${effectProperties[p.property]}`;
}
export function effectRandom(seed, index) {
  let x = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
export function effectProgress(e, time) {
  let u =
    e.progress >= 0 ? e.progress : Math.max(0, (time - e.start) / e.duration);
  if (e.loop && e.progress < 0) u = time < e.start ? 0 : u % 1;
  u = Math.max(0, Math.min(1, u));
  return e.reverse ? 1 - u : u;
}
export function fragmentPose(e, index, progress) {
  const angle = effectRandom(e.seed, index * 4) * Math.PI * 2,
    speed = 0.3 + effectRandom(e.seed, index * 4 + 1) * 0.7,
    t = progress * e.duration;
  return {
    x: Math.cos(angle) * e.amount * progress * speed + (e.wind * t * t) / 2,
    y: Math.sin(angle) * e.amount * progress * speed + (e.gravity * t * t) / 2,
    rotation:
      (effectRandom(e.seed, index * 4 + 2) - 0.5) * e.rotation * progress,
    alpha: Math.max(0, 1 - progress),
    scale: 1 - progress * 0.35,
    speed,
  };
}
