# Atelier Animation — V1 de test

Branche : `codex/test-animation-studio`. PR #127, issue #126. Aucun changement de cette branche n’est fusionné automatiquement.

## Ouvrir et composer

L’atelier **Animation** se trouve dans l’accueil et dans les supports de chaque vidéo. Route autonome : `#/animations`. Ses fichiers JSON sont typés `animation`, ses données navigateur ont leur propre préfixe et ses fichiers liés ont leurs propres emplacements. Les créations associées à une vidéo suivent les mêmes sauvegardes de dossier et exports de vidéo que les autres supports.

Le menu de gauche contient les scènes. Le cadre central représente la vidéo finale ; la marge autour reste visible en composition et n’est jamais exportée. Les coordonnées négatives et les positions au-delà du cadre sont autorisées. Ctrl + molette zoome ; le bouton central ou Espace + glisser déplace la vue. Le bouton de retour à 100 % recentre également la vue.

Le **même composant de propriétés** que Diaporama reste utilisé : texte et styles par mots, alignements, typographie, écriture progressive, SVG, images et effets, formes, tableaux, bits, opacité, placement, groupes, calques/z-index, verrouillage et composants réutilisables. Les options propres aux étapes de diaporama sont remplacées par celles de la timeline. Les tiroirs restent exclusifs.

## Créer un mouvement

1. En mode **Composer**, sélectionner un objet ou un groupe.
2. Cliquer **Animer la sélection**. La séquence contient ces objets et possède un début et une durée indépendants.
3. Choisir une propriété et un instant, puis **Ajouter une clé**. La valeur initiale vient du premier objet de la sélection. Cliquer un losange pour modifier sa valeur et son temps local ; le glisser déplace la clé. Supprimer la clé avec sa corbeille ou Suppr lorsque le focus est dans la timeline.
4. Ajouter une autre clé, puis passer en **Aperçu** ou **Lire**. Les clés restent indépendantes de la géométrie de base ; Composer montre cette base. La lecture utilise les paramètres d’écriture progressive du panneau partagé.

La timeline montre les séquences et, pour la séquence sélectionnée, une ligne par propriété animée. Glisser sa barre décale le début de la séquence. Les boutons image précédente/suivante et le temps numérique permettent une navigation précise. La hauteur de la timeline est réglable par son bord supérieur.

Propriétés animables : X/Y, largeur/hauteur, rotation, inclinaison X/Y, opacité, taille de texte, échelle du contenu, couleur et progression sur un chemin. Interpolations linéaire, progressive, accélération, décélération, instantanée ou Bézier avec quatre paramètres. L’interpolation appartient au segment qui part de la clé sélectionnée.

Les groupes conservent leurs écarts relatifs lors d’une translation, d’une rotation ou d’un changement de dimensions. Les séquences sont évaluées de haut en bas ; une propriété absolue définie plus bas prend le dessus pour les objets communs. La dernière valeur persiste après la fin d’une séquence. Les effets procéduraux utilisent le temps local de la séquence.

## Trajectoires, références et effets

Dans les propriétés **Animation**, ouvrir les tiroirs spécifiques, ou utiliser **Scène** pour retrouver les réglages sans sélection :

- **Spline** : courbe de Bézier cubique, quatre points déplaçables à la souris, au clavier (flèches) ou par coordonnées. Attacher la séquence, choisir vitesse constante approximée par longueur d’arc ou paramétrique, orienter selon la tangente. Le pivot du groupe suit le chemin. Le tracé peut être visible dans la vidéo ou rester un guide d’édition.
- **Références** : sélectionner deux objets, puis Référence. La flèche suit leurs bords dans l’aperçu/export ; couleur et épaisseur réglables.
- **Modifieur** : oscillation, gravité analytique ou écrasement/étirement autour d’un pivot. Pour combiner des mouvements, superposer plusieurs séquences ciblant les objets concernés.
- **Particules** : émetteur sur le premier objet, avec graine, quantité, vitesse, durée de vie, taille, couleur et gravité. Dispersion circulaire, taille et opacité décroissantes. Maximum 200 particules par séquence.

Le menu **Export et exemples** ajoute une nouvelle scène d’exemple sans remplacer la scène courante : GC (parcours simplifié Eden → Survivor → Old) ou String Pool (cas d’un littéral absent, puis référence). Ce sont des illustrations éditables, pas des simulateurs de JVM. Les étapes réelles du GC dépendent du collecteur et les règles du pool dépendent de l’opération Java illustrée.

## Exporter

- MOV : QTRLE/ARGB ; MKV : FFV1/BGRA. Fond transparent ou couleur unie/vert. Service FFmpeg local existant requis.
- WebM : fond uni/vert requis pour éviter de promettre un alpha non conservé selon le navigateur ; l’onglet doit rester visible.
- PNG : image à l’instant courant via Fichier. JSON : document complet et indépendant des autres ateliers.

Durée 0,1 à 120 s ; 24/30/60 images/s ; export HD, Full HD ou QHD. Capture limitée à 256 Mo, sortie encodée à 512 Mo. L’export fige une copie de la scène et utilise le même évaluateur/rendu que l’aperçu. MOV/MKV calculent chaque image à `numéro / fps`, sans dépendre de la vitesse de lecture de l’écran. Annulation et récupération après échec d’encodage réutilisent le système existant.

## Périmètre et vérifications

Cette V1 propose des séquences de transformations et quelques modifieurs. Elle ne contient pas de moteur de conditions/variables Java, de collisions entre objets, de maillage déformable ou de morphing arbitraire de SVG. Une spline est actuellement un segment cubique ; plusieurs séquences peuvent enchaîner plusieurs chemins. La rotation des groupes ne crée pas un parentage persistant.

Tests automatisés : interpolation, groupes, splines, immutabilité, déterminisme, particules, timing de l’écriture progressive, normalisation, isolation des sauvegardes, routes et fichiers/bundles de vidéo. Vérification navigateur isolée : timeline visible, lecture, poignées de spline, panneau partagé et écriture progressive, coordonnées négatives, sauvegarde/rechargement, thème clair, téléchargements MOV/MKV/JSON, accueil et ouverture des autres ateliers. Export réel de six images en 1280 × 720 à 24 fps : QTRLE/ARGB et FFV1/BGRA, durée 0,25 s ; alpha transparent et opaque vérifié au décodage. Import dans Kdenlive à confirmer avec l’utilisateur ; pas de benchmark de projets lourds.
