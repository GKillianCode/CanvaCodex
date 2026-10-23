import { timecodeParts } from "./timecode.js";
const number = (v, f, min, max) =>
  Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : f;
export function normalizeCounter(raw = {}) {
  const mode = raw.mode === "time" ? "time" : "number",
    limit = mode === "time" ? 86400 : 1e12;
  return {
    mode,
    display: raw.display === 'scroll' ? 'scroll' : 'replace',
    direction: ['left','right','up','down'].includes(raw.direction) ? raw.direction : 'up',
    from: number(raw.from, 0, mode === "time" ? 0 : -limit, limit),
    to: number(raw.to, 100, mode === "time" ? 0 : -limit, limit),
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

// Only the two adjacent values are evaluated: no list of all intermediate numbers.
export function counterScroll(raw, value) {
  const c = normalizeCounter(raw);
  if (c.display !== 'scroll' || c.from === c.to) return null;
  const sign = Math.sign(c.to-c.from), factor = c.mode === 'time' ? 1 : 10**c.decimals;
  const bounded = Math.max(Math.min(c.from,c.to),Math.min(Math.max(c.from,c.to),value));
  if (Math.abs(bounded-c.to)<1e-9) return {current:counterText(c,c.to),next:counterText(c,c.to),progress:0,direction:c.direction};
  const current = (sign > 0 ? Math.floor(bounded*factor+1e-7) : Math.ceil(bounded*factor-1e-7))/factor;
  const next = sign > 0 ? Math.min(c.to,current+1/factor) : Math.max(c.to,current-1/factor);
  const progress = next === current ? 0 : Math.max(0,Math.min(1,(bounded-current)/(next-current)));
  return {current:counterText(c,current),next:counterText(c,next),progress,direction:c.direction};
}

// The disappearance bound is exclusive: reach the target on the last visible frame.
export function counterTiming(range, sceneDuration, fps) {
  const end = Math.max(0, Math.min(sceneDuration, range?.end ?? sceneDuration));
  const start = Math.max(0, Math.min(end, range?.start ?? 0));
  const finish = Math.max(start, (Math.ceil(end * fps - 1e-7) - 1) / fps);
  return {start,end,finish,duration:finish-start};
}
