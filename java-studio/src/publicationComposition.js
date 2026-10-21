import {
  composeDescription,
  normalizeDescriptionLibrary,
  availableDescriptionTemplates,
  formatPublicationHeading,
} from "./publicationTemplates.js";
import { musicCredits } from "./publicationMusic.js";
const text = (v, max = 20000) => (typeof v === "string" ? v.slice(0, max) : "");
const id = (v) => (typeof v === "string" && /^[\w-]{1,100}$/.test(v) ? v : "");
export function normalizePublicationDetails(raw = {}) {
  raw = raw && typeof raw === "object" ? raw : {};
  const unique = (rows, make) => {
    const seen = new Set();
    return (Array.isArray(rows) ? rows : []).slice(0, 100).flatMap((row) => {
      const key = id(row?.id);
      if (!key || seen.has(key)) return [];
      seen.add(key);
      return [{ id: key, ...make(row) }];
    });
  };
  return {
    headingPackId: id(raw.headingPackId),
    introduction: text(raw.introduction, 5000),
    programme: text(raw.programme, 10000),
    videoUrl: text(raw.videoUrl, 2000),
    previousId: raw.previousId === undefined ? "auto" : id(raw.previousId),
    nextId: raw.nextId === undefined ? "auto" : id(raw.nextId),
    previousUrl: text(raw.previousUrl, 2000),
    nextUrl: text(raw.nextUrl, 2000),
    playlistUrl: text(raw.playlistUrl, 2000),
    tags: text(raw.tags, 500),
    hashtags: text(raw.hashtags, 1000),
    technical: unique(raw.technical, (row) => ({
      topic: text(row.topic, 300),
      since: text(row.since, 80),
      notes: text(row.notes, 2000),
      moreLabel: text(row.moreLabel, 200),
      moreUrl: text(row.moreUrl, 2000),
    })),
    resources: unique(raw.resources, (row) => ({
      label: text(row.label, 200),
      url: text(row.url, 2000),
    })),
  };
}
export function publicUrl(value) {
  try {
    const url = new URL(String(value).trim());
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}
export function publicationNeighbors(rows, project, details) {
  const playlist = rows.filter(
      (row) => !row.archived && row.playlist === project?.playlist,
    ),
    index = playlist.findIndex((row) => row.id === project?.id);
  const choose = (selected, offset) =>
    selected === "auto"
      ? index < 0
        ? null
        : playlist[index + offset] || null
      : rows.find((row) => row.id === selected && row.id !== project?.id) ||
        null;
  return {
    previous: choose(details.previousId, -1),
    next: choose(details.nextId, 1),
  };
}
const clean = (v) => String(v || "").trim();
const list = (value) =>
  String(value || "")
    .split("\n")
    .map(clean)
    .filter(Boolean)
    .map((line) => "• " + line.replace(/^[-•]\s*/, ""))
    .join("\n");
const section = (title, content) =>
  clean(content)
    ? [clean(title), clean(content)].filter(Boolean).join("\n")
    : "";
const tidy = (value) =>
  value
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
export function composePublication(
  publication,
  rawLibrary,
  music = [],
  related = {},
) {
  const library = normalizeDescriptionLibrary(rawLibrary),
    details = normalizePublicationDetails(publication.details),
    settings = library.settings,
    warnings = [];
  const heading = (key, title = settings.titles[key]) =>
    formatPublicationHeading(title, key, settings, details.headingPackId);
  if (
    details.headingPackId &&
    !settings.headingPacks.some((pack) => pack.id === details.headingPackId)
  )
    warnings.push(
      "Le style choisi a été retiré. Le style par défaut est utilisé.",
    );
  const template = availableDescriptionTemplates(library).find(
    (t) => t.id === publication.descriptionRecipe?.templateId,
  );
  const resources = details.resources
    .filter((r) => clean(r.label) || clean(r.url))
    .map((r) => {
      const url = publicUrl(r.url);
      if (r.url && !url)
        warnings.push("Lien de ressource invalide : " + (r.label || r.url));
      return url ? [clean(r.label), url].filter(Boolean).join(" — ") : "";
    })
    .filter(Boolean)
    .join("\n");
  const technical = details.technical
    .filter((r) => clean(r.topic))
    .map((r) => {
      const since = clean(r.since).replace(/^Java\s*/i, "");
      const url = publicUrl(r.moreUrl);
      if (r.moreUrl && !url)
        warnings.push("Lien technique invalide : " + r.topic);
      return [
        "• " + clean(r.topic) + (since ? " — depuis Java " + since : ""),
        clean(r.notes),
        url ? (clean(r.moreLabel) || "Pour aller plus loin") + " : " + url : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
  const learning = [];
  for (const [key, label] of [
    ["previous", "Vidéo précédente"],
    ["next", "Vidéo suivante"],
  ]) {
    if (details[key + "Id"] === "") continue;
    const row = related[key],
      explicit = details[key + "Url"],
      url = publicUrl(
        explicit || row?.workflow?.publication?.details?.videoUrl,
      );
    if (explicit && !url)
      warnings.push("Lien de " + label.toLowerCase() + " invalide.");
    if (url)
      learning.push(
        label +
          (row ? " — " + (row.workflow?.publication?.title || row.name) : "") +
          "\n" +
          url,
      );
  }
  const playlistUrl = publicUrl(details.playlistUrl || template?.playlistUrl);
  if ((details.playlistUrl || template?.playlistUrl) && !playlistUrl)
    warnings.push("Lien de playlist invalide.");
  if (playlistUrl)
    learning.push(
      "Playlist" +
        (related.playlist ? " — " + related.playlist : "") +
        "\n" +
        playlistUrl,
    );
  if (details.videoUrl && !publicUrl(details.videoUrl))
    warnings.push("Le lien YouTube de cette vidéo est invalide.");
  const hashtags = [
    ...new Set(
      details.hashtags
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((tag) => tag.replace(/^#+/, ""))
        .filter((tag) => /^[\p{L}\p{N}_]+$/u.test(tag)),
    ),
  ]
    .map((tag) => "#" + tag)
    .join(" ");
  const sections = {
    introduction: clean(details.introduction),
    programme: section(heading("programme"), list(details.programme)),
    chapitrage: section(
      heading("chapitrage"),
      (publication.chapters || [])
        .filter((c) => clean(c.time) && clean(c.title))
        .map((c) => clean(c.time) + " " + clean(c.title))
        .join("\n"),
    ),
    technique: section(heading("technique"), technical),
    apprentissage: section(heading("apprentissage"), learning.join("\n\n")),
    ressources: section(heading("ressources"), settings.resourcesText),
    musiques: section(
      heading("musiques"),
      musicCredits(music, publication.musicIds),
    ),
    chaine: section(heading("chaine"), settings.channelText),
    hashtags,
  };
  function expand(source, trail = []) {
    return source.replace(/{{\s*([^{}\n]+?)\s*}}/g, (whole, raw) => {
      const tag = raw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const aliases = {
        chapitres: "chapitrage",
        audio: "musiques",
        audios: "musiques",
        introduction: "introduction",
      };
      const key = aliases[tag] || tag;
      if (Object.hasOwn(sections, key)) return sections[key];
      if (key.startsWith("bloc:") || key.startsWith("partie:")) {
        if (trail.includes(key) || trail.length >= 8) {
          warnings.push("Référence circulaire dans les blocs : " + raw);
          return "";
        }
        const itemId = raw.slice(raw.indexOf(":") + 1).trim();
        if (key.startsWith("bloc:")) {
          const block = library.blocks.find((b) => b.id === itemId);
          if (!block) {
            warnings.push("Bloc introuvable : " + itemId);
            return "";
          }
          return section(
            heading("custom", block.heading),
            expand(block.content, [...trail, key]),
          );
        }
        const slot = template?.slots.find((s) => s.id === itemId);
        if (!slot) {
          warnings.push("Partie introuvable : " + itemId);
          return "";
        }
        const choice = publication.descriptionRecipe?.values?.[itemId];
        const block = library.blocks.find(
          (b) => b.id === (choice?.blockId ?? slot.defaultBlockId),
        );
        const selectedBlock = choice?.blockId ?? slot.defaultBlockId;
        if (choice?.custom === undefined && selectedBlock && !block)
          warnings.push("Bloc introuvable : " + selectedBlock);
        const content =
          choice?.custom !== undefined ? choice.custom : block?.content || "";
        const value = expand(content, [...trail, key]);
        return section(
          heading("custom", slot.label),
          slot.kind === "list" ? list(value) : value,
        );
      }
      warnings.push("Balise inconnue : " + whole);
      return whole;
    });
  }
  let description = publication.description || "";
  if (publication.descriptionMode === "template") {
    if (!template) {
      warnings.push(
        "Ce modèle n’existe plus. Le dernier rendu enregistré est conservé.",
      );
      description = publication.generatedDescription || description;
    } else
      description = tidy(
        expand(
          template.body ||
            composeDescription(
              template,
              library,
              publication.descriptionRecipe?.values,
            ),
        ),
      );
  }
  if (description.length > 5000)
    warnings.push(
      "La description dépasse 5 000 caractères. Raccourcis-la avant de la publier sur YouTube.",
    );
  return {
    description,
    comment: tidy(
      [publication.comment || "", section(heading("ressources"), resources)]
        .filter(Boolean)
        .join("\n\n"),
    ),
    tags: details.tags,
    hashtags,
    warnings: [...new Set(warnings)],
    template,
  };
}
