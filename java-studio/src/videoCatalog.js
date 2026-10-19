import { reactive } from "vue";
export const defaultStatuses = [
  ["backlog", "Idées / Backlog"],
  ["preparation", "Création"],
  ["ready", "Prêt à tourner"],
  ["recording", "Tournage"],
  ["editing", "Montage"],
  ["done", "Terminé"],
  ["publishing", "À publier"],
  ["published", "Publié"],
];
export const defaultTypes = [
  ["course", "Cours"],
  ["exercise", "Exercice"],
  ["demo", "Démonstration"],
];
export const catalogKey = "video-catalog";
export const validVideoId = (value) =>
  typeof value === "string" && /^[a-z][a-z0-9_-]{0,80}$/.test(value);
export function normalizeCatalog(raw = {}) {
  const rows = (value, fallback, required) => {
    if (!Array.isArray(value)) return fallback.map((row) => [...row]);
    const ids = new Set(),
      labels = new Set();
    const result = [];
    for (const row of value.slice(0, 100)) {
      if (!Array.isArray(row) || !validVideoId(row[0]) || ids.has(row[0]))
        continue;
      const name = String(row[1] ?? "")
          .trim()
          .slice(0, 80),
        key = name.toLocaleLowerCase();
      if (!name || labels.has(key)) continue;
      ids.add(row[0]);
      labels.add(key);
      result.push([row[0], name]);
    }
    return result.length || !required
      ? result
      : fallback.map((row) => [...row]);
  };
  const statuses = rows(raw.statuses, defaultStatuses, true),
    types = rows(raw.types, defaultTypes, false);
  return {
    statuses,
    types,
    defaultType: types.some(([id]) => id === raw.defaultType)
      ? raw.defaultType
      : "",
    fallbackStatus: statuses.some(([id]) => id === raw.fallbackStatus)
      ? raw.fallbackStatus
      : statuses.find(([id]) => id === "preparation")?.[0] || statuses[0][0],
  };
}
export const videoStatuses = reactive(defaultStatuses.map((row) => [...row]));
export const videoTypes = reactive(defaultTypes.map((row) => [...row]));
export const videoCatalog = reactive({
  defaultType: "",
  fallbackStatus: "preparation",
});
export function installCatalog(raw) {
  const c = normalizeCatalog(raw);
  videoStatuses.splice(0, videoStatuses.length, ...c.statuses);
  videoTypes.splice(0, videoTypes.length, ...c.types);
  Object.assign(videoCatalog, {
    defaultType: c.defaultType,
    fallbackStatus: c.fallbackStatus,
  });
  return c;
}
export function catalogSnapshot() {
  return normalizeCatalog({
    statuses: videoStatuses,
    types: videoTypes,
    ...videoCatalog,
  });
}
export function migrateVideoClassification(
  project,
  catalog,
  applyDefault = false,
) {
  const status = catalog.statuses.some(([id]) => id === project.status)
    ? project.status
    : catalog.fallbackStatus;
  let videoType = catalog.types.some(([id]) => id === project.videoType)
    ? project.videoType
    : "";
  if (applyDefault && !videoType) videoType = catalog.defaultType;
  return { status, videoType };
}
