import { anchorPoint, cameraFrame } from "./animationWorkflow.js";
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
      const from = anchorPoint(a, r.parentX, r.parentY),
        to = anchorPoint(b, r.childX, r.childY);
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
  if (flags.forces)
    for (const e of config.engines.filter(
      (e) => e.enabled && e.kind === "gravity",
    ))
      for (const key of e.targets) {
        const p = scene.positions[key];
        if (!p) continue;
        const r = [...(p.contacts || [])]
            .reverse()
            .map((id) => config.triggers.find((r) => r.id === id))
            .find((r) => r?.gravity != null),
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
      { w, h, corners } = cameraFrame(c);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 1920, 1080);
    ctx.clip();
    ctx.beginPath();
    ctx.rect(0, 0, 1920, 1080);
    ctx.moveTo(corners[0].x, corners[0].y);
    for (const p of corners.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = "rgba(20,24,35,0.22)";
    ctx.fill("evenodd");
    ctx.restore();
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate((c.rotation * Math.PI) / 180);
    ctx.setLineDash([]);
    ctx.strokeStyle = "#ad8bd1";
    ctx.lineWidth = 3;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 10);
    ctx.stroke();
    const text =
      "CAMÉRA · " + Number(c.zoom.toFixed(1)).toLocaleString("fr-FR") + " %";
    ctx.font = "600 20px Inter";
    const width = ctx.measureText(text).width + 24;
    ctx.fillStyle = "#342a44";
    ctx.fillRect(-w / 2, -h / 2 - 32, width, 32);
    ctx.fillStyle = "#f3ebff";
    ctx.fillText(text, -w / 2 + 12, -h / 2 - 10);
    ctx.restore();
  }
  ctx.restore();
}
