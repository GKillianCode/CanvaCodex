# Refonte du workflow Frame — prototype global

Branche de test : codex/test-global-workflow, issue #124. Le Conducteur et Publication validés ont été intégrés dans main via #123. Le nouveau prototype reste à valider.

## Organisation commune

Le projet vidéo est le point d’entrée du travail : Préparer (Conducteur), Créer les supports (diaporamas, incrustations, miniatures), Publier (textes YouTube). Les playlists classent les vidéos ; les parcours décrivent les prérequis pédagogiques, indépendamment de leur ordre de production. Les ateliers autonomes restent accessibles pour une création indépendante. Aucun document n’est dupliqué lors d’un changement de vue.

Un accès Ateliers / Ctrl K est partagé par tous les en-têtes : accueil, fiche vidéo, parcours, Conducteur, Publication, studios de diaporamas, incrustations et miniatures. Il propose la fiche et les supports de la vidéo courante, les quatre ateliers autonomes et une recherche dans les résumés des vidéos. La recherche ne charge pas les corps des créations. Navigation clavier, état courant et messages d’erreur sont communs.

## Surfaces revues

| Surface | Organisation et usage |
| --- | --- |
| Accueil | Bibliothèque centrale, ateliers autonomes compacts distingués des projets vidéo, recherche et filtres conservés ensemble. Pagination et résumés conservés. |
| Fiche vidéo | Trois étapes explicites, accès aux ateliers liés, supports regroupés et filtre par type, création/import/suppression/restauration conservés. |
| Playlists | Gestion existante conservée dans la bibliothèque : nom, ordre, pagination, vignettes et vidéos. Accès par la bibliothèque commune, aucune seconde taxonomie introduite. |
| Parcours | Application autonome toujours disponible dans le même lanceur ; canvas, groupes, connexions et projets fil rouge conservés. |
| Conducteur | Document continu intégré sous le support, sans barre permanente : commandes slash, clic droit avec sous-menus, poignées de déplacement dans la marge, duplication/suppression et annulation. Brouillon et navigation par parties conservés. Anciennes pages reprises dans leur ordre de lecture. |
| Publication | Formulaire continu, miniature liée/carrousel, copie des textes, modèles et chapitres conservés. Accès direct aux créations de la vidéo. |
| Diaporamas | Outils et rendu conservés ; navigation commune, sauvegarde avant sortie, blocage pendant la capture/export. |
| Incrustations | Même accès commun ; paramètres et export animé conservés, sortie bloquée pendant un export. |
| Miniatures | Créations indépendantes ou liées à la vidéo ; navigation directe vers Publication et les autres supports. |

## Fiabilité

Les formats JSON, identifiants, thèmes, bibliothèque de composants et stockages ne sont pas modifiés par la refonte. Le moteur de rendu et les propriétés des objets restent communs. Une navigation déclenchée par l’interface attend les sauvegardes des espaces ouverts avant de modifier l’adresse. Une erreur conserve l’éditeur ouvert. Les enregistrements, décomptes, exports et opérations de fichier bloquent la sortie du studio. Le lanceur ne s’ouvre pas par-dessus un dialogue de travail.

## Limites à garder visibles

Le prototype réorganise le parcours et les commandes transversales ; il ne réécrit pas chaque contrôle de dessin ou chaque dialogue spécialisé. La validation visuelle et fonctionnelle doit inclure les parcours entre applications, les sauvegardes et les petits écrans. Les essais de présentation ne doivent laisser aucune fenêtre de test ouverte. Pas d’IA, de backend ni d’automatisation OBS/Audacity/YouTube ajoutés.

L’apparence claire/sombre est une préférence globale de l’interface, distincte du thème de chaque création. Le bouton soleil/lune est commun aux ateliers ; les documents et exports restent inchangés. Le Conducteur propose des insertions entre blocs, une sortie du code par flèches aux limites et Ctrl/Cmd Entrée avant/après.

Le sommaire du Conducteur est commun au brouillon et aux parties, avec actions et hauteur complète. L’annulation temporaire après suppression expire au bout de15secondes. Les contrôles de langage/copie du code appartiennent uniquement à l’édition, avec un cadre de lecture sans ces commandes.
