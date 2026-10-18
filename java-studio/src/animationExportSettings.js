export function hasTransparentScenes(scenes) {
  return scenes.some(
    (scene) => !["solid", "gradient"].includes(scene.animation?.background),
  );
}
export function resolveAnimationFormat(format, scenes) {
  return format === "auto"
    ? hasTransparentScenes(scenes)
      ? "mkv"
      : "mp4"
    : format;
}
