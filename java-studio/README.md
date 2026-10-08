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
- Ajouter une diapo ouvre une galerie de **30 dispositions**, dont six avec images. Aucun choix de direction à la création. Le parcours mémoire ajoute quatre diapos verticales sans remplacer le projet.
- Dans « Éditer », glisser une miniature ou sa poignée pour changer l’ordre de lecture. Les flèches ↑/↓ sur une poignée permettent aussi de réordonner au clavier. Les positions sur le canvas ne changent pas ; cette opération active le parcours manuel.
- « Présenter » commence par la première diapo ; « Tester cette diapo » commence par la sélection.
- Les propriétés affichent la **sortie de la diapo** : automatique selon la position de la suivante, ou forcée vers la gauche, la droite, le haut ou le bas. Cette direction concerne la diapo qui quitte l’écran.
- Ajouter des textes, images ou blocs de code indépendants via le clic droit sur la diapo ou « Ajouter un élément ». Chaque élément a sa position et son ordre/animation d’apparition. Les templates « Trois idées », « Étapes verticales », « Chronologie » et « À retenir » préparent les trois révélations 1, 2, 3, puis la diapo suivante.
- Importer des images locales PNG/JPEG/WebP/SVG, choisir l’image entière ou le recadrage, régler largeur/hauteur. Les fichiers sont acceptés jusqu’à 20 Mo. Les images matricielles sont redimensionnées à 1 600 px maximum, puis davantage si nécessaire pour le stockage ; les JPEG restent compressés en JPEG et les PNG/WebP conservent leur transparence ; les SVG restent vectoriels et intégrées au projet JSON, aux PNG et au WebM. Les images des templates sont des emplacements à remplir.
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
- Les 30 dispositions sont composées d’objets éditables, y compris les fonds de carte, pastilles, séparateurs et numéros. Sur les anciennes diapos, « Réappliquer la disposition » remet les nouvelles marges et tailles sans changer les textes/images ; « Annuler la recomposition » restaure la dernière composition.
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

Un atlas de contrôle visuel des 30 dispositions et 10 thèmes est accessible en développement à `/tests/visual.html`.

## Mesures et édition

- **Grouper / Ctrl G**, **Dissocier / Ctrl Maj G** après une sélection multiple. Un clic sur un membre sélectionne le groupe ; glisser ou flèches déplacent les membres ensemble, Ctrl D duplique la sélection. Double-clic pour éditer un membre. Groupes simples, animations individuelles, pas de transformation collective de taille/rotation.
- Propriétés en tiroirs thématiques repliables. Les nouveaux textes ajustent leur cadre au contenu pendant la saisie. Activer **Cadre ajusté au texte** sur un texte existant ; régler sa largeur maximale de ligne. Le redimensionnement manuel rétablit un cadre fixe.
- SVG autonomes acceptés, sans script ni ressource externe. Le fond du thème derrière les images est facultatif. Une image opaque reste opaque.
- Incrustation **Voir une autre vidéo** : surtitre, titre et indication complémentaire, export PNG transparent pour le montage.

- **Style → Fond du diaporama → Dégradé de fond** : décocher pour un fond uni, commun à toutes les diapos et exports. Les anciens projets conservent leur dégradé.
- **Style de la forme → Extrémités arrondies** : décocher pour des bouts plats sur traits/courbes, y compris les pointillés.

Les formes occupent leur cadre sans marge vide : étoiles, polygones, courbes et cœurs sont ajustés à leurs dimensions. Les traits horizontaux/verticaux ont un cadre correspondant à leur épaisseur ; étirer leur hauteur/largeur transversale règle cette épaisseur. Le contour est inclus dans les dimensions et la zone de clic ne déborde plus du cadre des formes.

Images : coche « Bords arrondis » puis règle le curseur dans Image et transparence. L’arrondi suit l’image affichée, même en mode Image entière dans un cadre plus grand. Dépose aussi des fichiers PNG, JPEG, WebP ou SVG directement sur la diapo en vue Éditer.

Ctrl Z annule et Ctrl Maj Z rétablit les modifications du projet (historique de la session, boutons ↶ ↷). Clique sur un objet puis utilise les flèches pour le déplacer de 1 pixel de sortie, ou Maj + flèche pour 10 pixels. L’annulation du texte reste native pendant la saisie.

### Couleurs, groupes et composants

Dans **Style du texte**, choisir une couleur du thème (11 couleurs) ou une couleur personnalisée. Les couleurs du thème suivent le changement de thème ; le mode Automatique conserve les titres en dégradé et la coloration Java. Les six couleurs complémentaires se modifient dans l’éditeur de thème.

Une sélection multiple propose le centrage du groupe dans la diapo, l’alignement des centres des membres et un espacement horizontal/vertical en pixels de sortie. Les cadres tournés sont pris en compte. Un grand espacement peut placer des objets hors de la diapo.

**Propriétés → Composants réutilisables** : nommer une sélection puis la créer dans la bibliothèque du projet. Insérer crée une copie groupée, modifiable avec les propriétés habituelles (double-clic pour éditer un membre). Bibliothèque conservée dans les sauvegardes et le JSON, avec annulation/rétablissement. Les copies restent indépendantes ; pas de propagation automatique des changements ni de variantes liées. Pour créer une variante, personnaliser une copie puis l’enregistrer sous un autre nom.

### Calques et bibliothèque

**Propriétés → Calques** liste tous les objets, du premier plan en haut à l’arrière-plan en bas. Cliquer sélectionne un membre individuellement ; Ctrl/⌘ + clic étend la sélection. Premier plan/Arrière-plan et Avancer/Reculer agissent aussi sur une sélection multiple en conservant l’ordre interne. Le rang numérique (z-index, 1 au fond) réordonne la sélection. Les mêmes commandes sont disponibles dans **Élément → Superposition**, pour les textes, images, codes et formes. L’ordre se conserve dans les sauvegardes, composants, présentation et exports.

**Propriétés → Composants** présente une bibliothèque avec aperçus, recherche, création guidée depuis la sélection, renommage et suppression. Cliquer sur l’aperçu insère une copie personnalisable. La bibliothèque ne pousse plus les propriétés sous un long formulaire fixe.

Les textes simples s’éditent dans un champ natif visible, sans miroir de texte ; le Java conserve son miroir syntaxique avec les couleurs du thème. Le fond d’édition est uni et une ligne supplémentaire garde la dernière ligne visible pendant la frappe.

### Texte, composants et zoom

Double-cliquer un texte (ou **Éditer**) ouvre maintenant un dialogue avec un brouillon lisible. **Appliquer** valide le texte et le surtitre ; **Annuler** ou Échap conserve le contenu précédent. Ctrl/⌘ + Entrée valide. La police et le style de la diapo restent appliqués par le rendu habituel. Le code Java conserve son éditeur sur la diapo.

Pour plusieurs composants : Ctrl/⌘ + clic puis **Aligner sur une ligne horizontale** ou **Aligner en colonne verticale**. Chaque groupe est une seule unité ; ses membres gardent leurs distances internes. La mise en ligne/colonne utilise l’espacement choisi pour séparer les composants, même si les copies ont été insérées au même endroit. Les commandes d’espacement traitent aussi les groupes entiers. Pour intervenir sur leurs membres séparément, dissocier explicitement le groupe.

Dans la vue Éditer, **Ctrl/⌘ + molette** zoome autour du pointeur, de **25 % à 300 %**. Les boutons −/+ proposent la même plage ; cliquer sur le pourcentage revient à 100 %. Les barres de défilement permettent d’atteindre les parties hors du viewport. Le zoom ne change pas la résolution de sortie. Le fichier de contrôle `tests/zoom.html` simule un événement de molette dans l’éditeur pour vérifier le gestionnaire et la non-capture de la molette sans Ctrl.

### F12 et noms d’éléments

**F12** lance la présentation depuis la première diapo, comme le bouton Présenter. Échap quitte. La touche est interceptée dans l’application ; répétitions et présentation déjà active sont ignorées. Fermer ou valider un dialogue d’édition avant de lancer la présentation pour garder son brouillon.

Sélectionner un élément puis **Élément → Nom de l’élément**, ou le sélectionner dans **Calques** et modifier son nom. Noms limités à 100 caractères, indépendants du texte affiché sur la diapo, conservés dans les projets, duplications et composants. Les noms apparaissent dans les calques, le sélecteur d’éléments et la liste des apparitions.

Les rectangles arrondis gardent des coins réguliers même lorsqu’ils sont étirés : l’arrondi est calculé sur leur plus petit côté, après redimensionnement. Il est partagé entre aperçu, présentation et exports.

Sélectionne plusieurs objets de même type (Ctrl/⌘ + clic), puis **Élément → Modifier les objets ensemble**. Pour les formes, le type exact doit être commun. Dimensions, rotation, apparitions et réglages de style proposés s’appliquent à tous ; un champ **Mixte** indique des valeurs différentes et seuls les réglages modifiés sont remplacés.

**Ctrl/⌘ C**, puis **Ctrl/⌘ V** copie les objets sélectionnés dans la même diapo ou une autre diapo du projet. Les groupes sont copiés entiers, avec leurs positions relatives, noms, styles, images et apparitions. Premier collage sur une autre diapo : mêmes coordonnées ; collages suivants décalés de 24 unités. Une copie dans la même diapo est aussi décalée. Boutons Copier et Coller disponibles ; Ctrl Z annule le collage. Les raccourcis de texte restent natifs dans les champs. La copie d’objets est conservée en mémoire dans l’application jusqu’au rechargement ; limite de 100 éléments ajoutés par diapo.

En vue **Éditer**, maintiens le clic gauche sur une zone vide de la diapo et glisse pour tracer une zone de sélection visible. Les objets entièrement contenus sont sélectionnés pendant le geste ; les groupes doivent être entièrement inclus. Le geste fonctionne dans toutes les directions et avec le zoom. Ctrl/⌘ ou Maj ajoute à la sélection existante. Échap ou l’annulation du geste restaure la sélection précédente. Glisser sur un objet continue à le déplacer.

**Élément → Placer sur la diapo** propose neuf boutons : centre, haut/bas centrés, gauche/droite centrés et les quatre coins. La **Marge des bords** est exprimée en pixels de sortie ; à zéro, les positions de bord sont alignées sur le bord de la diapo. Le centrage utilise le cadre visible tourné. Une sélection multiple ou un groupe est déplacé comme un ensemble, avec dimensions, rotations et écarts conservés. Ctrl Z annule le placement.

Dans **Diapo → Ordre des apparitions**, chaque groupe possède une seule ligne compacte ; ses membres apparaissent seulement dans ses réglages. Choisir son **Étape** fait apparaître tous ses éléments au même clic ; son **Animation** peut aussi être réglée d’un coup. Les valeurs différentes sont indiquées par **Mixte**, sans modifier les étapes antérieures tant que tu n’en choisis pas une commune. L’étape 0 rend le groupe visible au départ. Les éléments non groupés gardent leur propre ligne ; dissocier un groupe rétablit les lignes individuelles.


### Tableaux, modèles et propriétés

- **+ Tableau** dans la barre d’outils, le clic droit ou Ajouter un élément. Régler 1–20 lignes et 1–10 colonnes, puis **Modifier les cellules** pour saisir les contenus dans un dialogue et valider. Personnaliser police, taille, marges, alignement, en-tête, alternance, bordures et couleurs du thème ou personnalisées. Les cellules débordantes sont rognées dans leur cadre. Le tableau compte comme un objet, accepte rotation, apparitions, copie, groupes et composants réutilisables ; son rendu est partagé avec les exports.
- Dix compositions supplémentaires : tableau comparatif, quatre repères, pipeline Java, stack/heap, pile d’appels, architecture JVM, décision, checklist, progression et code commenté. Leurs diagrammes et indicateurs sont assemblés avec les formes/textes habituels et peuvent être modifiés individuellement depuis **Calques**.
- Les anciens décors de modèle sont convertis à la reprise en objets. Leur suppression est conservée ; ils ne sont recréés qu’en réappliquant volontairement une disposition. La conversion respecte la limite de 100 éléments ajoutés ; si une ancienne diapo est déjà pleine, les décors supplémentaires ne sont pas créés. Les positions et contenus existants sont conservés.
- Texte sélectionné + **Alt** et survol d’un rectangle qui le contient : quatre marges G/D/H/B, en pixels de sortie, calculées sur les cadres avec rotations. Les distances habituelles restent disponibles hors conteneur. Ces repères n’apparaissent pas dans les exports.
- Taille, police et ajustement du cadre sont regroupés dans **Style du texte** ; position/dimensions ne contiennent que la géométrie. Placement et superposition restent dans des sections repliables. Les formes ont accès à la palette du thème pour le remplissage et le contour, individuellement ou en sélection multiple ; une couleur liée suit les changements de thème.
- **Thème et fond** ouvre l’espace **Thèmes**, où se trouvent les couleurs globales, le dégradé, l’en-tête et le pied de diapo. Le sous-menu à chevron de l’enregistrement est supprimé. Ctrl S et Ctrl Maj S restent disponibles ; un bouton séparé télécharge une copie JSON.

Format de sauvegarde : version 19, avec objets tableau et décors persistants (designVersion 3). Les anciens projets restent importables. Les copies et composants sont indépendants de leur modèle d’origine.


### Styles de tableau et repères entre objets

Dans les propriétés d’un tableau, quatre styles sont disponibles : **Classique, Arrondi, Minimal, Contraste**. Ils modifient l’apparence en conservant les cellules et les proportions.

- En-tête **en haut, en bas, à gauche, à droite, en haut et à gauche**, ou absent ; nombre de lignes/colonnes d’en-tête réglable. Les cellules du bord choisi deviennent l’en-tête sans déplacer leur contenu ; le dialogue indique les cellules concernées.
- Coins arrondis en pixels et opacité globale. Les coins sont construits dans les dimensions finales, sans étirement de l’arrondi.
- Fonds et textes distincts pour **l’en-tête et le corps**, via palette du thème ou couleur libre. Fonds désactivables pour la transparence. Taille et gras propres à l’en-tête et au corps.
- Grille complète, horizontale, verticale, contour seul ou aucune bordure ; traits continus, tirets ou pointillés, épaisseur et couleur réglables. Séparateur d’en-tête avec couleur/épaisseur propres. « Aucune » masque aussi le séparateur.
- Bandes alternées par lignes ou colonnes, couleur et intensité réglables ; alignement horizontal/vertical et marge des cellules.
- Poids relatifs des lignes et colonnes : 2 réserve deux fois plus d’espace que 1, sans modifier les dimensions du tableau. Valeurs décimales conservées au rechargement.

**Alt** : sélectionner un objet, placer la souris sur un autre puis maintenir Alt. Le survol traverse la sélection au premier plan pour trouver l’objet derrière ; Alt s’active aussi sans nouveau mouvement de souris. Tous les types d’objets et cadres de groupes sont pris en compte. Si un objet contient l’autre ou s’ils se superposent, quatre écarts **G/D/H/B** apparaissent ; une valeur négative indique un dépassement. Des objets séparés affichent les distances ΔX/ΔY. Sans objet cible, les quatre écarts à la diapo sont affichés. Rotations et pixels de sortie sont pris en compte ; repères absents des exports.

Le format version 17 reprend les tableaux précédents : première ligne d’en-tête ou aucun en-tête selon l’ancien réglage, dimensions et cellules conservées. Les styles supplémentaires sont conservés dans les copies, composants et sauvegardes.


### Aimantation d’alignement

Dans l’éditeur, le bouton **Aimantation** sous la diapo active ou désactive l’accrochage pendant le déplacement. Activé par défaut, ce choix est conservé sur cet appareil. Les bords et centres de la sélection s’alignent sur ceux de la diapo et des autres objets, avec des guides roses. Le seuil est de 6 pixels à l’écran quel que soit le zoom ; les groupes et sélections multiples gardent leurs écarts. Les poignées de taille et de rotation restent libres.

Les boutons « + Formes » et « + Tableau » ont été retirés de la barre supérieure. Ces objets restent disponibles dans **Propriétés → Ajouter un élément** et dans le menu du clic droit.


### Propriétés, textes et palette du diaporama

Le panneau conserve quatre accès : Objet, Diapo, Calques et Composants. Les options de l’objet sont réparties entre Style, Couleurs, Placement et Animation. Tous les tiroirs sont fermés au démarrage ; leur ouverture, la catégorie et le défilement sont conservés lorsqu’on sélectionne un autre objet. Les couleurs du tableau sont séparées en En-tête, Corps et Traits. Les sélections multiples disposent des mêmes réglages applicables, sans remplacer les contenus des tableaux.

Les préréglages Titre et Sous-titre utilisent Inter, et Texte utilise Montserrat. Les polices explicitement choisies dans les anciens projets sont conservées. Un texte peut recevoir une liste à puces, cercles, carrés, tirets, nombres, lettres, chiffres romains, cases ou symbole personnalisé. Départ de numérotation, retrait, espacement et couleur du marqueur sont réglables ; chaque nouvelle ligne crée un item.

Dans Thèmes, « Personnaliser la palette » modifie les couleurs uniquement pour le diaporama actuel. La bibliothèque du thème de base reste intacte. Ces couleurs sont enregistrées avec le projet et disponibles dans les palettes des objets. Choisir un autre thème remet la palette à celle de ce thème ; Réinitialiser restaure explicitement les couleurs de base. Thème et fond ne sont plus dupliqués dans les propriétés.


### Incrustations éditables et arrondis par coin

Les incrustations utilisent le même composant Propriétés que les diaporamas : Style, Couleurs, Placement, Animation, Calques et Composants. Chaque texte, fond, accent et image est un objet modifiable, déplaçable, duplicable et supprimable. On peut ajouter des tableaux et tous les autres objets, grouper, aligner, espacer, copier/coller entre diapos et incrustations, utiliser les repères et l’aimantation. Le PNG utilise le rendu commun avec un fond transparent, sans en-tête ni pied global.

Le bouton « Formats · 24 » ouvre une galerie d’aperçus avec recherche et catégories, remplaçant la liste latérale. Les quatre formats historiques sont conservés et vingt formats ajoutés : vidéo avec miniature, portrait intervenant, cartouche compact, titre panoramique, numéro de chapitre, citation, définition, attention, validation, liste de contrôle, trois étapes, chiffre clé, avant/après, abonnement, profil social, lien du site, épisode podcast, crédits, écran de fin, fiche produit. Choisir un format remplace la composition ; Ctrl Z permet de revenir en arrière. Dans le format avec miniature, sélectionner le calque Miniature puis Style → Image et cadrage → Importer une image.

Rectangles, carrés et rectangles arrondis disposent de l’option « Arrondis par coin ». Les quatre pourcentages sont indépendants, de 0 à 50 % du petit côté. Les rayons restent circulaires lors de l’étirement. Les réglages sont disponibles dans les deux éditeurs et en sélection multiple ; sauvegardes, copies et composants les conservent. Les anciens rectangles sans arrondi restent rectangulaires.

Le format 19 enregistre l’incrustation dans banner.slide. Les anciens bandeaux sont automatiquement convertis en objets éditables avec leurs textes, surtitres et notes ; les éléments supprimés ne sont pas recréés au rechargement.


### Partager les composants entre navigateurs

Dans Propriétés → Composants, « Projet » conserve la bibliothèque du diaporama et « Partagée » utilise un fichier indépendant. Sur le premier navigateur, ajouter un composant avec l’icône Partager de sa carte ou créer depuis la sélection dans Partagée, puis Enregistrer dans frame-composants.json. Sur le second navigateur, ouvrir le même fichier depuis Partagée. Enregistrer transmet les changements ; Actualiser relit le fichier. La bibliothèque est également relue au retour dans l’application, si l’accès est déjà autorisé. Chaque insertion reste une copie personnalisable.

Les modifications sur des composants différents sont réunies. Si le même composant a changé des deux côtés, l’écriture est bloquée et la copie locale est conservée : exporter cette copie ou utiliser Enregistrer sous pour la préserver. Les composants présents sont conservés à l’ouverture/import ; un doublon identique n’est pas réimporté. Éviter les sauvegardes exactement simultanées : les contrôles de conflit sur fichier ne sont pas une transaction de serveur.

Les navigateurs qui ne proposent pas l’accès direct aux fichiers utilisent les boutons Exporter/Importer JSON. Dans ce cas, réimporter le fichier actualisé pour récupérer les changements. Le fichier bibliothèque est distinct du fichier projet ; les modifications partagées en attente survivent au rechargement de l’onglet, mais doivent être enregistrées/exportées avant sa fermeture. Pas de serveur ni de synchronisation en ligne.

### Copier entre instances

Sélectionner les objets, placer le focus sur la composition et utiliser Ctrl C (Cmd C sur Mac). Ouvrir l’autre instance, cliquer sur sa composition puis Ctrl V/Cmd V. Textes, images intégrées, formes, tableaux, groupes, styles et dimensions sont transférés entre diapos et incrustations. Pour copier un composant complet, utiliser Copier sur sa carte puis coller sur la composition cible. Les collages répétés sont décalés de 24 unités de conception.

Les boutons Copier/Coller utilisent également le presse-papiers système lorsque le navigateur l’autorise. En cas de refus ou d’API indisponible, les raccourcis natifs restent la voie proposée. La copie/collage de texte dans un champ continue de fonctionner normalement. Les objets sont transmis au format texte balisé Frame, sans exécuter de contenu importé. Limites : 100 objets par composition, 100 composants par bibliothèque, échange de 64 millions de caractères maximum.


### Alignement, échelle et animations

Style → Typographie propose quatre alignements pour les textes : gauche, centre, droite et justifié. La justification répartit les espaces sur les lignes repliées ; la dernière ligne de chaque paragraphe reste à gauche. Les listes gardent leurs marqueurs et retraits. Le réglage est aussi disponible pour plusieurs textes sélectionnés.

Placement → Mise à l’échelle : activer les poignées proportionnelles pour un objet, puis tirer un coin. Les sélections multiples et groupes utilisent automatiquement quatre poignées proportionnelles. Textes, cadres, marges, puces, contours, tableaux et code suivent le même facteur ; les rotations et groupes sont conservés. On peut également saisir un pourcentage puis Appliquer l’échelle. Les transformations sont annulables et conservées dans les projets/composants. Les poignées ordinaires restent disponibles pour déformer un objet individuel hors de ce mode.

Animation propose fondu, montée, descente, glissement gauche/droite, zoom, recul léger et immédiat. Automatique alterne des effets sobres de façon stable par diapo et étape ; les éléments d’un groupe partagent leur mouvement et le centre du zoom. Dans Diapo → Ordre des apparitions, le bouton Auto applique ce choix à toute la diapo, sans changer les étapes. Une disparition optionnelle s’applique au retour à l’étape précédente (Retour arrière/Page précédente). Les animations durent 420 ms ; la préférence système de réduction des mouvements est respectée. Les PNG restent des images statiques ; le rendu des animations est partagé avec la présentation et la capture Canvas.

Un seul tiroir de propriétés reste ouvert à la fois. Les incrustations montrent un écran transparent au rapport 16:9, avec damier limité à son cadre, contour et dimensions de sortie ; le reste de l’atelier est uni. Ce cadre sert uniquement de repère dans l’éditeur et n’est pas exporté.


### Puissances et exposants

Dans la boîte Modifier le texte, **Insérer une puissance** ouvre deux champs : Base et Exposant. Par exemple, 2 et 23 insèrent `2²³` à la position du curseur, ou remplacent la sélection. **Sélection en exposant** transforme les chiffres sélectionnés. Exposants disponibles : chiffres, signes +/−/=, parenthèses, n et i. Le texte final utilise des caractères Unicode : rendu, export PNG/vidéo, sauvegardes et copier/coller conservent les puissances. La taille des exposants suit la police choisie.

### Apparitions compactes et notes de présentation

Diapo → Ordre des apparitions présente une ligne par objet ou groupe, avec un petit champ d’étape (0 = au départ) et un résumé de l’animation. Cliquer la ligne ouvre uniquement ses réglages d’apparition/disparition ; les noms des membres et options détaillées ne sont plus répétés pour chaque ligne. Auto conserve les étapes et applique la variation sobre. Le tiroir Position sur le canvas est retiré des propriétés ; le canvas spatial et son fonctionnement restent disponibles.

Dans **Diapo → Notes de présentation**, écrire des notes Markdown sur plusieurs lignes puis utiliser **Aperçu** : titres, listes, gras, italique, citations, code et tableaux sont rendus. Chaque diapo conserve ses notes dans le projet, avec sauvegarde locale, JSON et duplication. Limite : 20 000 caractères par diapo. Le rendu utilise [Markdown-it](https://github.com/markdown-it/markdown-it), sans HTML brut ni chargement d’images externes.

La console de présentation affiche le panneau Notes, avec un état vide si aucun texte n’est renseigné. Les notes suivent la diapo courante ; leur taille de lecture est réglable et le bouton Notes permet de masquer/réafficher le panneau. Les touches de défilement dans le panneau font défiler les notes ; Échap quitte toujours la présentation. Les notes sont affichées dans l’interface du présentateur et exclues du Canvas, donc des PNG et de la vidéo enregistrée par l’application. Un partage de l’écran complet affiche aussi ce panneau.


### Étapes pédagogiques dans une même diapo

Dans l’éditeur, **+ Étape** sous la diapo duplique l’état sélectionné. Modifier ensuite les objets avec les outils habituels : texte ou valeur, position, dimensions, couleur, tableau, code, ajout/suppression et groupes. Les étapes sont indépendantes ; modifier un état ne change pas les précédents. Les boutons Initial / étapes permettent de les retrouver. **Diapo → Étapes pédagogiques** permet de nommer, réordonner et supprimer les étapes, ainsi que de choisir la visibilité et la mise en évidence de chaque objet. Jusqu’à 20 étapes supplémentaires par diapo.

Les notes Markdown correspondent à l’état sélectionné. Les apparitions ordonnées restent configurables dans chaque état ; elles sont jouées avant le passage au suivant. Une nouvelle étape démarre avec tous ses objets visibles au départ, sauf les objets explicitement masqués. Un fondu sobre de 300 ms accompagne les changements d’état, désactivé si le système demande de réduire les mouvements. Retour arrière retrouve l’état précédent ; le parcours de la console permet aussi d’aller directement à une étape. PNG exporte l’état sélectionné ; les états et les notes sont conservés dans la sauvegarde locale, le JSON, la duplication de diapo et l’historique. Format projet 20, anciens projets acceptés.

### Mode présentateur sur deux fenêtres

**Présenter** ou **F12** ouvre une console privée et une fenêtre **Frame · Public**. Déplacer manuellement cette fenêtre vers l’écran à filmer ou à projeter, puis utiliser son bouton **Plein écran**. Autoriser les fenêtres contextuelles pour le site si le navigateur les bloque. Le bouton **Tester cette diapo** conserve un aperçu dans la console ; **Ouvrir la fenêtre Public** permet de lui ajouter la sortie publique ou de la rouvrir après fermeture.

La console montre la diapo courante, le prochain écran (apparition, état ou diapo), les notes Markdown de l’état, le parcours, un chronomètre et les outils laser/crayon/enregistrement. La fenêtre Public reçoit uniquement les pixels du Canvas, sans notes ni commandes de la console. Les annotations et les transitions sont donc partagées avec la diffusion et la capture WebM. Filmer/partager la fenêtre Public plutôt que l’écran entier pour garder les notes privées.

Espace/Entrée/Page suivante avance ; Retour arrière/Page précédente recule dans la console. Les flèches de la console conservent la navigation spatiale. Dans la fenêtre Public, droite/gauche avance/recule aussi. Son Échap sort d’abord du plein écran lorsque celui-ci est actif ; hors plein écran, il demande de quitter la présentation. Quitter depuis la console ferme la fenêtre Public. La fermeture/reconnexion est signalée ; fermer la console laisse un message de déconnexion côté public. Communication limitée à l’origine et à la session, images transférées à 30 images/s au maximum, dernier mouvement conservé, ressources libérées après dessin. L’ouverture et le placement sur un second écran restent gérés par le navigateur et le système.

### Opacité des objets

Sélectionner un objet puis Objet → Couleurs → Opacité : curseur de 0 à 100 %, commun aux textes, code, formes, images et tableaux, dans les diapos et les incrustations. Une sélection multiple applique la valeur à tous ses membres ; « Mixte » indique des valeurs différentes. Le réglage est conservé en sauvegarde, copie, composants et étapes pédagogiques, et utilisé en présentation et export.
