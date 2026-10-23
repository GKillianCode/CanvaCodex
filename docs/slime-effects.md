# Slime · cinq mondes, 31 effets

Projet natif et éditable : [animation-slime-cinq-scenes.json](../animation-slime-cinq-scenes.json), à la racine. Dans Animation : **Exemples → Slime · cinq mondes** ajoute les scènes sans remplacer le travail en cours. Le fichier s’importe aussi par **Fichier → Importer un document JSON** (remplace le document ouvert). Pour lire ou exporter les 54 secondes : cocher **Toutes les scènes** dans **Animer / Exporter**.

Le même personnage parcourt cinq scènes : prairie, canyon, atelier nocturne, monde inversé et observatoire. Sauts, rebonds, trous, changements de gravité, contacts et transitions spatiales sont conservés. Les effets servent le décor et les actions ; ils ne changent pas les calculs physiques. Les 31 effets sont présents dans l’ensemble du film.

## Retrouver et modifier un effet

- La timeline affiche le nom de l’effet et de son objet ; cliquer sur cette piste ouvre directement le tiroir existant.
- Cocher **Sélection** pour ne garder que les pistes de l’objet et les pistes de scène/caméra. Les séquences de démonstration démarrent repliées pour faciliter le repérage.
- Glisser la plage temporelle d’un effet pour le décaler ; étirer sa poignée droite pour changer sa durée. Les losanges des propriétés et les courbes existantes restent utilisables.
- Les notes de chaque scène recensent ses effets. Les objets vectoriels, images SVG, textes et particules restent modifiables. Aucun effet n’écrit dans les bibliothèques personnelles.

## 1. Prairie · du matin au soir

Film : 0–10 s. Les temps ci-dessous sont locaux à cette scène.

| Effet | Objet | Début | Durée |
|---|---|---:|---:|
| Fondu | Nom du décor | 0.0 s | 0.9 s |
| Texte rythmé | Ouverture · texte rythmé | 0.3 s | 2.2 s |
| Balancement | Herbe vectorielle 1 + 8 autres | 0.0 s | 10.0 s |
| Ondulation | Nuage 3 | 0.0 s | 10.0 s |
| Flou | Colline 4 | 0.0 s | 10.0 s |
| Ombre | Slime · personnage | 0.0 s | 10.0 s |
| Dessiner le tracé | Sentier qui se dessine | 0.8 s | 2.4 s |

## 2. Canyon · passage suspendu

Film : 10–20 s. Les temps ci-dessous sont locaux à cette scène.

| Effet | Objet | Début | Durée |
|---|---|---:|---:|
| Explosion | Cristal · explosion au départ du saut | 3.0 s | 1.1 s |
| Poussière | Voile de sable emporté | 2.1 s | 1.6 s |
| Effondrement | Fragments suspendus · effondrement | 4.3 s | 1.3 s |
| Reconstruction | Portique reconstruit après le saut | 6.1 s | 1.8 s |
| Courbure | Fanion mobile | 0.0 s | 4.0 s |
| Mosaïque | Stèle révélée en mosaïque | 5.7 s | 1.3 s |

## 3. Atelier nocturne · énergie

Film : 20–30 s. Les temps ci-dessous sont locaux à cette scène.

| Effet | Objet | Début | Durée |
|---|---|---:|---:|
| Néon | Nom du décor | 0.0 s | 10.0 s |
| Scintillement | Fenêtre + 2 autres | 0.0 s | 10.0 s |
| Contour en mouvement | Circuit dessiné · énergie instable | 0.0 s | 10.0 s |
| Glitch | Relais · mouvement réutilisable | 0.0 s | 10.0 s |
| Dissolution | Signal qui disparaît | 4.8 s | 2.1 s |
| Désaturation | Bâtiment lointain | 0.0 s | 10.0 s |
| Rotation de teinte | Signal de fin de séquence | 0.0 s | 10.0 s |

## 4. Gravité · le monde inversé

Film : 30–44 s. Les temps ci-dessous sont locaux à cette scène.

| Effet | Objet | Début | Durée |
|---|---|---:|---:|
| Morphing vectoriel | Rune · cercle vers étoile | 1.8 s | 3.2 s |
| Torsion 2D | Architecture changeante | 0.0 s | 14.0 s |
| Traînée | Slime · même personnage | 0.0 s | 14.0 s |
| Pulsation | Repère du bloc 3 | 0.0 s | 14.0 s |
| Ouverture circulaire | Onde autour du bloc de gravité | 6.6 s | 1.5 s |
| Déformer sur une spline | Ruban · déformation sur spline | 0.3 s | 2.5 s |
| Doré / métallique | Titre métallique | 0.0 s | 14.0 s |

## 5. Observatoire · le relais des mondes

Film : 44–54 s. Les temps ci-dessous sont locaux à cette scène.

| Effet | Objet | Début | Durée |
|---|---|---:|---:|
| Image vers image | Souvenir du voyage · image de départ | 3.2 s | 3.2 s |
| Reflet mobile | Nom du décor | 1.0 s | 3.4 s |
| Halo | Sonde de l’observatoire · boucle spline | 0.0 s | 10.0 s |
| Balayage | Conclusion · balayage | 0.5 s | 2.4 s |

## Ce que ce projet a permis de corriger

- Surfaces intermédiaires rectangulaires au lieu de carrés disproportionnés pour les titres larges ; limites mémoire existantes conservées.
- Un effet graphique d’intensité zéro est neutre, notamment le glitch : plus de teinte résiduelle.
- Tracé ouvert dessiné sur sa vraie longueur, sans segment fictif de fermeture.
- Surface de traînée couvrant aussi les poses passées, pour conserver les échos pendant une chute rapide.
- Événement **Masquer** pour arrêter un signal visuel ; actions de visibilité évaluées chronologiquement sans qu’un événement futur annule les précédents.
- Timeline filtrable et accès direct au panneau partagé, sans nouveau système de propriétés. Les obstacles physiques n’affichent plus de fausses plages temporelles.
- Ajout de l’exemple : cinq places de scène requises, message corrigé.

## Bilan des outils

Le moteur existant suffit pour cette réalisation en 2D : physique, splines, caméra, attachements, événements, préréglages, effets et export sont réutilisés. L’événement Masquer manquait pour finir proprement certaines actions ; il est maintenant disponible dans l’éditeur. La passerelle Vectoriel → Animation réelle est utilisée pour importer l’herbier de la première scène. Les deux images de souvenir sont des SVG autonomes et la dernière scène montre leur transition.

Ce projet ne constitue pas une simulation de fracture ou de fluide en 3D. Les limites du moteur 2D et des textures intermédiaires restent celles du [guide Animation](animation-studio.md). Régénération : `node java-studio/scripts/build-slime-demo.mjs`.
