const maxMilliseconds = 86400000;
const validRate = (rate) => Number.isInteger(rate) && rate >= 1 && rate <= 120;
export function timecodeParts(seconds, frameRate = 0) {
  if (validRate(frameRate)) {
    const n = Number(seconds);
    const frames = Math.round(
      Math.min(86400, Math.max(0, Number.isFinite(n) ? n : 0)) * frameRate,
    );
    const whole = Math.floor(frames / frameRate);
    return {
      hours: String(Math.floor(whole / 3600)).padStart(2, "0"),
      minutes: String(Math.floor(whole / 60) % 60).padStart(2, "0"),
      seconds: String(whole % 60).padStart(2, "0"),
      frames: String(frames % frameRate).padStart(2, "0"),
    };
  }
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
export function timecodeSeconds(parts, frameRate = 0) {
  const framed = validRate(frameRate);
  const fields = [
    "hours",
    "minutes",
    "seconds",
    framed ? "frames" : "milliseconds",
  ];
  if (
    !fields.every((key) =>
      new RegExp(
        key === "milliseconds" || key === "frames"
          ? "^\\d{1,3}$"
          : "^\\d{1,2}$",
      ).test(String(parts?.[key] ?? "")),
    )
  )
    return null;
  const [h, m, s, ms] = fields.map((key) => Number(parts[key]));
  if (framed && ms >= frameRate) return null;
  if (h > 24 || m > 59 || s > 59 || (h === 24 && m + s + ms > 0)) return null;
  return h * 3600 + m * 60 + s + ms / (framed ? frameRate : 1000);
}
export function formatTimecode(seconds, frameRate = 0) {
  const t = timecodeParts(seconds, frameRate);
  if (validRate(frameRate))
    return `${t.hours}:${t.minutes}:${t.seconds}:${t.frames}`;
  return `${t.hours}:${t.minutes}:${t.seconds}.${t.milliseconds}`;
}
