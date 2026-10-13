// Composite in backing pixels: fractional tile edges can expose the cleared canvas.
export function drawSlideTransition(ctx, from, to, direction, progress) {
  const { width, height } = ctx.canvas;
  const x = -direction.x * Math.round(width * progress);
  const y = -direction.y * Math.round(height * progress);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(from, x, y, width, height);
  ctx.drawImage(to, x + direction.x * width, y + direction.y * height, width, height);
  ctx.restore();
}
