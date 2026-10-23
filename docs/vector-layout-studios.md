# Ateliers Vectoriel et Mise en page — V1 de test

Les deux ateliers sont autonomes et accessibles depuis **Applications** sur toutes les pages. **Notes** reste le premier accès. Ils partagent les outils, le panneau de propriétés et le format de dessin, avec deux bibliothèques et deux types de fichiers séparés.

## Commencer

- **Vectoriel** : `#/vectoriel`. Nouveau dessin vide ou « Ouvrir un exemple » pour le schéma Mémoire et références.
- **Mise en page** : `#/mise-en-page`. Nouveau document ou exemple de fiche Java avec exercice sur une deuxième page.
- Chaque document a son adresse ; une actualisation rouvre le document concerné. « Documents » revient à sa bibliothèque ; l’icône Accueil revient à Frame.
- Les boutons de création et d’exemple ouvrent immédiatement le document, sans actualisation manuelle.

## Outils communs

Sélection simple, Maj pour ajouter à la sélection, rectangle de sélection dans le vide, déplacement, poignées de redimensionnement, rotation et saisie numérique. Maj conserve les proportions pendant le redimensionnement et impose des pas de 90° en rotation. Les objets peuvent dépasser la page. La molette fait défiler, Ctrl molette règle le zoom ; molette enfoncée ou Espace permet de déplacer la vue. Les repères et l’aimantation sont désactivables.

Formes géométriques issues de la bibliothèque Frame, textes, images PNG/JPEG/WebP et SVG autonomes. Remplissages, dégradés, contours, pointillés, opacité et images découpées dans une forme. Le contour reste indépendant de l’image. La plume accepte des points au clic et des poignées de courbe au clic-glisser. Entrée termine un tracé ouvert ; cliquer le premier point ferme le tracé ; Échap annule. Dans Points du tracé, les points et leurs poignées sont déplaçables, ajoutables et supprimables.

Calques avec visibilité, verrouillage et réorganisation par glisser-déposer. Groupes, alignements, répartition et centrage sur la page. Soustraction et intersection non destructives de deux formes : les sources restent dans les calques. Les découpes utilisent des masques SVG, pas une fusion définitive des points. Une union géométrique/fusion complète n’est pas incluse dans cette V1.

Clic droit : ajouter, copier, coller, dupliquer, grouper, dégrouper, supprimer. Ctrl C/V fonctionne entre les deux nouveaux ateliers ; Ctrl D duplique, Ctrl A sélectionne, Ctrl Z / Ctrl Maj Z annule/rétablit. La suppression d’un objet, d’une page ou d’un document demande confirmation. Historique borné et chaînes d’images mutualisées, via le moteur d’historique existant.

## Documents et texte

Dans Mise en page, les formats A4/A5 utilisent les dimensions physiques exactes et les coordonnées sont affichées en millimètres ; le dessin vectoriel travaille en pixels. Marges, colonnes, gouttière, couleur du papier, en-tête, pied de page et numéros sont réglables. Les pages/plans de travail peuvent être créés, renommés, dupliqués, déplacés et supprimés.

Styles de document : titre, sous-titre, paragraphe, légende, code. Taille, interligne et police (Inter, Montserrat, Lora, monospace) sont partagés par les textes qui utilisent le style. La couleur et l’alignement d’un objet restent personnalisables. Double-clic sur un texte ouvre son éditeur ; un dépassement du bloc est signalé et « Ajuster la hauteur au texte » le corrige.

Clic droit → **Répartir un texte sur des pages** crée de nouvelles pages selon les marges, colonnes et style choisis. Les pages existantes sont conservées. Il s’agit d’une répartition à l’ajout, pas encore d’un flux lié qui se redistribue après chaque modification de texte, format ou typographie. Tableaux éditables disponibles depuis la révision ergonomique ci-dessous. Pas de sommaire automatique, fonds perdus, CMJN ou PDF accessible balisé.

## Sauvegarde et exports

- Copie automatique des documents dans IndexedDB, via le dépôt Frame ; documents séparés et chargement du seul document actif. Ils sont inclus dans la sauvegarde globale existante des réglages.
- Index léger avec aperçus sans images embarquées ; affichage de 24 documents par page. Seul le plan de travail actif est rendu en grand.
- Détection des écritures concurrentes dans une transaction : une version obsolète ne remplace pas une modification d’un autre onglet. Le bouton de récupération JSON reste disponible si une sauvegarde échoue.
- **Fichier → Enregistrer le fichier / Enregistrer sous** : fichier local JSON lié lorsque le navigateur supporte File System Access, avec protection contre une modification externe. Sinon téléchargement JSON. Lier un fichier n’active pas une écriture permanente sur disque ; la copie automatique dans le navigateur reste séparée.
- Export/import de projet JSON `frame-design`, avec `kind: vector` ou `kind: layout`. Importer crée une nouvelle copie ; le fichier d’un autre atelier est refusé. Les fichiers des ateliers vidéo ne changent pas de format.
- **SVG** et **PNG** exportent la page active, le dessin recadré ou la sélection depuis le panneau d’aperçu. Le SVG conserve les formes, courbes, textes et masques. Les textes SVG utilisent les polices disponibles dans le lecteur ; cette V1 ne convertit pas les lettres en tracés. Un SVG importé comme image reste un objet vectoriel unique, sans décomposer ses tracés. Les SVG contenant des images embarquées peuvent être refusés par l’import sécurisé des ateliers historiques ; utiliser le PNG dans ce cas, ou le JSON pour conserver l’édition dans ces nouveaux ateliers.
- **PDF** : ouvre un document d’impression isolé, sans barre d’outils ni repères. Choisir « Enregistrer en PDF » dans la fenêtre du navigateur. Toutes les pages sont imprimées avec texte sélectionnable, marges physiques et pagination ; les polices locales utilisées sont proposées au moteur d’impression. Aucun service distant. Le document temporaire se ferme après l’impression, sans fenêtre externe persistante.

Limites actuelles : 100 pages/plans de travail, 300 objets par page, 128 points par tracé, import JSON de 30 Mo et images préparées par le moteur d’import existant. Les nouveaux documents ne sont pas encore attachables comme supports dans une fiche vidéo et ne sont pas directement liés à la bibliothèque de composants partagés ; réutilisation via SVG/PNG pour cette V1.

## Vérification

Les tests couvrent normalisation, séparation des formats, sécurité du SVG, pagination sans perte de mots, copie des groupes et découpes, accès aux documents à la demande et conflits de révision. Le scénario navigateur couvre aussi l’ouverture des exemples sans actualiser, sauvegarde/reprise à l’adresse du document, annulation/rétablissement, confirmations, plume et points, SVG téléchargé, PDF multipage réel, thèmes clair/sombre et écritures concurrentes atomiques. Serveur et données de test isolés du serveur utilisateur.

## Révision ergonomique — 22 octobre 2026

- Palette flottante **partagée** avec Diaporama, Incrustations, Miniatures et Animation : poignée de déplacement, repli et position mémorisée par application. Les outils eux-mêmes restent adaptés au moteur SVG.
- Annuler/rétablir, aimantation, repères et zoom dans la barre inférieure. Pages/plans à gauche dans un panneau redimensionnable ; double-clic sur un nom ou bouton Document pour ouvrir le nom et le format. Les objets sont dans l’onglet Calques à droite.
- Onglets Objet/Document/Calques et tiroirs `InspectorDrawer` du diaporama, exclusifs. Propriétés typographiques locales ; styles globaux réservés à Mise en page. Couleurs de la bibliothèque de thèmes existante pour remplissage, contour et dégradé ; les couleurs choisies sont copiées dans l’objet (pas de liaison dynamique au thème).
- Exporter ouvre un aperçu : SVG ou PNG, plan entier/dessin/sélection, marge facultative, transparence et PNG 1×/2×/3×. Recadrage incluant rotation, contour et extrema Bézier ; dépendances des découpes conservées, autres objets exclus. Le PDF conserve toutes les pages et le dialogue d’impression.
- Règles graduées en pixels ou millimètres, avec les repères. Les règles suivent le zoom et le déplacement de la page ; ce ne sont pas encore des guides déplaçables.
- Clic droit : bloc de code (langage, fond, coloration Prism dans le rendu SVG/PDF), tableau éditable et répartition de texte continu. Tableaux : lignes/colonnes, cellules, taille/couleur du texte, fond et grille désactivables. Pas de fusion de cellules ni de flux multipage automatique pour les tableaux.
- Les poignées utilisent les mêmes calculs `resizeRotated`/`rotationFromPointer` que les autres éditeurs ; leur affichage reste SVG, avec les dimensions/accents visuels de Frame.

### Bilan comparatif et priorités possibles

L’[export d’Inkscape](https://inkscape-manuals.readthedocs.io/en/latest/export-png.html) distingue page, dessin et sélection. Cette distinction est désormais disponible ici. La gestion des cadres et du texte dans [Scribus](https://github.com/scribusproject/scribus/blob/master/doc/en/readme.html) donne aussi des repères pour la suite. Ce bilan est une proposition, pas une annonce de fonctions terminées.

1. **Mise en page : chaîner les blocs de texte et signaler les débordements.** La répartition actuelle crée des pages à l’ajout ; elle ne recalcule pas le flux après une retouche. C’est la prochaine amélioration la plus utile pour des cours longs.
2. **Gabarits de pages et guides personnalisés.** Les en-têtes/pieds et marges existent ; les composants répétés, formats différents par page et guides tirés depuis les règles restent à faire.
3. **Vectoriel : opérations géométriques complètes.** Soustraction/intersection sont des masques non destructifs. Union réelle, opérations complexes sur des chemins, décomposition des SVG importés et texte converti en tracés restent absents.
4. **Réutilisation dans les autres ateliers.** Les exports SVG/PNG fonctionnent, mais la bibliothèque de composants liés n’est pas encore branchée directement sur ces deux applications.
5. **Sorties professionnelles d’imprimerie.** PDF actuel adapté à la lecture et aux fiches. CMJN, fonds perdus, PDF balisé, polices vectorisées et contrôle prépresse ne sont pas présents.

Corrections vérifiées dans cette révision : bouton Document qui donnait l’impression de ne rien faire, accès au renommage, styles de texte trop globaux en Vectoriel, contrastes des boutons clairs, origine des règles, exports recadrés de formes tournées et de courbes hors de leur boîte initiale. Les documents antérieurs sont conservés ; les anciens textes de style Code reçoivent désormais le rendu de bloc de code.

## Panneau unique et pages mixtes

Les six éditeurs utilisent maintenant le même cadre `InspectorShell` et les mêmes champs `TransformFields`. Les contrôles du diaporama sont utilisés directement ou extraits : police, graisse, placement, groupe/espacement, couleur de thème, forme/contour et tiroirs. Le volet droit est redimensionnable. Objet sans sélection et Document ont des contenus distincts.

Les styles se gèrent depuis un texte sélectionné : choisir un style, créer un style nommé depuis ce texte, modifier le style commun pour mettre à jour ses textes. L’ancienne liste de tous les styles dans Document est retirée. Toutes les polices de Frame et leurs graisses sont disponibles.

Une nouvelle page peut être portrait ou paysage ; un PDF peut contenir les deux orientations. Les colonnes ont des proportions réglables, dont la somme est rééquilibrée. Les objets déplacés s’aimantent sur leurs repères lorsque l’aimantation est active. Maj + rotation utilise 45° dans ces deux ateliers. Les opérations de combinaison se trouvent dans la palette flottante.

L’import vidéo est disponible dans Diaporama et Animation via Insérer : lecture automatique, boucle, départ, lecture manuelle et les réglages visuels des images. Les extraits (64 Mo maximum) restent locaux, dans IndexedDB, et voyagent avec le fichier JSON exporté. Les exports Canvas contiennent les images de la vidéo sans son. Un MOV doit utiliser un codec décodable par le navigateur ; MP4 H.264 est généralement le choix le plus portable.

L’import et les couleurs SVG utilisent toujours le moteur partagé des incrustations. Les styles internes sûrs et les fichiers .svg sans type MIME sont désormais reconnus.


### Galerie, tiroirs et repères de lignes

Les propriétés utilisent le même InspectorDrawer que le diaporama, avec un chevron unique. Le thème se choisit dans **Fichier → Thèmes** ou **Affichage → Thèmes**, puis **Retour à l’atelier** ; sa palette apparaît dans les couleurs des objets et de la page. Les anciens sélecteurs de thème intégrés au panneau sont retirés. Les nouveaux documents héritent du thème choisi ; chaque document peut mémoriser son propre choix.

Dans **Document → Marges et grille**, choisir le nombre de colonnes et de lignes, puis déplacer les séparateurs de la répartition. Les pourcentages se rééquilibrent entre les deux zones voisines. Les flèches du clavier ajustent un séparateur sélectionné (Maj : pas de 5 %). Les gouttières des lignes et colonnes sont indépendantes. Ces repères servent à l’aimantation et ne figurent pas dans SVG/PNG/PDF ; le texte continu suit les colonnes, pas les lignes de repères.

Les SVG Illustrator contenant un DOCTYPE et des alias d’espace de noms SVG/XLink sont nettoyés automatiquement à l’import, sans modifier le fichier d’origine. Le SVG reste vectoriel et recolorable par le moteur existant.


## Projets d’exemple avancés — 22 octobre 2026

Depuis la bibliothèque de chaque atelier, **Explorer le projet** crée une copie indépendante. Les exemples simples restent disponibles. Les documents sont construits par `src/designExamples.js` avec le modèle et le moteur de rendu existants ; ils ne remplacent aucun projet utilisateur.

### Vectoriel : Atlas JVM

Quatre plans de travail, 192 objets natifs : cartographie pile/tas, identité et String pool, fabrique de signes, scénario d’affectation en trois états. Formes, groupes, Bézier et tangentes, contours, opacité, découpe booléenne non destructive, motif SVG dans une forme, styles nommés et blocs de code. Le plan « Fabrique de signes » permet de déplacer l’anneau et sa découpe ou de modifier les points des courbes. Les traits sont des tracés éditables, pas des connecteurs automatiquement attachés aux objets.

### Mise en page : Dans la mémoire de Java

Sept pages et 216 objets natifs : couverture illustrée, références et aliasing, identité/contenu, accessibilité, poster A4 paysage, laboratoire et corrigé/sources. Les autres pages sont A4 portrait. Code Java coloré, tableau éditable, grille deux colonnes/trois lignes, styles de titres/corps/légendes/code et repères non imprimés. L’exemple utilise la mise en page libre ; il ne prétend pas fournir un texte chaîné ou des gabarits de pages, qui restent des pistes non livrées.

Contenu vérifié avec la [JVMS §2](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-2.html), la [JLS §15.21.3](https://docs.oracle.com/javase/specs/jls/se25/html/jls-15.html#jls-15.21.3) et l’[API String](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/String.html). Les schémas représentent des relations logiques et ne figent pas l’implantation physique de la JVM.

Des fichiers `.frame.json` importables sont aussi présents dans `public/examples/`. Ils sont la source à utiliser pour reprendre l’édition native dans Frame. Les SVG d’aperçu/export conservent leur rendu avec des polices locales embarquées et leurs licences OFL ; les règles de sécurité de l’import SVG des autres ateliers restent strictes et ne sont pas élargies pour accepter les fontes embarquées. Pour utiliser ces créations comme une image dans un autre atelier, le PNG reste disponible.

### Corrections issues de la validation

- Le rendu des blocs de code et des tableaux respecte la police et la graisse choisies.
- Les retours à la ligne tiennent compte de l’espacement des lettres.
- Les polices utilisées sont chargées avant les mesures d’export. L’aperçu et les SVG/PNG embarquent uniquement les fontes locales utiles ; le PDF utilise les mêmes déclarations. Les licences accompagnent les fontes du SVG.
- Un seul moteur de rasterisation PNG sert le dialogue d’export et les commandes de l’atelier, avec les limites de pixels existantes. Les sélections successives d’options d’export ne rétablissent pas un aperçu périmé.
- La création d’un exemple est protégée contre les doubles clics.

Validation : édition réelle, annulation, déplacement d’un groupe avec découpe, reprise après actualisation, téléchargements SVG/PNG, chemin d’impression réel et nettoyage de son iframe. PDF sept pages produit et rendu avec Poppler, orientations mixtes vérifiées, textes contrôlés et onze compositions inspectées. Le moteur a aussi exporté un plan de 300 formes sans erreur sur l’environnement de test ; ce contrôle ne garantit pas un temps identique sur chaque ordinateur.

Pour régénérer les aperçus et JSON après modification du générateur, démarrer un serveur Vite isolé sur 5289 avec un `FRAME_ASSETS_DIR` temporaire, puis lancer `FRAME_TEST_URL=http://127.0.0.1:5289 FRAME_PLAYWRIGHT_MODULE=<chemin-vers-playwright> node scripts/design-examples.mjs`. Le script refuse le port utilisateur. `tests/browser/advanced-examples.cjs` vérifie les parcours dans le même environnement isolé.
