# Frame — Java Studio

Atelier personnel Vue 3 pour préparer des diaporamas techniques Java et des incrustations vidéo.

## Lancer en local

```sh
npm install
npm run dev
```

## Production

```sh
npm run build
```

Le dossier `dist` peut être servi par un serveur statique ou intégré à une application Symfony. Cette première version ne contient pas de backend Symfony.

## Utilisation

- Modifier le contenu dans le panneau à droite.
- Choisir une composition et ajuster X, Y, largeur et taille du texte.
- Déplacer les blocs directement sur la diapo.
- Choisir un thème global pour les diapos et les incrustations.
- Exporter une diapo en PNG Full HD ou un bandeau en PNG transparent.
- Présenter : flèches pour naviguer, Échap pour quitter ; laser ou crayon pour annoter.
- Enregistrer : vidéo WebM 1920 × 1080, 30 images/seconde, sans audio. La vidéo contient uniquement le rendu des diapos, le laser et les annotations.
- Sauvegarde automatique dans le navigateur sur l’appareil utilisé. Exporter le projet JSON pour une sauvegarde portable et l’importer pour reprendre ailleurs.

L’enregistrement utilise Canvas.captureStream et MediaRecorder ; un navigateur récent compatible WebM est nécessaire. Le téléchargement se déclenche au clic sur Stop. L’enregistrement reste en mémoire jusqu’à son export : privilégier des séquences courtes. Le format est WebM, pas MP4.

Aucun service d’IA, paiement, microphone ou caméra. Les projets ne sont pas synchronisés entre appareils. Les polices d’interface sont chargées via Google Fonts avec une police système de secours ; le rendu des diapos utilise des polices système pour que les exports restent autonomes.
