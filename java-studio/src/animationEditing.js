export function editableClip(clips, selectedId, key, time) {
  const selected = clips.find(
    (c) => c.id === selectedId && c.keys.length === 1 && c.keys[0] === key,
  );
  return (
    selected ||
    clips
      .filter(
        (c) =>
          c.keys.length === 1 &&
          c.keys[0] === key &&
          time >= c.start &&
          time <= c.start + c.duration,
      )
      .sort((a, b) => b.start - a.start)[0]
  );
}
export function moveKeySelection(
  entries,
  delta,
  origins = entries.map((r) => r.key.time),
) {
  const min = Math.max(...entries.map((r, i) => -origins[i])),
    max = Math.min(...entries.map((r, i) => r.clip.duration - origins[i]));
  const shift = Math.max(min, Math.min(max, delta));
  const changed = entries.map((r, i) => ({
    ...r,
    time: Math.round((origins[i] + shift) * 1e6) / 1e6,
  }));
  if (
    changed.some((r) =>
      r.clip.frames.some(
        (f) =>
          f !== r.key &&
          !entries.some((e) => e.key === f) &&
          f.field === r.key.field &&
          Math.abs(f.time - r.time) < 1e-6,
      ),
    )
  )
    return false;
  for (const r of changed) r.key.time = r.time;
  for (const r of entries) r.clip.frames.sort((a, b) => a.time - b.time);
  return true;
}
export function copyKeySelection(entries) {
  if (!entries.length) return [];
  const first = Math.min(...entries.map((r) => r.clip.start + r.key.time));
  return entries.map((r) => ({
    ...JSON.parse(JSON.stringify(r.key)),
    time: r.clip.start + r.key.time - first,
  }));
}
