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

## Pagination et saisie rapide

Le bas de page affiche le nombre de résultats à gauche, les pages cliquables au centre et le sélecteur du nombre de vidéos à droite, sans libellé visible. La première et la dernière page sont toujours proposées, avec les pages voisines de la page active et des points de suspension si nécessaire.

Commencer à taper `play`, `vid` ou `ty` propose le mot-clé correspondant. Le sélectionner au clic ou avec les flèches et Entrée insère automatiquement `playlist:`, `vidéo:` ou `type:`, puis ouvre les suggestions de valeurs.

## Paramètres des vidéos

Depuis **Fichier → Paramètres des vidéos**, créer, renommer et supprimer les statuts et les types. Leurs identifiants internes restent stables lors d’un renommage : fiches, filtres, recherche, playlists et parcours utilisent les mêmes libellés.

- Conserver au moins un statut. Le statut initial sert aux nouvelles vidéos et remplace les statuts supprimés sur les vidéos existantes. Il se choisit dans Valeurs par défaut.
- Supprimer un type remet ses vidéos en « Non défini » ; les autres types sont conservés.
- Choisir un type par défaut le présélectionne pour les nouvelles vidéos.
- Pour modifier les vidéos existantes, ouvrir Statuts ou Types de vidéos : choisir **Statut à remplacer / Remplacer par le statut**, ou **Type de vidéo à remplacer / Remplacer par le type**, puis cliquer **Remplacer ce statut/type**. Seules les vidéos avec la valeur source sont modifiées, archives comprises. « Non défini » est proposé comme source et destination pour les types. Une source identique à la destination est refusée. Le remplacement ne supprime aucune étiquette et ne modifie pas les valeurs par défaut ; il enregistre aussi les paramètres en cours.

Les listes sont conservées dans les paramètres IndexedDB de la bibliothèque (`video-catalog`) et chargées avant les fiches. L’enregistrement du catalogue et les changements de classification sont atomiques dans la bibliothèque ; les fichiers vidéo du dossier lié sont ensuite synchronisés par le mécanisme de sauvegarde local habituel. Modifier des paramètres ne change pas la date de dernière modification des vidéos.

### Organisation des paramètres

La fenêtre propose trois sections fermées au départ : **Statuts**, **Types de vidéos** et **Valeurs par défaut**. Cliquer une section l’ouvre et referme la précédente. Les listes gardent leur nom, leur ajout et leur suppression dans leur propre section ; les choix pour les nouvelles vidéos se trouvent dans Valeurs par défaut. Les remplacements des vidéos existantes restent dans Statuts et Types de vidéos.

Une poignée à gauche de chaque ligne permet de la déplacer. Une ligne de dépôt indique l’emplacement avant le relâchement ; la fenêtre défile automatiquement près de ses bords pendant le déplacement. Sur une poignée au clavier, ↑/↓ déplace d’une ligne et Début/Fin envoie au début/à la fin. Un geste annulé ne modifie pas l’ordre. **Enregistrer les paramètres** conserve le nouvel ordre, utilisé par les listes et le tri par processus. Le bouton reste accessible et indique si des modifications attendent d’être enregistrées.
