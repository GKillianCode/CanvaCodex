import {projectCameraPose} from "./animationWorkflow.js";
import { storyboardAt } from "./animationStoryboard.js";
import { animationScene } from "./animationModel.js";
import { renderAnimation } from "./animationRender.js";
import { renderSlide } from "./render.js";
export function storyboardTransition(scenes, time) {
  const part = storyboardAt(scenes, time);
  if (!part) return null;
  const next = scenes[part.index + 1],
    duration = Math.min(
      part.duration / 2,
      Math.max(0, Number(part.scene.animation?.transition) || 0),
    );
  if (!next || !duration || part.time < part.duration - duration)
    return { ...part, next: null, progress: 0 };
  const t = (part.time - part.duration + duration) / duration,
    progress = t * t * (3 - 2 * t);
  const dx = (next.grid?.x || 0) - (part.scene.grid?.x || 0),
    dy = (next.grid?.y || 0) - (part.scene.grid?.y || 0);
  return {
    ...part,
    next,
    progress,
    offset:
      Math.abs(dy) > Math.abs(dx)
        ? { x: 0, y: (Math.sign(dy) || 1) * 1080 }
        : { x: (Math.sign(dx) || 1) * 1920, y: 0 },
  };
}
export function renderAnimationStoryboard(ctx, scenes, theme, time,options={}) {
  const part = storyboardTransition(scenes, time);
  if (!part) return;
  if (!part.next)
    return renderAnimation(
      ctx,
      part.scene,
      theme,
      part.scene.animation,
      part.time,options,
    );
  const { next, progress: u, offset: d } = part,
    a = part.scene.animation,
    b = next.animation;
  const linked =
    a.actorId &&
    a.actorId === b.actorId &&
    part.scene.elements[a.actorKey] &&
    next.elements[b.actorKey];
  const hide = (scene, key) => ({
    ...scene,
    hiddenKeys: [...(scene.hiddenKeys || []), ...(key ? [key] : [])],
  });
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 1920, 1080);
  ctx.clip();
  ctx.save();
  ctx.translate(-d.x * u, -d.y * u);
  const from = renderAnimation(
    ctx,
    hide(part.scene, linked ? a.actorKey : null),
    theme,
    a,
    part.time,options,
  );
  ctx.restore();
  ctx.save();
  ctx.translate(d.x * (1 - u), d.y * (1 - u));
  const to = renderAnimation(
    ctx,
    hide(next, linked ? b.actorKey : null),
    theme,
    b,
    0,options,
  );
  ctx.restore();
  if (linked) {
    const p = options.camera===false?from.scene.positions[a.actorKey]:projectCameraPose(from.scene.positions[a.actorKey],from.config.camera),
      q = options.camera===false?to.scene.positions[b.actorKey]:projectCameraPose(to.scene.positions[b.actorKey],to.config.camera);
    if (p && q) {
      const pose = { ...p };
      for (const k of ["x", "y", "w", "h", "rotation", "opacity"]) {
        const source = p[k] ?? (k === "opacity" ? 100 : 0),
          target = q[k] ?? (k === "opacity" ? 100 : 0);
        pose[k] =
          source +
          (target + (k === "x" ? d.x : k === "y" ? d.y : 0) - source) * u;
      }
      pose.x -= d.x * u;
      pose.y -= d.y * u;
      renderSlide(
        ctx,
        {
          ...part.scene,
          blockKeys: [a.actorKey],
          elements: { [a.actorKey]: from.scene.elements[a.actorKey] },
          positions: { [a.actorKey]: pose },
          fragments: { [a.actorKey]: { order: 0, animation: "none" } },
          hiddenKeys: [],
        },
        theme,
        { transparent: true, order: Infinity },
      );
    }
  }
  ctx.restore();
  return from;
}
