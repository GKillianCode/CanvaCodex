import {particleOriginSampler} from "./particleHistory.js";
import {drawAnimationBackground} from "./animationBackground.js";
import {splineSegments} from "./splines.js";
import { drawShape, normalizeShape, shapeGeometry } from "./shapes.js";
import { boundColor } from "./colors.js";
import { animationScene, animationParticles } from "./animationModel.js";
import { renderSlide } from "./render.js";
export function renderAnimation(
  ctx,
  scene,
  theme,
  config,
  time,
  { guides = false, positions = null } = {},
) {
  const state = animationScene(scene, config, time);
  if(positions) Object.assign(state.scene.positions, positions);
  ctx.save();
  drawAnimationBackground(ctx,state.config,theme);
  const cutters = state.config.effects
    .filter(
      (e) =>
        e.enabled && ["subtract", "intersect"].includes(e.kind) && e.target,
    )
    .map((e) => e.target);
  renderSlide(
    ctx,
    {
      ...state.scene,
      hiddenKeys: [...(state.scene.hiddenKeys || []), ...cutters],
    },
    theme,
    {
      transparent: true,
      order: Infinity,
      typingElapsed: state.typingElapsed,
      beforeObject: (ctx, key) => {
        for (const effect of state.config.effects.filter(
          (e) =>
            e.enabled &&
            e.key === key &&
            ["subtract", "intersect"].includes(e.kind),
        )) {
          const p = state.scene.positions[effect.target],
            e = state.scene.elements[effect.target];
          if (!p || e?.type !== "shape") continue;
          const path = shapeGeometry(
              { ...e, outlined: false, filled: true },
              p,
            ),
            transformed = new Path2D(),
            cx = p.x + p.w / 2,
            cy = p.y + (p.h || 0) / 2,
            m = new DOMMatrix()
              .translate(cx, cy)
              .rotate(p.rotation || 0)
              .skewX(p.skewX || 0)
              .skewY(p.skewY || 0)
              .translate(-cx, -cy);
          transformed.addPath(path, m);
          if (effect.kind === "subtract") {
            const inverse = new Path2D();
            inverse.rect(-20000, -20000, 40000, 40000);
            inverse.addPath(transformed);
            ctx.clip(inverse, "evenodd");
          } else ctx.clip(transformed);
        }
      },
    },
  );
  for (const link of state.config.links) {
    const a = state.scene.positions[link.from],
      b = state.scene.positions[link.to];
    if (!a || !b) continue;
    const dx = b.x + (b.w || 0) / 2 - a.x - (a.w || 0) / 2,
      dy = b.y + (b.h || 0) / 2 - a.y - (a.h || 0) / 2;
    if (!dx && !dy) continue;
    const edge = (p, x, y) => {
        const f = Math.min(
          x ? Math.abs((p.w || 0) / 2 / x) : Infinity,
          y ? Math.abs((p.h || 0) / 2 / y) : Infinity,
        );
        return {
          x: p.x + (p.w || 0) / 2 + x * f,
          y: p.y + (p.h || 0) / 2 + y * f,
        };
      },
      from = edge(a, dx, dy),
      to = edge(b, -dx, -dy),
      angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.strokeStyle = link.color;
    ctx.fillStyle = link.color;
    ctx.lineWidth = link.width;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - 18 * Math.cos(angle - 0.4),
      to.y - 18 * Math.sin(angle - 0.4),
    );
    ctx.lineTo(
      to.x - 18 * Math.cos(angle + 0.4),
      to.y - 18 * Math.sin(angle + 0.4),
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  for (const clip of state.config.clips) {
    if (!clip.enabled) continue;
    const p = state.scene.positions[clip.keys[0]];
    if (!p) continue;
    for (const particle of animationParticles(clip, time, particleOriginSampler(scene,config,clip.keys[0]))) {
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = boundColor(clip.particles, "color", theme);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  for (const engine of state.config.engines) {
    if (!engine.enabled || engine.kind !== "particles") continue;
    const p = state.scene.positions[engine.key];
    if (!p) continue;
    for (const particle of animationParticles(
      { ...engine, particles: { ...engine.particles, enabled: true } },
      time,
      particleOriginSampler(scene,config,engine.key),
    )) {
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.translate(particle.x, particle.y);
      ctx.rotate((engine.particles.rotation * Math.PI) / 180);
      const shape = normalizeShape({
        ...engine.particles.shape,
        fill: boundColor(engine.particles, "color", theme),
        fillRole: null,
        stroke: boundColor(engine.particles, "color", theme),
        strokeRole: null,
        opacity: 100,
      });
      drawShape(
        ctx,
        shape,
        {
          x: -particle.size * engine.particles.aspect,
          y: -particle.size,
          w: particle.size * 2 * engine.particles.aspect,
          h: particle.size * 2,
        },
        theme,
      );
      ctx.restore();
    }
  }
  for (const path of state.config.paths)
    if (path.visible || guides) {
      const segments=splineSegments(path.points,path.closed),a=segments[0][0];
      ctx.save();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 3;
      if (!path.visible) ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      for(const [,b,c,d] of segments)ctx.bezierCurveTo(b.x,b.y,c.x,c.y,d.x,d.y);
      ctx.stroke();
      ctx.restore();
    }
  ctx.restore();
  return state;
}
