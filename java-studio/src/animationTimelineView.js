export function timelineView(duration, zoom) {
  const scale = Math.max(25, Math.min(1600, Number(zoom) || 100));
  return {
    zoom: scale,
    span: Math.max(0.1, Number(duration) || 8) * Math.max(1, 100 / scale),
    widthPercent: Math.max(100, scale),
  };
}
export function timelineTime(clientX, left, width, span, start = 0) {
  return Math.max(0, ((clientX - left) / Math.max(1, width)) * span - start);
}
