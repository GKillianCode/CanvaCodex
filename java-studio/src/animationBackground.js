import { boundColor } from "./colors.js";
export function drawAnimationBackground(ctx, config, theme) {
  if (config.background === "transparent") return;
  if (config.background === "gradient") {
    const a = ((config.gradientAngle || 0) * Math.PI) / 180,
      dx = Math.cos(a),
      dy = Math.sin(a),
      extent = (Math.abs(dx) * 1920 + Math.abs(dy) * 1080) / 2;
    const gradient = ctx.createLinearGradient(
      960 - dx * extent,
      540 - dy * extent,
      960 + dx * extent,
      540 + dy * extent,
    );
    gradient.addColorStop(0, boundColor(config, "color", theme));
    gradient.addColorStop(1, config.color2 || "#223c57");
    ctx.fillStyle = gradient;
  } else ctx.fillStyle = boundColor(config, "color", theme);
  ctx.fillRect(0, 0, 1920, 1080);
}
