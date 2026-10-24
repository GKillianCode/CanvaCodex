export function timelineView(duration, zoom, padded = false) {
  const scale = Math.max(25, Math.min(1600, Number(zoom) || 100));
  return {
    zoom: scale,
    span:
      Math.max(0.1, Number(duration) || 8) *
      Math.max(1, 100 / scale) *
      (padded ? 2 : 1),
    offset: padded
      ? (Math.max(0.1, Number(duration) || 8) * Math.max(1, 100 / scale)) / 2
      : 0,
    widthPercent: Math.max(100, scale) * (padded ? 2 : 1),
  };
}
export function timelineTime(clientX, left, width, span, start = 0) {
  return Math.max(0, ((clientX - left) / Math.max(1, width)) * span - start);
}

export function snapTimelineTime(time, cursor, pixelsPerSecond, tolerance = 8) {
  return Math.abs(time - cursor) * pixelsPerSecond <= tolerance ? cursor : time;
}
export function orderedTracks(keys, order = []) {
  const known = new Set(keys);
  return [...new Set([...order.filter((k) => known.has(k)), ...keys])];
}
export function reorderTrack(keys, source, target, before = true) {
  const next = keys.filter((k) => k !== source),
    at = next.indexOf(target);
  if (source === target || at < 0) return keys;
  next.splice(at + (before ? 0 : 1), 0, source);
  return next;
}
