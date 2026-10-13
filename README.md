# CanvaCodex — Frame

Studio personnel pour préparer des diaporamas, des incrustations vidéo et des miniatures avec une charte graphique commune.

L’application se trouve dans [`java-studio/`](java-studio/README.md). Elle utilise Vue 3 et Vite, sans backend dans cette première version.

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

- **Transparent · MOV sans perte**, choix par défaut : vidéo 30 images/s avec canal alpha, contenant des images PNG RGBA. Le damier de l’aperçu n’est jamais exporté. Export déterministe image par image, sans encodeur externe ni serveur ; fichier plus volumineux, limite 256 Mo. Certains logiciels de montage n’importent pas ce codec et nécessitent une conversion (par exemple vers ProRes 4444).
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

À l’accueil, « Trier les vidéos » propose Dernières modifications, État du processus et Ordre dans les playlists. Le dernier tri choisi est mémorisé dans ce navigateur. Le processus suit : Idées / Backlog → Création → Prêt à tourner → Tournage → Montage → Terminé → À publier → Publié. Modifie le statut dans la fiche de la vidéo puis enregistre-la. Les anciens statuts restent compatibles (Préparation est désormais nommé Création).

Chaque carte affiche son numéro dans la playlist. « Gérer les playlists » ouvre la liste ; ouvre une playlist pour la renommer, la supprimer ou gérer ses vidéos. Glisse les vidéos verticalement avec leur poignée ou saisis directement une position : les autres vidéos sont décalées automatiquement. Les menus des vidéos permettent d’ouvrir, renommer, archiver/restaurer ou retirer une vidéo de la playlist. Supprimer une playlist conserve les vidéos. L’accueil n’affiche plus de liste de playlists ni de sélecteur « Toutes les playlists ».

Le bouton « États » propose des cases à cocher et Tout afficher / Tout masquer pour filtrer rapidement le catalogue. Le statut « Idées / Backlog » conserve les idées sans échéance : sélectionne-le dans la fiche vidéo, puis enregistre. Les états restent prédéfinis dans cette version.

Le parcours est indépendant du statut de production, des changements de nom et de la date de modification. Il est conservé localement dans IndexedDB ; renommer une playlist préserve son parcours. Les nouvelles vidéos sont ajoutées après les identifiants déjà enregistrés ; un changement de playlist renumérote les deux groupes selon l’ordre local existant, puis tu peux fixer la nouvelle position. Les archives gardent leur place : leurs numéros peuvent donc être absents de la vue active. Supprimer une playlist conserve les vidéos dans Sans playlist et renumérote ce groupe. Les ordres de catalogue sont propres à cette bibliothèque ; un import/une copie crée une nouvelle vidéo et ne remplace pas les positions des vidéos existantes. Le paquet JSON individuel ne transporte pas l’organisation complète du catalogue.


### Playlists illustrées, carnet et canvas pédagogique

Une playlist s’ouvre dans une grande fenêtre, avec 24 vidéos par page. Chaque ligne affiche la miniature du projet si elle existe, sinon la première diapo du diaporama (puis une incrustation en dernier recours). Les aperçus sont chargés près de la zone visible. Les numéros restent ceux de la playlist complète ; une position saisie peut déplacer une vidéo vers une autre page.

Après les trois ateliers de la fiche vidéo, **Ouvrir le carnet** ouvre une application dédiée (`#/videos/<id>/notes`), avec rechargement et retour à la vidéo. Le carnet Markdown propose : Écrire, Écrire et lire, Lire ; titres, listes, code, liens et tableaux. Les notes déjà enregistrées sont reprises. « Enregistrer le carnet » ou Ctrl/Cmd S dans le texte sauvegarde uniquement le carnet ; le retour à la vidéo et la navigation attendent la sauvegarde du carnet. Le carnet est inclus dans le paquet vidéo JSON et dans les duplications. Limite : 20 000 caractères, HTML brut et images externes désactivés. Les six niveaux de titres sont visibles ; les blocs de code balisés (par exemple `java`) disposent de coloration syntaxique Java, JavaScript, TypeScript, Python, Bash, JSON, SQL, YAML, HTML et CSS.

À l’accueil, **Canvas des parcours** ouvre un espace indépendant des playlists. Fais un clic droit pour ajouter des vidéos de ta bibliothèque (sélecteur illustré et paginé) ou des étapes. Toutes les cartes mesurent 280 × 240. Tire depuis le point de sortie à droite d’une carte et relâche sur une autre pour créer une flèche. Au clavier : Entrée sur le point de sortie puis sélection de la carte cible. Une carte peut avoir plusieurs suites et plusieurs prérequis ; déplacer les cartes conserve les connecteurs.

Maj + clic sélectionne plusieurs cartes ; clic droit → Grouper la sélection. Le nom du groupe se modifie dans le panneau latéral, son titre déplace toutes ses cartes, Dégrouper conserve les cartes. Aimantation à la grille de 24 unités activée par défaut, désactivable au clic droit. Le canvas s’étend au fil du déplacement, y compris dans les coordonnées négatives. Molette enfoncée ou Espace + glisser déplace la vue ; un rectangle tracé dans le vide sélectionne les cartes entièrement contenues, Ctrl/Cmd A sélectionne tout, un clic vide désélectionne. Le zoom est en bas et Ctrl/Cmd + molette zoome autour du pointeur. Clic droit → Recentrer les cartes. Sélectionner un lien permet de le supprimer ; retirer une carte du canvas ne supprime pas sa vidéo.

Canvas sauvegardé automatiquement dans IndexedDB, avec indication d’erreur et réessai ; fermeture attend la sauvegarde, rechargement avertit en cas d’écriture non terminée. Limites : 500 cartes et 2 000 liens. Les cartes contiennent seulement des références vidéo et des positions. Ce canvas global est propre au navigateur et n’est **pas inclus dans les exports JSON individuels de vidéos**. Aucun parcours n’est imposé et aucune playlist n’est réordonnée par le canvas.
