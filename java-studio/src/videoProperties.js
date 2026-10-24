export const videoControls = [
  {
    field: "videoVolume",
    label: "Volume vidéo",
    unit: "%",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 100,
  },
  {
    field: "videoRate",
    label: "Vitesse de lecture",
    unit: "×",
    min: 0.1,
    max: 4,
    step: 0.05,
    defaultValue: 1,
  },
];
export const videoAnimationFields = videoControls.map((c) => c.field);
export const videoAnimationLabels = Object.fromEntries(
  videoControls.map((c) => [c.field, c.label + " · " + c.unit]),
);
export function normalizeVideoProperties(raw = {}) {
  return Object.fromEntries(
    videoControls.map((c) => [
      c.field,
      Number.isFinite(Number(raw[c.field])) && raw[c.field] != null
        ? Math.max(c.min, Math.min(c.max, Number(raw[c.field])))
        : c.defaultValue,
    ]),
  );
}
