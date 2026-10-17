import {workspaceLocalStorage} from './localPersistence.js';
import { ref } from "vue";
export const APPEARANCE_KEY = "frame-ui-appearance";
export const appearance = ref("dark");
export function readAppearance(storage) {
  try {
    return storage?.getItem(APPEARANCE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}
export function setAppearance(value, persist = true) {
  appearance.value = value === "light" ? "light" : "dark";
  if (typeof document !== "undefined")
    document.documentElement.dataset.appearance = appearance.value;
  if (persist)
    try {
      workspaceLocalStorage.setItem(APPEARANCE_KEY, appearance.value);
    } catch {}
}
export function initAppearance() {
  let storage;
  try {
    storage = workspaceLocalStorage;
  } catch {}
  setAppearance(readAppearance(storage), false);
  window.addEventListener("storage", (event) => {
    if (event.key === APPEARANCE_KEY || event.key === null)
      setAppearance(readAppearance(storage), false);
  });
}
