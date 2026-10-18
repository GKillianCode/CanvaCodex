export function storyboard(scenes) {
  let start = 0;
  return scenes.map((scene) => {
    const duration = Math.max(
        0.1,
        Math.min(120, Number(scene.animation?.duration) || 8),
      ),
      part = { scene, start, duration };
    start += duration;
    return part;
  });
}
export function storyboardDuration(scenes) {
  return storyboard(scenes).reduce((n, p) => n + p.duration, 0);
}
export function storyboardAt(scenes, time) {
  const parts = storyboard(scenes);
  if (!parts.length) return null;
  const t = Math.max(0, Number(time) || 0),
    part = parts.find((p) => t < p.start + p.duration) || parts.at(-1);
  return {
    ...part,
    time: Math.max(0, Math.min(part.duration, t - part.start)),
    index: parts.indexOf(part),
  };
}
