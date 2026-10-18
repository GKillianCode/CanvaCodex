import { reactive } from "vue";
export const localAssets = reactive({
  components: [],motions: [],
  themes: [],
  removed: [],
  ready: false,
  busy: 0,
  error: "",
  paths: {},
  revisions: {},
  version: 0,
});
let token = "",
  queue = Promise.resolve(),
  opening = null;
const clone = (v) => JSON.parse(JSON.stringify(v));
export async function refreshAssets(kinds=["components","themes","motions"]) {
  try {
    for (const kind of kinds) {
      const response = await fetch("/__frame_assets__/" + kind, {
        headers: localAssets.revisions[kind]
          ? { "If-None-Match": localAssets.revisions[kind] }
          : {},
      });
      if (response.status === 304) continue;
      if (!response.ok)
        throw Error(
          "Les bibliothèques locales sont indisponibles. Démarre Frame avec son serveur local.",
        );
      const result = await response.json();
      token = result.token;
      localAssets[kind] = result.data[kind];
      if (kind === "themes") localAssets.removed = result.data.removed || [];
      localAssets.paths[kind] = result.path;
      localAssets.revisions[kind] = result.revision;
      localAssets.version++;
    }
    localAssets.ready = true;
    localAssets.error = "";
    return localAssets;
  } catch (e) {
    localAssets.error = e.message;
    throw e;
  }
}
export function ensureAssets() {
  return (
    opening ||
    (opening = refreshAssets().catch((e) => {
      opening = null;
      throw e;
    }))
  );
}
export function updateAssets(kind, mutate) {
  const task = queue
    .catch(() => {})
    .then(async () => {
      localAssets.busy++;
      try {
        for (let retry = 0; retry < 3; retry++) {
          await refreshAssets([kind]);
          const data = {
            format:
              "frame-" +
              (kind === "themes" ? "theme" : kind === "motions" ? "motion" : "component") +
              "-library",
            version: 1,
            [kind]: clone(localAssets[kind]),
            ...(kind === "themes" ? { removed: [...localAssets.removed] } : {}),
          };
          await mutate(data);
          const response = await fetch("/__frame_assets__/" + kind, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-Frame-Assets-Token": token,
              "If-Match": localAssets.revisions[kind],
            },
            body: JSON.stringify(data),
          });
          if (response.status === 409) continue;
          if (!response.ok) {
            let result;
            try {
              result = await response.json();
            } catch {}
            throw Error(result?.error || "Enregistrement local impossible.");
          }
          const result = await response.json();
          localAssets[kind] = result.data[kind];
          if (kind === "themes") localAssets.removed = result.data.removed;
          localAssets.paths[kind] = result.path;
          localAssets.revisions[kind] = result.revision;
          localAssets.version++;
          localAssets.error = "";
          return result;
        }
        throw Error("Le fichier a changé plusieurs fois. Réessaie.");
      } catch (e) {
        localAssets.error = e.message;
        throw e;
      } finally {
        localAssets.busy--;
      }
    });
  queue = task;
  return task;
}
export function upsertAsset(kind, item, expected) {
  return updateAssets(kind, (data) => {
    const list = data[kind],
      index = list.findIndex((c) => c.id === item.id);
    if (
      expected !== undefined &&
      JSON.stringify(index < 0 ? null : list[index]) !== expected
    )
      throw Error(
        "Ce composant a changé dans un autre onglet. Recharge avant d’enregistrer.",
      );
    if (index < 0) {
      if (list.length >= 100) throw Error("Limite de 100 éléments atteinte.");
      list.push(clone(item));
    } else list[index] = clone(item);
    if (kind === "themes")
      data.removed = data.removed.filter((id) => id !== item.id);
  });
}
export function removeAsset(kind, id) {
  return updateAssets(kind, (data) => {
    data[kind] = data[kind].filter((c) => c.id !== id);
    if (kind === "themes" && !data.removed.includes(id)) data.removed.push(id);
  });
}
if (typeof window !== "undefined") {
  const focus = () => {
    if (localAssets.ready) refreshAssets().catch(() => {});
  };
  window.addEventListener("focus", focus);
  const timer = setInterval(() => {
    if (
      localAssets.ready &&
      document.visibilityState === "visible" &&
      !localAssets.busy
    )
      refreshAssets().catch(() => {});
  }, 10000);
  if (import.meta.hot)
    import.meta.hot.dispose(() => {
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    });
}
