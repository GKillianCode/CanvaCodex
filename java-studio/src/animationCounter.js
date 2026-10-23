import { timecodeParts } from "./timecode.js";
const number = (v, f, min, max) =>
  Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : f;
export function normalizeCounter(raw = {}) {
  const mode = raw.mode === "time" ? "time" : "number",
    limit = mode === "time" ? 86400 : 1e12;
  return {
    mode,
    from: number(raw.from, 0, mode === "time" ? 0 : -limit, limit),
    to: number(raw.to, 100, mode === "time" ? 0 : -limit, limit),
    duration: number(raw.duration, 10, 0.001, 120),
    easing: ["linear", "smooth", "easeIn", "easeOut"].includes(raw.easing)
      ? raw.easing
      : "linear",
    pad: raw.pad !== false,
    decimals: Math.round(number(raw.decimals, 0, 0, 6)),
    format: raw.format === "ms" ? "ms" : "hms",
    separator: String(raw.separator ?? ":").slice(0, 3),
    decimalSeparator: String(raw.decimalSeparator ?? ".").slice(0, 1),
    grouping: raw.grouping === true,
    prefix: String(raw.prefix ?? "").slice(0, 60),
    suffix: String(raw.suffix ?? "").slice(0, 60),
  };
}
export function normalizeCounters(raw) {
  return Object.fromEntries(
    Object.entries(
      raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {},
    )
      .slice(0, 200)
      .filter(([k, v]) => k.length <= 100 && v && typeof v === "object")
      .map(([k, v]) => [k, normalizeCounter(v)]),
  );
}
export function counterText(raw, value) {
  const c = normalizeCounter(raw);
  let text;
  if (c.mode === "time") {
    // Floor to complete seconds so a running clock does not advance early.
    const parts = timecodeParts(Math.floor(Math.max(0, value) + 1e-7));
    text = (
      c.format === "ms"
        ? [
            String(Number(parts.hours) * 60 + Number(parts.minutes)).padStart(
              Math.max(
                2,
                String(Math.floor(Math.max(c.from, c.to) / 60)).length,
              ),
              "0",
            ),
            parts.seconds,
          ]
        : [parts.hours, parts.minutes, parts.seconds]
    ).join(c.separator);
  } else {
    const rounded = c.decimals
      ? Number(value.toFixed(c.decimals))
      : c.to >= c.from
        ? Math.floor(value + 1e-7)
        : Math.ceil(value - 1e-7);
    const digits = Math.max(
      Math.floor(Math.abs(c.from)).toString().length,
      Math.floor(Math.abs(c.to)).toString().length,
    );
    let [whole, fraction] = Math.abs(rounded).toFixed(c.decimals).split(".");
    if (c.pad) whole = whole.padStart(digits, "0");
    if (c.grouping) whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, c.separator);
    const sign =
      rounded < 0 ? "-" : c.pad && (c.from < 0 || c.to < 0) ? " " : "";
    text =
      sign + whole + (fraction != null ? c.decimalSeparator + fraction : "");
  }
  return c.prefix + text + c.suffix;
}
