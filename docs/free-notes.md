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
