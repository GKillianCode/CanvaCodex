# Mémoire du projet — CanvaCodex / Frame

Dernière mise à jour : 2 octobre 2026 (Europe/Paris).

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
- Polices d’interface Google Fonts avec polices de secours. Les diapos utilisent des polices système pour garder des exports autonomes.
- Une inscription Sites privée a été créée au premier tour, mais aucune mise en ligne n’a abouti : les scripts du module étaient devenus indisponibles. Ne pas confondre cette inscription avec un site publié. La configuration locale `.openai/` n’est pas nécessaire au fonctionnement ni à la publication sur GitHub.

## État livré

- [x] Interface française avec espaces Diaporamas, Incrustations et Thèmes.
- [x] Quatre diapos d’exemple autour du bytecode et de la JVM.
- [x] Ajout, duplication et suppression de diapos (au moins une conservée).
- [x] Modification des surtitres, titres, explications et exemples de code.
- [x] Vingt compositions distinctes, dont six avec images ; galerie lors de l’ajout, sans choix de direction.
- [x] Déplacement des blocs à la souris et réglages X, Y, largeur, taille du texte.
- [x] Quatre thèmes globaux partagés entre diapos et incrustations.
- [x] Trois formats de bandeaux : titre inférieur, titre de chapitre, À retenir.
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

Publication en cours ; ajouter le lien de PR après confirmation.
