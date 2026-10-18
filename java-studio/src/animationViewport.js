export function drawEngineGuides(ctx, scene, theme) {
  for (const key of scene.blockKeys || []) {
    const e = scene.elements[key],
      p = scene.positions[key];
    if (!e?.engineKind || !p) continue;
    ctx.save();
    ctx.strokeStyle = theme.accent;
    ctx.fillStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(p.x + p.w / 2 - 10, p.y + p.h / 2);
    ctx.lineTo(p.x + p.w / 2 + 10, p.y + p.h / 2);
    ctx.moveTo(p.x + p.w / 2, p.y + p.h / 2 - 10);
    ctx.lineTo(p.x + p.w / 2, p.y + p.h / 2 + 10);
    ctx.stroke();
    ctx.font = "500 28px Inter";
    ctx.fillText(e.name, p.x + p.w / 2 + 28, p.y + p.h / 2 + 8);
    ctx.restore();
  }
}
