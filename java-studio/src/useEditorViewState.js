import { ref, watch, onMounted, onUnmounted } from "vue";
const record = (value) =>
  !!value && typeof value === "object" && !Array.isArray(value);
const strings = (value) =>
  value === undefined ||
  (Array.isArray(value) &&
    value.length <= 1000 &&
    value.every((v) => typeof v === "string" && v.length <= 200));
export function validEditorView(value) {
  if (!record(value)) return false;
  for (const name of ["timeline", "inspector", "viewport", "scenes"])
    if (value[name] !== undefined && !record(value[name])) return false;
  if (value.inspector) {
    const v = value.inspector;
    if (
      v.section !== undefined &&
      !["element", "slide", "engines", "layers", "components"].includes(
        v.section,
      )
    )
      return false;
    if (
      v.category !== undefined &&
      !["style", "colors", "layout", "motion"].includes(v.category)
    )
      return false;
    for (const key of ["drawers", "scrolls"])
      if (v[key] !== undefined && !record(v[key])) return false;
  }
  for (const scene of Object.values(value.scenes || {})) {
    if (!record(scene) || !strings(scene.selection)) return false;
    if (scene.timeline !== undefined) {
      if (!record(scene.timeline)) return false;
      for (const key of ["expanded", "hidden", "folders"])
        if (!strings(scene.timeline[key])) return false;
    }
  }
  return true;
}
// Presentation preferences stay separate from exported document content and undo history.
export function useEditorViewState(storage, projectId) {
  const key = () => "frame-editor-view:" + projectId.value;
  const read = () => {
    try {
      const value = JSON.parse(storage.getItem(key()) || "{}");
      return validEditorView(value) ? value : {};
    } catch {
      return {};
    }
  };
  const state = ref(read());
  let timer;
  const save = () => {
    clearTimeout(timer);
    try {
      storage.setItem(key(), JSON.stringify(state.value));
    } catch {}
  };
  watch(
    state,
    () => {
      clearTimeout(timer);
      timer = setTimeout(save, 150);
    },
    { deep: true },
  );
  watch(projectId, () => {
    clearTimeout(timer);
    state.value = read();
  });
  onMounted(() => window.addEventListener("pagehide", save));
  onUnmounted(() => {
    save();
    window.removeEventListener("pagehide", save);
  });
  return state;
}
