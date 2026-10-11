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

Les anciennes sauvegardes combinées sont migrées automatiquement ; l’ancien stockage est conservé jusqu’à la réussite des nouvelles écritures. Un ancien fichier combiné lié demande un premier « Enregistrer sous » pour préserver l’original. Son import reste compatible et restaure uniquement la partie de l’application ouverte ; importer le même ancien fichier dans l’autre atelier pour en retrouver l’autre partie. Il s’agit d’un document courant par espace, sans catalogue de projets ni synchronisation entre navigateurs.

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
