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
