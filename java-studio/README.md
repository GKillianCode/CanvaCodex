# Frame — Java Studio

Atelier personnel Vue 3 pour préparer des diaporamas techniques Java et des incrustations vidéo.

## Lancer en local

```sh
npm ci
npm run dev
```

## Production

```sh
npm run build
```

Le dossier `dist` peut être servi par un serveur statique ou intégré à une application Symfony. Cette première version ne contient pas de backend Symfony.

## Utilisation

- Double-cliquer sur un texte ou un extrait de code pour le modifier sur la diapo. Terminer avec le bouton ou Ctrl/⌘ + Entrée.
- Coller du Java : coloration Prism et indentation Prettier automatique dans un worker. Le bouton « Formater » permet de recommencer ; un extrait incomplet est conservé tel quel.
- L’atelier s’ouvre sur un canvas spatial : glisser les diapos pour les disposer, glisser le fond pour parcourir la grille, utiliser les boutons de zoom ou Ctrl/⌘ + molette. Le bouton « Voir toutes les diapos » recadre le parcours. Double-cliquer une diapo ouvre son édition.
- Ajouter une diapo ouvre une galerie de **20 dispositions**, dont six avec images. Aucun choix de direction à la création. Le parcours mémoire ajoute quatre diapos verticales sans remplacer le projet.
- Dans « Éditer », glisser une miniature ou sa poignée pour changer l’ordre de lecture. Les flèches ↑/↓ sur une poignée permettent aussi de réordonner au clavier. Les positions sur le canvas ne changent pas.
- « Présenter » commence par la première diapo ; « Tester cette diapo » commence par la sélection.
- Les propriétés affichent la **sortie de la diapo** : automatique selon la position de la suivante, ou forcée vers la gauche, la droite, le haut ou le bas. Cette direction concerne la diapo qui quitte l’écran.
- Ajouter des textes ou des images indépendants dans les propriétés. Chaque élément a sa position et son ordre/animation d’apparition. Les templates « Trois idées », « Étapes verticales », « Chronologie » et « À retenir » préparent les trois clics 1, 2, 3, puis la diapo suivante.
- Importer des images locales PNG/JPEG/WebP, choisir l’image entière ou le recadrage, régler largeur/hauteur. Elles sont redimensionnées à 1 600 px maximum et intégrées au projet JSON, aux PNG et au WebM. Les images des templates sont des emplacements à remplir.
- Choisir une composition et ajuster X, Y, largeur et taille du texte.
- Déplacer les blocs directement sur la diapo.
- Choisir un thème global pour les diapos et les incrustations.
- Exporter une diapo en PNG Full HD ou un bandeau en PNG transparent.
- L’en-tête et le pied de page sont désactivés par défaut ; les activer dans Composition si souhaité.
- Animation : définir l’ordre d’apparition de chaque élément (0 = visible au départ), son animation, la colonne/ligne de chaque diapo et la durée des transitions.
- Présenter : flèches pour le parcours spatial, Espace/Entrée ou clic avec le laser pour révéler puis avancer, Page précédente pour revenir, Échap pour quitter ; laser ou crayon pour annoter.
- Enregistrer : vidéo WebM 1920 × 1080, 30 images/seconde, sans audio. La vidéo contient uniquement le rendu des diapos, le laser et les annotations.
- Sauvegarde automatique dans le navigateur sur l’appareil utilisé. Exporter le projet JSON pour une sauvegarde portable et l’importer pour reprendre ailleurs.

L’enregistrement utilise Canvas.captureStream et MediaRecorder ; un navigateur récent compatible WebM est nécessaire. Le téléchargement se déclenche au clic sur Stop. L’enregistrement reste en mémoire jusqu’à son export : privilégier des séquences courtes. Le format est WebM, pas MP4.

Les transitions déplacent deux diapos contiguës dans le même Canvas, y compris dans la vidéo. Les préférences système de réduction des animations sont respectées. L’exemple mémoire utilise les unités décimales (1 Go = 1 000 Mo) et distingue les unités binaires GiB/MiB/KiB.

## Vérifier

```sh
npm test
npm run build
```

Aucun service d’IA, paiement, microphone ou caméra. Les projets ne sont pas synchronisés entre appareils. Les polices d’interface sont chargées via Google Fonts avec une police système de secours ; le rendu des diapos utilise des polices système pour que les exports restent autonomes.
