import { ref } from "vue";
const key = "frame-interface-preferences";
export const showReorderArrows = ref(false);
export function setReorderArrows(value) {
  showReorderArrows.value = value === true;
  if (typeof document !== "undefined")
    document.documentElement.dataset.reorderArrows = String(
      showReorderArrows.value,
    );
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ showReorderArrows: showReorderArrows.value }),
    );
  } catch {}
}
export function initInterfacePreferences() {
  let value = false;
  try {
    value =
      JSON.parse(localStorage.getItem(key) || "{}").showReorderArrows === true;
  } catch {}
  setReorderArrows(value);
}
