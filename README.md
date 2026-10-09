# CanvaCodex — Frame

Atelier personnel pour préparer des diaporamas techniques Java et des incrustations vidéo avec une charte graphique commune.

L’application se trouve dans [`java-studio/`](java-studio/README.md). Elle utilise Vue 3 et Vite, sans backend dans cette première version.

## Démarrer

```sh
cd java-studio
npm ci
npm run dev
```

## Compiler

```sh
cd java-studio
npm run build
```

## Mémoire et suivi

- [`Agent.md`](Agent.md) : contexte, décisions, conventions, état et roadmap.
- [Dépôt GitHub](https://github.com/GKillianCode/CanvaCodex) : issues et pull requests de suivi.

Les projets sont sauvegardés dans le navigateur sur l’appareil utilisé et peuvent être exportés/importés en JSON. Les incrustations sont exportées en PNG transparent et les présentations enregistrées en WebM, sans audio.

La présentation dispose d’états pédagogiques dans une même diapo et d’une console privée synchronisée avec une fenêtre Public, pour filmer ou projeter sans afficher les notes.


## Étapes et incrustations Java

La barre **Étapes de la diapo** regroupe tous les états dans une liste, avec navigation précédente/suivante, ajout et corbeille pour supprimer l’étape sélectionnée. L’état initial est conservé ; Ctrl Z annule une suppression. **Gérer** ouvre les noms, l’ordre et les réglages des états.

Dans **Incrustations → Formats → Java**, deux compositions entièrement éditables sont disponibles : **Fiche de type Java** et **Octets et bits**. La fiche affiche type, bornes, largeur et valeur par défaut. **Format → Composition** permet de choisir byte, short, int, long, char, float, double ou boolean sans modifier la géométrie ni recréer les objets supprimés. Export PNG transparent disponible via Fichier.

**Insérer → Octets et bits** ajoute aussi l’objet aux diapos. Dans **Objet → Style → Octets et valeur**, saisir un entier décimal, choisir 1–8 octets, le nombre d’octets par ligne et le mode signé (complément à deux). Les grands entiers restent exacts ; une valeur hors plage est signalée et jamais tronquée. Par exemple, 151 vaut `10010111` sur un octet non signé ; il dépasse la plage d’un byte Java signé. Les largeurs 3, 5, 6 et 7 octets sont pédagogiques et ne correspondent pas à des primitifs Java. Poids fort à gauche ; ce schéma ne représente pas l’endianness en mémoire.

Affichage : valeur, numéros des octets et poids des bits optionnels. Couleurs : palette du thème ou preset orange inspiré de la référence, puis personnalisation de chaque couleur. Déplacement, redimensionnement, opacité, animations, copie et sauvegarde dans la bibliothèque de composants utilisent les outils communs.

Les fiches suivent la [spécification Java](https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html) : long = 8 octets/64 bits ; boolean n’a pas de taille de stockage universelle définie par le langage. La largeur concerne la représentation numérique, sans surcoût des objets. Les bornes flottantes sont les extrema finis, avec mention de NaN et des infinis. Les valeurs par défaut concernent les champs et éléments de tableaux ; une variable locale doit être initialisée.
