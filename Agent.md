# Mémoire du projet — CanvaCodex / Frame

Dernière mise à jour : 2 octobre 2026 (Europe/Paris).

Ce fichier conserve le contexte, les décisions, les conventions, l’état réel du projet et sa roadmap. Le lire au début d’une session et le mettre à jour lorsque les décisions ou l’état changent. Résumer les échanges utiles, sans copier intégralement les conversations, sans secrets et sans présenter une idée comme une fonctionnalité livrée.

## Vision et public

Killian prépare une chaîne YouTube consacrée à Java en profondeur. La chaîne lui sert à développer ses compétences pour trouver un emploi et à transmettre ses connaissances. Sa conviction : continuer à apprendre à coder et à comprendre le fonctionnement des outils, sans dépendre de l’IA.

Les spectateurs connaissent déjà les variables, boucles, fonctions et méthodes. Les vidéos expliquent leur mise en œuvre en Java et les mécanismes sous le capot, étape par étape. Les contenus d’exemple doivent respecter ce niveau ; éviter un cours générique d’initiation à la programmation.

L’application est un outil personnel de production vidéo. Elle doit permettre de consacrer le temps au contenu plutôt qu’à concevoir des templates. Aucun paiement, abonnement, produit commercial ou connexion à une IA n’est demandé. L’utilisation de Codex pour développer l’application ne signifie pas qu’il faut intégrer une IA dans le produit.

## Besoins exprimés

- Éditeur de diaporamas avec compositions prédéfinies et personnalisation fine des positions.
- Thèmes prédéfinis appliqués globalement à toutes les diapos.
- Deux espaces cohérents : diaporamas et incrustations/bandeaux vidéo.
- Bandeaux dont le texte est modifiable, exportables pour un montage manuel.
- Mode présentation permettant de montrer, entourer et annoter avec un laser personnalisable.
- Enregistrement des diapos et des mouvements/annotations ; fichier vidéo exporté après Stop pour être ajouté à la vidéo principale.
- Préférence technologique : Symfony et Vue.js. Le choix initial d’une version Vue autonome a été annoncé et la première interface a été jugée satisfaisante par l’utilisateur. Cela ne constitue pas un abandon définitif de Symfony.
- Première version utilisable rapidement, avec un design soigné, interface en français.

## Décisions et architecture actuelle

- Nom de l’interface : **Frame — Java Studio**. Dépôt : [GKillianCode/CanvaCodex](https://github.com/GKillianCode/CanvaCodex).
- Racine du dépôt : ce dossier. Application : `java-studio/`.
- Vue 3, Vite 6, composants Single File Components, JavaScript, icônes Lucide Vue.
- Pas de backend ni de Symfony à ce stade. Pas de synchronisation entre appareils.
- Données sauvegardées sur l’appareil dans `localStorage` (clé `frame-project`). Export/import de projet JSON pour les sauvegardes portables.
- Rendu partagé sur Canvas 2D, format 1920 × 1080, pour présentation et exports.
- Enregistrement via `Canvas.captureStream(30)` et `MediaRecorder`, vidéo WebM sans audio. L’éditeur, ses panneaux et commandes ne sont pas enregistrés.
- PNG pour les diapos ; PNG transparent pour les bandeaux.
- Interface sombre avec accent menthe ; thèmes Terminal, Midnight, Carbon et Paper. Les thèmes concernent les créations ; l’atelier conserve son interface sombre.
- Polices d’interface Google Fonts avec polices de secours. Les diapos utilisent des polices système pour garder des exports autonomes.
- Une inscription Sites privée a été créée au premier tour, mais aucune mise en ligne n’a abouti : les scripts du module étaient devenus indisponibles. Ne pas confondre cette inscription avec un site publié. La configuration locale `.openai/` n’est pas nécessaire au fonctionnement ni à la publication sur GitHub.

## État livré

- [x] Interface française avec espaces Diaporamas, Incrustations et Thèmes.
- [x] Quatre diapos d’exemple autour du bytecode et de la JVM.
- [x] Ajout, duplication et suppression de diapos (au moins une conservée).
- [x] Modification des surtitres, titres, explications et exemples de code.
- [x] Quatre compositions : explication + code, ouverture, code en grand, deux colonnes.
- [x] Déplacement des blocs à la souris et réglages X, Y, largeur, taille du texte.
- [x] Quatre thèmes globaux partagés entre diapos et incrustations.
- [x] Trois formats de bandeaux : titre inférieur, titre de chapitre, À retenir.
- [x] Export PNG, sauvegarde locale et export/import JSON avec validation structurelle.
- [x] Présentation avec navigation, laser réglable en couleur/taille, crayon, effacement.
- [x] Enregistrement WebM, aperçu vidéo après Stop et lien de téléchargement.
- [x] Interface adaptée aux petits écrans.
- [ ] Backend Symfony, base de données et gestion de plusieurs projets.
- [ ] Hébergement opérationnel distant.
- [x] Dépôt Git local initialisé, remote `origin` associé à CanvaCodex, branche `feat/frame-studio-initial` créée.
- [x] Commits locaux du socle et de l’application ; mémoire et brouillons de suivi préparés.
- [x] Sources de l’application publiées sur GitHub ; [issue #1](https://github.com/GKillianCode/CanvaCodex/issues/1) créée.
- [x] Mémoire et conventions publiées ; [PR #2](https://github.com/GKillianCode/CanvaCodex/pull/2) ouverte pour revue, non fusionnée.

## Validation et limites connues

Vérifications effectuées le 2 octobre 2026 : `npm run build` passe ; l’interface a été inspectée dans le navigateur ; duplication vérifiée et corrigée (copie d’un objet Vue réactif) ; enregistrement avec changement de diapo puis Stop, vidéo produite de 557 Ko et reconnue par le lecteur comme 1920 × 1080 ; export PNG de bandeau produit de 60 Ko. Le téléchargement automatique n’a pas pu être récupéré par l’outil de test navigateur : un lien de téléchargement explicite permet de retenter. La transparence est prévue par le rendu Canvas mais n’a pas été mesurée sur le fichier téléchargé. Sur mobile à 390 px, la largeur du contenu ne dépasse plus celle du document.

Un outil navigateur de lecture seule permet de lire le contenu du projet lorsque WebMCP est supporté. Entrée valide testée ; entrée invalide rejetée après rechargement. Ce mécanisme n’ajoute aucun service d’IA à l’application.

Limites à conserver visibles dans les comptes rendus :

- WebM uniquement, pas de MP4, audio, microphone ou caméra.
- Compatibilité liée à `MediaRecorder`, au Canvas et aux codecs WebM du navigateur.
- Les enregistrements restent en mémoire jusqu’à l’export ; les longues sessions doivent être évaluées.
- Le rafraîchissement ou la fermeture perd les exports en mémoire, mais le projet modifié est sauvegardé localement lorsque cette sauvegarde fonctionne.
- Les projets locaux ne se synchronisent pas. Exporter du JSON pour transférer ou sauvegarder.
- Le placement libre peut produire des chevauchements ; il n’existe pas encore de détection de débordement du contenu.
- Les premiers essais ont modifié les diapos d’exemple dans le navigateur principal ; elles ont été restaurées. Utiliser un contexte de test séparé pour les vérifications futures.

## Conventions de travail

- Préserver les fonctionnalités et données existantes ; demander seulement les informations qui changent réellement le résultat.
- Maintenir une interface française, simple et orientée production de contenu.
- Utiliser le rendu partagé pour éviter les différences entre aperçu et export.
- Ne pas ajouter d’IA, de paiement ou de fonctions commerciales sans une nouvelle demande explicite.
- Conserver `package-lock.json` ; installer avec `npm ci` lors d’une installation reproductible.
- Vérifier la compilation pour les changements applicatifs ; vérifier les parcours touchés dans un contexte de test distinct. Ne pas annoncer des tests non effectués.
- Éviter les grandes refontes silencieuses. La séparation de `App.vue` en composants sera utile à mesure que les fonctionnalités évoluent.
- Ne jamais committer de secrets, de tokens, de fichiers d’environnement, de données de projet personnelles ni de fichiers exportés par l’utilisateur.
- Mettre à jour ce fichier, le README et les tickets pertinents lorsque le comportement ou les décisions évoluent.

## Traçabilité GitHub demandée

À compter du 2 octobre 2026, l’utilisateur demande de tracer tout le travail sur GitHub via issues, branches, commits et pull requests dans `GKillianCode/CanvaCodex`.

- Créer ou réutiliser une issue pour chaque lot cohérent de travail, avec problème, résultat attendu et critères de validation.
- Utiliser une branche dédiée, par exemple `feat/<sujet>`, `fix/<sujet>` ou `docs/<sujet>` ; éviter les changements applicatifs directement sur la branche principale.
- Commits ciblés avec messages explicites, de préférence `feat:`, `fix:` ou `docs:`.
- Une pull request décrit le comportement final, les vérifications réellement effectuées et les limites importantes ; lier l’issue correspondante.
- Ne pas inventer de numéro d’issue ou de PR. Ajouter ici les liens seulement après création confirmée.
- Publier le travail autorisé ; ne pas fusionner automatiquement les PR ni réécrire l’historique sans une demande explicite.
- Si l’accès GitHub est indisponible, préparer les fichiers et commits localement, noter le blocage, puis reprendre la publication dès que la connexion est confirmée. Ne pas demander un token dans le chat.

## Roadmap proposée — à prioriser avec Killian

Ces éléments sont des pistes, pas des fonctionnalités commandées ou livrées.

1. **Versionner la première version** : mémoire projet, dépôt, issue de livraison initiale, commits, PR et guide de lancement.
2. **Fiabiliser les exports** : vérifier les PNG transparents dans le logiciel de montage de Killian ; vérifier laser et crayon dans les fichiers vidéo ; tester les séquences longues et prévenir la perte d’un enregistrement.
3. **Améliorer l’édition** : annuler/rétablir, réordonner les diapos, guides d’alignement, repères de marges et détection de dépassement.
4. **Affiner les templates techniques** : compositions diagrammes, comparaisons avant/après, stack/heap, pipeline JVM, code avec lignes mises en évidence ; sauvegarder ses propres compositions.
5. **Ajouter Symfony si nécessaire** : persistance de plusieurs projets, modèles réutilisables et sauvegardes serveur, sans mécanisme commercial.
6. **Choisir un hébergement personnel** : local ou distant, en conservant l’accès adapté à un usage privé.

## Historique et prochaines actions

- **2 octobre 2026 — première version** : application Vue autonome créée, aperçus et exports implémentés ; build et principaux parcours vérifiés. L’utilisateur juge l’application satisfaisante comme point de départ.
- **2 octobre 2026 — mémoire et GitHub** : demande de ce fichier `Agent.md` à la racine, et de traçabilité GitHub pour les travaux suivants. Le dépôt distant est accessible en lecture et ne contient aucun ref au moment de la vérification. Aucun outil GitHub authentifié n’est disponible initialement ; connexion GitHub proposée. Publication à reprendre après confirmation de connexion.
- **Préparation locale** : commit `27a1eed` sur `main` pour le socle du dépôt ; commit `d074f06` sur `feat/frame-studio-initial` pour l’application. Le build a été revérifié et passe. Brouillons d’issue et de PR conservés dans `.github/drafts/`. Un envoi non interactif de `main` a échoué faute d’identifiants HTTPS ; rien n’a été publié. Aucun numéro d’issue ou de PR n’est encore attribué. Le plugin GitHub avait été proposé ; sa connexion a ensuite été confirmée et la publication a repris.

- **Connexion et publication GitHub** : accès au dépôt confirmé avec les droits d’écriture. Le dépôt était toujours vide. Le connecteur GitHub a créé le socle distant sur `main` (commit `42c8388`) et publié les sources sur `feat/frame-studio-initial` (commit `197c3da`), avec l’issue [#1](https://github.com/GKillianCode/CanvaCodex/issues/1). Les commits distants ont des identifiants différents des premiers commits locaux : les sources ont été publiées via le connecteur, sans identifiants Git HTTPS locaux. La mémoire a été publiée dans le commit `6f38e1f` et la [PR #2](https://github.com/GKillianCode/CanvaCodex/pull/2) est ouverte vers `main`. L’issue #1 reste ouverte jusqu’à la revue et la fusion. Aucun changement n’a été fusionné automatiquement.

### Suivi GitHub actuel

- Issue de livraison : [#1](https://github.com/GKillianCode/CanvaCodex/issues/1).
- Pull request : [#2](https://github.com/GKillianCode/CanvaCodex/pull/2), branche `feat/frame-studio-initial` vers `main`, ouverte pour revue.
- Les sources applicatives n’ont pas changé pendant la publication ; le build réussi précédemment reste pertinent.
- Les premiers commits locaux sont conservés dans les branches d’archive `archive/local-frame-initial-20261002` et `archive/local-bootstrap-20261002`. Les branches de travail locales `main` et `feat/frame-studio-initial` doivent suivre leurs homologues distantes après récupération, sans réécriture de l’historique distant.
- Pour la suite : créer ou réutiliser une issue avant chaque nouveau lot, documenter les décisions ici et ouvrir une PR avec les validations réellement effectuées. La roadmap reste proposée ; aucun ticket de développement supplémentaire n’est lancé sans choix de priorité.
