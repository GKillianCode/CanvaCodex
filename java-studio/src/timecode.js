const maxMilliseconds = 86400000;
export function timecodeParts(seconds) {
  const n = Number(seconds);
  const total = Math.min(
    maxMilliseconds,
    Math.max(0, Math.round((Number.isFinite(n) ? n : 0) * 1000)),
  );
  return {
    hours: String(Math.floor(total / 3600000)).padStart(2, "0"),
    minutes: String(Math.floor(total / 60000) % 60).padStart(2, "0"),
    seconds: String(Math.floor(total / 1000) % 60).padStart(2, "0"),
    milliseconds: String(total % 1000).padStart(3, "0"),
  };
}
export function timecodeSeconds(parts) {
  const fields = ["hours", "minutes", "seconds", "milliseconds"];
  if (
    !fields.every((key) =>
      new RegExp(key === "milliseconds" ? "^\\d{1,3}$" : "^\\d{1,2}$").test(
        String(parts?.[key] ?? ""),
      ),
    )
  )
    return null;
  const [h, m, s, ms] = fields.map((key) => Number(parts[key]));
  if (h > 24 || m > 59 || s > 59 || (h === 24 && m + s + ms > 0)) return null;
  return ((h * 3600 + m * 60 + s) * 1000 + ms) / 1000;
}
export function formatTimecode(seconds) {
  const t = timecodeParts(seconds);
  return `${t.hours}:${t.minutes}:${t.seconds}.${t.milliseconds}`;
}
