export const publicationTitles = {
  programme: "Au programme",
  chapitrage: "Chapitres",
  technique: "Informations techniques",
  apprentissage: "Poursuivre son apprentissage",
  ressources: "Ressources complémentaires",
  musiques: "Musiques de fond",
  chaine: "La chaîne",
};
export const defaultHeadingPacks = [
  {
    id: "plain",
    name: "Essentiel",
    prefix: "",
    suffix: "",
    uppercase: false,
    emojis: {},
  },
  {
    id: "equals",
    name: "Encadré",
    prefix: "===",
    suffix: "===",
    uppercase: false,
    emojis: {},
  },
  {
    id: "stars",
    name: "Étoiles",
    prefix: "***",
    suffix: "***",
    uppercase: false,
    emojis: {},
  },
  {
    id: "emoji",
    name: "Repères visuels",
    prefix: "",
    suffix: "",
    uppercase: false,
    emojis: {
      programme: "📚",
      chapitrage: "⏱️",
      technique: "⚙️",
      apprentissage: "🧭",
      ressources: "🔗",
      musiques: "🎵",
      chaine: "🎬",
      custom: "✦",
    },
  },
  {
    id: "custom",
    name: "Personnel",
    prefix: "—",
    suffix: "—",
    uppercase: true,
    emojis: {},
  },
];
function normalizeHeadingPacks(raw) {
  const seen = new Set();
  const rows = (Array.isArray(raw) ? raw : defaultHeadingPacks)
    .slice(0, 20)
    .flatMap((pack) => {
      if (!pack || !id(pack.id) || seen.has(pack.id)) return [];
      seen.add(pack.id);
      return [
        {
          id: pack.id,
          name: text(pack.name, 80).trim() || "Mon style",
          prefix: text(pack.prefix, 60),
          suffix: text(pack.suffix, 60),
          uppercase: pack.uppercase === true,
          emojis: Object.fromEntries(
            [...Object.keys(publicationTitles), "custom"].map((key) => [
              key,
              text(pack.emojis?.[key], 32).trim(),
            ]),
          ),
        },
      ];
    });
  return rows.length ? rows : normalizeHeadingPacks(defaultHeadingPacks);
}
export function formatPublicationHeading(title, key, settings, packId = "") {
  if (!String(title || "").trim()) return "";
  const packs = settings.headingPacks || defaultHeadingPacks,
    pack =
      packs.find((p) => p.id === packId) ||
      packs.find((p) => p.id === settings.defaultHeadingPack) ||
      packs[0];
  const value = pack.uppercase ? title.toLocaleUpperCase("fr-FR") : title;
  return [
    pack.prefix?.trim(),
    pack.emojis?.[key] || pack.emojis?.custom,
    value.trim(),
    pack.suffix?.trim(),
  ]
    .filter(Boolean)
    .join(" ");
}
export const defaultResourcesText =
  "Documentation officielle, code source et ressources utiles : retrouvez les liens dans le commentaire épinglé.";
export const defaultChannelText =
  "Sur cette chaîne, on explore Java, la programmation et les outils du développement à travers des explications et des exemples concrets.\n\nUne question, une remarque ou un sujet que vous aimeriez approfondir ? Partagez-le dans les commentaires.\n\nSi cette vidéo vous a été utile, vous pouvez la soutenir avec un like et vous abonner pour suivre les prochains cours.";
export const descriptionTokens = [
  ["introduction", "Introduction"],
  ["programme", "Programme"],
  ["chapitrage", "Chapitres"],
  ["technique", "Informations techniques"],
  ["apprentissage", "Poursuivre l’apprentissage"],
  ["ressources", "Ressources"],
  ["musiques", "Musiques"],
  ["chaine", "Chaîne"],
  ["hashtags", "Hashtags"],
];
export function structuredTemplate(
  id = "frame-course-default",
  name = "Cours · description structurée",
) {
  return {
    id,
    name,
    playlist: "",
    playlistUrl: "",
    intro: "",
    outro: "",
    slots: [],
    body: descriptionTokens.map(([tag]) => "{{" + tag + "}}").join("\n\n"),
  };
}
export function availableDescriptionTemplates(library) {
  return [
    library.templates.find((t) => t.id === "frame-course-default") ||
      structuredTemplate(),
    ...library.templates.filter((t) => t.id !== "frame-course-default"),
  ];
}
export const descriptionLibraryKey = "publication-description-library";
const id = (v) => (typeof v === "string" && /^[\w-]{1,100}$/.test(v) ? v : "");
const text = (v, max = 20000) => (typeof v === "string" ? v.slice(0, max) : "");
export function normalizeDescriptionLibrary(raw = {}) {
  raw = raw && typeof raw === "object" ? raw : {};
  const unique = (rows, make, limit = 200) => {
    const seen = new Set();
    return (Array.isArray(rows) ? rows : []).slice(0, limit).flatMap((row) => {
      const key = id(row?.id);
      if (!key || seen.has(key)) return [];
      seen.add(key);
      return [{ id: key, ...make(row) }];
    });
  };
  const headingPacks = normalizeHeadingPacks(raw.settings?.headingPacks);
  return {
    settings: {
      headingPacks,
      defaultHeadingPack: headingPacks.some(
        (pack) => pack.id === raw.settings?.defaultHeadingPack,
      )
        ? raw.settings.defaultHeadingPack
        : headingPacks[0].id,
      titles: Object.fromEntries(
        Object.entries(publicationTitles).map(([key, value]) => [
          key,
          typeof raw.settings?.titles?.[key] === "string"
            ? raw.settings.titles[key].slice(0, 120)
            : value,
        ]),
      ),
      resourcesText:
        typeof raw.settings?.resourcesText === "string"
          ? text(raw.settings.resourcesText)
          : defaultResourcesText,
      channelText:
        typeof raw.settings?.channelText === "string"
          ? text(raw.settings.channelText)
          : defaultChannelText,
    },
    templates: unique(
      raw.templates,
      (row) => ({
        name: text(row.name, 120) || "Sans titre",
        playlist: text(row.playlist, 200),
        playlistUrl: text(row.playlistUrl, 2000),
        body: text(row.body),
        intro: text(row.intro),
        outro: text(row.outro),
        slots: unique(row.slots, (slot) => ({
          label: text(slot.label, 100) || "Bloc",
          kind: slot.kind === "list" ? "list" : "text",
          defaultBlockId: id(slot.defaultBlockId),
        })).slice(0, 20),
      }),
      201,
    ),
    blocks: unique(raw.blocks, (row) => ({
      name: text(row.name, 120) || "Sans titre",
      heading: text(row.heading, 120),
      content: text(row.content),
    })),
  };
}
export function composeDescription(template, library, values = {}) {
  if (!template) return "";
  return [
    template.intro,
    ...template.slots.map((slot) => {
      const choice = values[slot.id];
      if (choice?.custom !== undefined) return text(choice.custom);
      return (
        library.blocks.find(
          (block) => block.id === (choice?.blockId ?? slot.defaultBlockId),
        )?.content || ""
      );
    }),
    template.outro,
  ]
    .filter((value) => value?.trim())
    .join("\n\n")
    .slice(0, 20000);
}
