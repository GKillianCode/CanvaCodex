# Atelier Animation — prototype

Branche `codex/test-animation-studio`, PR #127, issue #126. Le prototype reste séparé de `main` en attendant la validation de Killian.

## Espace de travail

Animation se trouve dans l’accueil et les supports d’une vidéo (`#/animations` en accès autonome). JSON, stockage navigateur et fichiers liés sont indépendants des autres ateliers. Les créations intégrées à une vidéo suivent ses sauvegardes et ses bundles.

L’extérieur reprend le canevas à points, adapté au thème clair/sombre. Le cadre central délimite la vidéo, avec une bordure complète pour les fonds transparents et unis. Le damier, les repères et la grille sont réservés au travail. Les objets peuvent sortir du cadre ; seule la vidéo intérieure est exportée.

Ctrl + molette zoome la scène ; bouton central ou Espace + glisser déplace la vue. Le retour à 100 % recentre aussi la vue. La liste des scènes reste à gauche. Les propriétés communes à Diaporama restent disponibles, dont styles par mots, écriture progressive, formes, SVG, images, tableaux, bits, groupes, verrouillage, composants et calques.

## Organisation des propriétés

- **Scène** : nom, durée, fréquence d’images et fond. Le fond uni accepte la palette du thème, une couleur personnalisée et un code hexadécimal.
- **Objet → Animation** : séquence, images clés, trajectoire, pivot, modifieur et références du ou des objets sélectionnés. Une séquence sans rapport avec la sélection n’y est plus présentée comme celle de l’objet.
- **Moteurs** : création, sélection et réglages des émetteurs et de la gravité. Sélectionner leur repère ouvre cette rubrique. Les tiroirs restent exclusifs.

Durée et FPS se règlent uniquement dans Scène ; ils ne sont plus dupliqués dans la barre de lecture.

## Base et état animé

**Base des objets** montre la disposition hors animation et permet de modifier les objets avec les outils habituels. L’écriture progressive y laisse le texte entier lisible.

**État animé** montre le résultat calculé à l’instant du curseur : transformations, trajectoires, moteurs et écriture progressive. Ce résultat ne remplace pas la base enregistrée des objets.

**Aperçu plein écran** ouvre un lecteur dans l’application, avec lecture/pause, position temporelle, boucle et export. Aucun lecteur externe n’est ouvert. Échap ferme cet aperçu. Le lecteur utilise le même rendu que l’export, sans grille ni repères de moteur.

## Séquences et images clés

Sélectionner un objet ou un groupe puis **Animer la sélection**. Choisir propriété et instant, puis **Ajouter une clé**. En état animé, la valeur initiale de la nouvelle clé est prise dans l’état calculé ; en base, elle vient de la géométrie de base.

- Glisser un losange déplace sa clé ; glisser une barre décale la séquence.
- Double-cliquer une clé place la lecture à son instant, affiche l’état animé et ouvre ses paramètres à gauche.
- Le panneau gauche montre les propriétés ayant une clé à cet instant : valeur, temps local, interpolation et courbe Bézier si choisie.
- Le clic droit permet d’afficher l’état, dupliquer ou supprimer la clé. La duplication décale la copie pour éviter de la recouvrir immédiatement. Suppr agit sur la clé lorsque le focus est dans la timeline, tout en gardant la suppression de caractères dans les champs.
- Ctrl + molette zoome la **timeline**, de 25 à 1 600 %, indépendamment de la scène. Les boutons et la valeur numérique font la même chose. Une barre horizontale permet de parcourir la timeline zoomée.

Propriétés animables : X/Y, dimensions, rotation, inclinaison X/Y, opacité, taille du texte, échelle du contenu, couleur et progression sur un chemin. Interpolations linéaire, progressive, accélération, décélération, instantanée et Bézier. Les groupes conservent leurs écarts. Les séquences sont évaluées dans l’ordre ; la fin d’une séquence conserve son dernier état.

## Splines

Créer une spline sur une séquence puis déplacer ses quatre points ou régler leurs coordonnées. Le pivot de la sélection suit la courbe, avec orientation optionnelle et vitesse constante approximée par longueur d’arc.

Une spline attachée **pilote X et Y** : les anciennes pistes X/Y restent enregistrées mais ne décalent plus la trajectoire. Détacher le chemin réactive ces pistes. Le guide SVG et le rendu partagent le même cadrage, y compris après zoom ou redimensionnement.

## Moteurs indépendants

Clic droit sur le canevas → **Ajouter un moteur** → **Moteur à particules** ou **Moteur de gravité**. Les boutons équivalents sont disponibles dans Moteurs.

Chaque moteur possède son propre petit repère déplaçable, sélectionnable et verrouillable. Il ne dessine pas de bloc visible dans l’export. Sa duplication et sa suppression utilisent l’historique commun. Un moteur peut aussi recevoir sa propre séquence et sa propre spline.

**Particules** : début, durée, quantité maximale, durée de vie, vitesse, taille, graine et gravité. Couleur du thème ou personnalisée. Choisir une dispersion circulaire, un préréglage directionnel ou les plages X/Y dans [-1, 1]. X positif va à droite et Y positif vers le bas. Exemples : X [0, 1], Y [0, 0] part à droite ; X [-1, 0], Y [0, 0] part à gauche ; X/Y [-1, 1] disperse sur les deux axes. La graine garantit un résultat reproductible. Maximum 200 particules par moteur.

**Gravité** : accélération uniforme appliquée aux objets cochés, indépendamment de leur géométrie ; le repère sert à manipuler et identifier le moteur, pas à définir une zone d’attraction.

Les anciens émetteurs attachés aux séquences continuent de fonctionner. Le bouton **Détacher cet émetteur** les transforme explicitement en moteurs indépendants, sans cumuler l’ancien et le nouveau rendu.

## Export et exemples

Le menu Export et exemples propose deux scènes éditables : GC simplifié et String Pool (cas d’un littéral absent). Ce ne sont pas des simulateurs de JVM ; le déroulé réel dépend du collecteur et de l’opération Java illustrée.

MOV QTRLE/ARGB et MKV FFV1/BGRA gardent l’alpha via le service FFmpeg local. WebM exige un fond uni/vert et un onglet visible. PNG exporte l’instant courant ; JSON conserve le projet complet. Durée de 0,1 à 120 s, 24/30/60 fps, export HD/Full HD/QHD, capture limitée à 256 Mo et sortie à 512 Mo. L’export fige une copie des données et calcule chaque image à son temps exact. Annulation et récupération après échec restent disponibles.

## Vérifications et limites

322 tests automatisés passent. Essais Chrome isolés : double-clic sur une clé, paramètres à gauche, duplication/suppression au clic droit, Ctrl Z/rétablir, zoom de timeline indépendant, suivi exact de la spline, cadrage SVG/canvas, aperçu plein écran identique au rendu, moteurs indépendants et directions, palettes et réouverture. Un changement numérique est annulé sans changer le fond. Les exports d’un émetteur indépendant en MOV/MKV ont les mêmes pixels RGBA sur neuf images en 1280 × 720, 30 fps, 0,3 s, avec alpha 0 à 255. Build réussi avec l’avertissement de taille de chunk préexistant.

Pas de moteur de conditions Java, collisions complexes, maillage déformable ou morphing arbitraire. Une spline reste un segment cubique ; le parentage persistant et les projets lourds restent à étudier. Import direct Kdenlive à confirmer avec l’utilisateur.
