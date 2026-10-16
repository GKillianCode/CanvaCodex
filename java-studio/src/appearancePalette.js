// UI colors only: the drawing engine and user document palettes are independent.
export function lightUIColor(hex, role = "ink") {
  let raw = hex.replace("#", "");
  if (raw.length <= 4)
    raw = raw
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(raw.slice(0, 2), 16),
    g = parseInt(raw.slice(2, 4), 16),
    b = parseInt(raw.slice(4, 6), 16),
    alpha = raw.length === 8 ? raw.slice(6) : "";
  const max = Math.max(r, g, b) / 255,
    min = Math.min(r, g, b) / 255,
    l = (max + min) / 2,
    s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  const encode = (values) =>
    "#" +
    values.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("") +
    alpha;
  if (role === "surface") {
    // Translucent black is a scrim/checkerboard, not a panel surface.
    if (alpha && max < 0.08) return hex;
    if (l < 0.37 && s < 0.65) {
      const v = 250 - l * 70;
      return encode([v - 3, v, v - 1]);
    }
    if (l < 0.45 && s >= 0.65)
      return encode([
        r * 0.25 + 250 * 0.75,
        g * 0.25 + 252 * 0.75,
        b * 0.25 + 250 * 0.75,
      ]);
    return hex;
  }
  if (role === "line") {
    if (s > 0.35 && l > 0.45) return encode([r * 0.5, g * 0.5, b * 0.5]);
    return encode([201, 215, 207]);
  }
  if (l < 0.28) return hex;
  if (s > 0.42) {
    const factor = l > 0.65 ? 0.44 : 0.65;
    return encode([r * factor, g * factor, b * factor]);
  }
  if (l > 0.7) return encode([37, 56, 46]);
  return encode([78, 100, 87]);
}
