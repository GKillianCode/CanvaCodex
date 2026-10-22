export const workflowNavigation = Symbol("frame-workflow-navigation");
export const workspaceTools = [
  {id:"notes",name:"Notes",description:"Idées libres, sous-notes et liens entre pages.",hash:"#/notes",stage:"Réfléchir"},
  {id:"vector",name:"Vectoriel",description:"Dessiner des formes, des tracés et des illustrations SVG.",hash:"#/vectoriel",stage:"Créer"},
  {id:"layout",name:"Mise en page",description:"Composer des fiches et des documents multipages à exporter en PDF.",hash:"#/mise-en-page",stage:"Créer"},
  {id:"animation",name:"Animation",description:"Créer des animations et des scènes.",hash:"#/animations",stage:"Créer"},
  {
    id: "canvas",
    name: "Parcours",
    description: "Relier les vidéos et construire les chemins pédagogiques.",
    hash: "#/parcours",
    stage: "Organiser",
  },
  {
    id: "slides",
    name: "Diaporamas",
    description: "Construire les explications et présenter le cours.",
    hash: "#/diaporamas",
    stage: "Créer",
  },
  {
    id: "banners",
    name: "Incrustations",
    description: "Préparer les animations pour le montage.",
    hash: "#/incrustations",
    stage: "Créer",
  },
  {
    id: "thumbnails",
    name: "Miniatures",
    description: "Composer les visuels des vidéos et playlists.",
    hash: "#/miniatures",
    stage: "Créer",
  },
];
export function videoDestinations(project) {
  if (!project?.id) return [];
  const root = "#/videos/" + project.id;
  return [
    {
      id: "overview",
      name: "Fiche vidéo",
      description: "Métadonnées et toutes les créations.",
      hash: root,
      stage: "Vue d’ensemble",
    },
    {
      id: "conductor",
      name: "Conducteur",
      description: "Brouillon, script, supports et repères de tournage.",
      hash: root + "/conductor",
      stage: "Préparer",
    },
    ...(project.creations || [])
      .filter((c) => ["slides", "banners", "thumbnails", "animation"].includes(c.app))
      .map((c) => ({
        id: c.id,
        name: c.name,
        description:
          "Support de cette vidéo · " +
          workspaceTools.find((a) => a.id === c.app).name,
        hash: root + "/" + c.app + "/" + c.id,
        stage: "Créer",
      })),
    {
      id: "publication",
      name: "Publication",
      description: "Titre, miniature, description et chapitres.",
      hash: root + "/publication",
      stage: "Publier",
    },
  ];
}
export function searchDestinations(rows, query, limit = 18) {
  const normalize = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return rows
    .filter((row) =>
      terms.every((term) =>
        normalize(row.name + " " + row.description + " " + row.stage).includes(
          term,
        ),
      ),
    )
    .slice(0, limit);
}
export async function navigateAfterSave(flushers, commit) {
  for (const flush of flushers) if (flush) await flush();
  return commit();
}
