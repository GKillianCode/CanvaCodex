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

## Parcours Slime et édition d’un état animé

`animation-slime-cinq-scenes.json`, à la racine du dépôt, s’importe dans **Animation → Fichier → Importer un document JSON**. Il remplace le document ouvert dans cet atelier comme les autres imports. Le menu **Exemples → Slime · quatre mondes** ajoute plutôt quatre scènes au document actuel. Prairie, canyon et atelier nocturne durent 10 secondes chacun ; le monde inversé dure 14 secondes. Cocher **Toutes les scènes** dans l’aperçu pour lire/exporter les 44 secondes à la suite. Le même personnage entre par la gauche dans les scènes suivantes, puis tombe du trou nocturne vers la quatrième scène placée en dessous.

Les sols sont deux vrais blocs obstacles séparés par un trou. La trajectoire est une spline à trois segments. Un moteur de gravité utilise le nouveau mode **Spline horizontale + saut physique** : X suit la spline, Y vient de l’impulsion verticale initiale et de la gravité, avec arrêt sur les obstacles. Une impulsion négative fait sauter ; son instant est le début du moteur. Le vent et le frottement horizontal ne s’appliquent pas dans ce mode puisque X est imposé par la spline. La physique utilise des pas déterministes de 1/120 seconde, sans IA. Il s’agit d’une simulation 2D simple, pas d’un moteur de corps rigides rotatifs.

Le pivot inférieur conserve les pieds pendant les clés largeur/hauteur : préparation du saut, étirement en l’air, écrasement à l’atterrissage. Les émetteurs liés au personnage produisent de la poussière avant/après le saut ; chaque scène a aussi des particules d’ambiance. Ciel, parallaxe, formes et portique évoluent avec des clés éditables. Tout reste constitué d’objets natifs.

Dans **État animé**, cliquer un objet conserve l’instant affiché. Déplacer/redimensionner l’objet enregistre les coordonnées et dimensions dans ses clés, en conservant sa disposition initiale. Pour un objet seul, **Position X/Y** désignent le coin supérieur gauche indépendamment du redimensionnement. Une spline ancre au contraire le pivot choisi. Le panneau **Image clé** est dans les propriétés à droite et libère la liste des scènes à gauche.

Régénération de la démonstration : `node java-studio/scripts/build-slime-demo.mjs` depuis la racine.

## Canvas des scènes, dégradés et contacts

**Éditer / Canvas** dans Animation réutilise le Canvas du diaporama : déplacement des scènes sur la grille, liens, parcours automatique ou manuel, zoom et retour à l’éditeur. L’ordre choisi s’applique à la lecture et à l’export de toutes les scènes. Une durée de transition réglable dans **Scène** fait glisser la caméra vers la scène suivante selon sa position dans le Canvas.

Dans **Scène**, le fond peut être transparent, uni ou dégradé à deux couleurs. Couleurs, angle et losanges posent leurs clés dans une piste **Fond de scène**. La palette du thème reste accessible. Les mêmes couleurs interpolées sont rendues dans l’éditeur, l’aperçu et l’export ; aucun rectangle décoratif n’est nécessaire pour animer le fond.

L’option **Objet continu entre scènes** et son **Identifiant partagé** identifient un personnage entre deux scènes. Pendant une transition, les deux décors défilent et un seul personnage est dessiné entre ses poses de sortie et d’entrée. Chaque scène conserve son état local éditable. Dans la démo, les poses de frontière et la vitesse de chute sont raccordées par calcul.

Pour une forme équipée d’un moteur **Spline horizontale + saut physique**, **Animation → Au contact d’un bloc** permet de choisir un bloc, modifier la forme/couleur du personnage et du bloc, définir une nouvelle force de gravité et une impulsion. Chaque règle se déclenche une fois pendant l’évaluation ; rejouer ou déplacer la tête de lecture recalcule les contacts. Une gravité négative attire au plafond ; les blocs Obstacles arrêtent aussi la montée. Les changements de forme gardent la taille et les réglages physiques du personnage.

La détection utilise les cadres rectangulaires, avec des blocs contacts fixes pendant l’évaluation. Ce n’est pas une collision précise selon les contours d’une étoile, ni une simulation complète d’obstacles mobiles. Le fond dégradé est opaque ; choisir Transparent pour un export avec décor transparent.

## Branche de test : outils de construction d’animations

La branche `codex/test-animation-workflow` part des trois correctifs de gravité, séquence active et naissance des particules. Elle ne fusionne pas la branche de test précédente.

Dans **Propriétés → Animation**, les nouveaux tiroirs proposent :

- **Attaches et références** : parent, ancre parent/enfant, décalages, rotation héritée et flèches reliant deux objets. Les cycles sont ignorés avec un diagnostic. Les attaches imposent la position de l’enfant ; utiliser les décalages ou détacher pour le déplacer librement.
- **Événements** : à un instant, à la fin d’une séquence ou après un contact physique déjà défini. Actions : montrer un objet ou une flèche, changer une couleur/forme, démarrer une séquence. Les fins de séquences suivent les décalages des séquences déclenchées ; les boucles désactivent les séquences concernées et sont signalées. Les événements restent locaux à la scène. Les contacts sources sont évalués sur la simulation de base ; un réseau où le démarrage conditionnel d’une physique modifierait le contact qui le déclenche n’est pas un graphe physique général pris en charge par cette V1.
- **Caméra** : centre X/Y, zoom 10–800 %, rotation et clés propres à la piste Caméra. Le cadrage est visible dans l’aperçu et l’export. L’éditeur garde les coordonnées du monde pour préserver ses gestes ; le repère caméra montre le cadre de sortie.
- **Mouvements réutilisables** : apparition, pulsation et rebond intégrés ; sauvegarde d’une séquence d’un objet avec sa trajectoire éventuelle dans `.frame-data/motions.json`. Les mouvements personnels sont partagés entre animations de cette installation, avec sauvegarde précédente et contrôle de concurrence. Appliquer adapte positions, dimensions et durée à l’objet cible. Les copies appliquées restent indépendantes du mouvement source. Le choix du mouvement est conservé en changeant d’objet.
- **Diagnostic visuel** : cadres des objets, obstacles, contacts, attaches, forces, chemins et cadre caméra. Ces repères ne sont pas enregistrés dans les vidéos.

Dans **Image clé**, le graphique permet de déplacer les deux poignées Bézier ; les champs numériques restent disponibles. Dans la timeline, Ctrl ou Maj + clic sélectionne plusieurs clés. Les glisser les décale ensemble dans les limites de leurs séquences, sans écraser une clé non sélectionnée. Copier/coller via boutons ou Ctrl C / Ctrl V fonctionne lorsque la timeline a le focus ; le collage se fait dans la séquence sélectionnée à la tête de lecture et refuse un dépassement de durée.

Exemple importable : `animation-workflow-reference-java.json` à la racine, aussi disponible dans **Exemples → Référence Java · événements**. Le libellé suit son objet, une référence apparaît à l’arrivée, une explication commence ensuite et la caméra zoome. L’exemple dure 6 secondes, sans IA.

## Gestes et images partagés entre les éditeurs

Dans diaporamas, incrustations, miniatures et animations : poignée de rotation au-dessus de l’objet ; Maj impose 0/90/180/270°. Les sélections multiples peuvent aussi tourner autour de leur centre. Maj + une poignée de redimensionnement conserve les proportions, y compris les poignées latérales et les objets déjà tournés. Le pourcentage de mise à l’échelle existant reste disponible dans les propriétés.

**Objet → Couleurs → Image de fond de la forme** permet d’importer un PNG/JPEG/WebP/SVG dans une forme fermée : image découpée selon le chemin de la forme, remplissage/contour indépendants, cadrage remplir/contenir, opacité et effets. Le contour est dessiné après l’image. Les données survivent aux exports JSON et aux composants réutilisables ; le rendu commun sert aux PNG, présentations et vidéos. Traits et courbes ouverts restent des contours sans surface de remplissage. La plume et les outils de sélection supplémentaires sont un chantier ultérieur, pas inclus ici.

### Slime · cinq mondes : parcours d’essai du workflow

Importer `animation-slime-cinq-scenes.json` à la racine, ou choisir **Exemples → Slime · cinq mondes**. L’exemple ajoute désormais l’Observatoire après le monde inversé (54 secondes au total). Les quatre parcours physiques précédents restent conservés ; la sortie du quatrième monde correspond à l’entrée du cinquième.

Dans chaque scène : le satellite est attaché au Slime ; le signal est attaché au relais. Une flèche apparaît à 1 seconde, la fin de la pulsation déclenche la rotation du relais et affiche son signal, puis le relais change de couleur. La pulsation provient réellement du préréglage réutilisable et reste éditable sous forme de clés. Des courbes Bézier pilotent pulsation/rotation ; la caméra zoome légèrement puis retrouve son cadre initial à la fin. Dans le monde inversé, le premier contact transforme aussi le satellite. Dans l’Observatoire, une sonde suit une spline fermée, le satellite scintille et le relais devient une étoile.

Pour examiner le fonctionnement, ouvrir **Animation → Diagnostic visuel** : activer Attaches, Collisions, Forces, Caméra et Trajectoires selon le besoin. Ces repères sont disponibles dans toutes les scènes, désactivés par défaut et exclus des exports. Ils ne constituent pas des objets de décor. Les mouvements appliqués dans le fichier n’écrivent pas dans la bibliothèque personnelle de l’utilisateur.
