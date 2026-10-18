import { normalizeThemes } from "./themes.js";
import { projectTheme } from "./projectTheme.js";
export function recoveredTheme(
  document,
  name = document?.project || "Thème récupéré",
) {
  if (!document || typeof document !== "object") return null;
  const themes = normalizeThemes(document.themes),
    base = themes.find((t) => t.id === document.themeId) || themes[0],
    colors = projectTheme(base, document.projectColors);
  const orange = String(name).toLowerCase().includes("orange");
  let substituted = false;
  if (
    orange &&
    !document.projectColors?.accent &&
    !(
      parseInt(colors.accent.slice(1, 3), 16) > 150 &&
      parseInt(colors.accent.slice(5, 7), 16) < 130 &&
      parseInt(colors.accent.slice(3, 5), 16) > 55
    )
  ) {
    const counts = new Map();
    const visit = (value) => {
      if (typeof value === "string" && /^#[a-f\d]{6}$/i.test(value)) {
        const red = parseInt(value.slice(1, 3), 16),
          green = parseInt(value.slice(3, 5), 16),
          blue = parseInt(value.slice(5, 7), 16);
        if (red > 150 && green > 55 && green < 210 && blue < 130 && red > green)
          counts.set(value, (counts.get(value) || 0) + 1);
      } else if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object")
        for (const [key, v] of Object.entries(value))
          if (!["src", "text", "code", "body", "title", "notes"].includes(key))
            visit(v);
    };
    visit({ slides: document.slides, banner: document.banner });
    const best = [...counts].sort((a, b) => b[1] - a[1])[0];
    if (best) colors.accent = best[0];
    else {
      colors.accent = "#d88b4d";
      substituted = true;
    }
  }
  return normalizeThemes([
    {
      ...colors,
      id:
        "recovered-" +
        String(document.projectId || name)
          .replace(/[^a-z0-9_-]/gi, "-")
          .slice(0, 80),
      name: (orange
        ? substituted
          ? "Orangeava · à ajuster"
          : "Orangeava · récupéré"
        : String(name) + " · récupéré"
      ).slice(0, 60),
      desc:
        (substituted
          ? "Reconstitution provisoire depuis « "
          : "Palette récupérée depuis « ") +
        name +
        " ». Les couleurs restent modifiables.",
    },
  ])[0];
}
export function themeSourcesFromRow(row) {
  const found = [];
  if (!/orangeava|primitives.*orange|orange.*primitiv/i.test(row?.name || ""))
    return found;
  for (const [key, value] of Object.entries(row.storage || {})) {
    if (!key.includes("project") || typeof value !== "string") continue;
    try {
      const raw = JSON.parse(value);
      if (raw && typeof raw === "object" && (raw.slides || raw.banner))
        found.push({
          name: raw.project || row.name,
          theme: recoveredTheme(raw, raw.project || row.name),
        });
    } catch {}
  }
  return found;
}
