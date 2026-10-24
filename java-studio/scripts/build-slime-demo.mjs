import { writeFile } from "node:fs/promises";
import { makeSlimeDemo } from "../src/animationSlimeDemo.js";
import { slimeEffectCues } from "../src/animationSlimeEffects.js";
const doc = makeSlimeDemo();
await writeFile(
  new URL("../../animation-slime-cinq-scenes.json", import.meta.url),
  JSON.stringify(doc) + "\n",
);
let offset = 0;
const sections = doc.slides
  .map((s, i) => {
    const rows = slimeEffectCues([s]),
      groups = new Map();
    for (const r of rows) {
      if (!groups.has(r.kind)) groups.set(r.kind, []);
      groups.get(r.kind).push(r);
    }
    const begin = offset;
    offset += s.animation.duration;
    return (
      `## ${i + 1}. ${s.title}\n\nFilm : ${begin}–${offset} s. Les temps ci-dessous sont locaux à cette scène.\n\n| Effet | Objet | Début | Durée |\n|---|---|---:|---:|\n` +
      [...groups.values()]
        .map((list) => {
          const r = list[0];
          return `| ${r.label} | ${r.object}${list.length > 1 ? " + " + (list.length - 1) + " autres" : ""} | ${r.start.toFixed(1)} s | ${r.duration.toFixed(1)} s |`;
        })
        .join("\n")
    );
  })
  .join("\n\n");
const guide = `# Slime · cinq mondes, 31 effets\n\nProjet natif et éditable : [animation-slime-cinq-scenes.json](../animation-slime-cinq-scenes.json), à la racine. Dans Animation : **Exemples → Slime · cinq mondes** ajoute les scènes sans remplacer le travail en cours. Le fichier s’importe aussi par **Fichier → Importer un document JSON** (remplace le document ouvert). Pour lire ou exporter les 54 secondes : cocher **Toutes les scènes** dans **Animer / Exporter**.\n\nLe même personnage parcourt cinq scènes : prairie, canyon, atelier nocturne, monde inversé et observatoire. Sauts, rebonds, trous, changements de gravité, contacts et transitions spatiales sont conservés. Les effets servent le décor et les actions ; ils ne changent pas les calculs physiques. Les 31 effets sont présents dans l’ensemble du film.\n\n## Retrouver et modifier un effet\n\n- La timeline affiche le nom de l’effet et de son objet ; cliquer sur cette piste ouvre directement le tiroir existant.\n- Cocher **Sélection** pour ne garder que les pistes de l’objet et les pistes de scène/caméra. Les séquences de démonstration démarrent repliées pour faciliter le repérage.\n- Glisser la plage temporelle d’un effet pour le décaler ; étirer sa poignée droite pour changer sa durée. Les losanges des propriétés et les courbes existantes restent utilisables.\n- Les notes de chaque scène recensent ses effets. Les objets vectoriels, images SVG, textes et particules restent modifiables. Aucun effet n’écrit dans les bibliothèques personnelles.\n\n${sections}\n\n## Ce que ce projet a permis de corriger\n\n- Surfaces intermédiaires rectangulaires au lieu de carrés disproportionnés pour les titres larges ; limites mémoire existantes conservées.\n- Un effet graphique d’intensité zéro est neutre, notamment le glitch : plus de teinte résiduelle.\n- Tracé ouvert dessiné sur sa vraie longueur, sans segment fictif de fermeture.\n- Surface de traînée couvrant aussi les poses passées, pour conserver les échos pendant une chute rapide.\n- Événement **Masquer** pour arrêter un signal visuel ; actions de visibilité évaluées chronologiquement sans qu’un événement futur annule les précédents.\n- Timeline filtrable et accès direct au panneau partagé, sans nouveau système de propriétés. Les obstacles physiques n’affichent plus de fausses plages temporelles.\n- Ajout de l’exemple : cinq places de scène requises, message corrigé.\n\n## Bilan des outils\n\nLe moteur existant suffit pour cette réalisation en 2D : physique, splines, caméra, attachements, événements, préréglages, effets et export sont réutilisés. L’événement Masquer manquait pour finir proprement certaines actions ; il est maintenant disponible dans l’éditeur. La passerelle Vectoriel → Animation réelle est utilisée pour importer l’herbier de la première scène. Les deux images de souvenir sont des SVG autonomes et la dernière scène montre leur transition.\n\nCe projet ne constitue pas une simulation de fracture ou de fluide en 3D. Les limites du moteur 2D et des textures intermédiaires restent celles du [guide Animation](animation-studio.md). Régénération : \`node java-studio/scripts/build-slime-demo.mjs\`.\n`;
await writeFile(new URL("../../docs/slime-effects.md", import.meta.url), guide);
console.log("Slime : JSON et guide des cinq scènes régénérés.");
