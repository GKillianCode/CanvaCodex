// Presentation notes are private metadata; changing them cannot change pixels.
// Do not read their values while collecting Vue render dependencies.
export function visualSnapshot(value) {
  if (Array.isArray(value)) return value.map(visualSnapshot);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => key !== "notes" || typeof value.title !== "string")
        .map((key) => [key, visualSnapshot(value[key])]),
    );
  return value;
}
