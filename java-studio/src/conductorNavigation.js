// Navigation leaves an atomic code block only at its text boundaries.
export function codeExitDirection(
  key,
  {
    collapsed,
    atStart,
    atEnd,
    ctrl = false,
    meta = false,
    alt = false,
    shift = false,
  },
) {
  if (!collapsed || alt) return 0;
  if (key === "Enter" && (ctrl || meta)) return shift ? -1 : 1;
  if (ctrl || meta || shift) return 0;
  if (atStart && ["ArrowUp", "ArrowLeft"].includes(key)) return -1;
  if (atEnd && ["ArrowDown", "ArrowRight"].includes(key)) return 1;
  return 0;
}
