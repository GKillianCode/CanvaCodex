export const MAX_NOTES = 20000;
export function normalizeNotes(value) {
  return typeof value === "string" ? value.slice(0, MAX_NOTES) : "";
}
