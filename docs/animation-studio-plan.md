# Proposition — Atelier Animation 2D

Statut : proposition à discuter, aucun développement applicatif engagé. 18 octobre 2026.
Suivi : issue #126, branche codex/test-animation-studio. Le prototype précédent est validé et fusionné dans main via #125.

## Objectif

Créer des séquences pédagogiques courtes pour le montage : valeurs qui circulent, mémoire, bits, diagrammes, titres et illustrations. Application indépendante accessible depuis l’accueil et depuis une vidéo. Pas de montage des rushes, de 3D ni d’IA dans ce périmètre proposé.

## Organisation

Scène centrale à dimensions fixes, damier pour la transparence et objets autorisés hors cadre. Bibliothèque/calques à gauche, propriétés à droite dans des tiroirs exclusifs, timeline redimensionnable en bas. Garder navigation, raccourcis, menus contextuels et thèmes clair/sombre cohérents avec Frame. Les outils avancés apparaissent selon la sélection.

Document animation typé/versionné avec stockage, import/export et liens vidéo distincts des autres applications. Réutiliser les briques de scène, sélection/groupes, propriétés compatibles, assets et exports ; ne pas faire passer les animations pour des diaporamas ou des incrustations. Évaluer les limites du moteur de rendu avant réutilisation des déformations. Toute nouvelle dépendance nécessite un choix justifié ; aucune installation à ce stade.

## Phase 1 — Socle utilisable proposé

- Formes, textes, images/SVG, groupes, calques, verrouillage, repères, zoom et annuler/rétablir.
- Timeline avec pistes par objet, propriétés dépliables, curseur temporel, lecture, boucle de travail et navigation image par image. Durée et fréquence configurables.
- Images clés de position, dimensions/échelle, rotation, opacité et couleurs ; pivot réglable. Ajouter, déplacer, copier, supprimer, sélectionner plusieurs clés et décaler un groupe dans le temps.
- Interpolation constante, linéaire et courbes douces ; édition des courbes d’accélération. Le mode enregistrement des clés est explicite pour éviter des clés accidentelles.
- Aperçu et export évaluent la même scène à un instant donné. Export MOV QTRLE avec alpha, MKV FFV1 avec alpha, WebM selon capacités, fond transparent/uni/vert et PNG fixe. Réutiliser le service FFmpeg local existant et ses contrôles.
- Quelques compositions éditables : transfert d’une valeur entre cases, compteur, apparition d’un schéma et titre animé.

## Phase 2 — Mouvement procédural proposé

- Pile de modifieurs activables et réordonnables : oscillation, variation pseudo-aléatoire avec graine, suivi de trajectoire, boucle, aller-retour et décalage entre objets.
- Gravité, vitesse initiale, frottement et rebond sur un sol ou des limites simples. Collisions complexes entre toutes les formes hors première version.
- Émetteurs de particules : quantité/débit, durée de vie, direction, dispersion, taille, couleur, opacité et gravité. Plafond explicite et qualité d’aperçu réglable.
- Calcul à pas fixe et graine conservée : revenir en arrière ou exporter donne le même résultat. Évaluer des points de reprise et le travail en arrière-plan selon mesures ; pas de simulation qui dépend des FPS de l’écran.

## Phase 3 — Déformations et réutilisation proposées

- Inclinaison, écrasement/étirement et déformations autour du pivot, puis étude d’une grille de déformation ou d’une courbure avec aperçu fidèle à l’export.
- Morphing de tracés seulement si leur structure est compatible ; pas de promesse de conversion arbitraire entre deux SVG.
- Parentage, contraintes simples et connecteurs attachés aux objets.
- Bibliothèque de mouvements réutilisables, paramètres exposés (texte, couleur, durée), duplication en variantes. Export d’une séquence PNG comme option complémentaire.

## Conditions de validation

Tester interpolation aux bornes et entre clés, transformations imbriquées/pivots, annuler/rétablir, sauvegarde isolée et réouverture. Comparer des images d’aperçu/export aux mêmes temps. Vérifier alpha et durée après décodage MOV/MKV, puis import réel dans Kdenlive avec l’utilisateur. Mesurer mémoire et fluidité sur une composition représentative avant de fixer les plafonds objets/particules. Aucune donnée personnelle migrée ni modifiée pour tester.

## À affiner avec Killian

Base proposée : animation 2D, clips courts, priorité aux schémas pédagogiques et à une timeline agréable. Les trois phases sont un ordre de réalisation suggéré, pas un engagement de livraison intégrale immédiate. Confirmer les priorités avant de coder ; les particules et déformations avancées peuvent venir après le socle.
