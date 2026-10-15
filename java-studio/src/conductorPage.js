export const PAGE_WIDTH = 1000;
const number = (value, fallback, min, max) =>
  Number.isFinite(Number(value))
    ? Math.max(min, Math.min(max, Number(value)))
    : fallback;
export function normalizePage(value, maxLength = 50000) {
  if (!Array.isArray(value)) return null;
  const seen = new Set();
  let remaining = maxLength;
  return value.slice(0, 100).flatMap((block) => {
    if (
      !block ||
      typeof block.id !== "string" ||
      !/^[\w-]{1,100}$/.test(block.id) ||
      seen.has(block.id)
    )
      return [];
    seen.add(block.id);
    const content =
      typeof block.content === "string"
        ? block.content.slice(0, remaining)
        : "";
    remaining -= content.length;
    const width = number(block.width, 600, 100, PAGE_WIDTH);
    return [
      {
        id: block.id,
        name:
          typeof block.name === "string" ? block.name.slice(0, 100) : "Bloc",
        kind: block.kind === "image" ? "image" : "text",
        content,
        imageId:
          typeof block.imageId === "string" ? block.imageId.slice(0, 100) : "",
        x: number(block.x, 40, 0, PAGE_WIDTH - width),
        y: number(block.y, 40, 0, 50000),
        width,
        height: number(block.height, 240, 60, 10000),
      },
    ];
  });
}
export function pageMarkdown(blocks, images = []) {
  return [...blocks]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((block) =>
      block.kind === "image"
        ? images.some((image) => image.id === block.imageId)
          ? "![](frame-image:" + block.imageId + ")"
          : ""
        : block.content,
    )
    .filter(Boolean)
    .join("\n\n");
}
export function pageHeight(blocks, editing = false) {
  return (
    Math.max(600, ...blocks.map((block) => block.y + block.height)) +
    (editing ? 400 : 40)
  );
}
export function pageGeometry(block, patch, snap = false) {
  const next = { ...block, ...patch };
  if (snap)
    for (const key of ["x", "y", "width", "height"])
      if (Object.hasOwn(patch, key))
        next[key] = Math.round(next[key] / 20) * 20;
  return normalizePage([next])[0];
}

// Pointer coordinates are relative to the transformed sheet, including its scroll offset.
export function pagePoint(clientX, clientY, rect, scale) {
  const zoom = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return {
    x: Math.max(0, Math.min(PAGE_WIDTH, (clientX - rect.left) / zoom)),
    y: Math.max(0, Math.min(50000, (clientY - rect.top) / zoom)),
  };
}
