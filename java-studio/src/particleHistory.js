import { animationScene } from "./animationModel.js";
const histories = new WeakMap();
export function particleOriginSampler(scene, config, key) {
  const signature = JSON.stringify(
    [
      scene.positions,
      Object.entries(scene.elements || {}).map(([key, e]) => [
        key,
        { type: e.type, engineKind: e.engineKind },
      ]),
      config,
    ],
    (key, value) =>
      ["src", "imageSrc", "text", "code", "textRuns"].includes(key)
        ? undefined
        : value,
  );
  let history = histories.get(scene);
  if (!history || history.signature !== signature) {
    history = { signature, samples: new Map() };
    histories.set(scene, history);
  }
  return (time) => {
    const stamp = Math.max(0, time).toFixed(6);
    let sample = history.samples.get(stamp);
    if (!sample) {
      const positions = animationScene(scene, config, Number(stamp)).scene
        .positions;
      const keys = new Set([
        key,
        ...config.engines
          .filter((e) => e.kind === "particles")
          .map((e) => e.key),
        ...config.clips
          .filter((c) => c.particles?.enabled)
          .map((c) => c.keys[0]),
      ]);
      sample = Object.fromEntries(
        [...keys]
          .filter((k) => positions[k])
          .map((k) => [
            k,
            {
              x: positions[k].x + (positions[k].w || 0) / 2,
              y: positions[k].y + (positions[k].h || 0) / 2,
            },
          ]),
      );
      history.samples.set(stamp, sample);
      if (history.samples.size > 128)
        history.samples.delete(history.samples.keys().next().value);
    }
    const p = sample[key];
    return p || { x: 0, y: 0 };
  };
}
