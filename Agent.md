# Mémoire du projet — CanvaCodex / Frame

Dernière mise à jour : 3 octobre 2026 (Europe/Paris).

Ce fichier conserve le contexte, les décisions, les conventions, l’état réel du projet et sa roadmap. Le lire au début d’une session et le mettre à jour lorsque les décisions ou l’état changent. Résumer les échanges utiles, sans copier intégralement les conversations, sans secrets et sans présenter une idée comme une fonctionnalité livrée.

## Vision et public

Killian prépare une chaîne YouTube consacrée à Java en profondeur. La chaîne lui sert à développer ses compétences pour trouver un emploi et à transmettre ses connaissances. Sa conviction : continuer à apprendre à coder et à comprendre le fonctionnement des outils, sans dépendre de l’IA.

Les spectateurs connaissent déjà les variables, boucles, fonctions et méthodes. Les vidéos expliquent leur mise en œuvre en Java et les mécanismes sous le capot, étape par étape. Les contenus d’exemple doivent respecter ce niveau ; éviter un cours générique d’initiation à la programmation.

L’application est un outil personnel de production vidéo. Elle doit permettre de consacrer le temps au contenu plutôt qu’à concevoir des templates. Aucun paiement, abonnement, produit commercial ou connexion à une IA n’est demandé. L’utilisation de Codex pour développer l’application ne signifie pas qu’il faut intégrer une IA dans le produit.

## Besoins exprimés

- Éditeur de diaporamas avec compositions prédéfinies et personnalisation fine des positions.
- Thèmes prédéfinis appliqués globalement à toutes les diapos.
- Deux espaces cohérents : diaporamas et incrustations/bandeaux vidéo.
- Bandeaux dont le texte est modifiable, exportables pour un montage manuel.
- Mode présentation permettant de montrer, entourer et annoter avec un laser personnalisable.
- Enregistrement des diapos et des mouvements/annotations ; fichier vidéo exporté après Stop pour être ajouté à la vidéo principale.
- Préférence technologique : Symfony et Vue.js. Le choix initial d’une version Vue autonome a été annoncé et la première interface a été jugée satisfaisante par l’utilisateur. Cela ne constitue pas un abandon définitif de Symfony.
- Première version utilisable rapidement, avec un design soigné, interface en français.

## Décisions et architecture actuelle

- Nom de l’interface : **Frame — Java Studio**. Dépôt : [GKillianCode/CanvaCodex](https://github.com/GKillianCode/CanvaCodex).
- Racine du dépôt : ce dossier. Application : `java-studio/`.
- Vue 3, Vite 6, composants Single File Components, JavaScript, icônes Lucide Vue.
- Pas de backend ni de Symfony à ce stade. Pas de synchronisation entre appareils.
- Données sauvegardées sur l’appareil dans `localStorage` (clé `frame-project`). Export/import de projet JSON pour les sauvegardes portables.
- Rendu partagé sur Canvas 2D, coordonnées de conception 1920 × 1080 mises à l’échelle vers la résolution choisie (QHD par défaut), pour présentation et exports.
- Enregistrement via `Canvas.captureStream(30)` et `MediaRecorder`, vidéo WebM sans audio. L’éditeur, ses panneaux et commandes ne sont pas enregistrés.
- PNG pour les diapos ; PNG transparent pour les bandeaux.
- Interface sombre avec accent menthe ; thèmes Terminal, Midnight, Carbon et Paper. Les thèmes concernent les créations ; l’atelier conserve son interface sombre.
- Polices d’interface et des diapos embarquées localement via Fontsource, avec repli système.
- Une inscription Sites privée a été créée au premier tour, mais aucune mise en ligne n’a abouti : les scripts du module étaient devenus indisponibles. Ne pas confondre cette inscription avec un site publié. La configuration locale `.openai/` n’est pas nécessaire au fonctionnement ni à la publication sur GitHub.

## État livré

- [x] Interface française avec espaces Diaporamas, Incrustations et Thèmes.
- [x] Quatre diapos d’exemple autour du bytecode et de la JVM.
- [x] Ajout, duplication et suppression de diapos (au moins une conservée).
- [x] Modification des surtitres, titres, explications et exemples de code.
- [x] Vingt compositions distinctes, dont six avec images ; galerie lors de l’ajout, sans choix de direction.
- [x] Déplacement des blocs à la souris et réglages X, Y, largeur, hauteur, taille du texte ; huit poignées de redimensionnement.
- [x] Galerie de 20 formes vectorielles, déformables avec remplissage, contour, opacité et superposition réglables.
- [x] Quatre thèmes globaux partagés entre diapos et incrustations.
- [x] Quatre formats de bandeaux : titre inférieur, titre de chapitre, À retenir, Voir une autre vidéo.
- [x] Export PNG, sauvegarde locale et export/import JSON avec validation structurelle.
- [x] Présentation avec navigation, laser réglable en couleur/taille, crayon, effacement.
- [x] Enregistrement WebM, aperçu vidéo après Stop et lien de téléchargement.
- [x] Édition directe par double-clic ; coloration Java Prism et formatage Prettier automatique au collage dans un worker.
- [x] En-tête/pied de page optionnels, désactivés par défaut.
- [x] Parcours spatial sur quatre axes, transitions continues enregistrées dans le Canvas.
- [x] Apparitions ordonnées des blocs au clic (fondu, montée, zoom ou immédiate).
- [x] Exemple mémoire vertical Go → Mo → Ko → octet, unités décimales distinguées des binaires.
- [x] Canvas spatial avec déplacement des diapos sur une grille, déplacement de la vue, zoom et recadrage ; double-clic pour éditer.
- [x] Liste réordonnable par glisser-déposer des miniatures/poignées et clavier ; « Présenter » commence au début.
- [x] Sortie de chaque diapo visible et configurable dans les propriétés ; aperçu depuis la diapo sélectionnée.
- [x] Textes et images ajoutables, supprimables et animables indépendamment ; import local, dimensions et recadrage des images.
- [x] Interface adaptée aux petits écrans.
- [ ] Backend Symfony, base de données et gestion de plusieurs projets.
- [ ] Hébergement opérationnel distant.
- [x] Dépôt Git local initialisé, remote `origin` associé à CanvaCodex, branche `feat/frame-studio-initial` créée.
- [x] Commits locaux du socle et de l’application ; mémoire et brouillons de suivi préparés.
- [x] Sources de l’application publiées sur GitHub ; [issue #1](https://github.com/GKillianCode/CanvaCodex/issues/1) créée.
- [x] Mémoire et conventions publiées ; [PR #2](https://github.com/GKillianCode/CanvaCodex/pull/2) ouverte pour revue, non fusionnée.

## Validation et limites connues

Vérifications effectuées le 2 octobre 2026 : `npm run build` passe ; l’interface a été inspectée dans le navigateur ; duplication vérifiée et corrigée (copie d’un objet Vue réactif) ; enregistrement avec changement de diapo puis Stop, vidéo produite de 557 Ko et reconnue par le lecteur comme 1920 × 1080 ; export PNG de bandeau produit de 60 Ko. Le téléchargement automatique n’a pas pu être récupéré par l’outil de test navigateur : un lien de téléchargement explicite permet de retenter. La transparence est prévue par le rendu Canvas mais n’a pas été mesurée sur le fichier téléchargé. Sur mobile à 390 px, la largeur du contenu ne dépasse plus celle du document.

Un outil navigateur de lecture seule permet de lire le contenu du projet lorsque WebMCP est supporté. Entrée valide testée ; entrée invalide rejetée après rechargement. Ce mécanisme n’ajoute aucun service d’IA à l’application.

Limites à conserver visibles dans les comptes rendus :

- WebM uniquement, pas de MP4, audio, microphone ou caméra.
- Compatibilité liée à `MediaRecorder`, au Canvas et aux codecs WebM du navigateur.
- Les enregistrements restent en mémoire jusqu’à l’export ; les longues sessions doivent être évaluées.
- Le rafraîchissement ou la fermeture perd les exports en mémoire, mais le projet modifié est sauvegardé localement lorsque cette sauvegarde fonctionne.
- Les projets locaux ne se synchronisent pas. Exporter du JSON pour transférer ou sauvegarder.
- Le placement libre peut produire des chevauchements ; il n’existe pas encore de détection de débordement du contenu.
- Les premiers essais ont modifié les diapos d’exemple dans le navigateur principal ; elles ont été restaurées. Utiliser un contexte de test séparé pour les vérifications futures.

## Conventions de travail

- Préserver les fonctionnalités et données existantes ; demander seulement les informations qui changent réellement le résultat.
- Maintenir une interface française, simple et orientée production de contenu.
- Utiliser le rendu partagé pour éviter les différences entre aperçu et export.
- Ne pas ajouter d’IA, de paiement ou de fonctions commerciales sans une nouvelle demande explicite.
- Conserver `package-lock.json` ; installer avec `npm ci` lors d’une installation reproductible.
- Vérifier la compilation pour les changements applicatifs ; vérifier les parcours touchés dans un contexte de test distinct. Ne pas annoncer des tests non effectués.
- Éviter les grandes refontes silencieuses. La séparation de `App.vue` en composants sera utile à mesure que les fonctionnalités évoluent.
- Ne jamais committer de secrets, de tokens, de fichiers d’environnement, de données de projet personnelles ni de fichiers exportés par l’utilisateur.
- Mettre à jour ce fichier, le README et les tickets pertinents lorsque le comportement ou les décisions évoluent.

## Traçabilité GitHub demandée

À compter du 2 octobre 2026, l’utilisateur demande de tracer tout le travail sur GitHub via issues, branches, commits et pull requests dans `GKillianCode/CanvaCodex`.

- Créer ou réutiliser une issue pour chaque lot cohérent de travail, avec problème, résultat attendu et critères de validation.
- Utiliser une branche dédiée, par exemple `feat/<sujet>`, `fix/<sujet>` ou `docs/<sujet>` ; éviter les changements applicatifs directement sur la branche principale.
- Commits ciblés avec messages explicites, de préférence `feat:`, `fix:` ou `docs:`.
- Une pull request décrit le comportement final, les vérifications réellement effectuées et les limites importantes ; lier l’issue correspondante.
- Ne pas inventer de numéro d’issue ou de PR. Ajouter ici les liens seulement après création confirmée.
- Publier le travail autorisé ; ne pas fusionner automatiquement les PR ni réécrire l’historique sans une demande explicite.
- Si l’accès GitHub est indisponible, préparer les fichiers et commits localement, noter le blocage, puis reprendre la publication dès que la connexion est confirmée. Ne pas demander un token dans le chat.

## Roadmap proposée — à prioriser avec Killian

Ces éléments sont des pistes, pas des fonctionnalités commandées ou livrées.

1. **Versionner la première version** : mémoire projet, dépôt, issue de livraison initiale, commits, PR et guide de lancement.
2. **Fiabiliser les exports** : vérifier les PNG transparents dans le logiciel de montage de Killian ; vérifier laser et crayon dans les fichiers vidéo ; tester les séquences longues et prévenir la perte d’un enregistrement.
3. **Améliorer l’édition** : annuler/rétablir, guides d’alignement, repères de marges et détection de dépassement. Le réordonnancement est livré.
4. **Affiner les templates techniques** : compositions diagrammes, comparaisons avant/après, stack/heap, pipeline JVM, code avec lignes mises en évidence ; sauvegarder ses propres compositions.
5. **Ajouter Symfony si nécessaire** : persistance de plusieurs projets, modèles réutilisables et sauvegardes serveur, sans mécanisme commercial.
6. **Choisir un hébergement personnel** : local ou distant, en conservant l’accès adapté à un usage privé.

## Historique et prochaines actions

- **2 octobre 2026 — première version** : application Vue autonome créée, aperçus et exports implémentés ; build et principaux parcours vérifiés. L’utilisateur juge l’application satisfaisante comme point de départ.
- **2 octobre 2026 — mémoire et GitHub** : demande de ce fichier `Agent.md` à la racine, et de traçabilité GitHub pour les travaux suivants. Le dépôt distant est accessible en lecture et ne contient aucun ref au moment de la vérification. Aucun outil GitHub authentifié n’est disponible initialement ; connexion GitHub proposée. Publication à reprendre après confirmation de connexion.
- **Préparation locale** : commit `27a1eed` sur `main` pour le socle du dépôt ; commit `d074f06` sur `feat/frame-studio-initial` pour l’application. Le build a été revérifié et passe. Brouillons d’issue et de PR conservés dans `.github/drafts/`. Un envoi non interactif de `main` a échoué faute d’identifiants HTTPS ; rien n’a été publié. Aucun numéro d’issue ou de PR n’est encore attribué. Le plugin GitHub avait été proposé ; sa connexion a ensuite été confirmée et la publication a repris.

- **Connexion et publication GitHub** : accès au dépôt confirmé avec les droits d’écriture. Le dépôt était toujours vide. Le connecteur GitHub a créé le socle distant sur `main` (commit `42c8388`) et publié les sources sur `feat/frame-studio-initial` (commit `197c3da`), avec l’issue [#1](https://github.com/GKillianCode/CanvaCodex/issues/1). Les commits distants ont des identifiants différents des premiers commits locaux : les sources ont été publiées via le connecteur, sans identifiants Git HTTPS locaux. La mémoire a été publiée dans le commit `6f38e1f` et la [PR #2](https://github.com/GKillianCode/CanvaCodex/pull/2) est ouverte vers `main`. L’issue #1 reste ouverte jusqu’à la revue et la fusion. Aucun changement n’a été fusionné automatiquement.

### Suivi GitHub actuel

- Issue de livraison : [#1](https://github.com/GKillianCode/CanvaCodex/issues/1).
- Pull request : [#2](https://github.com/GKillianCode/CanvaCodex/pull/2), branche `feat/frame-studio-initial` vers `main`, ouverte pour revue.
- Les sources applicatives n’ont pas changé pendant la publication ; le build réussi précédemment reste pertinent.
- Les premiers commits locaux sont conservés dans les branches d’archive `archive/local-frame-initial-20261002` et `archive/local-bootstrap-20261002`. Les branches de travail locales `main` et `feat/frame-studio-initial` doivent suivre leurs homologues distantes après récupération, sans réécriture de l’historique distant.
- Pour la suite : créer ou réutiliser une issue avant chaque nouveau lot, documenter les décisions ici et ouvrir une PR avec les validations réellement effectuées. La roadmap reste proposée ; aucun ticket de développement supplémentaire n’est lancé sans choix de priorité.

### 2 octobre 2026 — édition fluide et diaporamas spatiaux

Demandes de Killian : corriger le lag au déplacement, rendre les habillages optionnels, naviguer dans les quatre directions avec transitions continues, révéler les éléments par ordre, éditer par double-clic, choisir une disposition dans une galerie et colorer/indenter réellement le Java. Suivi : [issue #3](https://github.com/GKillianCode/CanvaCodex/issues/3), branche `feat/spatial-slides`, basée sur `feat/frame-studio-initial` tant que la PR #2 reste ouverte.

Architecture : `useStudio.js` gère les interactions ; `model.js` normalise les anciens projets et les coordonnées ; `render.js` partage le rendu ; composants dédiés à la galerie et à l’édition ; Prism pour les tokens, Prettier Java 2.7.7 dans un worker pour le formatage. Les miniatures font 384 × 216 et sont mises en cache. Pendant un glisser, la position est transitoire, le rendu est limité à une fois par frame ; sauvegarde et miniature se mettent à jour à la fin. Les thèmes/fonds et tokens sont également mis en cache. Les anciens textes et positions sont préservés, les slides reçoivent une grille et des blocs statiques par défaut.

Validation : six tests passent (migration, quatre directions, groupes d’apparition, séquence mémoire, tokens Java, formatage et conservation d’un extrait incomplet), build réussi. Dans un navigateur de test séparé : double-clic et collage formaté confirmés ; glisser observé avec un seul commit de position et une seule miniature recalculée après le geste ; galerie, ajout du parcours, apparition et transitions verticales aller/retour vérifiés ; WebM de 641 Ko reconnu en 1920 × 1080 après une transition et une apparition. La barre de commandes de présentation a été corrigée pour rester sous le Canvas. Aucun benchmark de FPS ni test d’enregistrement long n’a été effectué.

Les blocs actuels restent titre, explication et code : pas encore de système arbitraire d’objets ou de schémas. L’ordre concerne ces blocs entiers. Les coordonnées spatiales sont distinctes des positions X/Y des éléments. La navigation par flèches suit le voisin sur le même axe ; Espace suit les apparitions puis l’ordre de la liste. Pas de bibliothèque Reveal.js intégrée : transitions Canvas pour garantir le même résultat dans l’export vidéo.

Publication confirmée : commit applicatif distant `f2826c8`, [PR #4](https://github.com/GKillianCode/CanvaCodex/pull/4) ouverte de `feat/spatial-slides` vers `feat/frame-studio-initial`. L’issue #3 décrit les critères réalisés et reste ouverte jusqu’à la revue/fusion. Aucune PR fusionnée. L’affichage mobile à 390 px a été revérifié sans débordement. Le commit local d’origine est conservé dans `archive/local-spatial-20261002` lors de l’alignement sur les commits du connecteur GitHub.

### 2 octobre 2026 — canvas, images et compositions étendues

Killian confirme que l’interface ne lag plus. Il demande de supprimer le choix de direction de la galerie, d’afficher le départ de la diapo dans les propriétés, d’avoir au minimum 20 templates avec images, trois textes révélés aux clics successifs, le réordonnancement par glisser-déposer et une grille spatiale inspirée du Canvas d’Obsidian. Suivi : [issue #5](https://github.com/GKillianCode/CanvaCodex/issues/5), branche `feat/deck-canvas`.

Décisions : le canvas est la vue initiale ; la vue Éditer conserve la liste pour réordonner. L’ordre de lecture et les positions spatiales sont indépendants. Les connexions et numéros du canvas indiquent l’ordre de lecture. Les diapos se déposent sur des cases libres ; une case occupée refuse le dépôt. Le fond se déplace librement, le zoom va de 12 % à 200 %, et le recadrage retrouve toutes les diapos. Les coordonnées sont bornées à ±10 000 cases, sans page de taille fixe. La direction automatique découle de la position de la suivante ; la propriété explicite indique le mouvement de la diapo **sortante**. Le retour en arrière inverse la transition. Présenter commence à la première diapo ; Tester cette diapo commence à la sélection.

Modèle version 3 compatible avec les sauvegardes précédentes : les champs titre/explication/code sont conservés, avec des éléments texte/image supplémentaires et leurs positions/animations. Les anciens éléments de template restent stockés mais sont masqués lorsqu’une nouvelle composition ne les utilise pas ; les éléments ajoutés manuellement restent visibles. Vingt dispositions réellement distinctes, dont six avec emplacements d’image. Les templates à trois textes proposent les ordres 1, 2, 3 par défaut. On peut ajouter et supprimer ses propres éléments, choisir leurs ordres, animations et positions. Limites du modèle : 100 diapos et 40 éléments supplémentaires par diapo.

Images : import PNG/JPEG/WebP local, fichier de 20 Mo maximum, conversion en WebP à 1 600 px maximum avec conservation de la transparence, source intégrée au JSON (moins de 3 Mo par source). Pas d’URL distante ni de ressource générée par IA. Le rendu Canvas partage les images mises en cache entre miniatures, PNG, transitions et WebM ; elles sont préchargées avant la présentation et les exports. La limite de stockage local du navigateur demeure : en cas d’échec, l’interface propose l’export JSON.

Validation dans une origine de test séparée : galerie avec 20 choix et aucune direction à la création ; sélection et sortie configurée vers le bas ; trois clics vérifiés aux étapes 1/3, 2/3 et 3/3 puis passage à la suivante ; déplacement de la deuxième diapo en première par poignée, puis réordonnancement depuis la miniature entière ; départ de la présentation à 1/9 avec le nouveau contenu ; déplacement spatial d’une diapo en (1,1), déplacement de la vue et zoom ; image PNG importée et visible ; nouveau texte édité directement ; export PNG de 81 Ko ; enregistrement avec image et sortie vers le bas, WebM de 355 Ko reconnu en 1920 × 1080. Après rechargement, ordre, positions, texte ajouté et source de l’image conservés. Mobile à 390 px sans débordement. Onze tests du modèle/Java passent ; build vérifié. Pas de test de longue session ni de mesure FPS.

Publication confirmée : [PR #6](https://github.com/GKillianCode/CanvaCodex/pull/6) ouverte de `feat/deck-canvas` vers `feat/spatial-slides`, avec l’issue #5 mise à jour. Le commit applicatif distant est `828c7da`. Aucun changement fusionné automatiquement. Les commits locaux d’origine sont conservés dans `archive/local-deck-canvas-20261002` lors de l’alignement sur les sources identiques publiées via le connecteur.


### 2 octobre 2026 — QHD, traînée laser et direction artistique

Demande : résolution réglable avec 2560 × 1440 par défaut, traînée laser uniquement pendant le clic gauche, refonte professionnelle des vingt dispositions et dix thèmes plus vifs. Suivi : [issue #7](https://github.com/GKillianCode/CanvaCodex/issues/7), branche `feat/qhd-art-direction`, basée sur `feat/deck-canvas` (PR #6 encore ouverte).

Modèle version 4 : résolution persistée/exportée/importée, ratio 16:9, HD/Full HD/QHD/4K et largeur personnalisée de 640 à 3840 px multiple de 16. Le rendu partagé conserve les coordonnées logiques 1920 × 1080 pour ne pas déplacer les anciens contenus ; canvas physique, PNG, bandeaux et capture vidéo utilisent la résolution de sortie. Les propriétés de position et de typographie sont affichées en pixels de sortie. Les miniatures restent 384 × 216 ; elles ne sont pas recalculées en haute résolution.

Laser : début de trait au bouton gauche, nouveaux points seulement si le bouton reste enfoncé, arrêt au relâchement/annulation, disparition progressive en 900 ms, strokes séparés, limite de 600 points. Les frames continuent pendant l’effacement même sans enregistrement. Le clic sur la diapo ne fait plus avancer : utiliser Espace/Entrée ou Révéler/Suivant. Le crayon conserve son comportement permanent. La traînée est incluse dans la capture Canvas.

Direction artistique : marges cohérentes de 128 px, titres forts, accents en dégradé et halos discrets, suppression de la grille de points, cadres de code arrondis, adaptation du texte à la hauteur réservée, code ajusté à son cadre, cartes numérotées, chronologie et comparaisons. Les anciens placements sont conservés (designVersion 1) ; Réappliquer la disposition active la nouvelle composition (version 2) et offre une annulation de la dernière recomposition sans annuler les éditions de texte. Palette partagée de dix thèmes : Terminal, Midnight, Carbon, Studio, Cobalt, Corail, Volt, Pulse, Glacier, Sunset. Studio et Glacier utilisent les couleurs syntaxiques claires. Aucun asset généré par IA ni ajout de dépendance.

Références visuelles consultées : [Apple Events](https://www.apple.com/apple-events/) et [générateur public de slides Benjamin Code](https://school.benjamincode.tv/galerie/slides-generator), pour la hiérarchie typographique, l’espace et les accents. Interprétation originale, sans copie d’asset. Atlas de contrôle en développement : `java-studio/tests/visual.html`.

Validation : 14 tests passent ; compilation réussie. Atlas des vingt dispositions et dix palettes inspecté dans le navigateur ; réglage Full HD puis QHD et recomposition/annulation vérifiés. PNG produit de 1 425 Ko ; récupération du fichier via l’automatisation indisponible (timeout du téléchargement), donc dimensions du PNG non mesurées sur disque. Présentation : traînée visible au drag, effacée ensuite avec diagnostics zéro point et inactive, sans avancer la diapo. WebM court produit de 7 646 Ko, lecteur reconnaissant 2560 × 1440. Aucune erreur console. Pas de mesure FPS ni de test d’enregistrement long/4K.

Publication confirmée : [PR #8](https://github.com/GKillianCode/CanvaCodex/pull/8) ouverte de `feat/qhd-art-direction` vers `feat/deck-canvas`, commit applicatif distant `569f8ac`. L’issue #7 est mise à jour et reste ouverte jusqu’à la fusion. Aucune fusion automatique. Les commits locaux d’origine sont conservés dans `archive/local-qhd-art-direction-20261002` lors de l’alignement sur les sources identiques du connecteur.


### 2 octobre 2026 — édition précise et laser continu

Feedback : la première traînée montre des points et manque de finesse. Killian demande Alt pour les distances haut/gauche, déplacement au clavier, Ctrl D pour dupliquer un élément, nom de fichier optionnel du code, redimensionnement aux coins et propriétés plus simples avec clic droit. Suivi : [issue #9](https://github.com/GKillianCode/CanvaCodex/issues/9), branche `feat/element-editor`, basée sur `feat/qhd-art-direction` (PR #8 encore ouverte).

Laser remplacé par un ruban par trait : échantillonnage tous les 3 px logiques avec récupération des événements coalescés du navigateur, contour lissé par courbes quadratiques, opacité réduite et largeur qui diminue avec l’âge. Aucun cercle ni bout rond répété sur la traînée ; seul le pointeur reste visible, plus petit. Maximum de 2 400 points, 800 interpolations par événement, même durée de 900 ms et même condition du bouton gauche. Les tracés fermés utilisent un axe de dégradé non nul. Le rendu et l’enregistrement restent partagés.

Édition : Alt affiche uniquement dans l’éditeur les distances depuis les bords haut et gauche, en pixels de sortie. Une commande Repères permet aussi de les activer. Relâcher Alt ou perdre le focus les désactive. Les flèches déplacent de 1 pixel réel (0,75 coordonnée logique en QHD), avec répétition native de la touche maintenue ; Maj déplace de 10 px. Les raccourcis ne modifient pas les éléments quand un champ de saisie est actif. Ctrl/⌘ D duplique un élément, y compris titre, code ou image, en conservant styles et fragments, avec décalage de 24 px logiques. Quatre poignées redimensionnent librement le cadre en gardant le coin opposé ; la taille de texte suit la transformation, et les images conservent leurs options de cadrage. Les transformations restent transitoires pendant le geste ; positions/sauvegarde/miniatures sont validées à la fin. Les poignées suivent l’aperçu sans déclencher la sauvegarde.

`PropertiesPanel.vue` sépare Élément, Diapo et Style ; les paramètres secondaires sont repliables. Menu au clic droit pour éditer, dupliquer, supprimer, ajouter texte/image/code. On peut supprimer un bloc de template mais pas le dernier élément visible. Les ajouts sont bornés dans le cadre pour garder leurs coins accessibles. Le champ facultatif codeTitle (200 caractères maximum) et les codes personnalisés sont conservés dans le JSON ; leur duplication et formatage passent par les mêmes fonctions que le code initial. Les titres dupliqués conservent graisse et surtitre. Les guides, cadres et poignées ne sont pas exportés. Aucun ajout de dépendance.

Vérifications : 18 tests passent et build réussi. Navigateur séparé : déplacement 171 → 172 px, Ctrl D sur le titre, Alt + flèche puis relâchement, guides 173/277 px, redimensionnement du coin inférieur droit (largeur/hauteur et typographie), clic droit et duplication du code, édition/formatage du code copié sans changer l’original, nom de fichier et géométrie retrouvés après rechargement, ajout d’un nouveau bloc de code depuis le menu. Nouveau laser observé fin et continu ; WebM de 31 secondes produit (13 721 Ko), reconnu en 2560 × 1440. Mobile à 390 px sans débordement horizontal ; aucune erreur console. Tests des quatre coins et des limites, images/code/titres dupliqués, migrations et tracés fermés. Pas de benchmark FPS ni de test d’enregistrement long.

Publication confirmée : [PR #10](https://github.com/GKillianCode/CanvaCodex/pull/10) ouverte de `feat/element-editor` vers `feat/qhd-art-direction`, commit applicatif distant `72c6ec3`. L’issue #9 est mise à jour et reste ouverte jusqu’à la fusion. Aucune fusion automatique. Les commits locaux d’origine sont conservés dans `archive/local-element-editor-20261002` lors de l’alignement sur les sources identiques du connecteur.


### 3 octobre 2026 — thèmes personnels et espace de travail

Demande : créer/dupliquer/éditer/supprimer les thèmes, sélection explicite et multiple, raccourcis Supp/Ctrl A, panneaux masquables et ajustables, navigation compacte et en-tête réduit ; améliorer encore le laser, commande unique, aperçu suivant et délai avant capture. Suivi : [issue #11](https://github.com/GKillianCode/CanvaCodex/issues/11), branche `codex/theme-workspace` basée sur `feat/element-editor` (PR #10 encore ouverte).

Modèle version 5 : palette modifiable de 1 à 100 thèmes, y compris les thèmes prédéfinis ; nom, description, cinq couleurs hexadécimales et coloration syntaxique claire/sombre. Création vierge avec valeurs de départ ou copie indépendante ; brouillon avec aperçu avant sauvegarde ; suppression récupérable via Annuler la suppression, sans perdre les modifications des autres thèmes. Palette conservée dans `frame-themes` et dans le JSON du projet ; import ancien compatible. Cache des fonds et miniatures basé sur les couleurs réelles pour éviter les aperçus obsolètes après édition d’un thème.

Sélection : aucun élément sélectionné initialement ; clic dans le vide pour désélectionner, Ctrl/⌘ + clic pour une sélection multiple. Ctrl/⌘ A sélectionne les éléments dans l’éditeur ou les diapos sur le canvas/dans la liste ; Supp supprime la sélection correspondante. Les champs texte conservent leurs raccourcis de saisie. Une diapo peut devenir vide ; le projet doit garder au moins une diapo. Les propriétés ne présentent la géométrie que pour une sélection unique.

Espace de travail : menu Affichage pour navigation, propriétés, liste/formats et barre d’outils ; navigation réductible aux icônes via hamburger, projet/résolution dans une barre compacte. Bord gauche des propriétés et bord droit de la liste redimensionnables (220–520 px et 140–360 px). Préférences conservées sur cet appareil via `frame-workspace`, indépendantes du projet ; panneaux empilés sur mobile.

Présentation : Espace est la commande unique Révéler/Suivant (Entrée également conservée). Aperçu repliable de la prochaine diapo, compteur d’apparitions restantes, fin du diaporama. Décompte de cinq secondes avant capture, annulation explicite et au départ de la présentation. Seul le Canvas est enregistré : aperçu, décompte et commandes restent hors du WebM. Laser : ruban lissé, tangentes locales plus stables et rendu à double définition limité à la zone occupée, puis réduction avec anticrénelage ; légère douceur du contour, sans points circulaires. Conservation du clic gauche maintenu et de l’effacement en 900 ms. Pas d’ajout de dépendance.

Validation : 20 cas du modèle/Java passent, build réussi. Navigateur sur origine isolée 127.0.0.1 : création/copie/suppression/annulation de thème, modification d’un prédéfini et couleur hexadécimale avec aperçu, persistance après rechargement ; Ctrl A des éléments/diapos, clic vide, suppression de tous les éléments d’une nouvelle diapo puis Supp de cette diapo ; navigation compacte, liste masquée et panneau réduit à 220 px ; Espace révèle puis propose Suivant ; compte à rebours, annulation immédiate et WebM exporté reconnu en 2560 × 1440 (5 967 Ko). Tracé laser continu inspecté, sans erreur console ; mobile à 390 px sans débordement horizontal. Pas de benchmark FPS ni d’enregistrement long/4K.

Publication confirmée : [PR #12](https://github.com/GKillianCode/CanvaCodex/pull/12) ouverte de `codex/theme-workspace` vers `feat/element-editor`, commit applicatif distant `401f8cb`. Issue #11 mise à jour, ouverte jusqu’à la fusion. Aucune fusion automatique. Les commits locaux d’origine sont conservés dans `archive/local-theme-workspace-20261003` lors de l’alignement sur les sources identiques publiées via le connecteur.


### 3 octobre 2026 — parcours du canvas et lecture unifiés

Demande : que la disposition des diapos et le chemin dessiné dans le canvas déterminent la lecture, par exemple 4 → 3 → 1 → 2, avec transitions selon leur position. Suivi : [issue #13](https://github.com/GKillianCode/CanvaCodex/issues/13), branche `codex/canvas-route`, basée sur `codex/theme-workspace` (PR #12 encore ouverte).

Modèle version 6 : `routeMode` (spatial ou manuel) et `routeStart` (identifiant stable ou départ automatique) inclus dans le JSON. Une seule liste ordonnée est partagée par fil, numéros, liste, présentation, Espace et aperçu suivant. En automatique, déplacement spatial, ajout/suppression/recomposition de l’ordre recalculent le parcours : départ haut puis gauche, ou diapo choisie ; voisin non visité le plus proche par distance de grille, avec priorité aux alignements et aux directions droite/bas/gauche/haut lors des égalités. Chaque diapo apparaît une seule fois. Cette heuristique ne peut pas deviner toute intention dans une grille ambiguë : utiliser le tracé explicite. L’ouverture/import d’un ancien projet conserve son ordre jusqu’à un déplacement ou une activation du mode automatique ; pas de réordonnancement silencieux au chargement.

Canvas : sélection du mode et du départ, Tracer le parcours par clics ordonnés avec aperçu puis validation/annulation ; les diapos non tracées restent à la fin. Un point à droite de chaque diapo permet de glisser un lien vers la suivante : la cible est insérée après la source, sans boucle ni suppression. Fil en courbes entre les bords des vignettes, flèches visibles, départ et étapes mis à jour. Un dépôt sur une case occupée échange les positions. Annuler le parcours restaure le dernier ordre/mode/départ et les sorties précédentes, sans annuler les positions ni les éditions de contenu. Réordonner la liste active le mode manuel. Les parcours définis depuis le canvas rétablissent les sorties automatiques ; les positions donnent ainsi le sens partagé avec la présentation/enregistrement. Les propriétés peuvent toujours forcer une sortie ensuite.

Validation : 23 cas de test passent ; build et diff --check réussis. Tests du parcours 4 → 3 → 1 → 2, départ personnalisé, directions gauche/haut, identités/contenus préservés, liens vers une seule cible, déduplication/identifiants manquants, géométrie des fils et migration JSON. Navigateur isolé : déplacement de la quatrième diapo avant les autres donnant 4 → 3 → 1 → 2 ; tracé inverse par quatre clics ; liaison glissée produisant 2 → 4 → 1 → 3 ; annulation ; échange des positions ; ordre retrouvé après sauvegarde complète/rechargement. Présentation vérifiée jusqu’à la dernière diapo 2, avec révélation avant chaque transition. Mobile 390 px corrigé et vérifié sans débordement horizontal ; aucune erreur console lors du contrôle. Capture WebM non répétée pour ce lot : le rendu partagé des transitions est inchangé. Aucun test long ni benchmark FPS.

Publication confirmée : [PR #14](https://github.com/GKillianCode/CanvaCodex/pull/14) ouverte de `codex/canvas-route` vers `codex/theme-workspace`, commit applicatif distant `50f574f`. Issue #13 mise à jour et ouverte jusqu’à la fusion. Aucune fusion automatique. Les commits locaux d’origine sont conservés dans `archive/local-canvas-route-20261003` lors de l’alignement sur les sources identiques du connecteur.


### 3 octobre 2026 — formes et poignées latérales

Demande : ajouter traits, rectangles, carrés, triangles, étoiles et autres formes, avec dimensions/couleurs dans les propriétés ; ajouter des poignées au milieu des côtés. Suivi : [issue #15](https://github.com/GKillianCode/CanvaCodex/issues/15), branche `codex/shapes-handles`, basée sur `codex/canvas-route` (PR #14 encore ouverte).

Modèle version 7 : éléments personnalisés `shape`, géométrie largeur/hauteur indépendante (minimum 8 px logiques), styles conservés dans sauvegarde/JSON et duplication. Galerie de 20 formes depuis + Formes, Ajouter un élément et clic droit : trait, courbe, rectangle, carré, rectangle arrondi, cercle, ellipse, triangle, triangle rectangle, losange, pentagone, hexagone, étoile, flèche, double flèche, trapèze, parallélogramme, chevron, croix, cœur. Remplissage et contour activables séparément, couleurs/hexadécimal, épaisseur en pixels de sortie, pointillés et opacité. Orientation du trait, arrondi et branches/profondeur d’étoile réglables. Premier plan/Arrière-plan règle l’ordre de dessin et la sélection. Pas d’édition de texte sur les formes.

Huit poignées pour tous les éléments : coins et milieux haut/bas/gauche/droite. Les milieux modifient un axe sans changer la typographie ; les coins conservent le bord opposé et adaptent les textes comme auparavant. Transformations transitoires pendant le geste, sauvegarde à la fin. Dessin Canvas avec chemins vectoriels partagés par éditeur, miniatures, présentation, PNG et WebM ; épaisseur du contour indépendante de l’étirement. Aucun ajout de dépendance.

Validation : 27 cas passent, build et diff --check réussis. Tests de catalogue/styles invalides, persistance/duplication indépendante, huit poignées sur texte/code/image/forme et limites, épaisseur du contour après déformation. Navigateur isolé : étoile avec remplissage rose et contour cyan, dimensions saisies au clavier, étirement horizontal et vertical, duplication et rechargement, trait diagonal et pointillé ; galerie mobile 390 px sans débordement. Présentation et WebM court produit (7 378 Ko), reconnu en 2560 × 1440. Aucune erreur console. PNG non téléchargé de nouveau ; même renderer que la capture. Pas de benchmark FPS ni d’enregistrement long.

Publication confirmée : [PR #16](https://github.com/GKillianCode/CanvaCodex/pull/16) ouverte de `codex/shapes-handles` vers `codex/canvas-route`, commit applicatif distant `69a001d`. Issue #15 mise à jour et ouverte jusqu’à la fusion. Aucune fusion automatique. Les commits locaux d’origine sont conservés dans `archive/local-shapes-handles-20261003` lors de l’alignement sur les sources identiques du connecteur.


### 3 octobre 2026 — rotation des éléments

Demande : tourner un élément avec une poignée près d’un coin et bloquer la rotation par pas de 45° avec Maj. Suivi : [issue #17](https://github.com/GKillianCode/CanvaCodex/issues/17), branche `codex/element-rotation`, basée sur `codex/shapes-handles` (PR #16 encore ouverte).

Modèle version 8 : angle `positions[key].rotation` normalisé dans [0,360), défaut 0 pour les anciens projets. Poignée ↻ distincte près du coin supérieur droit pour conserver les huit poignées de taille. Rotation autour du centre du cadre logique ; Maj arrondit à 45°, champ Rotation · degrés pour saisir un angle précis. Même rotation dans miniatures, présentation, PNG et WebM. Cadre et poignées suivent l’angle, sélection par transformation inverse, redimensionnement sur les axes locaux avec coin opposé conservé. Éditeur de texte/code incliné autour du même centre. Transformation transitoire puis sauvegarde à la fin ; duplication et import conservent l’angle. Aucun ajout de dépendance.

Validation : 30 cas passent ; build et diff --check réussis. Tests de rotation libre, pas de 45° et angles négatifs, transformation inverse, coins opposés lors du redimensionnement, import et duplication. Navigateur isolé : geste libre à 37,93°, clic dans une partie tournée hors de l’ancien cadre, étirement de largeur sans changer la hauteur, angle 45° saisi puis duplication/rechargement, édition directe du titre à 15°. Le geste avec Maj maintenu est couvert par les tests de calcul ; l’automatisation du drag ne permet pas de maintenir ce modificateur. WebM court produit (13 037 Ko), reconnu en 2560 × 1440 ; aucune erreur console. PNG non téléchargé à nouveau, même renderer. Pas de benchmark FPS ni d’enregistrement long.

Publication confirmée : [PR #18](https://github.com/GKillianCode/CanvaCodex/pull/18) ouverte de `codex/element-rotation` vers `codex/shapes-handles`, commit applicatif distant `8980952`. Issue #17 mise à jour et ouverte jusqu’à la fusion. Aucune fusion automatique. Les commits locaux sont conservés dans `archive/local-element-rotation-20261003` lors de l’alignement sur les sources identiques du connecteur.


### 3 octobre 2026 — choix des polices sans service externe

Demande : choisir les polices dans l’éditeur, éventuellement via Google Fonts, sans service payant ni IA. Suivi : [issue #19](https://github.com/GKillianCode/CanvaCodex/issues/19), branche `codex/font-picker`, basée sur `codex/element-rotation` (PR #18 encore ouverte).

Décision : huit familles Google Fonts embarquées localement par les paquets npm @fontsource (Inter, DM Sans, Space Grotesk, Montserrat, Lora, JetBrains Mono, Fira Code, IBM Plex Mono). Polices sous licence libre, copies complètes dans `java-studio/public/fonts/licenses/`. Référence : [FAQ Google Fonts](https://fonts.google.com/faq), [API CSS officielle](https://developers.google.com/fonts/docs/css2). Aucun abonnement, clé API ou connexion IA ; pas de catalogue distant. Suppression de l’import Google distant de l’interface, DM Sans et Space Grotesk servis depuis l’application. Les fichiers WOFF/WOFF2 sont intégrés par Vite, téléchargés depuis le même hôte lorsque nécessaires ; graisses 400/700 et jeu latin (accents français), repli système pour les glyphes non fournis. Graisses 500/600 supplémentaires pour les polices de l’interface.

Modèle version 9 : identifiant `positions[key].font`, validé à l’import avec repli Arial pour les textes et monospace pour le code. Propriétés : select par bloc avec groupes système/Google Fonts et aperçu ; le code est limité à la chasse fixe. Famille partagée entre Canvas, mesures, adaptation à la hauteur, coloration Java, légende/numéros du code et éditeur direct. Largeur des lignes Java mesurée dans la police choisie au lieu du facteur fixe 0,61. Choix conservé par duplication/JSON, compatible avec rotation. Chargement dédupliqué des graisses ; invalidation des miniatures après chargement ; PNG/présentation/capture attendent et signalent un échec au lieu d’exporter silencieusement une police de remplacement. Délai de 8 s, reprise après échec.

Validation : 34 cas passent, build et diff --check réussis ; npm rapporte zéro vulnérabilité après installation. Tests du catalogue/normalisation, restriction monospace, migration/JSON/copies indépendantes, mesures dans la bonne famille, attente des deux graisses, cache de chargement et reprise après échec. Navigateur isolé : Lora sur titre et JetBrains Mono sur Java, édition directe des deux, copie du code conservant sa police, rechargement avec sélection correcte et rendu serif visible. WebM court produit (12 486 Ko), reconnu en QHD 2560 × 1440 ; aucune erreur console. Mobile 390 px sans débordement du workspace. PNG non téléchargé à nouveau, même renderer avec attente de chargement. Pas de test de panne réseau dans le navigateur ni de capture longue.

Publication confirmée : [PR #20](https://github.com/GKillianCode/CanvaCodex/pull/20) ouverte de `codex/font-picker` vers `codex/element-rotation`, commit applicatif distant `71c42ed`. Issue #19 mise à jour et ouverte jusqu’à la fusion. Aucune fusion automatique. Les commits locaux sont conservés dans `archive/local-font-picker-20261003` lors de l’alignement sur les sources identiques du connecteur.


### 3 octobre 2026 — styles typographiques

Demande : différentes forces de gras, italique, souligné, surligné et autres décorations. Suivi : [issue #21](https://github.com/GKillianCode/CanvaCodex/issues/21), branche `codex/text-styles`, basée sur `codex/font-picker` (PR #20 encore ouverte).

Modèle version 10 : `positions[key].textStyle` par bloc textuel, avec graisse numérique, italique, souligné, barré, surlignage, couleur hexadécimale et intensité 0–100. Réglages appliqués au bloc entier, sans mise en forme de mots sélectionnés. Panneau Élément / Style du texte avec aperçu et réinitialisation. Graisses limitées aux variantes fournies par chaque famille Fontsource, désormais embarquées avec leurs italiques natives ; systèmes 400/700. Space Grotesk et Fira Code utilisent un italique synthétique signalé dans l’interface. Aucun service externe, coût ou IA.

Canvas partage famille, graisse et italique entre mesure, adaptation à la hauteur, dessin, miniatures, présentation et exports. Surlignage par ligne derrière les glyphes ; soulignement et barré après dessin. Code conserve ses couleurs Java ; numéros sans décoration. Édition directe utilise un miroir typographique derrière le textarea. Chargement et cache identifient famille/graisse/italique et attendent les variantes utilisées avant export. Import normalise les styles, sauvegarde les conserve ; duplication clone les styles profondément, recomposition conserve police et style. Le rôle titre reste indépendant de la graisse choisie.

Validation : 39 cas passent, build et diff --check réussis. Tests des variantes et valeurs invalides, migration, duplication indépendante, ordre de dessin des décorations, mesures, chargement/cache des faces et conservation lors de recomposition. Navigateur isolé : titre Inter 900 italique souligné avec surlignage cyan, code JetBrains Mono 600 italique barré surligné ; styles visibles pendant la saisie, conservés après rechargement et visibles en présentation. WebM court produit (9 193 Ko), reconnu en 2560 × 1440 ; aucune erreur console. PNG non téléchargé à nouveau, même renderer. Pas de nouveau contrôle mobile ni de capture longue.

Publication confirmée : [PR #22](https://github.com/GKillianCode/CanvaCodex/pull/22) ouverte de `codex/text-styles` vers `codex/font-picker`, commit applicatif distant `f74d892`. Issue #21 mise à jour et ouverte jusqu’à la fusion. Aucune fusion automatique. Les commits locaux sont conservés dans `archive/local-text-styles-20261003` lors de l’alignement sur les sources identiques du connecteur.


### 3 octobre 2026 — mesures, groupes, SVG et fichiers liés

Demande : Alt vers un autre objet et vision globale d’une sélection, groupes, propriétés en tiroirs, SVG/transparence, textes au cadre ajusté, incrustation recommandant une vidéo, Ctrl S vers un fichier lié et reprise de session. « Découper » a été précisé par Killian : dissocier un groupe. Suivi : [issue #23](https://github.com/GKillianCode/CanvaCodex/issues/23), branche `codex/editor-workspace-files` basée sur `codex/text-styles` (PR #22 ouverte).

Modèle version 11 : groupes disjoints par diapo, identifiant de projet, positions autoSize/wrapWidth des textes et fond facultatif des images. Ctrl/⌘ + clic sélectionne plusieurs éléments, Ctrl A tous les objets ; Grouper/Ctrl G et Dissocier/Ctrl Maj G dans les propriétés. Clic sur un membre sélectionne le groupe, glisser ou flèches déplacent ensemble sans changer leurs distances ; duplication copie les groupes et objets, double-clic édite individuellement un membre. Groupes à un niveau, sans groupe imbriqué ni rotation/redimensionnement collectif. Les animations restent individuelles. Suppression/recomposition retire les références masquées ; migration valide les membres.

Alt : cadre global de la sélection, X/Y depuis les bords ; survol d’un objet hors sélection donne ΔX/ΔY entre les bords des cadres englobants, rotation prise en compte. Chevauchement sur un axe = 0 px ; les mesures sont exprimées en pixels de sortie et restent hors exports. Propriétés en tiroirs Style du texte, Position et dimensions, Image et transparence, Style de la forme, Contenu du code et Apparition.

Nouveaux textes : cadre automatique mesuré dans la police/graisse choisie, qui grandit/rétrécit pendant la saisie, avec largeur maximale de ligne réglable. La taille de police reste stable. Activation possible sur les textes existants ; les presets gardent leurs cadres fixes pour préserver leurs compositions. Poignées ou largeur/hauteur manuelles passent en cadre fixe. SVG autonomes intégrés en data URI vectoriel ; refus des scripts, événements, ressources externes et foreignObject. PNG/WebP transparents conservés, conversion des images matricielles en PNG, pas de fond de thème derrière une image chargée sauf option explicite. Le dessin partagé exporte le SVG via Canvas à la résolution demandée. Pas de suppression automatique de fond d’une image opaque.

Nouvelle incrustation « Voir une autre vidéo » : pictogramme lecture, surtitre, titre et indication complémentaire ; PNG transparent partagé avec le thème. C’est un visuel de montage, pas un lien interactif dans le PNG.

Sauvegarde : Ctrl/⌘ S, Enregistrer, Enregistrer sous/Ctrl Maj S, Ouvrir un fichier lié et copie JSON. File System Access pour les navigateurs compatibles (Chrome/Edge, contexte sécurisé ou localhost), handle et version de référence conservés dans IndexedDB `frame-files`, associés au projectId. Une permission peut être redemandée après fermeture sans refaire Enregistrer sous. Écriture uniquement sur commande explicite ; protection contre les modifications externes par comparaison au contenu de référence, conflit signalé et proposition Enregistrer sous. Repli JSON téléchargé quand le navigateur ne supporte pas l’écriture directe. Référence : [MDN showSaveFilePicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker), [permissions](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/requestPermission). Copie locale `frame-project` après 450 ms et sur pagehide/fermeture/visibilité cachée ; `frame-session` restaure diapo active, espace et vue. Les préférences des panneaux restent dans frame-workspace. Aucun fichier utilisateur ni handle ne va sur GitHub ; aucun backend/service externe ajouté.

Validation : 47 cas passent (39 existants + 8 nouveaux, exécutés directement avec Node), build et diff --check réussis. Tests des distances/rotation/chevauchement, groupes/migration/dissociation, déplacement commun borné, SVG admissibles/refusés, auto-dimensions, fond transparent, fichier réutilisé/reprise/permission/conflit/annulation. Les opérations de fichiers sont testées avec des doubles de FileSystemFileHandle ; le sélecteur natif et l’écriture sur le vrai disque n’ont pas été automatisés. Navigateur isolé : nouveau texte réduit à Java avec cadre 122 × 41 px de sortie, ΔX 849 px / ΔY 0 au survol du code ; Ctrl A, regroupement de quatre objets, déplacement commun, groupe retrouvé après rechargement, dissociation puis sélection d’un seul titre ; même diapo et vue Éditer restaurées. SVG transparent chargé visuellement, tiroirs et nouveau bandeau vérifiés ; PNG de bandeau produit 104 Ko, lien disponible mais téléchargement non récupéré par l’outil. Aucune erreur console au contrôle ; workspace diapos/incrustations 390 px sans débordement. Pas de nouvelle capture WebM ni de mesure alpha sur le fichier PNG.

Publication confirmée : [PR #24](https://github.com/GKillianCode/CanvaCodex/pull/24) ouverte de `codex/editor-workspace-files` vers `codex/text-styles`, commit applicatif distant `f804e51`. Issue #23 mise à jour, ouverte jusqu’à fusion. Aucune fusion automatique. Les commits locaux d’origine sont conservés dans `archive/local-editor-workspace-files-20261003` lors de l’alignement sur les sources identiques du connecteur.


### 3 octobre 2026 — arrondi des traits et fond uni

Demande : rendre l’arrondi des traits optionnel et pouvoir désactiver le dégradé du background. Suivi : [issue #25](https://github.com/GKillianCode/CanvaCodex/issues/25), branche `codex/optional-gradients-caps`, basée sur `codex/editor-workspace-files` (PR #24 ouverte).

Modèle version 12 : `roundedEnds` sur les formes (défaut vrai), checkbox Extrémités arrondies pour traits et courbes ; désactivée, extrémités plates (`lineCap=butt`), y compris pointillés. Le rayon des rectangles arrondis reste indépendant. `frame.gradient` global au projet (défaut vrai pour préserver les anciens projets), option Propriétés → Style → Fond du diaporama → Dégradé de fond. Désactivée, le renderer peint seulement la couleur bg du thème et évite les halos radiaux. Aucun changement du dégradé des titres ni de la transparence des incrustations. Même option passée aux miniatures, présentation, PNG et WebM, conservée dans la sauvegarde locale/JSON et fichiers liés.

Validation : 49 cas passent (39 + 10), build et diff --check. Nouveaux tests : fond uni sans appel de gradient, migration du réglage, extrémités plates/rondes pour trait/courbe, import et duplication. Navigateur isolé : dégradé désactivé et fond uni visible, ajout d’un trait et option d’arrondi désactivée, rechargement sans erreur console. Pas de nouvelle capture PNG/WebM ni de nouveau contrôle mobile pour ces deux options.

Publication confirmée : [PR #26](https://github.com/GKillianCode/CanvaCodex/pull/26) ouverte de `codex/optional-gradients-caps` vers `codex/editor-workspace-files`, commit applicatif distant `971efc3`. Issue #25 mise à jour, ouverte jusqu’à fusion. Aucune fusion automatique. Commits locaux conservés dans `archive/local-optional-gradients-caps-20261003` lors de l’alignement sur les fichiers identiques publiés par le connecteur.


### 3 octobre 2026 — cadres des formes sans marge inutile

Demande : retirer le padding autour des éléments, en priorité les formes. Suivi : [issue #27](https://github.com/GKillianCode/CanvaCodex/issues/27), branche `codex/tight-shape-bounds`, basée sur `codex/optional-gradients-caps` (PR #26 ouverte).

Les chemins des étoiles, polygones, courbes et cœurs occupent maintenant leur cadre complet, calculé à partir de leurs extrema réels. Le demi-contour nécessaire pour éviter de couper le trait reste pris en compte. Traits horizontaux/verticaux : cadre visible et propriétés ajustés à l’épaisseur réelle, centre conservé pour les anciens projets ; redimensionnement transversal règle aussi l’épaisseur. Suppression de la tolérance de clic extérieure de 12 unités autour des formes ; sélection toujours rectangulaire. Rendu partagé éditeur/miniatures/présentation/exports. Aucun changement du modèle version 12 ni des marges du texte/code.

Validation : 50 cas (39 + 11), build et diff --check réussis. Test des extrema des étoiles/polygones/courbes/cœurs et cadres de traits. Navigateur isolé : étoile touchant les quatre limites du cadre, trait fin avec poignées au ras du tracé, hauteur affichée égale à l’épaisseur, aucune erreur console. Pas de nouvelle capture PNG/WebM.

Publication confirmée : [PR #28](https://github.com/GKillianCode/CanvaCodex/pull/28) ouverte de `codex/tight-shape-bounds` vers `codex/optional-gradients-caps`, commit applicatif distant `dac4c86`. Issue #27 ouverte jusqu’à fusion. Aucune fusion automatique. Commits locaux conservés dans `archive/local-tight-shape-bounds-20261003` lors de l’alignement sur les fichiers identiques publiés.


### 3 octobre 2026 — transitions sans couture

Demande : supprimer la fine barre noire entre deux diapos pendant le coulissement. Suivi : [issue #29](https://github.com/GKillianCode/CanvaCodex/issues/29), branche `codex/seamless-transitions`, basée sur `codex/tight-shape-bounds` (PR #28 ouverte).

Cause : deux images juxtaposées sur des coordonnées fractionnaires dans le canvas effacé pouvaient exposer une couture par interpolation. Le compositeur travaille maintenant directement en pixels de sortie : déplacement arrondi une seule fois, seconde page exactement à une largeur/hauteur de la première. La transformation logique est restaurée après composition pour les annotations. Même canvas pour la présentation et l’enregistrement ; durée, easing et navigation inverse conservés. Aucun changement de modèle.

Validation : 51 cas (39 + 12), build et diff --check. Test de jointure et coordonnées entières dans les quatre directions, résolutions 640/1920/2560/3840 et six instants dont départ/arrivée. Navigateur isolé : mouvements horizontal et vertical observés pendant la transition à 2560 × 1440, aucune couture visible ni erreur console. Réglages de contrôle rétablis après vérification. Pas de nouvel export WebM ni analyse pixel du fichier vidéo.

Publication confirmée : [PR #30](https://github.com/GKillianCode/CanvaCodex/pull/30) ouverte de `codex/seamless-transitions` vers `codex/tight-shape-bounds`, commit applicatif distant `3dc9524`. Issue #29 ouverte jusqu’à fusion. Aucune fusion automatique. Commits locaux conservés dans `archive/local-seamless-transitions-20261003` lors de l’alignement sur les sources identiques publiées.


### 3 octobre 2026 — positions stables après reprise

Demande : les objets se déplacent après sauvegarde puis actualisation. Le signalement de fond noir sur les PNG a été retiré par Killian (erreur de sa part) ; les changements exploratoires de transparence ont été retirés, aucune modification d’import/rendu d’image conservée. Suivi : [issue #31](https://github.com/GKillianCode/CanvaCodex/issues/31), branche `codex/stable-object-positions`, basée sur `codex/seamless-transitions` (PR #30 ouverte).

La normalisation de reprise appliquait des contraintes d’édition : coordonnées négatives ramenées à zéro et cadres fins/narrow élargis, déplaçant notamment les objets tournés et les traits. Elle conserve maintenant les coordonnées/dimensions finies enregistrées (bornes défensives ±10000 pour les ancres, 1..10000 pour les dimensions), sans arrondi ; taille de police inchangée. Hauteur absente conservée comme absente pour le calcul automatique. Les contraintes d’édition restent au moment des gestes, aucun changement de modèle version 12.

Validation : 52 cas (39 + 13), build et diff --check. Nouveau test de trois reprises JSON successives : image tournée à coordonnées négatives, trait de 2 unités, texte étroit et hauteur automatique absente. Navigateur isolé : comparaison des x/y/w/h/taille/rotation de tous les objets avant/après actualisation identique, aucune erreur console au contrôle. Pas de nouveau sélecteur natif de fichier ni d’écriture sur disque testés.

Publication confirmée : [PR #32](https://github.com/GKillianCode/CanvaCodex/pull/32) ouverte de `codex/stable-object-positions` vers `codex/seamless-transitions`, commit applicatif distant `f03f376`. Issue #31 ouverte jusqu’à fusion. Aucune fusion automatique. Commits locaux conservés dans `archive/local-stable-object-positions-20261003` lors de l’alignement sur les sources identiques publiées.
