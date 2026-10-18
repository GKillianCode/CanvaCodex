import { normalizeThemes } from "./themes.js";
const keys = [
  "frame-personal-themes",
  "frame-themes",
  "slides:frame-themes",
  "banners:frame-themes",
  "frame-thumbnails:frame-themes",
  "frame-animation:frame-themes",
];
function read(storage, key) {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
}
export function loadThemeLibrary(storage, documentThemes, localThemes) {
  const removed = read(storage, "frame-theme-tombstones") || [],
    map = new Map();
  for (const value of [
    ...keys
      .slice()
      .reverse()
      .map((k) => read(storage, k)),
    localThemes,
  ])
    if (Array.isArray(value))
      for (const t of normalizeThemes(value))
        if (!removed.includes(t.id)) map.set(t.id, t);
  if (Array.isArray(documentThemes))
    for (const t of normalizeThemes(documentThemes)) map.set(t.id, t);
  return normalizeThemes([...map.values()].slice(0, 100));
}
export function savePersonalTheme(storage, theme, remove = false) {
  const value = read(storage, "frame-personal-themes") || [],
    removed = new Set(read(storage, "frame-theme-tombstones") || []);
  let themes = value.filter((t) => t.id !== theme.id);
  if (remove) removed.add(theme.id);
  else {
    removed.delete(theme.id);
    themes.push(theme);
  }
  storage.setItem("frame-personal-themes", JSON.stringify(themes.slice(-100)));
  storage.setItem("frame-theme-tombstones", JSON.stringify([...removed]));
}
