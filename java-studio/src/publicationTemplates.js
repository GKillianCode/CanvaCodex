export const descriptionLibraryKey = "publication-description-library";
const id = (v) => (typeof v === "string" && /^[\w-]{1,100}$/.test(v) ? v : "");
const text = (v, max = 20000) => (typeof v === "string" ? v.slice(0, max) : "");
export function normalizeDescriptionLibrary(raw = {}) {
  raw = raw && typeof raw === "object" ? raw : {};
  const unique = (rows, make) => {
    const seen = new Set();
    return (Array.isArray(rows) ? rows : []).slice(0, 200).flatMap((row) => {
      const key = id(row?.id);
      if (!key || seen.has(key)) return [];
      seen.add(key);
      return [{ id: key, ...make(row) }];
    });
  };
  return {
    templates: unique(raw.templates, (row) => ({
      name: text(row.name, 120) || "Sans titre",
      playlist: text(row.playlist, 200),
      intro: text(row.intro),
      outro: text(row.outro),
      slots: unique(row.slots, (slot) => ({
        label: text(slot.label, 100) || "Bloc",
        defaultBlockId: id(slot.defaultBlockId),
      })).slice(0, 20),
    })),
    blocks: unique(raw.blocks, (row) => ({
      name: text(row.name, 120) || "Sans titre",
      content: text(row.content),
    })),
  };
}
export function composeDescription(template, library, values = {}) {
  if (!template) return "";
  return [
    template.intro,
    ...template.slots.map((slot) => {
      const choice = values[slot.id];
      if (choice?.custom !== undefined) return text(choice.custom);
      return (
        library.blocks.find(
          (block) => block.id === (choice?.blockId ?? slot.defaultBlockId),
        )?.content || ""
      );
    }),
    template.outro,
  ]
    .filter((value) => value?.trim())
    .join("\n\n")
    .slice(0, 20000);
}
