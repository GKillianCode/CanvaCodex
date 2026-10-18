# Outils de sélection et plume — V1 en test

Palette commune au-dessus du canevas dans Diaporamas, Incrustations, Miniatures et Animation. Le Canvas des parcours et les pages de texte ne sont pas concernés par ce lot. Tout est calculé localement, sans IA.

## Sélection d’objets

- **V** : déplacer, sélection simple et rectangle habituel dans le vide.
- **M** : sélection rectangulaire, y compris en démarrant sur un objet.
- **E** : sélection elliptique.
- **L** : lasso libre ; maintenir le clic gauche et dessiner la zone.
- **G** : lasso polygonal ; cliquer les sommets puis Entrée, double-clic ou bouton Valider. Retour arrière retire le dernier sommet.

Les boutons secondaires proposent Remplacer, Ajouter, Retirer et Intersection. Maj/Ctrl au début du geste ajoute ; Alt retire. Échap annule une sélection en cours et retrouve la sélection précédente. Les coordonnées sont limitées à l’écran pour la sélection, même si le geste commence à l’extérieur. Les objets dont la boîte englobante entière est dans la zone sont retenus ; les groupes restent indivisibles et les objets/groupes verrouillés sont exclus. Il s’agit de sélection d’objets, pas de sélection ou retouche de pixels.

## Plume et formes libres

**P** active la plume. Cliquer ajoute une ancre ; maintenir et glisser crée deux tangentes symétriques. Recliquer la première ancre ferme la forme. Entrée ou Terminer crée une courbe ouverte ; Maj+Entrée ou Fermer la forme crée une forme fermée. Retour arrière retire le dernier point et Échap annule le tracé. Maximum128ancres.

Après création, **A** affiche les points de la forme sélectionnée. Déplacer une ancre entraîne ses tangentes ; déplacer une poignée conserve la symétrie, ou Alt permet de dissocier les tangentes. Le sélecteur Point et les boutons permettent d’ajouter un point après l’ancre choisie (subdivision exacte de Bézier), de le supprimer, de rendre le point anguleux ou de le lisser. Une forme ouverte conserve au moins deux ancres et une forme fermée trois. La case Fermée permet d’ouvrir/fermer le contour.

Le cadre est réajusté après édition des points en conservant leur position réelle, y compris avec rotation et inclinaison. Une transformation exactement aplatie doit être réduite avant édition, car son inversion n’est pas définie. Revenir à **V** pour déplacer/redimensionner/tourner l’objet avec les poignées habituelles. Les changements de document restent annulables avec Ctrl+Z.

Les formes fermées proposent les mêmes couleurs de thème, remplissage par image, cadrage, opacité/effets d’image et contour indépendant que les autres formes. Les courbes ouvertes n’ont pas de surface à remplir ; leur épaisseur, pointillés et extrémités restent personnalisables. Les données natives sont conservées dans les fichiers JSON et composants réutilisables, puis dessinées par le rendu commun aux PNG, présentations et vidéos. Dans Animation, les canaux de transformation existants restent utilisables ; la géométrie des points n’a pas de canal d’animation propre dans cette V1.
