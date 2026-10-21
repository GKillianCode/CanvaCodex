import { ref } from "vue";
export const INTERFACE_PREFERENCES_KEY = "frame-interface-preferences";
export const interfaceFonts = [
  {
    id: "default",
    name: "DM Sans · par défaut",
    family: '"DM Sans", sans-serif',
  },
  { id: "inter", name: "Inter", family: "Inter, sans-serif" },
  { id: "montserrat", name: "Montserrat", family: "Montserrat, sans-serif" },
  { id: "lora", name: "Lora", family: "Lora, serif" },
  {
    id: "mono",
    name: "JetBrains Mono · monospace",
    family: '"JetBrains Mono", monospace',
  },
];
export const writingFonts = [
  { id: "interface", name: "Même police que l’interface", family: "inherit" },
  ...interfaceFonts,
];
export function normalizeInterfacePreferences(raw = {}) {
  return {
    showReorderArrows: raw?.showReorderArrows === true,
    interfaceFont: interfaceFonts.some((f) => f.id === raw?.interfaceFont)
      ? raw.interfaceFont
      : "default",
    writingFont: writingFonts.some((f) => f.id === raw?.writingFont)
      ? raw.writingFont
      : "interface",
    tabularNumbers: raw?.tabularNumbers !== false,
  };
}
export const showReorderArrows = ref(false);
export const typographyPreferences = ref(normalizeInterfacePreferences());
function apply(raw, persist = true) {
  const value = normalizeInterfacePreferences(raw);
  typographyPreferences.value = value;
  showReorderArrows.value = value.showReorderArrows;
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.dataset.reorderArrows = String(value.showReorderArrows);
    root.dataset.interfaceFont = value.interfaceFont;
    root.style.setProperty(
      "--frame-interface-font",
      interfaceFonts.find((f) => f.id === value.interfaceFont).family,
    );
    root.style.setProperty(
      "--frame-writing-font",
      writingFonts.find((f) => f.id === value.writingFont).family,
    );
    root.style.setProperty(
      "--frame-number-variant",
      value.tabularNumbers ? "tabular-nums" : "normal",
    );
  }
  if (persist)
    try {
      localStorage.setItem(INTERFACE_PREFERENCES_KEY, JSON.stringify(value));
    } catch {}
}
export function setReorderArrows(value) {
  apply({ ...typographyPreferences.value, showReorderArrows: value === true });
}
export function setTypographyPreference(key, value) {
  if (["interfaceFont", "writingFont", "tabularNumbers"].includes(key))
    apply({ ...typographyPreferences.value, [key]: value });
}
function read() {
  try {
    return JSON.parse(localStorage.getItem(INTERFACE_PREFERENCES_KEY) || "{}");
  } catch {
    return {};
  }
}
export function initInterfacePreferences() {
  apply(read(), false);
  if (typeof window !== "undefined")
    window.addEventListener("storage", (event) => {
      if (event.key === INTERFACE_PREFERENCES_KEY || event.key === null)
        apply(read(), false);
    });
}
