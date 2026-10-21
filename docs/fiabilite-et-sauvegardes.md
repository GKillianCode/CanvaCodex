# Fiabilité et sauvegardes de Frame

## Écritures dans plusieurs onglets

Les notes libres ont une révision vérifiée dans la transaction IndexedDB. Une copie périmée ne peut plus remplacer un enregistrement récent. La protection couvre aussi les renommages et déplacements de notes (signature de l’arbre, hors liens et dates dérivés du contenu).

Les bibliothèques Musiques et Modèles de description comparent la version chargée à la version présente avant d’écrire. Le Conducteur et Publication conservent leur protection existante.

En cas de conflit : le brouillon reste affiché, la sauvegarde est bloquée, et des actions permettent de **télécharger le brouillon** puis de **recharger la version enregistrée**, avec confirmation. Le brouillon de note est un JSON importable par l’import de notes, avec ses images. Les brouillons de bibliothèques sont des JSON lisibles pour récupération manuelle ; ils ne remplacent jamais automatiquement une bibliothèque récente. Fermer brutalement un onglet sans télécharger son brouillon ne constitue pas une sauvegarde ; l’avertissement de fermeture reste présent.

Une note supprimée dans un autre onglet ne peut pas être recréée accidentellement par l’autosauvegarde. Après récupération facultative du brouillon et confirmation, recharger permet de revenir aux notes disponibles.

## Fichier → Sauvegarde globale…

La commande est commune aux pages et ateliers. Elle enregistre d’abord le travail courant, puis produit un JSON `frame-backup`, version 1, contenant :

- vidéos et tous leurs supports : diaporamas, incrustations, miniatures et animations ;
- Conducteur, brouillons, Publication, playlists et ordre des vidéos ;
- notes libres, liens, sous-notes et parcours ;
- bibliothèques de musiques et de modèles/blocs de description, catalogues de statuts et types ;
- fichiers de bibliothèques locales : thèmes, composants et mouvements réutilisables ;
- documents autonomes et préférences Frame de ce navigateur.

Les images incorporées aux documents sont incluses. Les exports vidéo déjà téléchargés, les fichiers externes d’origine, les permissions et les liens vers les dossiers/fichiers du système ne sont pas transférés. Les bibliothèques physiques nécessitent le serveur local Frame, comme auparavant.

### Restaurer sans remplacer

Choisir un fichier affiche un inventaire avant l’action de restauration. L’import accepte les fichiers jusqu’à **256 Mo**. Il est destiné en priorité à un navigateur/espace vierge. Il conserve les identifiants, donc les liens entre documents.

Les documents identiques sont conservés ; un identifiant déjà présent avec un contenu différent bloque la restauration. Les playlists et les ordres peuvent être réunis sans supprimer les éléments existants. Les préférences déjà présentes dans le navigateur sont conservées. Un document autonome différent bloque aussi l’import : le transférer séparément ou utiliser un espace vierge.

Les données IndexedDB sont importées dans une transaction : une erreur ne laisse pas un demi-ensemble de vidéos ou de notes. Les fichiers de bibliothèques sont ajoutés avant cette transaction ; un incident disque ultérieur peut laisser ces nouveaux éléments dans la bibliothèque, sans remplacer les éléments existants. Réessayer est sans duplication. Il n’existe pas de transaction unique entre disque, IndexedDB et localStorage.

Quand un dossier de vidéos est lié, les fichiers restaurés y sont également répliqués, avec le mécanisme existant de reprise après erreur de permission. L’accueil et les notes/parcours se rafraîchissent après la restauration.

Cette commande ne remplace pas les imports/exports par atelier et n’ajoute pas de sauvegarde automatique planifiée ni d’historique de versions sur disque.

## Mémoire et chargement

L’historique partage les grandes chaînes, notamment les images incorporées, entre ses états. Il libère les ressources qui ne sont plus accessibles après suppression d’états ou création d’une nouvelle branche d’annulation. Sa cible de 24 Mo peut ramener l’historique au seul état courant ; cet état est conservé même s’il dépasse seul le budget.

Le cache d’images tient compte des octets décodés et de l’usage récent, avec une cible de 32 Mio/100 entrées pour les ressources non réservées. Les images du document actif, d’un aperçu ou d’un export sont réservées pour éviter les images absentes au rendu ; elles sont libérées à la fermeture de cet espace. Le jeu d’images actif peut dépasser la cible : ce n’est pas une limite sur la RAM totale de Frame.

Les ateliers se chargent à la demande ; les dépendances tierces sont séparées du code principal. La compilation ne signale plus de fichier JavaScript dépassant 500 ko. Cela ne remplace pas un benchmark de gros projets.

## Accès rapides partagés

**Playlists · Notes · Parcours** figurent dans la barre commune de toutes les pages, y compris les ateliers visuels. La navigation enregistre d’abord le travail courant et reste sur place si l’enregistrement échoue. Playlists dispose de la route `#/playlists`, qui rouvre la liste après une actualisation. Fermer la liste ramène à l’accueil. Les animations liées à une vidéo sont aussi présentes dans le lanceur Ctrl K.

## Vérifications

- `npm --prefix java-studio test` et `npm --prefix java-studio run build`.
- Test navigateur : `java-studio/tests/browser/reliability.mjs`, avec Playwright existant, `FRAME_TEST_URL=http://127.0.0.1:5289`, `FRAME_PLAYWRIGHT_MODULE` vers son module et un serveur isolé configuré avec `FRAME_ASSETS_DIR=/tmp/...`.
- Les tests utilisent des données fictives et ne modifient pas le stockage de localhost:5173.
