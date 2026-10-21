# Revue de Frame — 21 octobre 2026

## Avis général

Frame couvre déjà le workflow : idées et notes libres → préparation dans le Conducteur → supports → tournage en une prise → montage externe → Publication. Ajouter une application par défaut n’est pas nécessaire. La priorité utile est de consolider la fiabilité et la gestion des ressources.

La dictée vocale est abandonnée à la demande de Killian. Travail repris sur `codex/revue-application`, depuis la version actuelle ; aucune fusion des PR de test. Ce rapport ne livre ni correctif ni nouvelle fonctionnalité.

## Périmètre et vérifications

Revue transversale du code : accueil/recherche/catalogues, vidéos/playlists, parcours, notes/réseau, Conducteur, Publication, bibliothèques, quatre ateliers visuels, thèmes/composants, historique et exports. Il ne s’agit pas d’une validation exhaustive de toutes les combinaisons de propriétés, codecs et navigateurs.

- 417 tests réussis ; compilation réussie.
- Chargement de dix routes dans Chrome headless, origine isolée 127.0.0.1:5289 : aucune exception JavaScript. Ce contrôle de chargement ne valide pas toutes les interactions.
- Reproductions avec données fictives et stockage isolé ; aucune modification des données sur localhost:5173.
- Aucun nouvel export long ni import Kdenlive effectué pendant cette revue.

## Problèmes confirmés

### Priorité haute : une note peut être écrasée par un autre onglet

Reproduction à travers les méthodes de stockage utilisées par les éditeurs, dans deux onglets de la même origine : les deux chargent « Initial ». Le premier ajoute « Ajout A » et enregistre. Le second conserve sa copie initiale, ajoute « Ajout B » et enregistre. Le résultat est « Initial + Ajout B », sans Ajout A et sans conflit signalé.

Cause : `java-studio/src/videoProjects.js`, méthode `saveFreeNote`, écrit le contenu sans révision attendue. La même protection que celle déjà présente dans le Conducteur et Publication devrait être étendue aux notes : détecter la version périmée, préserver le brouillon et proposer une récupération.

### Priorité haute : même risque pour les bibliothèques de publication

`PublicationLibraryApp.vue` enregistre toute la bibliothèque via `setSetting`. Reproduction au niveau du dépôt : deux copies du catalogue sont chargées ; A ajoute une musique ; B renomme une musique dans sa copie périmée puis enregistre. L’ajout de A disparaît. Le même mécanisme concerne les modèles et blocs de description ; leur cas spécifique n’a pas été rejoué séparément.

Prévoir une révision de bibliothèque, ou une fusion par identifiant avec détection des conflits. Ces deux problèmes sont surtout importants si plusieurs onglets restent ouverts.

## Limites observées, distinctes des bugs reproduits

### La sauvegarde d’une vidéo n’est pas une sauvegarde complète de Frame

Le miroir local de `videoFolders.js` écrit la fiche vidéo, son carnet et ses créations. Les notes libres, le parcours et les bibliothèques de publication suivent d’autres chemins de stockage, notamment IndexedDB. Les thèmes, composants et animations réutilisables disposent de leurs fichiers locaux séparés via le serveur d’assets. Exporter une vidéo ne suffit donc pas à tout restaurer.

Proposition prioritaire : une commande « Sauvegarder tout Frame », avec inventaire et restauration vérifiable. Elle doit préserver les mécanismes existants et ne pas déplacer les données silencieusement.

Un échec de permission du dossier local a aussi été testé : l’enregistrement navigateur est conservé et l’erreur du miroir est gérée. Ce scénario n’est pas retenu comme bug de conflit.

### Les documents riches en images restent le principal risque mémoire

L’accueil utilise des résumés et charge les aperçus visibles ; les notes chargent leur corps actif. Un catalogue de 500 vidéos n’équivaut donc pas à charger 500 documents complets. Aucun benchmark de 500 vidéos n’a été effectué ici.

En revanche, `history.js` conserve des instantanés JSON complets : une image incorporée se répète dans plusieurs états. Le budget annoncé de 24 Mo est une cible, puisque deux états sont conservés même s’ils la dépassent. Le cache d’images est limité en nombre, pas en octets décodés. Optimiser les ressources partagées et l’historique avant d’augmenter les limites.

### Chargement initial et maintenance

La compilation produit un fichier JavaScript principal de 1,19 Mo (392 Ko gzip), avec avertissement Vite. Charger les ateliers à la demande serait une optimisation raisonnable ; aucune mesure actuelle ne prouve une lenteur gênante sur la machine de Killian.

Le grand éditeur de texte, les composables des ateliers et la feuille de styles concentrent beaucoup de comportements. Les faire évoluer par petites extractions, avec tests de sélection, listes imbriquées, déplacement et conversion Markdown. Une réécriture globale ajouterait un risque inutile.

## Évolutions réellement utiles

1. **Sauvegarde globale et points de restauration** : récupérer un état précédent après une mauvaise manipulation ; tester une restauration complète avant de considérer le chantier terminé.
2. **Vérification avant tournage/publication**, intégrée à la fiche vidéo : supports manquants, références supprimées, chapitrage incomplet, ressources indisponibles. Réutiliser les diagnostics existants plutôt qu’ajouter une seconde checklist manuelle.
3. **Bibliothèque de médias locale partagée**, si le besoin se confirme : images, captures, logos, recherche et aperçu, réutilisation dans plusieurs ateliers sans réimporter les mêmes fichiers. C’est la seule nouvelle application que je verrais justifiée à court terme, et elle peut commencer comme un panneau partagé.
4. **Recherche transversale** : étendre la recherche existante aux contenus des notes et du Conducteur. Le lanceur Ctrl K existe déjà ; inutile de créer une seconde palette.

Ordre conseillé : protections des sauvegardes → sauvegarde/restauration globale → éventuellement bibliothèque de médias. Les autres idées restent des propositions, sans engagement de développement.

## Ce que je n’ajouterais pas

Pas d’éditeur vidéo concurrent de Kdenlive, pas de gestionnaire de prises puisque le tournage se fait d’une traite, pas de nouvelle application de notes/checklists faisant doublon, pas d’IA. Les composants, états, presets, moteurs d’animation et modèles couvrent déjà beaucoup de réutilisation. Le gain suivant viendra davantage de la sérénité d’utilisation que d’un nouvel écran.
