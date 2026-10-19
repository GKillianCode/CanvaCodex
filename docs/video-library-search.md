# Recherche et affichage de la bibliothèque

L’accueil conserve dans ce navigateur la recherche, les états visibles (y compris une sélection vide), le tri, le choix archives/vidéos actives, le nombre de vidéos par page et la page courante. Retourner d’une vidéo ou actualiser restaure cette vue. Une modification des filtres revient à la première page ; après suppression/archivage, une page devenue inexistante est ramenée à la dernière disponible.

- Texte libre : recherche dans le titre, sans distinction de casse ni d’accents.
- `playlist:` : suggère les playlists existantes et « Sans playlist ».
- `vidéo:` (ou `video:`) : recherche dans les titres et propose ceux de la bibliothèque.
- `type:` : suggère les types existants, dont « Non défini ».

Une suggestion se choisit à la souris ou avec les flèches et Entrée ; Échap ferme les suggestions. Les noms avec espaces sont automatiquement entourés de guillemets. Des guillemets contenus dans un nom sont échappés.

Exemple : `playlist:"Java" playlist:"IA" type:"Cours" vidéo:"variables"` recherche les cours sur les variables dans Java **ou** IA. Plusieurs filtres d’une même famille sont réunis par OU ; les familles se combinent par ET. Du texte libre peut compléter les filtres.

Le menu **Applications**, à côté de Fichier, ouvre les ateliers autonomes. Le bouton **Parcours** de l’accueil ouvre directement le canevas. Le sélecteur du bas propose 10,20,30ou50vidéos par page. La recherche travaille sur les résumés de vidéos : elle ne charge pas tous les supports dans la mémoire.

Les préférences d’affichage se trouvent dans `frame-video-library-view` (localStorage). Elles ne changent ni les vidéos ni leurs fichiers. L’ancien choix de tri `frame-video-sort` est repris si aucune préférence complète n’existe.
