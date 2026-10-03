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
- Le canvas propose **Parcours automatique** : déplacer les diapos recalcule le fil et l’ordre de lecture selon leurs positions. Le départ est en haut à gauche, ou choisi dans Départ. Les cas ambigus peuvent être définis avec **Tracer le parcours** : cliquer les diapos dans l’ordre, puis Valider (les restantes sont ajoutées à la fin). Glisser le point de liaison vers une diapo la place immédiatement après la source. Les numéros, la liste, Espace et l’aperçu suivent le même fil ; les transitions suivent les positions. Annuler le parcours restaure le dernier ordre. Les anciens projets conservent leur ordre au chargement, jusqu’au premier déplacement ou à l’activation du parcours automatique.
- L’atelier s’ouvre sur un canvas spatial : glisser les diapos pour les disposer (une case occupée échange leurs positions), glisser le fond pour parcourir la grille, utiliser les boutons de zoom ou Ctrl/⌘ + molette. Le bouton « Voir toutes les diapos » recadre le parcours. Double-cliquer une diapo ouvre son édition.
- Ajouter une diapo ouvre une galerie de **20 dispositions**, dont six avec images. Aucun choix de direction à la création. Le parcours mémoire ajoute quatre diapos verticales sans remplacer le projet.
- Dans « Éditer », glisser une miniature ou sa poignée pour changer l’ordre de lecture. Les flèches ↑/↓ sur une poignée permettent aussi de réordonner au clavier. Les positions sur le canvas ne changent pas ; cette opération active le parcours manuel.
- « Présenter » commence par la première diapo ; « Tester cette diapo » commence par la sélection.
- Les propriétés affichent la **sortie de la diapo** : automatique selon la position de la suivante, ou forcée vers la gauche, la droite, le haut ou le bas. Cette direction concerne la diapo qui quitte l’écran.
- Ajouter des textes, images ou blocs de code indépendants via le clic droit sur la diapo ou « Ajouter un élément ». Chaque élément a sa position et son ordre/animation d’apparition. Les templates « Trois idées », « Étapes verticales », « Chronologie » et « À retenir » préparent les trois révélations 1, 2, 3, puis la diapo suivante.
- Importer des images locales PNG/JPEG/WebP/SVG, choisir l’image entière ou le recadrage, régler largeur/hauteur. Les images matricielles sont redimensionnées à 1 600 px maximum, avec transparence conservée ; les SVG restent vectoriels et intégrées au projet JSON, aux PNG et au WebM. Les images des templates sont des emplacements à remplir.
- Propriétés : **Élément** pour la géométrie, le contenu et son apparition ; **Diapo** pour la composition, la transition et le parcours ; **Style** pour le thème partagé et l’habillage facultatif.
- Flèches : déplacer l’élément sélectionné de **1 pixel de sortie** ; maintenir la touche pour répéter, Maj + flèches pour 10 px. Maintenir **Alt** pour les distances du cadre global aux bords haut et gauche ; survoler un objet hors sélection pour les distances ΔX/ΔY entre cadres englobants (rotation comprise, chevauchement = 0) ; « Repères · Alt » permet aussi de les afficher.
- **Ctrl/⌘ D** duplique l’élément sélectionné, avec son contenu, sa géométrie et ses apparitions. Les champs en cours d’édition gardent leur clavier de saisie.
- Ajouter une forme avec **+ Formes**, Ajouter un élément ou le clic droit : 20 choix (traits, courbes, rectangles, cercles, triangles, étoiles, flèches…). Régler largeur/hauteur en pixels, remplissage, contour, épaisseur, pointillés et opacité. Arrondi réglable et étoiles à 3–12 branches. **Arrière-plan / Premier plan** règle la superposition. Les formes conservent leurs animations et apparaissent dans PNG/WebM/JSON.
- Glisser l’une des **huit poignées** : les milieux étirent uniquement la largeur ou la hauteur ; les coins changent les deux. Glisser l’un des **quatre coins** pour changer largeur/hauteur ; la typographie s’ajuste avec le cadre. Les images se redimensionnent librement sans imposer leur ratio (le cadrage « Image entière » conserve le ratio de l’image).
- La poignée **↻ près du coin supérieur droit** tourne chaque élément autour de son centre. Maintenir **Maj** pendant le geste pour des pas de **45°**. Angle précis dans **Rotation · degrés** ; sélection, huit poignées, duplication, JSON, présentation et exports suivent la rotation.
- Dans **Élément / Police d’écriture**, choisir une police par bloc avec aperçu : Arial, Georgia, Times New Roman, monospace système, ou huit familles Google Fonts incluses (**Inter, DM Sans, Space Grotesk, Montserrat, Lora, JetBrains Mono, Fira Code, IBM Plex Mono**). Le Java propose uniquement les polices à chasse fixe. Les familles sont embarquées localement via Fontsource, sans clé API ni service payant ni IA ; les polices de l’interface sont aussi locales. Les graisses disponibles de chaque famille et leurs variantes italiques natives sont fournies, avec les caractères latins ; les autres caractères utilisent le repli système. Les licences sont dans `public/fonts/licenses`. La police est conservée dans JSON et duplication. Le rendu, l’édition directe et les exports utilisent la même famille ; PNG/présentation/capture attendent le chargement.
- Dans **Élément / Style du texte**, régler la graisse, l’italique, le soulignement, le barré et le surlignage (couleur et intensité), puis réinitialiser au besoin. Ces réglages concernent tout le bloc sélectionné, y compris le code. Les graisses suivent les variantes de la police ; Space Grotesk et Fira Code utilisent un italique synthétique. Styles visibles pendant la saisie et dans les exports, conservés par sauvegarde, duplication et recomposition.
- Pour un extrait Java, « Titre / nom de fichier » est facultatif et apparaît en haut du cadre. Chaque bloc de code, y compris une copie, reste éditable et formatable.
- Clic droit sur un élément : éditer, dupliquer ou supprimer ; clic droit sur la diapo : ajouter texte, image, code ou forme.
- Clic dans le vide : désélectionner. **Ctrl/⌘ A** : sélectionner tous les éléments de l’éditeur ou toutes les diapos du canvas/de la liste. **Supp** : supprimer la sélection. Ctrl/⌘ + clic permet une sélection multiple. Un projet garde au moins une diapo.
- Menu **Affichage** : masquer/réafficher les panneaux ; hamburger : réduire la navigation aux icônes. Glisser le bord du panneau propriétés ou de la liste pour régler leur largeur. Ces préférences restent sur cet appareil.
- Déplacer les blocs directement sur la diapo.
- Créer, éditer, dupliquer ou supprimer des thèmes dans **Thèmes**. Ajuster cinq couleurs au sélecteur ou en hexadécimal avec aperçu immédiat ; la suppression peut être annulée. Les thèmes personnels sont intégrés aux exports JSON. Choisir parmi **10 thèmes** de départ : Terminal, Midnight, Carbon, Studio, Cobalt, Corail, Volt, Pulse, Glacier et Sunset. Les aperçus utilisent le rendu réel.
- Cliquer sur la résolution sous le nom du projet : **2560 × 1440 (QHD) par défaut**, formats HD/Full HD/4K ou largeur personnalisée entre 640 et 3840 px, multiple de 16. Le ratio reste 16:9. Diapos PNG, bandeaux transparents et vidéos utilisent ce format ; les positions sont affichées en pixels de sortie.
- Les 20 dispositions ont été recomposées. Sur les anciennes diapos, « Réappliquer la disposition » remet les nouvelles marges et tailles sans changer les textes/images ; « Annuler la recomposition » restaure la dernière composition.
- L’en-tête et le pied de page sont désactivés par défaut ; les activer dans Style si souhaité.
- Dans Élément / Apparition : définir l’ordre d’apparition de chaque élément (0 = visible au départ), son animation, les paramètres du parcours et des transitions se trouvent dans Diapo.
- Présenter : aperçu repliable de la prochaine diapo, hors enregistrement ; **Espace** révèle les éléments puis passe à la suivante. Flèches pour le parcours spatial, Espace/Entrée ou le bouton Révéler/Suivant pour révéler puis avancer, Page précédente pour revenir, Échap pour quitter ; Maintenir le **clic gauche** avec le laser pour tracer ; relâcher arrête les nouveaux points et la traînée s’efface en 900 ms. Elle forme un ruban fin, translucide et lissé, sans marqueurs aux points échantillonnés. Le crayon conserve ses traits jusqu’à l’effacement.
- Enregistrer : **compte à rebours de 5 secondes**, annulable avant le départ, puis vidéo WebM à la résolution du projet, 30 images/seconde, sans audio. La vidéo contient uniquement le rendu des diapos, le laser et les annotations.
- Sauvegarde automatique locale et restauration de la diapo active, de la vue et des panneaux après actualisation/fermeture. **Ctrl S** écrit dans le fichier lié ; **Ctrl Maj S / Enregistrer sous** choisit un fichier. **Ouvrir un fichier lié** permet de modifier un JSON directement. Le menu du fichier conserve aussi l’import/export de copies. Chrome/Edge compatibles : lien persisté avec IndexedDB, permission éventuellement redemandée à la reprise. Les autres navigateurs téléchargent une copie JSON. Un fichier modifié en dehors de Frame provoque un conflit ; utiliser Enregistrer sous. Le cache local ne remplace pas une sauvegarde portable.

L’enregistrement utilise Canvas.captureStream et MediaRecorder ; un navigateur récent compatible WebM est nécessaire. Le téléchargement se déclenche au clic sur Stop. L’enregistrement reste en mémoire jusqu’à son export : privilégier des séquences courtes. Le format est WebM, pas MP4.

Les transitions déplacent deux diapos contiguës dans le même Canvas, y compris dans la vidéo. Les préférences système de réduction des animations sont respectées. L’exemple mémoire utilise les unités décimales (1 Go = 1 000 Mo) et distingue les unités binaires GiB/MiB/KiB.

## Vérifier

```sh
npm test
npm run build
```

Aucun service d’IA, paiement, microphone ou caméra. Les projets ne sont pas synchronisés entre appareils. Les polices de l’interface et des diapos sont servies localement avec un repli système pour les glyphes non fournis.

Un atlas de contrôle visuel des 20 dispositions et 10 thèmes est accessible en développement à `/tests/visual.html`.

## Mesures et édition

- **Grouper / Ctrl G**, **Dissocier / Ctrl Maj G** après une sélection multiple. Un clic sur un membre sélectionne le groupe ; glisser ou flèches déplacent les membres ensemble, Ctrl D duplique la sélection. Double-clic pour éditer un membre. Groupes simples, animations individuelles, pas de transformation collective de taille/rotation.
- Propriétés en tiroirs thématiques repliables. Les nouveaux textes ajustent leur cadre au contenu pendant la saisie. Activer **Cadre ajusté au texte** sur un texte existant ; régler sa largeur maximale de ligne. Le redimensionnement manuel rétablit un cadre fixe.
- SVG autonomes acceptés, sans script ni ressource externe. Le fond du thème derrière les images est facultatif. Une image opaque reste opaque.
- Incrustation **Voir une autre vidéo** : surtitre, titre et indication complémentaire, export PNG transparent pour le montage.
