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
