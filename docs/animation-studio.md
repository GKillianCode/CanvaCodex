# Atelier Animation — prototype

Branche `codex/test-animation-studio`, [PR #127](https://github.com/GKillianCode/CanvaCodex/pull/127), issue #126. Aucune fusion dans `main` avant validation de Killian.

## Espace de travail et propriétés

L’atelier est accessible depuis l’accueil, une vidéo ou `#/animations`. Chaque animation possède ses fichiers, sa sauvegarde et ses scènes successives. Plusieurs animations indépendantes sont plusieurs supports de la vidéo.

Le cadre central délimite la vidéo, avec bordure complète sur fond uni ou transparent. L’extérieur de la scène est un plateau fini à points en clair/sombre. Les points s’arrêtent à sa bordure extérieure ; la zone de travail autour reste unie. Les objets peuvent dépasser du cadre. Ctrl + molette zoome la scène ; bouton central ou Espace + glisser déplace la vue. Les points, repères et commandes ne sont pas exportés.

- **Objet** : les propriétés communes aux autres ateliers, ou uniquement les paramètres du moteur sélectionné. Sélectionner un objet ou moteur revient à sa fiche de propriétés.
- **Scène** : nom, durée de 0,1 à 120 s, 24/30/60 images par seconde, fond et palette.
- **Animation** : effets ajoutés à la sélection, regroupés en Mouvement, Déformation, Génération et Physique 2D ; séquences, clés, splines et références.
- **Calques / Composants** : outils partagés avec Diaporama, sans duplication du panneau.

Styles par mots, textes progressifs, SVG, images, tableaux, bits, groupes, verrouillage et superposition restent disponibles. Les bibliothèques de thèmes des anciens ateliers sont reprises avec les thèmes du document. Les nouveaux thèmes enregistrés explicitement deviennent disponibles dans les autres ateliers. Les variantes de palette du document restent propres au document. Supprimer un thème personnel de la bibliothèque ne supprime pas sa copie intégrée aux autres documents.

## Disposition initiale et état animé

**Disposition initiale** permet de travailler la géométrie de base et laisse le texte entier visible. **État animé** calcule le rendu au temps du curseur, sans remplacer cette base. Déplacer la disposition initiale d’un moteur translate également ses clés X/Y propres ; les clés ne le ramènent plus à son ancienne position au lancement. Un moteur attaché à une spline suit toujours sa trajectoire.

## Clés par propriété

Dans Objet → Placement, les losanges se trouvent à côté de X, Y, largeur, hauteur et rotation. Ils existent aussi pour la taille du texte, l’opacité et la couleur. Animation → Propriétés animées rassemble les canaux de transformation, inclinaison, échelle et progression du chemin.

1. Choisir un instant dans la timeline, puis **Ajouter une image clé**. Le marqueur peut être vide, sans propriété imposée. Un double-clic dans la piste pose également une image clé.
2. Associer les propriétés avec leurs losanges. Modifier un style sur l’image clé sélectionnée crée son canal avec une référence initiale, sans remplacer la valeur de base.
3. Répéter à un autre instant. Plusieurs propriétés peuvent être enregistrées au même instant.

Les formes proposent des canaux distincts pour la couleur du remplissage, la couleur du contour, leur activation, les pointillés, l’épaisseur, l’arrondi, les branches et leur profondeur. Activation et pointillés changent instantanément, sans fausse interpolation.

Un losange plein indique une clé à cet instant ; un contour coloré indique un canal animé. Recliquer le losange plein propose de retirer la clé. Lors de la première saisie à un temps non nul, une référence est créée à zéro pour éviter un saut immédiat. L’interpolation des nouvelles clés reprend celle du canal.

Les moteurs à particules disposent également de clés pour la force, la vitesse, la taille, la quantité, la durée de vie et la gravité. La couleur animée est prise dans le rendu réel de la palette.

- Glisser un losange déplace son instant. Glisser la barre décale la séquence.
- Double-clic ou clic droit → **Afficher cet état** place le curseur au temps exact, active le rendu animé et ouvre les valeurs de la clé à gauche.
- Clic droit : dupliquer/supprimer une clé. La duplication la décale pour ne pas la recouvrir immédiatement.
- Chaque ligne de propriété a sa propre interpolation : linéaire, progressive, accélération, décélération, instantanée ou Bézier. Les paramètres Bézier et valeurs individuelles restent à gauche.
- Le nom de séquence est directement éditable. La suppression demande confirmation ; le double-clic affiche l’état et ne supprime jamais la séquence. Chaque séquence possède suppression, activation et masquage de piste. Désactiver suspend son animation ; masquer ne modifie que la timeline. **Pistes masquées** permet de la retrouver.
- La flèche de ligne replie ses propriétés. La tête de lecture a une poignée large et un curseur horizontal. Ctrl + molette zoome le temps indépendamment de la scène ; la barre horizontale parcourt la zone zoomée.

Les séquences sont évaluées de haut en bas et conservent leur état final. Les groupes gardent leurs écarts. Une spline attachée pilote X/Y ; les anciennes clés restent enregistrées mais ne décalent pas la trajectoire.

## Effets ajoutables

Sélectionner l’objet, ouvrir **Animation**, puis **Ajouter un effet**. Chaque effet possède sa fiche, un interrupteur et une suppression ; les effets ne sont plus tous présentés dans les propriétés d’un émetteur.

- Mouvement : oscillation et tourbillon procédural 2D.
- Déformation : étirement/écrasement et inclinaison périodiques.
- Génération : répétition avec nombre/décalages X/Y, découpe et intersection avec une autre forme. La forme de découpe est masquée dans le rendu animé. La découpe ne gomme pas les autres calques derrière l’objet.
- Physique 2D : gravité, vent, résistance de l’air, rebond et frottement. Ajouter **Obstacle** à un rectangle pour en faire un sol. Les collisions utilisent les cadres rectangulaires, sans rotation des surfaces de contact.
- Trajectoire : spline cubique à quatre points éditables, visible ou invisible dans la vidéo ; suivi du pivot, orientation optionnelle et vitesse approximativement constante.

Le tourbillon est un mouvement calculé, pas un solveur de fluide. Les collisions ne sont pas un moteur de corps rigides arbitraires. Les répétitions génèrent du contenu de rendu, pas de nouveaux objets sources indépendants ; 1 000 éléments de rendu au maximum.

## Moteurs indépendants

Clic droit sur la scène → Ajouter un moteur → Particules ou Gravité. Le repère est une icône, avec son nom au survol. Il se déplace, se verrouille et se duplique via les outils communs, et reste absent des vidéos.

**Particules** : début/durée, nombre (maximum 200), vie, vitesse, force, graine et gravité ; direction circulaire ou plages X/Y [-1, 1]. X positif va à droite, Y positif vers le bas. X [0, 1], Y [0, 0] part à droite. La galerie commune propose les vingt formes, avec contours, coins arrondis, branches d’étoile, proportions et rotation. Couleur personnalisée ou palette du thème.

Clic droit sur un moteur libre : **Associer à un objet**. Clic droit sur un moteur attaché : **Détacher l’émetteur**. Le décalage est préservé au moment du changement. Le panneau ne propose plus un détachement permanent sans objet associé. Les anciens effets de séquence restent lisibles.

La gravité indépendante affecte uniquement les objets cochés, avec force, résistance de l’air, vent, rebond et frottement. Le repère identifie le moteur ; il ne définit pas une zone d’attraction.

## Aperçu, scènes et exports

**Animer / Exporter**, en haut, ouvre un lecteur interne plein écran. L’icône de la timeline ouvre le même lecteur. Échap ferme ; aucune fenêtre externe n’est créée. **Exemples**, en haut également, ajoute une scène GC simplifié ou String Pool (cas absent) sans remplacer les créations.

Dans le lecteur :

- **Toutes les scènes** décoché : lecture/export de la scène courante.
- Coché : scènes successives dans l’ordre de la liste, en une seule vidéo.
- **Boucle** : recommencer la scène ou l’ensemble choisi ; décoché : arrêt au dernier instant.
- Format MOV QTRLE/ARGB, MKV FFV1/BGRA ou WebM sur fond uni/vert ; résolution HD, Full HD ou QHD.

MOV et MKV conservent la transparence via FFmpeg local. Le rendu et les données sont figés pour tout l’export. Pour plusieurs scènes, le FPS de la première scène sert à toute la vidéo. Limites : dix minutes cumulées, capture 256 Mo et sortie 512 Mo. Annulation et récupération après erreur restent communes aux autres ateliers. PNG exporte l’instant de la scène ; JSON conserve toutes les scènes.

## Validation et limites

336 tests automatisés ; build réussi avec l’avertissement de chunk préexistant. Contrôles Chrome headless isolés : clés multiples, valeurs et couleurs animées, rappel d’état, masquage/activation/interpolation des pistes, zoom temporel, moteur déplacé avec annulation, attachement/détachement, formes de particules, découpe préservant l’arrière-plan, thèmes entre ateliers et lecture de scènes successives.

Export réel de deux scènes : MOV qtrle/argb et MKV ffv1/bgra, 1280 × 720, 30 fps, quinze images/0,5 s. Alpha préservé, coupure vérifiée à l’image 6 et pixels RGBA identiques entre formats. Pas de vérification directe dans Kdenlive, ni de gros projets, ni de données personnelles modifiées.

## Retours du même jour — sécurité et découverte

Les deux barres de commandes sont centrées. Le bouton Ajouter une image clé et les marqueurs globaux de piste permettent de choisir l’instant avant les propriétés. Les splines sont disponibles dans la barre et dans Animation → Trajectoire spline, même sans séquence préexistante. Séquences, clés, objets, scènes, effets et trajectoires demandent confirmation avant suppression dans Animation ; Annuler ou Échap conserve les données.

Chrome isolé : plateau fini vérifié en clair/sombre, marqueur vide créé puis alimenté par cinq canaux de style, couleurs remplissage/contour séparées, double-clic sans suppression, confirmation/annulation/Échap/annuler l’action, quatre poignées de spline et conservation des marqueurs après rechargement. Les thèmes et Diaporama ont été revérifiés. Publication confirmée sur la branche de test et la PR #127 ; aucune fusion. Un premier envoi avait été interrompu par une limite de la revue automatique, puis a pu être repris.
