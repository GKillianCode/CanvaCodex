import { normalizeEngine, normalizeAnimation } from "./animationModel.js";
import { normalizeShape } from "./shapes.js";
export function addSceneEngine(
  scene,
  kind,
  point = { x: 960, y: 540 },
  targets = [],
) {
  if (
    Object.keys(scene.elements).length >= 100 ||
    (scene.animation?.engines?.length || 0) >= 50
  )
    throw Error("Limite d’objets ou de moteurs atteinte.");
  kind = kind === "gravity" ? "gravity" : "particles";
  scene.animation ||= normalizeAnimation();
  scene.animation.engines ||= [];
  const key =
      "shapeEngine" + crypto.randomUUID().replaceAll("-", "").slice(0, 12),
    id = crypto.randomUUID();
  scene.elements[key] = normalizeShape({
    name: kind === "gravity" ? "Gravité" : "Émetteur de particules",
    shape: "circle",
    engineKind: kind,
    filled: false,
    outlined: false,
  });
  scene.positions[key] = {
    x: point.x - 24,
    y: point.y - 24,
    w: 48,
    h: 48,
    size: 24,
  };
  scene.fragments[key] = { order: 0, animation: "none" };
  scene.blockKeys.push(key);
  const engine = normalizeEngine({
    id,
    key,
    kind,
    duration: scene.animation.duration,
    targets,
    particles: { enabled: true },
    gravity: kind === "gravity" ? 200 : 0,
  });
  scene.animation.engines.push(engine);
  return engine;
}
