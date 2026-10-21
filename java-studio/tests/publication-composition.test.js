import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePublication,
  normalizeWorkflow,
} from "../src/videoWorkflow.js";
import {
  composePublication,
  normalizePublicationDetails,
  publicationNeighbors,
  publicUrl,
} from "../src/publicationComposition.js";
import {
  normalizeDescriptionLibrary,
  structuredTemplate,
  availableDescriptionTemplates,
} from "../src/publicationTemplates.js";
const publication = (raw) =>
  normalizePublication({
    descriptionMode: "template",
    descriptionRecipe: { templateId: "frame-course-default" },
    ...raw,
  });
const library = (raw) =>
  normalizeDescriptionLibrary({
    settings: {
      channelText: "Ma chaîne",
      resourcesText: "Liens dans le commentaire épinglé.",
    },
    ...raw,
  });
test("structured description keeps the intended order and separates programme from timestamps", () => {
  const p = publication({
    details: {
      introduction: "Une introduction originale.",
      programme: "Comprendre le modèle mémoire\nObserver un exemple",
      technical: [
        {
          id: "tech",
          topic: "Notion personnalisée",
          since: "Java 17",
          moreLabel: "Approfondir",
          moreUrl: "https://youtu.be/example",
        },
      ],
    },
    chapters: [
      { id: "a", time: "00:00", title: "Début" },
      { id: "b", time: "01:20", title: "Exemple" },
    ],
    musicIds: ["m"],
  });
  const result = composePublication(p, library(), [
    {
      id: "m",
      title: "Musique test",
      artist: "Artiste",
      url: "https://example.com/music",
      license: "Licence",
    },
  ]);
  assert.ok(result.description.startsWith("Une introduction originale."));
  assert.ok(
    result.description.includes(
      "Au programme\n• Comprendre le modèle mémoire\n• Observer un exemple",
    ),
  );
  assert.ok(
    result.description.includes("Chapitres\n00:00 Début\n01:20 Exemple"),
  );
  assert.ok(result.description.includes("depuis Java 17"));
  assert.ok(!result.description.includes("Java Java"));
  for (const [a, b] of [
    ["Au programme", "Chapitres"],
    ["Chapitres", "Informations techniques"],
    ["Informations techniques", "Ressources complémentaires"],
    ["Ressources complémentaires", "Musiques de fond"],
    ["Musiques de fond", "La chaîne"],
  ])
    assert.ok(result.description.indexOf(a) < result.description.indexOf(b));
});
test("empty optional content removes its heading, and no Java version or link is invented", () => {
  const result = composePublication(
    publication({ details: { technical: [{ id: "x", topic: "Une notion" }] } }),
    library({ settings: { resourcesText: "", channelText: "" } }),
  );
  assert.equal(result.description, "Informations techniques\n• Une notion");
  assert.ok(!result.description.includes("depuis"));
  assert.ok(!result.description.includes("https"));
});
test("resources appear in the pinned comment while the description uses shared instructions", () => {
  const result = composePublication(
    publication({
      comment: "Mon message",
      details: {
        resources: [
          { id: "a", label: "Documentation", url: "https://example.com/docs" },
        ],
      },
    }),
    library(),
  );
  assert.ok(!result.description.includes("https://example.com/docs"));
  assert.ok(result.description.includes("Liens dans le commentaire épinglé."));
  assert.equal(
    result.comment,
    "Mon message\n\nRessources complémentaires\nDocumentation — https://example.com/docs",
  );
});
test("custom reusable blocks and per-video text/list parts render at their chosen position", () => {
  const t = structuredTemplate("custom", "Mon modèle");
  t.body = "{{partie:objectif}}\n\n{{bloc:commun}}\n\n{{introduction}}";
  t.slots = [{ id: "objectif", label: "Objectifs", kind: "list" }];
  const l = library({
    templates: [t],
    blocks: [
      {
        id: "commun",
        name: "Commun",
        content: "Du texte partagé\n{{chapitrage}}",
      },
    ],
  });
  const p = publication({
    descriptionRecipe: {
      templateId: "custom",
      values: { objectif: { custom: "Point A\nPoint B" } },
    },
    details: { introduction: "Fin choisie" },
    chapters: [{ id: "a", time: "00:00", title: "Début" }],
  });
  assert.equal(
    composePublication(p, l).description,
    "Objectifs\n• Point A\n• Point B\n\nDu texte partagé\nChapitres\n00:00 Début\n\nFin choisie",
  );
});
test("shared heading changes affect all generated videos and preserve free descriptions", () => {
  const l = library({
      settings: {
        titles: { programme: "Ce que vous allez apprendre" },
        channelText: "",
        resourcesText: "",
      },
    }),
    a = publication({ details: { programme: "A" } }),
    b = publication({ details: { programme: "B" } });
  assert.match(
    composePublication(a, l).description,
    /^Ce que vous allez apprendre/,
  );
  assert.match(
    composePublication(b, l).description,
    /^Ce que vous allez apprendre/,
  );
  assert.equal(
    composePublication(
      normalizePublication({ description: "Mon ancien texte" }),
      l,
    ).description,
    "Mon ancien texte",
  );
});
test("shared default template is editable and legacy templates stay compatible", () => {
  const t = structuredTemplate();
  t.body = "Ma structure\n{{programme}}";
  const l = library({
    templates: [
      t,
      {
        id: "old",
        name: "Ancien",
        intro: "Avant",
        outro: "Après",
        slots: [{ id: "s", defaultBlockId: "b" }],
      },
    ],
    blocks: [{ id: "b", content: "Bloc" }],
  });
  assert.equal(availableDescriptionTemplates(l)[0].body, t.body);
  assert.match(
    composePublication(publication({ details: { programme: "Sujet" } }), l)
      .description,
    /^Ma structure/,
  );
  assert.equal(
    composePublication(
      publication({ descriptionRecipe: { templateId: "old" } }),
      l,
    ).description,
    "Avant\n\nBloc\n\nAprès",
  );
});
test("missing templates preserve the saved result and invalid or cyclic tags report warnings", () => {
  const result = composePublication(
    publication({
      descriptionRecipe: { templateId: "gone" },
      generatedDescription: "Copie de sécurité",
    }),
    library(),
  );
  assert.equal(result.description, "Copie de sécurité");
  assert.match(result.warnings.join(), /n’existe plus/);
  const t = structuredTemplate("loop");
  t.body = "{{bloc:a}}\n{{inconnu}}";
  const l = library({
    templates: [t],
    blocks: [
      { id: "a", content: "{{bloc:b}}" },
      { id: "b", content: "{{bloc:a}}" },
    ],
  });
  const cycle = composePublication(
    publication({ descriptionRecipe: { templateId: "loop" } }),
    l,
  );
  assert.match(cycle.warnings.join(), /circulaire/);
  assert.match(cycle.warnings.join(), /inconnue/);
  assert.ok(cycle.description.includes("{{inconnu}}"));
});
test("playlist neighbors follow saved order and explicit omissions suppress old override links", () => {
  const rows = [
    { id: "one", playlist: "Java" },
    { id: "skip", playlist: "Java", archived: true },
    { id: "two", playlist: "Java" },
    { id: "other", playlist: "IA" },
    { id: "three", playlist: "Java" },
  ];
  const d = normalizePublicationDetails();
  assert.equal(publicationNeighbors(rows, rows[2], d).previous.id, "one");
  assert.equal(publicationNeighbors(rows, rows[2], d).next.id, "three");
  const p = publication({
    details: {
      previousId: "",
      previousUrl: "https://youtu.be/old",
      nextUrl: "https://youtu.be/next",
      playlistUrl: "https://youtube.com/playlist?list=test",
    },
  });
  const result = composePublication(p, library(), [], {
    next: {
      name: "Suite",
      workflow: { publication: { title: "Titre suivant" } },
    },
    playlist: "Java",
  });
  assert.ok(!result.description.includes("youtu.be/old"));
  assert.ok(result.description.includes("Titre suivant"));
  assert.ok(result.description.includes("Playlist — Java"));
});
test("public links reject executable schemes and tags remain separate from hashtags", () => {
  assert.equal(publicUrl("javascript:alert(1)"), "");
  assert.equal(publicUrl("https://user:pass@example.com"), "");
  assert.equal(publicUrl("https://example.com/a"), "https://example.com/a");
  const result = composePublication(
    publication({
      details: {
        hashtags: "#Java Java #Cours",
        tags: "java, cours",
        resources: [{ id: "x", url: "javascript:alert(1)" }],
      },
    }),
    library(),
  );
  assert.ok(result.description.endsWith("#Java #Cours"));
  assert.ok(!result.description.includes("java, cours"));
  assert.equal(result.tags, "java, cours");
  assert.ok(!result.comment.includes("javascript"));
  assert.match(result.warnings.join(), /invalide/);
});
test("new publication data survives normalization and long generated descriptions are warned, not cut", () => {
  const p = publication({
    details: {
      programme: "a".repeat(6000),
      technical: [
        { id: "a", topic: "A" },
        { id: "a", topic: "Duplicate" },
      ],
    },
  });
  assert.equal(
    normalizeWorkflow({ publication: p }).publication.details.programme.length,
    6000,
  );
  assert.equal(p.details.technical.length, 1);
  const result = composePublication(p, library());
  assert.ok(result.description.length > 6000);
  assert.match(result.warnings.join(), /5 000/);
  assert.equal(
    normalizePublication({ description: "Original" }).descriptionMode,
    "manual",
  );
});
test("heading packs decorate actual output and per-video choices override the shared default", () => {
  const l = library({
    settings: {
      defaultHeadingPack: "equals",
      channelText: "",
      resourcesText: "",
    },
  });
  assert.equal(
    composePublication(publication({ details: { programme: "Sujet" } }), l)
      .description,
    "=== Au programme ===\n• Sujet",
  );
  assert.equal(
    composePublication(
      publication({ details: { programme: "Sujet", headingPackId: "stars" } }),
      l,
    ).description,
    "*** Au programme ***\n• Sujet",
  );
  const custom = library({
    settings: {
      headingPacks: [
        {
          id: "mine",
          name: "Mon style",
          prefix: "→",
          suffix: "←",
          uppercase: true,
          emojis: { programme: "📚" },
        },
      ],
      defaultHeadingPack: "missing",
      channelText: "",
      resourcesText: "",
    },
  });
  assert.equal(custom.settings.defaultHeadingPack, "mine");
  assert.equal(
    composePublication(publication({ details: { programme: "Sujet" } }), custom)
      .description,
    "→ 📚 AU PROGRAMME ←\n• Sujet",
  );
});
test("heading packs cover reusable blocks and custom parts and survive normalization", () => {
  const t = structuredTemplate("personal");
  t.body = "{{bloc:b}}\n\n{{partie:p}}";
  t.slots = [{ id: "p", label: "Objectif" }];
  const l = library({
    templates: [t],
    blocks: [{ id: "b", heading: "À retenir", content: "Important" }],
  });
  const p = publication({
    descriptionRecipe: {
      templateId: "personal",
      values: { p: { custom: "Mon objectif" } },
    },
    details: { headingPackId: "equals" },
  });
  assert.equal(
    composePublication(p, l).description,
    "=== À retenir ===\nImportant\n\n=== Objectif ===\nMon objectif",
  );
  assert.equal(
    normalizeWorkflow({ publication: p }).publication.details.headingPackId,
    "equals",
  );
  const missing = composePublication(
    publication({ details: { headingPackId: "removed", programme: "Sujet" } }),
    l,
  );
  assert.match(missing.warnings.join(), /style|Style/);
});
