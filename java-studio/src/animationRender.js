import { animationScene, animationParticles } from "./animationModel.js";
import { renderSlide } from "./render.js";
export function renderAnimation(
  ctx,
  scene,
  theme,
  config,
  time,
  { guides = false } = {},
) {
  const state = animationScene(scene, config, time);
  ctx.save();
  if (state.config.background === "solid") {
    ctx.fillStyle = state.config.color;
    ctx.fillRect(0, 0, 1920, 1080);
  }
  renderSlide(ctx, state.scene, theme, {
    transparent: true,
    order: Infinity,
    typingElapsed: state.typingElapsed,
  });
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
    for (const particle of animationParticles(clip, time, {
      x: p.x + (p.w || 0) / 2,
      y: p.y + (p.h || 0) / 2,
    })) {
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  for (const path of state.config.paths)
    if (path.visible || guides) {
      const [a, b, c, d] = path.points;
      ctx.save();
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 3;
      if (!path.visible) ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo(b.x, b.y, c.x, c.y, d.x, d.y);
      ctx.stroke();
      ctx.restore();
    }
  ctx.restore();
  return state;
}
