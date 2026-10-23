# CanvaCodex — Frame

Studio personnel pour préparer des diaporamas, des incrustations vidéo et des miniatures avec une charte graphique commune.

L’application se trouve dans [`java-studio/`](java-studio/README.md). Elle utilise Vue 3 et Vite. Les exports MOV/MKV utilisent un encodeur FFmpeg local intégré au lancement Vite ; les sauvegardes restent dans le navigateur.

## Démarrer

```sh
cd java-studio
npm ci
npm run dev
```

## Compiler

```sh
cd java-studio
npm run build
```

## Sauvegarde globale et accès rapides

**Fichier → Sauvegarde globale…** exporte vidéos, supports, notes, parcours et bibliothèques dans un même fichier. La restauration affiche un inventaire et refuse de remplacer un document différent déjà présent. Les notes et bibliothèques sont protégées contre les enregistrements concurrents entre onglets, avec récupération du brouillon.

Les accès **Playlists · Notes · Parcours** sont disponibles dans la barre du haut sur toutes les pages. [Détails, limites et vérifications](docs/fiabilite-et-sauvegardes.md).

## Mémoire et suivi

- [`Agent.md`](Agent.md) : contexte, décisions, conventions, état et roadmap.
- [Dépôt GitHub](https://github.com/GKillianCode/CanvaCodex) : issues et pull requests de suivi.

Les projets sont sauvegardés dans le navigateur sur l’appareil utilisé et peuvent être exportés/importés en JSON. Les incrustations sont exportées en PNG transparent et les présentations enregistrées en WebM, sans audio.

## Accueil et ateliers indépendants

L’accueil ouvre trois applications : **Diaporamas**, **Incrustations** et **Miniatures**. Le bouton Accueil remplace la navigation latérale entre applications. Un seul atelier est actif ; chacun garde ses préférences, thèmes, création et fichier lié.

Miniatures propose six **identités de playlists**, sur fond blanc avec écritures noires : Java rouge, IA bleu, Conception violet, DevOps vert pétrole, Production orange et Versioning ardoise. Un contour et un petit nom de playlist servent de repères constants ; le centre reste libre pour ton contenu. Le bouton Playlists applique l’habillage sans remplacer tes titres, images ou autres objets, et Ctrl Z permet d’annuler. Les quatre calques d’habillage restent personnalisables. Les créations existantes ne sont pas remplacées automatiquement.

Format par défaut 1280 × 720, export PNG et JSON propres à Miniatures, outils de texte/image/formes/calques/groupes communs.

## Sauvegardes indépendantes

Diaporamas et Incrustations conservent chacun leur document dans le navigateur. À la réouverture, Frame affiche l’accueil ; ouvrir un atelier retrouve sa création en cours, avec ses objets et réglages. Noms, thèmes, couleurs, résolution et historiques sont indépendants.

Le menu Fichier agit sur l’espace actif : `frame-diaporama.json` pour les diaporamas, `frame-incrustation.json` pour les incrustations, `frame-miniature.json` pour les miniatures. Chaque espace peut être lié à son propre fichier local. Importer un document agit uniquement dans l’application ouverte. Les documents des autres applications sont refusés avec un message.

Les anciennes sauvegardes combinées sont migrées automatiquement ; l’ancien stockage est conservé jusqu’à la réussite des nouvelles écritures. Un ancien fichier combiné lié demande un premier « Enregistrer sous » pour préserver l’original. Son import reste compatible et restaure uniquement la partie de l’application ouverte ; importer le même ancien fichier dans l’autre atelier pour en retrouver l’autre partie. Les ateliers autonomes conservent un document courant par espace, sans synchronisation entre navigateurs. Le prototype décrit plus bas ajoute une bibliothèque de vidéos et des créations multiples indépendantes.

La présentation dispose d’états pédagogiques dans une même diapo et d’une console privée synchronisée avec une fenêtre Public, pour filmer ou projeter sans afficher les notes.


## Étapes et incrustations Java

La barre **Étapes de la diapo** regroupe tous les états dans une liste, avec navigation précédente/suivante, ajout et corbeille pour supprimer l’étape sélectionnée. L’état initial est conservé ; Ctrl Z annule une suppression. **Gérer** ouvre les noms, l’ordre et les réglages des états.

Dans **Incrustations → Formats → Java**, deux compositions entièrement éditables sont disponibles : **Fiche de type Java** et **Octets et bits**. La fiche affiche type, bornes, largeur et valeur par défaut. **Format → Composition** permet de choisir byte, short, int, long, char, float, double ou boolean sans modifier la géométrie ni recréer les objets supprimés. Export PNG transparent disponible via Fichier.

**Insérer → Octets et bits** ajoute aussi l’objet aux diapos. Dans **Objet → Style → Octets et valeur**, saisir un entier décimal, choisir 1–8 octets, le nombre d’octets par ligne et le mode signé (complément à deux). Les grands entiers restent exacts ; une valeur hors plage est signalée et jamais tronquée. Par exemple, 151 vaut `10010111` sur un octet non signé ; il dépasse la plage d’un byte Java signé. Les largeurs 3, 5, 6 et 7 octets sont pédagogiques et ne correspondent pas à des primitifs Java. Poids fort à gauche ; ce schéma ne représente pas l’endianness en mémoire.

Affichage : valeur, numéros des octets et poids des bits optionnels. Couleurs : palette du thème ou preset orange inspiré de la référence, puis personnalisation de chaque couleur. Déplacement, redimensionnement, opacité, animations, copie et sauvegarde dans la bibliothèque de composants utilisent les outils communs.

Les fiches suivent la [spécification Java](https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html) : long = 8 octets/64 bits ; boolean n’a pas de taille de stockage universelle définie par le langage. La largeur concerne la représentation numérique, sans surcoût des objets. Les bornes flottantes sont les extrema finis, avec mention de NaN et des infinis. Les valeurs par défaut concernent les champs et éléments de tableaux ; une variable locale doit être initialisée.


## Exporter une incrustation animée

Dans **Incrustations → Animer** (ou **Fichier → Exporter une incrustation animée**), régler une durée de 2–20 secondes. Choisir les animations d’entrée/sortie et leur durée, puis le décalage entre blocs. Cliquer un bloc ou un groupe pour définir son arrivée, sa fin de sortie et ses effets ; les membres d’un groupe restent synchronisés. Les animations de présentation existantes restent indépendantes. Lire l’aperçu ou déplacer son curseur avant d’exporter.

- **MOV · QTRLE**, choix par défaut : vidéo30 images/s sans perte avec alpha ARGB, encodée automatiquement avec FFmpeg local pour le montage.
- **MKV · FFV1** : alternative sans perte avec alpha BGRA, dans un conteneur Matroska. MOV et MKV gardent la transparence avec le fond Transparent ; le damier n’est pas exporté. Ils acceptent aussi un fond de chrominance. La capture intermédiaire PNG/MOV est limitée à256Mo, la sortie encodée à512Mo.
- **Fond de chrominance · WebM** : fond vert, bleu ou personnalisé à retirer au montage. Choisir une couleur absente des objets ; rester sur l’onglet pendant la capture en temps réel. Export sans audio, aux dimensions du projet. Si MediaRecorder n’est pas disponible, utiliser le MOV.

La progression et l’annulation sont disponibles pendant l’export. Les réglages sont sauvegardés avec le projet et réimportés en JSON. Changer de format conserve le rythme global mais réinitialise les réglages propres aux anciens blocs. Le PNG transparent reste accessible dans Fichier.

Conversion optionnelle sur une machine disposant de [FFmpeg](https://www.ffmpeg.org/ffmpeg-all.html), sans supprimer le MOV d’origine :

```bash
ffmpeg -i frame-incrustation-alpha.mov -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le frame-incrustation-prores.mov
```

Les exports animés utilisent une copie exacte de l’incrustation éditée : valeurs Java, textes personnalisés et suppressions sont conservés, sans réappliquer le modèle initial.

Les ateliers disposent de routes `#/diaporamas`, `#/incrustations` et `#/miniatures` : rechargement et navigation précédent/suivant conservent l’atelier. Aucun réglage serveur supplémentaire n’est requis. Dans Insérer → Image, importer une photo puis Style → Image et cadrage → Utiliser comme image de fond. Le calque remplit le canevas derrière les objets (et au-dessus du fond blanc de playlist), reste éditable/supprimable. Couleurs → Effets de l’image propose niveaux de gris, flou, luminosité, contraste et saturation, avec curseurs et saisie en %, réinitialisation, persistance JSON et rendu partagé pour les exports. Flou 100 % = 40 px de conception ; luminosité/contraste/saturation 100 % = neutre.

Le repère de playlist est transparent : aucun aplat blanc sous son nom, et le contour est interrompu sur cette zone. Les anciens repères blancs d’origine sont adaptés au chargement en conservant le contenu. Sélectionner le contour → Style → Forme et contour pour régler le début et la fin de la découpe en % de sa largeur.

Dans les trois ateliers, Style → Typographie propose l’alignement vertical Haut/Centré/Bas, centré par défaut. Le placement s’effectue sur l’encre visible du texte dans la hauteur du bloc, y compris les textes multilignes et les listes. L’alignement horizontal reste indépendant. Pour un cadre plus grand que le texte, désactiver Ajuster au contenu ou modifier sa hauteur ; un cadre ajusté au contenu n’a pas d’espace vertical libre. Sélection multiple compatible. Le code s’aligne dans la zone de contenu sous son en-tête. Options sauvegardées et utilisées dans le rendu partagé aperçu/présentation/export.

Un cadenas dans les propriétés de l’objet et sur chaque ligne de Calques permet de verrouiller/déverrouiller son placement. Déplacement souris/clavier, dimensions, rotation, mise à l’échelle et commandes de placement sont protégés ; textes et couleurs restent éditables. Un groupe contenant un membre verrouillé reste immobile. Le clic sélectionne un objet verrouillé sans le déplacer ni sélectionner un objet dessous. La sélection rectangulaire ignore les objets verrouillés ; Calques permet aussi de les déverrouiller. L’état est sauvegardé et compatible avec Annuler/Rétablir.

La sélection rectangulaire peut démarrer dans les marges autour du canevas. La zone visible est limitée au canevas ; seuls les objets ou groupes entièrement contenus sont sélectionnés. Ctrl/Maj permet d’étendre la sélection ; les objets partiellement couverts ou hors du canevas restent exclus.

Pour animer un changement entre étapes pédagogiques : sélectionne l’objet, ouvre Animation → Transition entre étapes et coche Interpoler la position et la taille. L’option est appliquée au même objet dans les états de cette diapo, y compris ceux déjà créés. Duplique l’état avec Étape, modifie la géométrie à l’étape suivante, puis lance la présentation. Position, dimensions, taille du texte et rotation évoluent par calcul avec un lissage de 0,5 s, à l’aller comme au retour. Objets ajoutés/supprimés ou non cochés : fondu. La préférence système de réduction des animations produit un changement immédiat. Le canevas présenté, la fenêtre Public et la capture vidéo utilisent les mêmes images calculées ; pas d’IA ni de serveur.

### Écriture progressive des textes

Sélectionne un texte (titre, paragraphe ou code), puis ouvre **Objet → Animation → Écriture progressive**. Active « Effet machine à écrire » et règle la révélation par caractère ou mot, la vitesse (1 à 120 unités/s), le délai (0 à 10 s) et le curseur (aucun, barre ou bloc clignotant). Les réglages modifiés peuvent s’appliquer à plusieurs textes sélectionnés. L’écriture démarre à l’apparition du texte en présentation, ou au début de sa piste dans une incrustation animée ; prévois assez de temps avant sa sortie. Le rendu conserve les lignes, dimensions, centrage et coloration du code. L’éditeur, les miniatures et les PNG affichent le texte complet. Le calcul dépend du temps écoulé, sans IA ni service externe ; la réduction des animations affiche immédiatement le texte complet en présentation. Les cellules des tableaux ne reçoivent pas cet effet individuel.

### Prototype : espaces de travail par vidéo

Branche expérimentale **codex/test-video-workspaces**, à essayer et valider avant fusion. L’accueil devient une bibliothèque locale de vidéos : créer une vidéo, rechercher, filtrer par playlist, dupliquer, archiver/restaurer. Sa fiche contient un nom, une playlist, un statut (préparation/prêt à tourner/montage/terminé) et des notes multilignes, enregistrés avec « Enregistrer la fiche ».

Chaque vidéo accueille plusieurs créations nommées : diaporamas, incrustations et miniatures, avec aperçu, renommage et duplication. Elles ouvrent les éditeurs existants ; « Vidéo » revient à leur fiche. Les routes identifient la vidéo et la création, y compris après rechargement. À la création, « Copier la création actuelle de cet atelier » reprend une copie indépendante du document autonome sauvegardé ; sinon un document neuf est créé. La fenêtre « Nouvelle vidéo » permet aussi de choisir un JSON existant pour chacun des trois ateliers. Depuis une fiche vidéo, « Importer » ajoute directement un document au bon atelier, sans remplacer une création existante. L’import individuel reste accessible dans Fichier de chaque éditeur.

Les ateliers autonomes restent accessibles en bas de l’accueil, avec leurs documents et routes habituels. Aucune migration automatique ni remplacement de ces documents. La bibliothèque utilise IndexedDB (`frame-video-library`) ; contenus, sessions, préférences et fichiers liés sont séparés par création. Une erreur de sauvegarde est affichée et le départ de l’éditeur attend les écritures locales ; le brouillon reste ouvert en cas d’échec.

« Sauvegarder la vidéo » télécharge un JSON `frame-video-project` réunissant la fiche et des documents `frame-workspace` indépendants pour chaque atelier. « Importer une vidéo » restaure une nouvelle copie, avec de nouveaux identifiants de vidéo/créations/documents ; aucune vidéo existante n’est écrasée et les fichiers locaux liés ne sont pas transportés. Les fichiers individuels restent propres à leur application. L’import complet est limité à 256 Mo, chaque vidéo à 100 créations. Le projet vidéo n’encode pas les PNG/MOV/WebM exportés : il sauvegarde les sources éditables nécessaires pour les reproduire.

Prototype local, sans compte, serveur ou synchronisation entre navigateurs. Le stockage du navigateur n’est pas une sauvegarde externe : conserve des exports JSON sur ton ordinateur. La gestion simultanée d’une même création dans plusieurs onglets n’est pas synchronisée. L’archivage est disponible pour les vidéos ; pas de suppression définitive ni de corbeille de créations dans ce prototype.


Dans « Gérer les playlists » à l’accueil, ajoute, renomme ou supprime tes playlists. Le renommage actualise toutes les vidéos associées, y compris archivées ; la suppression conserve les vidéos et leurs documents dans « Sans playlist ». Les noms de playlists des vidéos importées sont ajoutés à la liste locale. Le choix est disponible à la création d’une vidéo et dans sa fiche.

Pour les grandes bibliothèques, l’accueil utilise un index de fiches légères (nom, playlist, statut, compteurs), sans notes ni contenus/images des créations. Affichage par pages de 24 vidéos ; aperçus chargés à proximité de la zone visible et libérés lorsqu’ils en sortent. La fiche d’une vidéo récupère ses métadonnées ; un aperçu manquant charge uniquement sa création, puis libère le document après rendu. L’éditeur ouvre un document à la fois. La sauvegarde complète ou la duplication d’une vidéo charge ponctuellement toutes ses créations.

IndexedDB passe en version 3 avec migration transactionnelle des données existantes et construction de l’index léger. Un test local avec 500 vidéos synthétiques a vérifié migration, playlists, pagination et conservation des documents. Les 500 fiches représentent environ 104 000 caractères JSON ; **ce n’est pas une mesure de RAM**. Images décodées, historique d’édition, import/export et captures vidéo restent susceptibles de consommer beaucoup de mémoire. La taille du catalogue concerne surtout l’espace de stockage du navigateur ; conserver des sauvegardes JSON.

Test navigateur reproductible en développement : ouvrir `/tests/video-library.browser.html` sur un **port neuf dédié aux tests**, puis cliquer « Tester la migration et 500 vidéos ». Il crée une bibliothèque synthétique, teste la migration v2→v3, les playlists, la préservation des documents et la mise à jour de l’index ; il refuse une base déjà en v3. Ne pas utiliser cette page sur l’origine contenant tes créations personnelles. Elle n’est pas incluse dans la compilation de production.


### Trier et ordonner les vidéos

À l’accueil, « Affichage → Trier les vidéos » propose Dernières modifications, État du processus et Ordre dans les playlists. Le dernier tri choisi est mémorisé dans ce navigateur. Le processus suit : Idées / Backlog → Création → Prêt à tourner → Tournage → Montage → Terminé → À publier → Publié. Modifie le statut dans la fiche de la vidéo puis enregistre-la. Les anciens statuts restent compatibles (Préparation est désormais nommé Création).

Chaque carte affiche son numéro dans la playlist. « Gérer les playlists » ouvre la liste ; ouvre une playlist pour la renommer, la supprimer ou gérer ses vidéos. Glisse les vidéos verticalement avec leur poignée ou saisis directement une position : les autres vidéos sont décalées automatiquement. Les menus des vidéos permettent d’ouvrir, renommer, archiver/restaurer ou retirer une vidéo de la playlist. Supprimer une playlist conserve les vidéos. L’accueil n’affiche plus de liste de playlists ni de sélecteur « Toutes les playlists ».

Dans « Affichage », la rubrique « États » propose des cases à cocher et Tout afficher / Tout masquer pour filtrer rapidement le catalogue. Le statut « Idées / Backlog » conserve les idées sans échéance : sélectionne-le dans la fiche vidéo, puis enregistre. Les états restent prédéfinis dans cette version.

Le parcours est indépendant du statut de production, des changements de nom et de la date de modification. Il est conservé localement dans IndexedDB ; renommer une playlist préserve son parcours. Les nouvelles vidéos sont ajoutées après les identifiants déjà enregistrés ; un changement de playlist renumérote les deux groupes selon l’ordre local existant, puis tu peux fixer la nouvelle position. Les archives gardent leur place : leurs numéros peuvent donc être absents de la vue active. Supprimer une playlist conserve les vidéos dans Sans playlist et renumérote ce groupe. Les ordres de catalogue sont propres à cette bibliothèque ; un import/une copie crée une nouvelle vidéo et ne remplace pas les positions des vidéos existantes. Le paquet JSON individuel ne transporte pas l’organisation complète du catalogue.


### Playlists illustrées, carnet et canvas pédagogique

Une playlist s’ouvre dans une grande fenêtre, avec 24 vidéos par page. Chaque ligne affiche la miniature du projet si elle existe, sinon la première diapo du diaporama (puis une incrustation en dernier recours). Les aperçus sont chargés près de la zone visible. Les numéros restent ceux de la playlist complète ; une position saisie peut déplacer une vidéo vers une autre page.

Après les trois ateliers de la fiche vidéo, **Ouvrir le carnet** ouvre une application dédiée (`#/videos/<id>/notes`), avec rechargement et retour à la vidéo. Le carnet Markdown propose : Écrire, Écrire et lire, Lire ; titres, listes, code, liens et tableaux. Les notes déjà enregistrées sont reprises. « Enregistrer le carnet » ou Ctrl/Cmd S dans le texte sauvegarde uniquement le carnet ; le retour à la vidéo et la navigation attendent la sauvegarde du carnet. Le carnet est inclus dans le paquet vidéo JSON et dans les duplications. Limite : 20 000 caractères, HTML brut et images externes désactivés. Les six niveaux de titres sont visibles ; les blocs de code balisés (par exemple `java`) disposent de coloration syntaxique Java, JavaScript, TypeScript, Python, Bash, JSON, SQL, YAML, HTML et CSS.

À l’accueil, **Canvas des parcours** ouvre un espace indépendant des playlists. Fais un clic droit pour ajouter des vidéos de ta bibliothèque (sélecteur illustré et paginé) ou des étapes. Toutes les cartes mesurent 280 × 240. Tire depuis le point de sortie à droite d’une carte et relâche sur une autre pour créer une flèche. Au clavier : Entrée sur le point de sortie puis sélection de la carte cible. Une carte peut avoir plusieurs suites et plusieurs prérequis ; déplacer les cartes conserve les connecteurs.

Maj + clic sélectionne plusieurs cartes ; clic droit → Grouper la sélection. Le nom du groupe se modifie par double-clic ou clic droit, son titre déplace toutes ses cartes, Dégrouper conserve les cartes. Aimantation à la grille de 24 unités activée par défaut, désactivable au clic droit. Le canvas s’étend au fil du déplacement, y compris dans les coordonnées négatives. Molette enfoncée ou Espace + glisser déplace la vue ; un rectangle tracé dans le vide sélectionne les cartes entièrement contenues, Ctrl/Cmd A sélectionne tout, un clic vide désélectionne. Le zoom est en bas et Ctrl/Cmd + molette zoome autour du pointeur. Clic droit → Recentrer les cartes. Sélectionner un lien permet de le supprimer ; retirer une carte du canvas ne supprime pas sa vidéo.

Canvas sauvegardé automatiquement dans IndexedDB, avec indication d’erreur et réessai ; fermeture attend la sauvegarde, rechargement avertit en cas d’écriture non terminée. Limites : 500 cartes et 2 000 liens. Les cartes contiennent seulement des références vidéo et des positions. Ce canvas global est propre au navigateur et n’est **pas inclus dans les exports JSON individuels de vidéos**. Aucun parcours n’est imposé et aucune playlist n’est réordonnée par le canvas.

Les groupes du canvas disposent de huit poignées pour redimensionner leur cadre. Glisse une carte entièrement à l’intérieur pour l’ajouter, ou à l’extérieur pour la retirer ; déplace tout le groupe par son titre. Les cadres restent enregistrés, même lorsqu’ils sont vides.

Le canvas affiche l’état de production sur les cartes vidéo avec un liseré discret. Toutes les cartes ont les mêmes dimensions. Les poignées apparaissent au survol ou à la sélection ; les groupes possèdent huit poignées (coins et côtés). Le panneau latéral a été retiré : double-clique une étape ou un groupe pour le modifier, ou passe par le clic droit. Les vidéos déjà placées sont exclues du sélecteur d’ajout.

Le prototype des espaces vidéo, playlists, carnet et canvas a été validé le 13 octobre 2026 pour intégration dans `main`. Les cartes vidéo utilisent une bordure de 2 px dans la couleur du statut pour faciliter la lecture de leur avancement.


### Ateliers unifiés et dossiers vidéo

Le canvas des parcours est un atelier autonome accessible dans la liste des applications : `#/parcours`. Il utilise le même en-tête que le carnet et les éditeurs, avec Accueil (ou Vidéo lorsque l’atelier appartient à une vidéo) et les menus propres à l’application. Le canvas propose Enregistrer, exporter/importer un JSON de parcours et annuler le dernier import. Son zoom accepte une valeur saisie de **3 % à 500 %**. En vue éloignée, les aperçus lourds ne sont pas chargés. Les cartes restent 280 × 240.

L’accueil place les ateliers en haut ; recherche, Affichage (tri, états, archives) et Playlists structurent le catalogue. Importer une vidéo se trouve dans Fichier. La fiche vidéo regroupe les trois ateliers en colonnes sur grand écran et garde le carnet à la fin ; les actions secondaires sont regroupées. Les dialogues bloquent le défilement du fond. Une nouvelle vidéo peut créer immédiatement ses trois documents ou importer des JSON existants. Un diaporama lié s’ouvre en édition ; Éditer précède Canvas dans l’en-tête.

Carnet et notes de diapo partagent Markdown-it et Prism. Les ligatures sont désactivées dans les zones de saisie pour rendre chaque `#` visible. L’aperçu du carnet attend une courte pause de 100 ms ; les changements de notes privées ne déclenchent plus les rendus du canevas et des miniatures. Les sauvegardes et l’historique restent actifs.

Dans **Fichier → Choisir le dossier de travail**, autorise une fois un répertoire sur ton ordinateur. En navigateur compatible avec File System Access (contexte HTTPS ou localhost), la création et les modifications d’une vidéo y écrivent automatiquement :

```text
Dossier choisi/
  ID-de-la-vidéo/
    video.frame.json
    carnet.md
    slides-ID-de-création.json
    banners-ID-de-création.json
    thumbnails-ID-de-création.json
```

Chaque fichier d’atelier est un JSON importable indépendamment dans son application ; son nom reste stable lorsque la création est renommée. Les documents sont conservés dans IndexedDB en parallèle. Un nouvel emplacement de vidéo copie ses créations depuis la bibliothèque ; Fichier → Mettre cette vidéo dans le dossier permet aussi de copier une vidéo existante. Ctrl S d’un éditeur lié enregistre sa création sans demander un fichier individuel ; Enregistrer sous reste disponible pour une copie manuelle.

Le navigateur peut redemander l’autorisation après une fermeture. Le bouton Réautoriser reprend les écritures en attente, même après rechargement. Une erreur disque conserve la copie dans le navigateur et affiche un avertissement ; les projets à reprendre sont mémorisés sans garder toutes leurs images en RAM. Un navigateur sans sélecteur de répertoire conserve la sauvegarde locale et l’export JSON ; « Conserver uniquement dans le navigateur pour le moment » est également disponible avant le premier choix de dossier. Le dossier n’est pas choisi silencieusement, les fichiers externes ne sont pas relus ni fusionnés automatiquement, et l’écriture de plusieurs fichiers n’est pas une transaction de dossier.


### Taille des textes et débordement du canevas

La taille de police saisie correspond aux pixels du document exporté, même après mise à l’échelle. La réduction automatique au cadre est désormais une option explicite de Typographie, désactivée par défaut et lorsqu’une nouvelle taille est saisie. Un cadre trop petit peut donc nécessiter un agrandissement. Les coordonnées peuvent être négatives ou dépasser les dimensions de l’écran ; déplacements, groupes, clavier et poignées conservent les parties hors cadre. Les exports gardent les dimensions de la création et coupent naturellement ce qui déborde.

Dans la fiche vidéo, chaque création dispose de **Supprimer**, avec confirmation. **Annuler la suppression** restaure la dernière création retirée tant que la fiche reste ouverte. Les autres créations et fichiers déjà exportés sont conservés ; le manifeste du dossier vidéo est mis à jour.


### Mettre en forme un mot ou un passage

Dans les trois ateliers, ouvre **Éditer le contenu** d’un texte, sélectionne un mot ou un groupe de mots dans la zone de saisie puis utilise la barre de styles : gras, italique, souligné, barré, surlignage, couleur du thème ou couleur personnalisée. Un aperçu montre les styles avant **Appliquer** ; Annuler laisse le texte original intact. **Retirer le style de la sélection** revient aux propriétés du bloc uniquement sur le passage sélectionné. Ctrl/⌘ B, I et U sont disponibles dans la saisie.

Les styles locaux suivent le texte lors de l’édition et sont conservés avec les sauvegardes, les copies et les composants. Le style général du bloc reste la base des passages sans mise en forme locale. Les retours à la ligne, les listes, l’alignement et l’écriture progressive utilisent les styles dans le rendu partagé des aperçus, présentations et exports. Limite : 1 000 passages mis en forme par texte. La coloration syntaxique du code et les styles des cellules de tableau gardent leurs outils dédiés.

Dans le **Canvas des parcours**, clic droit → **Ajouter un projet fil rouge** crée un repère de début de projet, avec drapeau et contour orangé. Double-clique pour modifier son titre et sa description. La carte garde les dimensions des étapes et utilise les mêmes connecteurs, déplacements, groupes et suppressions. Son type est conservé en sauvegarde et export/import de parcours.


### Prototype Conducteur et Publication

Sur la branche de test `codex/test-video-production`, ouvre une vidéo puis **Conducteur** ou **Publication** dans sa fiche.

- **Conducteur** : organise les parties, rédige le script Markdown, ajoute tes repères privés et lie les créations existantes. Le conducteur s’ouvre en **Aperçu** ; **Éditer** permet de modifier le script et le support placé au-dessus. **Présenter** (F12) lance la lecture dans la même fenêtre et demande le plein écran ; Échap permet de revenir. La taille du texte des anciens documents en flux est réglable ; les pages composées gardent leur mise en page et s’adaptent à la largeur. Les flèches permettent de parcourir le plan. Les actions des parties sont accessibles au clic droit ou au bouton ⋯ de la liste.
- **Publication** : prépare le titre, choisis une miniature existante et copie séparément description, chapitres ou commentaire épinglé avec les petites icônes placées à côté des champs, tous réunis sur une page. Reprends les titres du conducteur puis renseigne les horaires du montage final. Une description peut servir de modèle local pour la playlist.

Les ateliers se sauvegardent automatiquement dans la vidéo ; Ctrl S force l’enregistrement. Ils suivent son export/import et son dossier de travail (`video.frame.json`). Fichier permet aussi un export Markdown du conducteur ou texte de la publication. Le Brouillon en tête du Conducteur conserve les notes en texte simple ; il est exclu de la présentation et du chapitrage. Les notes des anciens carnets y sont conservées. Aucun contenu n’est publié automatiquement.

Les boutons **Conducteur / Publication**, après l’état d’enregistrement dans l’en-tête, permettent de changer de vue. L’application Carnet a été remplacée par la page Brouillon du Conducteur ; les anciens liens restent compatibles.


Le Conducteur occupe la largeur disponible avec un défilement interne, sans déplacement de la page au changement de partie. **Ce que je dis** et **Mes repères** disposent chacun d’un canevas de largeur fixe (1 000 px), qui s’allonge vers le bas. Le bouton en bas à droite ouvre la zone sur toute la page ; **Revenir à la partie** ou Échap la réduit. Ajoute des blocs texte et images, déplace-les par leur poignée de titre et redimensionne-les avec les huit poignées. À droite : grille aimantée activée par défaut, nom, X/Y, largeur/hauteur, duplication, suppression et superposition. Les outils de texte apparaissent dans le panneau quand un bloc texte est sélectionné : titres, styles, listes, citations, code, liens, tableaux et surlignage, sans balises affichées. Le clic droit sur une sélection propose les couleurs de surlignage. Chaque zone accepte jusqu’à 100 blocs ; les 32 images PNG/JPEG/WebP sont partagées par la partie. Les images conservent leurs proportions dans leur cadre. Les anciennes illustrations deviennent des blocs indépendants. La disposition est conservée en aperçu, en lecture et dans le fichier vidéo ; l’export Markdown restitue le contenu dans l’ordre haut/bas puis gauche/droite. Les repères restent des consignes privées de tournage, distinctes du texte à prononcer.

Dans le diaporama, **Présenter / F12** n’ouvre plus de fenêtre externe. Le compteur reste à zéro avant l’enregistrement et commence avec la capture effective après le décompte. Il reste figé à l’arrêt et repart de zéro au prochain enregistrement. La capture intégrée utilise uniquement le Canvas : compteur, notes et interface restent hors du fichier vidéo.

Les images restent intégrées aux sauvegardes de la vidéo ; elles sont référencées par ID dans le texte et leur affichage utilise le chargement différé. Un dossier externe d’images liées n’est pas utilisé dans cette version. Les anciennes illustrations sont conservées au passage à l’éditeur visuel.

Dans **Publication**, une miniature existante est sélectionnée automatiquement si aucun choix valide n’est enregistré. S’il y a plusieurs variantes, les flèches et les petites vignettes permettent de choisir ; ce choix est sauvegardé avec la vidéo.


Le **Conducteur** s’ouvre sur **Préparer** : pour la partie sélectionnée, deux cartes **Ce que je dis / Mes repères** donnent une vue d’ensemble non modifiable. Clique sur une carte pour ouvrir son éditeur sur toute la page ; Revenir à la partie ou Échap le ferme. Le défilement sur les cartes fait défiler la page, sans capturer la molette dans un canevas.

Dans l’éditeur, le clic droit sur la scène permet d’ajouter un texte ou une image à cet emplacement (sur un texte sélectionné, il garde le menu de surlignage). Les propriétés sont rangées dans trois tiroirs exclusifs : Ajouter et grille, Placement du bloc, Texte et Markdown. La palette de surlignage n’est plus répétée à droite. Le tiroir de texte propose **Visuel / Markdown**, des titres et sous-titres, listes, séparateurs et code coloré (Java, JavaScript/TypeScript, Python, Bash, JSON, SQL, YAML, HTML, CSS). La mise en page reste commune à l’aperçu et à Présenter, avec une scène qui occupe la largeur disponible et s’agrandit sur les grands écrans.


### Prototype du workflow global

Le Conducteur et Publication ont été validés et intégrés à `main` via la PR #123. Les deux cartes du Conducteur utilisent maintenant des illustrations SVG locales.

La nouvelle branche de test `codex/test-global-workflow` propose une navigation commune **Ateliers / Ctrl K** depuis tous les espaces : recherche d’un atelier, d’une vidéo ou d’un support lié à la vidéo courante. La fiche vidéo présente **Préparer → Créer les supports → Publier**, avec un filtre des créations par type. L’accueil distingue les projets vidéo des ateliers autonomes. Les changements de vue attendent les sauvegardes ; le studio bloque la sortie pendant un enregistrement, export ou opération de fichier. Les moteurs d’édition et les formats de sauvegarde sont conservés. Le périmètre et l’audit des différentes surfaces figurent dans `docs/UX-workflow.md`. Cette nouvelle branche reste un prototype à valider.


Le Conducteur propose une préparation linéaire : texte et instructions (consignes en italique), support associé, puis partie suivante. Les anciens repères sont repris sans perte ; les documents dépassant les limites restent exportables depuis Fichier. L’éditeur conserve l’en-tête et un retour à gauche ; suppression au clic droit/Suppr, annulation disponible. Aperçu et présentation laissent défiler toute la hauteur des pages composées. Prototype sur `codex/test-global-workflow`, PR #125, à valider.

Le Conducteur s’édite désormais comme un document continu directement dans chaque partie, sous son support : `/h1`, `/h2`, listes, citations, code, séparateurs, tableaux et images. Menu filtrable avec flèches/Entrée/Échap, barre de mise en forme et surlignages conservés. Les anciens blocs sont repris dans l’ordre de lecture ; leurs positions libres deviennent un flux de document. Brouillon et parties restent disponibles.


Le document du Conducteur n’affiche plus de barre d’outils permanente. Les commandes restent accessibles avec `/` et par clic droit : mise en forme, sous-menus de surlignage, types de blocs, code et réglages d’image. Une poignée apparaît dans la marge au survol pour déplacer un bloc ; elle ouvre aussi les actions Dupliquer/Supprimer. La dernière opération sur les blocs peut être annulée (Ctrl Z), y compris la suppression d’une image.


La préparation du Conducteur affiche les limites latérales du document, une marge distincte pour les poignées et des repères discrets entre les blocs. Le code conserve un cadre complet qui grandit avec son contenu ; toutes les lignes, y compris les lignes vides, sont sauvegardées. Ces repères d’édition ne s’ajoutent pas à la présentation.


Un bouton soleil/lune dans l’en-tête change l’apparence de toute l’application. Le choix clair/sombre est mémorisé localement, sans modifier les thèmes des créations ni leurs exports. Les styles clairs sont régénérés par `npm run theme:build` (également au lancement et au build).

Dans le Conducteur, clique entre les blocs ou dans la zone vide pour ajouter du texte. Aux limites du code, les flèches permettent de sortir ; `Ctrl+Entrée` ajoute un paragraphe après, `Ctrl+Maj+Entrée` avant (Cmd sur Mac). Les repères du document sont plus discrets.


Le Conducteur conserve le même sommaire dans le brouillon et les parties, sur toute la hauteur disponible. Les blocs de code proposent une copie et un sélecteur de langage directement en édition ; ces contrôles restent absents de l’aperçu et de la présentation. Les repères du document sont très légers et le code garde un cadre discret en lecture. Les messages de suppression avec annulation disparaissent après15secondes.


La fiche vidéo propose deux cartes illustrées, Préparer et Publier ; les supports restent accessibles juste en dessous. En lecture du Conducteur, le support associé est affiché en haut à côté de la taille du texte. La sélection remontante conserve le curseur et le contenu ; le dépôt des blocs est indiqué par un emplacement entre blocs avec « Déposer ici ».

Les états des vidéos disposent d’une palette dédiée au mode clair : badges et bordures du canvas restent contrastés, sans modifier les couleurs du mode sombre.
Les groupes du canvas des parcours proposent sept couleurs (double-clic sur leur titre pour les modifier), conservées dans les sauvegardes et adaptées aux deux apparences. Les étapes sont bleues, les projets fil rouge violets.

Les enregistrements de diaporamas proposent MP4 H.264 par défaut (compressé), MOV QTRLE, MKV FFV1 et WebM, avec un fond opaque. Pour MP4/MOV/MKV, une capture WebM à débit élevé est envoyée progressivement dans un fichier temporaire local, puis convertie au clic sur **Stop**. Le plafond PNG de 256 Mo et la limite de sortie de 512 Mo ne concernent plus ce chemin de présentation ; aucune durée ou taille cumulée ne déclenche Stop. Le téléchargement se fait depuis le disque local, sans charger tout le MP4/MOV/MKV dans la mémoire du navigateur. Les incrustations gardent leurs choix de fond : MOV/MKV préservent l’alpha, WebM utilise la chrominance. Le lecteur intégré reste disponible pour WebM ; MOV/MKV se téléchargent pour le montage. Aucun audio n’est enregistré.

La palette du parcours est atténuée : Création bleu grisé, Prêt à tourner olive, groupes très légers en clair et flèches gris bleuté contrastées.

Chaque vidéo peut porter un type **Cours**, **Exercice** ou **Démonstration**, indépendant de son état d’avancement. Le choix se fait à la création ou dans la fiche vidéo et apparaît dans la bibliothèque, les playlists et le canvas. Les anciennes vidéos restent sans type jusqu’à leur classement.
Les étiquettes d’état et de type partagent un contour fin et des dimensions communes, sans liseré latéral ; elles sont alignées sur les cartes du canvas dans les deux thèmes.
Les nouvelles vidéos ont le type **Non défini** par défaut. Tous les types utilisent la même étiquette grise dans les deux thèmes ; les couleurs restent réservées aux états d’avancement. Les types déjà attribués sont conservés.

Si le dossier de sauvegarde automatique a été déplacé, le bandeau permet de **Choisir le nouvel emplacement…** (ou **Choisir un autre dossier…**). Sélectionne le dossier qui contient les sous-dossiers portant les ID des vidéos : les sauvegardes en attente sont rejouées après la nouvelle liaison. Les copies du navigateur sont conservées si l’accès au disque échoue.

Dans le Conducteur, **`/comment`** insère une note de travail jaune directement dans le document. Elle reste dans la sauvegarde, mais ne s’affiche ni en Aperçu ni en Présenter. Les parties disposent d’un trait de destination avant/après pendant leur déplacement. Les ateliers liés proposent deux icônes distinctes : retour direct à l’Accueil et retour à la fiche Vidéo.

La navigation Accueil/Vidéo et les menus sont regroupés dans un bloc compact. Les suppressions de parties, blocs du Conducteur et créations affichent des notifications empilées en bas à droite, avec annulation indépendante pendant 15 secondes. Les commentaires privés gardent un contour complet dans les deux thèmes.


## J’aime et abonnement animés

Dans **Incrustations → Formats → Social**, choisir **J’aime et abonnement · animé**. Le bandeau apparaît, puis le bouton J’aime (0,9 s), l’abonnement (2,7 s) et le remerciement (4,8 s). Sortie commune en fondu à la fin des huit secondes. **Animer** donne accès à l’aperçu, aux timings par groupe et à l’export MOV transparent, ou WebM avec chrominance. Tous les textes, formes, couleurs et groupes restent éditables. Ce format est une invitation visuelle pour le montage, sans connexion ni action sur YouTube.


## États des incrustations

Les incrustations utilisent la même barre **Étapes** et le même gestionnaire que les diaporamas : dupliquer l’état courant, renommer, réordonner ou supprimer une étape (Ctrl Z pour annuler). Chaque état possède ses propres objets, textes, positions, styles et visibilité. Jusqu’à vingt étapes en plus de l’état initial. Le PNG exporte l’état sélectionné.

Dans **Objet → Animation → Transition entre étapes**, cocher **Interpoler la position et la taille**, puis déplacer ou redimensionner cet objet dans une autre étape. Le calcul est commun au diaporama : transition douce de 0,5 s maximum, raccourcie si les étapes sont très rapprochées. Les autres objets passent en fondu.

**Animer → Étapes de l’incrustation** règle le début de chaque état en secondes ; sans réglage, les états sont répartis sur la durée du clip. L’état initial commence à zéro, les autres restent dans l’ordre de l’éditeur. Les entrées/sorties des objets restent des timings globaux du clip, communs aux états : déplacer le curseur sur un état pour accéder à ses objets. Aperçu et exports MOV/WebM utilisent exactement le même rendu des états et des interpolations.


## Couleurs et opacité des SVG

Importer un SVG comme image, le sélectionner, puis ouvrir **Objet → Couleurs → Couleurs du SVG**. Chaque couleur détectée dans les attributs de remplissage/contour, les styles directement sur les éléments ou les points du dégradé dispose de la palette du thème et d’un sélecteur personnalisé. Une même couleur remplace toutes ses occurrences. Les liens au thème suivent ses changements ; les références aux dégradés, les zones sans remplissage et l’opacité propre au SVG sont conservés. Le fichier source reste intact et **Restaurer les couleurs du SVG** retire les substitutions.

**Objet → Couleurs → Opacité** règle la transparence globale avec curseur ou saisie du pourcentage, comme pour tous les autres objets. Les réglages SVG sont conservés dans les états, les sauvegardes JSON, les composants réutilisables et les exports PNG/MOV/WebM des trois ateliers. Le remplacement de l’image repart de ses couleurs d’origine. Le SVG doit toujours être autonome : scripts, ressources externes et feuilles de style intégrées restent refusés lors de l’import. Jusqu’à128 couleurs explicites proposées par image ; ce panneau remplace une couleur commune, sans éditer individuellement les chemins.


## Outro YouTube · vidéo, playlist et chaîne

Dans **Incrustations → Formats → Vidéo**, choisir **Outro YouTube · vidéo et playlist**. Le gabarit règle la résolution à1920 ×1080 : deux rectangles640 ×360 (16:9), un cercle central294 ×294 pour la chaîne et des légendes alignées sous les zones. Le nom de la playlist est prérempli depuis la vidéo parente si elle en possède une ; dans un atelier autonome, une légende générique reste modifiable. Ce sont des emplacements visuels, sans lecture de vidéo ni liaison YouTube automatique.

Fond vert #00ff00, également présent comme calque de fond verrouillé pour le PNG et l’éditeur (déverrouillable dans Calques). **Animer** utilise15s, apparitions successives vidéo/playlist/chaîne, MOV sur fond de chrominance par défaut ; WebM reste disponible. Les couleurs visibles sont fixes et évitent le vert de découpe, mais chaque objet reste personnalisable. Ctrl Z annule l’application du format, y compris la résolution.

Ajouter ensuite les vrais éléments vidéo, playlist et abonnement dans [YouTube Studio](https://support.google.com/youtube/answer/6388789?hl=fr), sur les5 à20 dernières secondes. La documentation officielle autorise leur repositionnement et ne donne pas de dimensions fixes en pixels :640 ×360 et le cercle294px sont des repères de composition ajustables, pas une garantie de placement exact sur tous les appareils. Il ne s’agit pas de la bannière de chaîne YouTube.


## Encodage local pour Kdenlive

Les MOV livrés utilisent maintenant **QTRLE/ARGB**, soit l’équivalent automatique de `ffmpeg -i capture.mov -c:v qtrle -pix_fmt argb sortie.mov`. Le nouveau **MKV utilise FFV1/BGRA**, sans perte et avec alpha. Le conteneur MKV seul ne garantit pas la transparence : c’est le codec/pixel format choisi qui la conserve. Même pipeline pour les incrustations animées et les enregistrements de présentation. WebM reste disponible.

**FFmpeg doit être installé et accessible dans le PATH du processus qui lance Frame** (c’est le cas sur la machine de développement vérifiée). Lancer l’application avec `npm run dev`, ou `npm run build` puis `npm run preview`. Redémarrer le serveur après mise à jour. Un hébergement statique seul conserve WebM mais ne fournit pas les exports QTRLE/FFV1. Ce service se contente d’encoder : aucun changement de port, aucun déplacement ni migration des sauvegardes. Aucun service distant ni IA.

La disponibilité du codec est vérifiée avant une capture. Si l’encodage final échoue après l’enregistrement, une fenêtre conserve la capture source avec **Réessayer**, **Télécharger la capture source** et fermeture explicite. Ne pas fermer l’onglet avant d’avoir récupéré cette capture. Les fichiers temporaires d’encodage sont supprimés après réponse, erreur ou annulation ; un arrêt brutal du processus peut laisser un dossier `frame-video-*` dans le répertoire temporaire système. Une seule conversion à la fois par instance, dix minutes maximum, capture256Mo et sortie512Mo. Les projets et les captures sources utilisateur ne sont pas modifiés.


## Atelier Animation — branche de test

Nouvel atelier indépendant sur `codex/test-animation-studio` : propriétés partagées avec Diaporama (dont écriture progressive), timeline/images clés, splines, séquences superposables, références, modifieurs simples et particules déterministes. Exports MOV QTRLE/MKV FFV1 avec alpha et WebM sur fond uni. [Guide de la V1](docs/animation-studio.md). La PR #127 reste en test ; la précédente PR #125 est fusionnée après validation utilisateur.

Démonstration Animation : [Slime · quatre scènes](animation-slime-cinq-scenes.json), à importer dans Animation → Fichier, ou à ajouter depuis Exemples → Slime · quatre mondes. Parcours spatial, chute vers un monde inférieur, gravité inversée, contacts de transformation et fonds dégradés animés ; 44 secondes au total. [Guide](docs/animation-studio.md).

Prototype de construction d’animations : attaches et flèches, événements, courbes Bézier, sélection/copie de plusieurs clés, caméra animée, mouvements sur disque et diagnostic visuel. Exemple : [Référence Java](animation-workflow-reference-java.json). Rotation Maj par paliers de 90°, redimensionnement proportionnel Maj et images découpées dans les formes sont partagés par les quatre éditeurs.

La branche de test `codex/test-selection-pen` ajoute une palette de sélection d’objets (rectangle, ellipse, lasso libre, opérations de sélection) et une plume Bézier commune aux quatre éditeurs. Voir le [guide sélection et plume](docs/selection-pen.md).

### Notes libres

Une application indépendante des vidéos : dossiers et sous-pages, éditeur visuel partagé avec le conducteur, liens internes et liens entrants, sauvegarde automatique locale et export/import JSON complet. Voir le [guide Notes libres](docs/free-notes.md).

### Publication : descriptions structurées et styles de titres

Dans une vidéo, **Publication → Préparer** sélectionne par défaut le modèle structuré pour les nouvelles publications. La rédaction libre reste disponible et les textes libres existants sont conservés. Le modèle **Cours · description structurée** propose : introduction, programme, chapitres, informations techniques, poursuite de l’apprentissage, ressources, musiques facultatives, présentation de la chaîne et hashtags facultatifs. Les rubriques vides sont omises. Les versions Java sont renseignées manuellement.

**Fichier → Modèles de description** donne accès aux modèles, aux blocs réutilisables et à **Rubriques et chaîne**. Cliquer sur Modifier avant de changer les réglages partagés, puis Enregistrer. Les titres des rubriques et les textes communs se répercutent sur les vidéos utilisant un modèle. La structure accepte les balises proposées par les boutons : `{{programme}}`, `{{chapitrage}}`, etc. Les blocs partagés utilisent `{{bloc:identifiant}}` ; les parties personnalisées utilisent `{{partie:identifiant}}` et peuvent recevoir un texte propre à chaque vidéo, une liste ou un bloc partagé. L’ordre des balises détermine l’ordre du résultat.

Les **styles des titres** proposent Essentiel, Encadré (`=== Titre ===`), Étoiles, Repères visuels avec emojis et Personnel. Ils sont personnalisables : signes avant/après, majuscules, emoji par rubrique ; on peut créer ses propres styles. Le style se choisit uniquement dans la bibliothèque partagée et s’applique à toutes les vidéos utilisant un modèle, y compris celles qui avaient un ancien réglage individuel. Ces décorations font partie du texte effectivement copié et exporté.

**Aperçu** affiche le résultat sans formulaire, avec copie de la description, du commentaire épinglé et des tags YouTube séparément. L’export texte utilise le même rendu. Les ressources sont ajoutées au commentaire épinglé ; la description contient par défaut une invitation à le consulter. Les liens vers les vidéos précédente/suivante suivent l’ordre de la playlist, si leurs URL publiques sont renseignées ; aucune URL n’est inventée. Les tags restent un champ facultatif distinct des hashtags. Un avertissement signale une description dépassant 5 000 caractères, une balise inconnue ou un modèle supprimé ; le dernier rendu enregistré sert de repli pour un modèle disparu. Les anciennes descriptions libres sont conservées.

#### Organiser les sections d’un modèle

Dans **Modèles de description → Rubriques et chaîne**, les réglages sont répartis entre **Structure**, **Apparence** et **Textes communs**. Dans Structure, choisis le modèle partagé, clique sur **Modifier les réglages partagés**, puis déplace les sections à l’aide de leurs poignées. Une ligne indique la position de dépôt et un exemple de rendu s’affiche à côté. Le nouvel ordre s’applique aux vidéos qui utilisent ce modèle ; les autres modèles conservent leur ordre. Enregistrer reste accessible dans la barre supérieure.

Le même éditeur de sections est disponible dans chaque fiche de modèle. Il permet d’ajouter des rubriques, des blocs, des parties personnalisées ou du texte libre, et de retirer une section du modèle sans supprimer le bloc partagé correspondant. **Alt + flèche haut/bas** sur la poignée réorganise aussi les sections ; les boutons fléchés suivent le réglage général de l’interface. Les balises restent accessibles dans **Structure texte · avancé**. Un déplacement sépare les sections par une ligne vide ; ouvrir simplement l’éditeur ne réécrit pas le texte existant. Les anciens modèles peuvent être repris en sections par une action explicite, en conservant leurs champs d’origine.

### Police de lecture et alignement des chiffres

Depuis l’accueil, **Fichier → Paramètres des vidéos… → Typographie** permet de choisir séparément la police de l’interface et celle des textes de travail (Publication, notes et conducteur). Les polices sont embarquées localement : DM Sans, Inter, Montserrat, Lora et JetBrains Mono. L’option **Chiffres de largeur fixe** est activée par défaut. Pour aligner toutes les lettres également, choisir **JetBrains Mono**. Un exemple permet de vérifier le rendu immédiatement. Ces préférences sont enregistrées automatiquement dans ce navigateur, indépendamment des étiquettes de vidéos. Elles ne modifient pas les polices des créations ni le texte copié/exporté ; YouTube conserve sa police.

#### Tiroirs de préparation

Dans **Publication → Préparer**, chaque section peut être ouverte ou repliée depuis son en-tête : titre, modèle, introduction, programme, description, chapitres, informations techniques, apprentissage, ressources, mots-clés, musiques, commentaire et miniature. Les compteurs restent visibles, notamment le nombre de chapitres. Les tiroirs sont initialement fermés, sauf la miniature ; leur état est mémorisé dans ce navigateur, indépendamment du contenu des vidéos. Refermer un tiroir ne supprime aucune saisie et ne change pas l’aperçu, la copie ou l’export. Un seul chevron indique son ouverture ; Entrée ou Espace fonctionne aussi au clavier.

#### Navigation entre préparation et fiche vidéo

Dans **Conducteur** et **Publication**, cliquer sur le titre de la vidéo dans la barre supérieure revient directement à sa fiche, après enregistrement du travail en cours. L’icône vidéo près d’Accueil reste également disponible. Les menus suivent le même ordre dans les deux ateliers : **Conducteur / Publication**, puis **Préparer / Aperçu**. Le bouton **Présenter** reste disponible dans Conducteur.


### Arrêt volontaire des prises de présentation

Pendant une prise, **Stop** s’active au clic de souris et reste hors du focus et de la navigation Tab. Entrée et Espace continuent à piloter les diapos sans déclencher Stop. Quitter ou Échap demande de terminer la prise avec Stop au lieu de la couper. Les formats et la résolution restent verrouillés pendant la capture/finalisation. Une erreur réelle du navigateur, du disque ou du service local est signalée comme une interruption ; elle ne présente pas un enregistrement tronqué comme un export terminé.

Les captures temporaires MP4/MOV/MKV sont locales et sont nettoyées à l’annulation/fermeture du serveur ; le résultat terminé reste téléchargeable jusqu’à la prochaine prise ou pendant six heures. Ces formats nécessitent FFmpeg et le serveur local Frame. La capture intermédiaire est compressée par le navigateur ; les codecs finaux QTRLE/FFV1 n’ajoutent pas de perte. Les exports transparents d’incrustations ne sont pas modifiés.

Le MP4 des diaporamas utilise H.264, qualité CRF 21 et préréglage veryfast. Il privilégie un fichier compact, opaque et compatible avec le montage. MOV QTRLE et MKV FFV1 restent des formats volumineux ; ils ne sont plus le choix par défaut. Le temps et le poids dépendent du contenu, de la résolution et du PC. Les exports transparents des autres ateliers conservent leurs codecs.

### Fonds et motifs

Dans les propriétés **Diapo / Format / Scène → Fond et motifs**, choisis un fond uni, un dégradé orientable ou un motif : points, grille, lignes, carrés, croix, hexagones. Quelques préréglages clairs/sombres servent de départ. Couleurs personnalisées ou liées au thème, opacité du motif, taille, espacement, épaisseur des traits, rotation, décalages et quinconce sont réglables selon le motif, au curseur ou par saisie numérique. Le même panneau est accessible depuis Thèmes pour les créations classiques.

Le réglage appartient à la composition et à son étape pédagogique, est sauvegardé dans le document et suit le rendu PNG/présentation/vidéo. « Fond actuel » conserve les anciens comportements ; les incrustations restent transparentes par défaut. Un fond choisi est placé derrière les objets : les grands calques opaques existants (dont certains presets de miniatures) peuvent le masquer et restent éditables/supprimables. Dans Animation, ce fond reste fixe derrière la caméra ; pour retrouver le fond animé par images clés, sélectionner « Fond actuel ». Les motifs sont calculés localement et mis en cache, sans images externes ni IA.

### Fond commun fixe et laser à la demande

Diaporama → Propriétés → Diapo → Fond et motifs : active **Fond commun fixe sur toutes les diapos**. La première activation reprend le fond de la diapo courante. Les réglages suivants concernent l’ensemble du diaporama : le fond reste fixe et seules les couches d’objets se déplacent pendant les transitions gauche/droite/haut/bas. Éditeur, vignettes, PNG, présentation et enregistrement utilisent ce même fond. Désactive l’option pour retrouver les fonds individuels, conservés sans modification. Les objets/images opaques couvrant toute la diapo restent des objets mobiles.

Le laser est désactivé à chaque ouverture de présentation. Le bouton **Laser** l’active ou le désactive ; la désactivation retire immédiatement le point et sa traînée temporaire. Reprendre le focus avec le laser coupé ne crée aucune marque. L’enregistrement capture uniquement le Canvas, jamais le curseur système ni les commandes de présentation. Le laser activé volontairement reste un effet enregistré dans le contenu.

### Vectoriel et Mise en page — branche de test

Deux ateliers autonomes dans **Applications**, avec **Notes** conservé en premier : Vectoriel pour les dessins, tracés et ressources SVG ; Mise en page pour les fiches et documents PDF multipages. Même navigation et outils de sélection, transformations, plume, calques, groupes, styles et sauvegarde de projets. Bibliothèques distinctes, exemples éditables et reprise par URL. [Fonctions, prise en main et limites de la V1](docs/vector-layout-studios.md).

Révision des ateliers de test : palette flottante commune, commandes en bas, tiroirs de propriétés partagés, export avec aperçu et recadrage SVG/PNG, couleurs des thèmes, règles, tableaux et code coloré. Voir le [guide et bilan comparatif](docs/vector-layout-studios.md#révision-ergonomique--22-octobre-2026).

Le panneau de propriétés utilise désormais `InspectorShell` dans les six éditeurs, avec les contrôles extraits du diaporama. Styles nommés depuis les textes, colonnes proportionnelles et PDF portrait/paysage mixte disponibles dans les ateliers de test. Diaporama et Animation acceptent les vidéos locales (rendu sans son), avec lecture automatique activable et les options visuelles des images. Le moteur SVG des incrustations reste partagé et accepte les styles internes autonomes.

Animation : [bibliothèque d’effets et passerelle vectorielle](docs/animation-studio.md#bibliothèque-deffets--23-octobre-2026) sur branche de test. Galerie à aperçus, pile d’effets, dissolutions/fragments, déformations, néon/métallique, préréglages locaux et quatre scènes de démonstration dans **Exemples → Laboratoire d’effets**.
