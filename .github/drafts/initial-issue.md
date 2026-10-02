# Livrer la première version de Frame et établir le suivi du projet

## Besoin

Disposer d’un atelier personnel pour produire des diaporamas Java techniques et des incrustations vidéo sans refaire le design à chaque vidéo. Conserver le contexte et les décisions dans `Agent.md` et tracer le travail sur GitHub.

## Périmètre de cette livraison

- Éditeur Vue : textes, exemples de code, compositions, déplacements et réglages précis.
- Thèmes globaux partagés avec les incrustations.
- Export PNG des diapos et PNG transparent des bandeaux.
- Présentation, pointeur personnalisable, annotations, enregistrement WebM et aperçu.
- Sauvegarde locale, export/import JSON et documentation de lancement.
- Mémoire de projet à la racine et conventions de travail GitHub.

## Critères d’acceptation

- [x] Sources présentes et compilation `npm run build` réussie.
- [x] Enregistrement avec navigation entre diapos puis Stop : vidéo générée et reconnue en 1920 × 1080.
- [x] Export PNG de bandeau généré avec lien de téléchargement.
- [x] Contexte, décisions, limites et roadmap documentés dans `Agent.md`.
- [ ] Commits publiés sur le dépôt GitHub et PR liée à cette issue.
- [ ] Revue et validation de la première version par Killian avant fusion.

## Limites de validation

Le fichier PNG téléchargé n’a pas été mesuré pour sa transparence ; celle-ci est implémentée dans le rendu. La récupération automatique des téléchargements par l’outil de test n’a pas abouti, mais l’aperçu vidéo reconnaît le fichier produit et un lien explicite est disponible. La synchronisation serveur, Symfony et l’hébergement restent hors de cette première livraison.

Issue publiée : https://github.com/GKillianCode/CanvaCodex/issues/1. Ce fichier conserve le texte de préparation ; l’état actuel est suivi dans l’issue GitHub.
