import {anchorPoint} from "./animationWorkflow.js";
import { visibleBlocks } from "./model.js";
export function drawAnimationDiagnostics(ctx, state, flags = {}) {
  const { scene, config } = state;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.font = "18px Inter";
  ctx.setLineDash([7, 5]);
  function box(p, color, label) {
    if (!p) return;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.strokeRect(p.x, p.y, p.w, p.h || 0);
    if (label) ctx.fillText(label, p.x, p.y - 8);
  }
  if (flags.bounds)
    for (const key of visibleBlocks(scene)) {
      const p = scene.positions[key];
      if (p && !scene.elements[key]?.engineKind)
        box(p, "#9ab7c6", scene.elements[key]?.name || key);
    }
  if (flags.collisions)
    for (const e of config.effects.filter(
      (e) => e.enabled && e.kind === "collider",
    ))
      box(scene.positions[e.key], "#84b9dd", "Obstacle");
  if (flags.contacts)
    for (const r of config.triggers.filter((r) => r.enabled)) {
      const fired = scene.positions[r.actor]?.contacts?.includes(r.id);
      box(
        scene.positions[r.target],
        fired ? "#93c89e" : "#e4bb78",
        fired ? "Contact déclenché" : "Contact",
      );
    }
  if (flags.attachments)
    for (const r of config.attachments.filter((r) => r.enabled)) {
      const a = scene.positions[r.parent],
        b = scene.positions[r.child];
      if (!a || !b) continue;
      ctx.strokeStyle = "#b7a0d4";
      ctx.beginPath();
      const from=anchorPoint(a,r.parentX,r.parentY),to=anchorPoint(b,r.childX,r.childY);
      ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);
      ctx.stroke();
    }
  if (flags.forces)
    for (const e of config.engines.filter(
      (e) => e.enabled && e.kind === "gravity",
    ))
      for (const key of e.targets) {
        const p = scene.positions[key];
        if (!p) continue;
        const r = [...(p.contacts||[])].reverse().map(id=>config.triggers.find(r=>r.id===id)).find(r=>r?.gravity!=null),
          g = r?.gravity ?? e.gravity,
          sign = Math.sign(g),
          x = p.x + p.w / 2,
          y = p.y + p.h / 2;
        ctx.strokeStyle = "#df9d9b";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + sign * 90);
        ctx.lineTo(x - 8, y + sign * 75);
        ctx.moveTo(x, y + sign * 90);
        ctx.lineTo(x + 8, y + sign * 75);
        ctx.stroke();
        ctx.fillStyle = "#df9d9b";
        ctx.fillText("g = " + Math.round(g), x + 12, y + sign * 45);
      }
  if (flags.camera) {
    const c = config.camera,
      w = (1920 * 100) / c.zoom,
      h = (1080 * 100) / c.zoom;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate((c.rotation * Math.PI) / 180);
    box({ x: -w / 2, y: -h / 2, w, h }, "#c4a5d6", "Cadrage caméra");
    ctx.restore();
  }
  ctx.restore();
}
