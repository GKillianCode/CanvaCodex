# Notes libres — V1

Notes s’ouvre depuis Notes libres sur l’accueil ou Applications → Notes, indépendamment des vidéos. Les routes #/notes et #/notes/<identifiant> permettent de retrouver une page après actualisation.

## Organiser les pages

Les boutons à gauche créent une note ou un dossier à la racine. Une page ouverte peut contenir des sous-notes et sous-dossiers. Les chevrons déplient l’arborescence ; la recherche retrouve les titres avec leurs parents. Le titre de la page est directement modifiable.

Le clic droit ou les trois points d’une ligne permettent d’ajouter des sous-pages, déplacer, dupliquer une note, monter/descendre et supprimer. Un déplacement dans ses propres descendants est interdit. La suppression d’un sous-arbre demande confirmation ; les autres notes et les vidéos sont conservées.

## Écrire et relier

Le composant du conducteur est réutilisé : commandes slash, titres, listes et sous-listes, citations, séparateurs, tableaux, code coloré, images, surlignage, poignées de blocs et menus au clic droit.

Lien vers une note, /note ou le clic droit ouvrent le sélecteur. Le texte sélectionné devient le libellé ; sinon, le titre de destination est inséré. Cliquer le lien ouvre la note dans Frame. Les liens entrants permettent de revenir aux notes qui la désignent. Les exemples de liens dans du code sont ignorés.

## Sauvegarder et transférer

La sauvegarde est automatique dans IndexedDB, séparément des vidéos. Ctrl/⌘ S force la sauvegarde ; la navigation attend les écritures et imports d’images. Seule la note ouverte charge son contenu et ses images. Le dépliage et la dernière page sont des préférences du navigateur.

Fichier → Exporter toutes les notes JSON conserve l’arborescence, les contenus et les images. L’import ajoute des copies avec de nouveaux identifiants et réécrit leurs liens internes, sans écraser les notes présentes. L’export Markdown concerne la note courante.

En cas d’erreur d’écriture, le texte reste ouvert. L’export JSON inclut le brouillon courant et l’export Markdown reste disponible pour récupération.

Limites V1 : 5 000 pages/dossiers, 50 000 caractères par note, limites d’images identiques au conducteur, import de sauvegarde jusqu’à 256 Mo. Pas de service distant.

### Déplacer les pages

Glisser la poignée à gauche d’une note ou d’un dossier sur une autre page pour l’y ranger. La zone « Racine des notes » permet de sortir d’un dossier ou d’une sous-note. Les destinations fermées se déplient après un court survol. Une page ne peut pas être déplacée dans ses propres descendants. Le menu « Déplacer vers » reste disponible sans glisser-déposer. Les identifiants et liens entre notes restent inchangés ; les chemins et fils d’Ariane suivent automatiquement la nouvelle organisation.

### Organisation simplifiée (20 octobre 2026)

Les dossiers sont retirés. Au chargement, les anciens dossiers et tous leurs descendants sont supprimés du stockage, y compris les contenus des notes. Les imports appliquent la même règle. Seules les notes et sous-notes restent disponibles. La liste des sous-pages en bas du document est supprimée : utiliser `/page` dans le texte pour insérer une étiquette cliquable vers une sous-note directe. Les petits-enfants ne sont pas proposés ; ouvrir leur parent pour les lier. Le glisser-déposer entre notes et vers la racine est conservé. Ces règles remplacent les indications précédentes sur les dossiers et le sélecteur global de liens.

Mise à jour : `/page` propose désormais toutes les notes, quel que soit leur niveau dans l’arborescence. La commande et le menu contextuel portent le libellé « Page ».

La barre latérale s’étire depuis son bord droit et conserve sa largeur. Les longues arborescences disposent d’un défilement horizontal. `/page` propose « Associer une note » pour choisir parmi toutes les pages, ou « Créer une note enfant » pour saisir un titre et créer une sous-note avec son lien dans le texte, sans quitter le document.

Les actions du sélecteur sont verticales. Suppr dans l’arborescence demande confirmation avant de supprimer une note et ses descendants. Les liens de page possèdent une croix qui retire seulement le lien du document : la page cible reste intacte. Leur teinte distingue les enfants directs des autres pages associées, selon l’organisation actuelle.

Les liens de page sont non éditables : leur libellé est toujours le titre actuel de la page cible, résolu par son identifiant. Renommer la page met à jour le titre affiché dans ses liens lors de leur chargement. La croix retire le lien sans supprimer la page.

### Carte des notes

Le bouton « Carte des notes » dans l’en-tête ouvre un graphe global. Chaque point représente une note ; chaque trait correspond à un lien /page entre deux notes existantes. Les doublons et liens réciproques sont regroupés. Les notes isolées restent affichables. L’option « Parenté » ajoute en pointillés les relations parent/enfant, indépendamment des liens du texte.

Molette pour zoomer, glisser dans le fond pour déplacer la vue, glisser un point pour le déplacer ; cliquer sur un point (ou Entrée au clavier) ouvre la note. Survoler un point met en évidence ses connexions. Recherche par titre, zoom et recentrage sont disponibles. Le placement est calculé localement, sans IA ni dépendance supplémentaire, à partir des métadonnées ; les corps et images des notes ne sont pas chargés. Les positions déplacées dans le graphe sont temporaires. La section « Liens entrants » des documents est supprimée.

### Lisibilité du réseau et des liens

Les noms des notes sont limités à 80 caractères sur une seule ligne. Les anciennes valeurs et les imports sont normalisés selon cette limite. Les liens de page sont des lignes discrètes et indépendantes : un seul lien par bloc, avec titre raccourci si nécessaire et croix de retrait. Le texte autour des anciens liens est conservé.

La vue s’appelle désormais « Réseau de notes ». Les groupes connectés sont organisés automatiquement dans des zones séparées ; chaque note dispose d’une cellule réservant de la place à son titre. Les libellés se raccourcissent selon le zoom et leur taille reste lisible à l’écran. Survoler un point affiche le titre complet.

À très faible zoom, seuls les libellés de la note active ou survolée restent affichés pour éviter la superposition ; zoomer révèle les autres titres.

### Exploration par niveaux

Le Réseau de notes s’ouvre désormais sur les notes racines. Cliquer sur une note (ou Entrée au clavier) montre cette note et uniquement ses sous-notes directes. Cliquer sur une sous-note descend encore d’un niveau. Le fil d’Ariane permet de remonter jusqu’à la racine, et « Ouvrir la note » ouvre le document exploré. Les liens et la recherche concernent uniquement le niveau affiché ; aucune modification de l’arborescence n’est réalisée par cette navigation.

L’exploration par niveaux utilise une constellation : la note choisie se place au centre, ses sous-notes se répartissent autour avec des espaces réservés aux titres. Les transitions accompagnent les changements de niveau ; elles respectent le réglage système de réduction des animations. Le chemin, le retour et la recherche sont réunis dans une barre compacte. Les filtres se trouvent dans « Options d’affichage ».

Le niveau suivant apparaît désormais très légèrement en transparence autour des notes du niveau courant. Ces aperçus ne sont pas cliquables ; explorer leur parent les fait passer au premier plan. Le chemin commence par « Racine ». Le lien « Bloc-notes » à gauche de l’en-tête revient à l’édition ; depuis celle-ci, « Réseau de notes » ouvre l’explorateur. L’état de sauvegarde se trouve à droite, près du thème.

Les notes finales, sans sous-note, ne permettent plus de descendre dans le réseau : clic et Entrée restent sans effet et le curseur est neutre. Elles restent visibles et leurs documents sont accessibles depuis le bloc-notes.

Les positions d’aperçu sont conservées lorsqu’on explore le niveau suivant et lorsqu’on revient en arrière, pendant la session du réseau. Les petits groupes sont rapprochés. La caméra garde son cadrage autant que possible ; « Recentrer » reste disponible pour ajuster volontairement la vue.

La croix de retrait d’un lien demande confirmation. Annuler conserve le lien ; confirmer retire uniquement le lien du document et conserve la note cible.

La note explorée est recentrée à chaque changement de niveau, sans réorganiser les positions relatives des notes. Le zoom courant est conservé et le déplacement reste libre ensuite. Le fond pointillé partage désormais les couleurs des parcours et des autres canevas, avec une visibilité renforcée en clair et sombre.
