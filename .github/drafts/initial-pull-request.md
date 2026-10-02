# Ajouter Frame, l’atelier de diaporamas Java et sa mémoire de projet

Cette première version permet de composer des diapos techniques, appliquer un thème commun aux bandeaux, exporter des PNG et enregistrer une présentation annotée en WebM Full HD. Elle utilise Vue 3 avec sauvegarde locale et import/export JSON ; `Agent.md` conserve le contexte, les décisions, les limites et la roadmap, et `AGENTS.md` oriente les prochaines sessions vers cette mémoire.

## Validation

- `npm run build` : réussi le 2 octobre 2026.
- Enregistrement avec changement de diapo puis Stop : vidéo générée et reconnue en 1920 × 1080 dans l’aperçu.
- Export PNG de bandeau généré ; la transparence du fichier téléchargé reste à vérifier.
- Affichage mobile vérifié à 390 px sans débordement de la largeur du document.

## Limites

Pas de backend Symfony ni de synchronisation entre appareils. Export vidéo WebM sans audio, conservé en mémoire jusqu’à l’export. Pas d’hébergement distant opérationnel.

PR publiée : https://github.com/GKillianCode/CanvaCodex/pull/2 ; liée à l’issue #1. Ce fichier conserve le texte de préparation ; l’état actuel est suivi dans la PR GitHub.
