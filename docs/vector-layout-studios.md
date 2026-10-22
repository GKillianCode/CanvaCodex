# Ateliers Vectoriel et Mise en page — V1 de test

Les deux ateliers sont autonomes et accessibles depuis **Applications** sur toutes les pages. **Notes** reste le premier accès. Ils partagent les outils, le panneau de propriétés et le format de dessin, avec deux bibliothèques et deux types de fichiers séparés.

## Commencer

- **Vectoriel** : `#/vectoriel`. Nouveau dessin vide ou « Ouvrir un exemple » pour le schéma Mémoire et références.
- **Mise en page** : `#/mise-en-page`. Nouveau document ou exemple de fiche Java avec exercice sur une deuxième page.
- Chaque document a son adresse ; une actualisation rouvre le document concerné. « Documents » revient à sa bibliothèque ; l’icône Accueil revient à Frame.
- Les boutons de création et d’exemple ouvrent immédiatement le document, sans actualisation manuelle.

## Outils communs

Sélection simple, Maj pour ajouter à la sélection, rectangle de sélection dans le vide, déplacement, poignées de redimensionnement, rotation et saisie numérique. Maj conserve les proportions pendant le redimensionnement et impose des pas de 90° en rotation. Les objets peuvent dépasser la page. La molette fait défiler, Ctrl molette règle le zoom ; molette enfoncée ou Espace permet de déplacer la vue. Les repères et l’aimantation sont désactivables.

Formes géométriques issues de la bibliothèque Frame, textes, images PNG/JPEG/WebP et SVG autonomes. Remplissages, dégradés, contours, pointillés, opacité et images découpées dans une forme. Le contour reste indépendant de l’image. La plume accepte des points au clic et des poignées de courbe au clic-glisser. Entrée termine un tracé ouvert ; cliquer le premier point ferme le tracé ; Échap annule. Dans Points du tracé, les points et leurs poignées sont déplaçables, ajoutables et supprimables.

Calques avec visibilité, verrouillage et réorganisation par glisser-déposer. Groupes, alignements, répartition et centrage sur la page. Soustraction et intersection non destructives de deux formes : les sources restent dans les calques. Les découpes utilisent des masques SVG, pas une fusion définitive des points. Une union géométrique/fusion complète n’est pas incluse dans cette V1.

Clic droit : ajouter, copier, coller, dupliquer, grouper, dégrouper, supprimer. Ctrl C/V fonctionne entre les deux nouveaux ateliers ; Ctrl D duplique, Ctrl A sélectionne, Ctrl Z / Ctrl Maj Z annule/rétablit. La suppression d’un objet, d’une page ou d’un document demande confirmation. Historique borné et chaînes d’images mutualisées, via le moteur d’historique existant.

## Documents et texte

Dans Mise en page, les formats A4/A5 utilisent les dimensions physiques exactes et les coordonnées sont affichées en millimètres ; le dessin vectoriel travaille en pixels. Marges, colonnes, gouttière, couleur du papier, en-tête, pied de page et numéros sont réglables. Les pages/plans de travail peuvent être créés, renommés, dupliqués, déplacés et supprimés.

Styles de document : titre, sous-titre, paragraphe, légende, code. Taille, interligne et police (Inter, Montserrat, Lora, monospace) sont partagés par les textes qui utilisent le style. La couleur et l’alignement d’un objet restent personnalisables. Double-clic sur un texte ouvre son éditeur ; un dépassement du bloc est signalé et « Ajuster la hauteur au texte » le corrige.

**Ajouter un texte continu** crée de nouvelles pages selon les marges, colonnes et style choisis. Les pages existantes sont conservées. Il s’agit d’une répartition à l’ajout, pas encore d’un flux lié qui se redistribue après chaque modification de texte, format ou typographie. Pas de tableaux éditables, sommaire automatique, fonds perdus, CMJN ou PDF accessible balisé dans cette V1.

## Sauvegarde et exports

- Copie automatique des documents dans IndexedDB, via le dépôt Frame ; documents séparés et chargement du seul document actif. Ils sont inclus dans la sauvegarde globale existante des réglages.
- Index léger avec aperçus sans images embarquées ; affichage de 24 documents par page. Seul le plan de travail actif est rendu en grand.
- Détection des écritures concurrentes dans une transaction : une version obsolète ne remplace pas une modification d’un autre onglet. Le bouton de récupération JSON reste disponible si une sauvegarde échoue.
- **Fichier → Enregistrer le fichier / Enregistrer sous** : fichier local JSON lié lorsque le navigateur supporte File System Access, avec protection contre une modification externe. Sinon téléchargement JSON. Lier un fichier n’active pas une écriture permanente sur disque ; la copie automatique dans le navigateur reste séparée.
- Export/import de projet JSON `frame-design`, avec `kind: vector` ou `kind: layout`. Importer crée une nouvelle copie ; le fichier d’un autre atelier est refusé. Les fichiers des ateliers vidéo ne changent pas de format.
- **SVG** et **PNG** exportent la page active. Le SVG conserve les formes, courbes, textes et masques. Les textes SVG utilisent les polices disponibles dans le lecteur ; cette V1 ne convertit pas les lettres en tracés. Un SVG importé comme image reste un objet vectoriel unique, sans décomposer ses tracés. Les SVG contenant des images embarquées peuvent être refusés par l’import sécurisé des ateliers historiques ; utiliser le PNG dans ce cas, ou le JSON pour conserver l’édition dans ces nouveaux ateliers.
- **PDF** : ouvre un document d’impression isolé, sans barre d’outils ni repères. Choisir « Enregistrer en PDF » dans la fenêtre du navigateur. Toutes les pages sont imprimées avec texte sélectionnable, marges physiques et pagination ; les polices locales utilisées sont proposées au moteur d’impression. Aucun service distant. Le document temporaire se ferme après l’impression, sans fenêtre externe persistante.

Limites actuelles : 100 pages/plans de travail, 300 objets par page, 128 points par tracé, import JSON de 30 Mo et images préparées par le moteur d’import existant. Les nouveaux documents ne sont pas encore attachables comme supports dans une fiche vidéo et ne sont pas directement liés à la bibliothèque de composants partagés ; réutilisation via SVG/PNG pour cette V1.

## Vérification

Les tests couvrent normalisation, séparation des formats, sécurité du SVG, pagination sans perte de mots, copie des groupes et découpes, accès aux documents à la demande et conflits de révision. Le scénario navigateur couvre aussi l’ouverture des exemples sans actualiser, sauvegarde/reprise à l’adresse du document, annulation/rétablissement, confirmations, plume et points, SVG téléchargé, PDF multipage réel, thèmes clair/sombre et écritures concurrentes atomiques. Serveur et données de test isolés du serveur utilisateur.
