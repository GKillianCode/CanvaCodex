import { pageHeight } from "./conductorPage.js";
// Merge old private cue documents once, preserving source text and placed blocks.
export function mergeConductorNotes(sequence) {
  if (!sequence?.cues?.trim() && !sequence?.cuesLayout?.length)
    return { sequence, merged: false };
  const cues = sequence.cues || "";
  const script = [
    sequence.script || "",
    "---\n\n### Instructions de tournage\n\n" + cues,
  ]
    .filter(Boolean)
    .join("\n\n");
  if (script.length > 50000)
    return {
      sequence,
      merged: false,
      reason: "La partie dépasse la limite de texte après regroupement.",
    };
  let scriptLayout = sequence.scriptLayout;
  if (scriptLayout || sequence.cuesLayout) {
    const textBlock = (id, content, y, height = 300) => ({
      id: crypto.randomUUID(),
      kind: "text",
      name: "Texte",
      content,
      imageId: "",
      x: 40,
      y,
      width: 920,
      height,
    });
    const existing = scriptLayout?.map((b) => ({ ...b })) || [
      textBlock("script-" + sequence.id, sequence.script || "", 40, 380),
    ];
    const bottom = Math.max(40, ...existing.map((b) => b.y + b.height)) + 40;
    const notes = sequence.cuesLayout?.length
      ? sequence.cuesLayout.map((b) => ({ ...b }))
      : [textBlock("instructions-" + sequence.id, cues, 0)];
    const top = Math.min(...notes.map((b) => b.y));
    scriptLayout = [
      ...existing,
      textBlock(
        "instructions-heading-" + sequence.id,
        "### Instructions de tournage",
        bottom,
        80,
      ),
      ...notes.map((b) => ({
        ...b,
        id: crypto.randomUUID(),
        y: bottom + 100 + b.y - top,
      })),
    ];
    if (
      scriptLayout.length > 100 ||
      scriptLayout.some((b) => b.y > 50000) ||
      pageHeight(scriptLayout) > 60000
    )
      return {
        sequence,
        merged: false,
        reason:
          "La mise en page contient trop de blocs pour être regroupée automatiquement.",
      };
  }
  return {
    sequence: {
      ...sequence,
      script,
      cues: "",
      ...(scriptLayout ? { scriptLayout } : {}),
      cuesLayout: [],
    },
    merged: true,
  };
}
