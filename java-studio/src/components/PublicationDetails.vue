<script setup>
import {
  Plus,
  Trash2,
  BookOpen,
  Code2,
  Link2,
  Hash,
  FileText,
} from "lucide-vue-next";
const props = defineProps({
  publication: Object,
  videos: Array,
  neighbors: Object,
  videoId: String,
  part: String,
});
const add = (key, value) => {
  if (props.publication.details[key].length < 100)
    props.publication.details[key].push({ id: crypto.randomUUID(), ...value });
};
</script>
<template>
  <article
    v-if="part === 'intro' && publication.descriptionMode === 'template'"
    class="production-card publication-detail-card"
  >
    <h2><FileText :size="17" />Le contenu de cette vidéo</h2>
    <label
      >Introduction<textarea
        v-model="publication.details.introduction"
        aria-label="Introduction de la vidéo"
        rows="3"
        maxlength="5000"
        placeholder="Présente le sujet et ce que la vidéo apporte…"
      /></label
    ><label
      >Programme<textarea
        v-model="publication.details.programme"
        aria-label="Programme de la vidéo"
        rows="6"
        maxlength="10000"
        placeholder="Une phrase par point abordé…"
      />
    </label>
    <p class="field-help">
      Le programme décrit ce que l’on va apprendre. Les chapitres ci-dessous
      indiquent les horaires de la vidéo montée.
    </p>
  </article>
  <template v-if="part === 'details'">
    <details
      class="publication-detail-card"
      :open="publication.details.technical.length > 0"
    >
      <summary>
        <Code2 :size="17" />Informations techniques<span>{{
          publication.details.technical.length || ""
        }}</span>
      </summary>
      <div>
        <p class="field-help">
          Renseigne les notions et leurs versions Java. Aucun numéro de version
          n’est deviné.
        </p>
        <section
          v-for="(row, i) in publication.details.technical"
          :key="row.id"
          class="publication-detail-row"
        >
          <div class="publication-row-heading">
            <strong>Notion {{ i + 1 }}</strong
            ><button
              class="icon-btn"
              :aria-label="'Supprimer la notion ' + (i + 1)"
              @click="publication.details.technical.splice(i, 1)"
            >
              <Trash2 :size="15" />
            </button>
          </div>
          <div class="publication-field-grid">
            <label
              >Notion<input
                v-model="row.topic"
                :aria-label="'Notion ' + (i + 1)"
                maxlength="300"
                placeholder="Point technique abordé" /></label
            ><label
              >Disponible depuis Java<input
                v-model="row.since"
                :aria-label="'Version Java de la notion ' + (i + 1)"
                maxlength="80"
                placeholder="Version · facultatif"
            /></label>
          </div>
          <label
            >Précision facultative<textarea
              v-model="row.notes"
              :aria-label="'Précision de la notion ' + (i + 1)"
              maxlength="2000"
              rows="2"
            />
          </label>
          <details>
            <summary>Aller plus loin · facultatif</summary>
            <label
              >Nom de la vidéo ou ressource<input
                v-model="row.moreLabel"
                :aria-label="'Approfondissement de la notion ' + (i + 1)"
                maxlength="200" /></label
            ><label
              >Lien<input
                v-model="row.moreUrl"
                :aria-label="'Lien de la notion ' + (i + 1)"
                maxlength="2000"
                placeholder="https://…"
            /></label>
          </details>
        </section>
        <button
          class="btn"
          :disabled="publication.details.technical.length >= 100"
          @click="
            add('technical', {
              topic: '',
              since: '',
              notes: '',
              moreLabel: '',
              moreUrl: '',
            })
          "
        >
          <Plus :size="14" />Ajouter une notion
        </button>
      </div>
    </details>
    <details class="publication-detail-card">
      <summary><BookOpen :size="17" />Poursuivre l’apprentissage</summary>
      <div>
        <p class="field-help">
          L’ordre automatique suit la playlist de la vidéo. Un lien absent reste
          omis de la description.
        </p>
        <section
          v-for="[key, label] in [
            ['previous', 'Vidéo précédente'],
            ['next', 'Vidéo suivante'],
          ]"
          :key="key"
        >
          <label
            >{{ label
            }}<select
              v-model="publication.details[key + 'Id']"
              :aria-label="label"
            >
              <option value="auto">Automatique · ordre de la playlist</option>
              <option value="">Ne pas afficher</option>
              <option
                v-for="video in videos.filter((v) => v.id !== videoId)"
                :key="video.id"
                :value="video.id"
              >
                {{ video.name }}
              </option>
            </select></label
          >
          <p
            v-if="publication.details[key + 'Id'] === 'auto'"
            class="field-help"
          >
            {{ neighbors[key]?.name || "Aucune vidéo à cette position." }}
          </p>
          <label
            >Lien public · facultatif<input
              v-model="publication.details[key + 'Url']"
              :disabled="publication.details[key + 'Id'] === ''"
              :aria-label="'Lien public · ' + label"
              maxlength="2000"
              placeholder="Lien YouTube de la vidéo choisie, ou https://…"
          /></label>
        </section>
        <label
          >Lien de la playlist<input
            v-model="publication.details.playlistUrl"
            aria-label="Lien de la playlist"
            maxlength="2000"
            placeholder="Vide : utiliser le lien prévu dans le modèle" /></label
        ><label
          >Lien YouTube de cette vidéo<input
            v-model="publication.details.videoUrl"
            aria-label="Lien YouTube de cette vidéo"
            maxlength="2000"
            placeholder="https://youtu.be/…"
        /></label>
        <p class="field-help">
          Le lien de cette vidéo servira aux autres vidéos qui la recommandent.
        </p>
      </div>
    </details>
    <details
      class="publication-detail-card"
      :open="publication.details.resources.length > 0"
    >
      <summary>
        <Link2 :size="17" />Ressources complémentaires<span>{{
          publication.details.resources.length || ""
        }}</span>
      </summary>
      <div>
        <p class="field-help">
          Les liens sont ajoutés au commentaire épinglé. La description affiche
          le texte commun « retrouvez les liens dans le commentaire épinglé ».
        </p>
        <div
          v-for="(row, i) in publication.details.resources"
          :key="row.id"
          class="publication-resource-row"
        >
          <input
            v-model="row.label"
            :aria-label="'Nom de la ressource ' + (i + 1)"
            maxlength="200"
            placeholder="Documentation, dépôt, outil…"
          /><input
            v-model="row.url"
            :aria-label="'Lien de la ressource ' + (i + 1)"
            maxlength="2000"
            placeholder="https://…"
          /><button
            class="icon-btn"
            :aria-label="'Supprimer la ressource ' + (i + 1)"
            @click="publication.details.resources.splice(i, 1)"
          >
            <Trash2 :size="15" />
          </button>
        </div>
        <button
          class="btn"
          :disabled="publication.details.resources.length >= 100"
          @click="add('resources', { label: '', url: '' })"
        >
          <Plus :size="14" />Ajouter une ressource
        </button>
      </div>
    </details>
    <details class="publication-detail-card">
      <summary><Hash :size="17" />Hashtags et mots-clés · facultatifs</summary>
      <div>
        <label
          >Hashtags dans la description<input
            v-model="publication.details.hashtags"
            aria-label="Hashtags de la description"
            maxlength="1000"
            placeholder="#Java #Programmation" /></label
        ><label
          >Tags YouTube<textarea
            v-model="publication.details.tags"
            aria-label="Tags YouTube"
            maxlength="500"
            rows="2"
            placeholder="Mots-clés séparés par des virgules"
          />
        </label>
        <p class="field-help">
          Les tags se copient dans le champ dédié de YouTube Studio ; ils ne
          sont pas ajoutés à la description. Les hashtags passent par la balise
          du modèle.
        </p>
        <a
          href="https://support.google.com/youtube/answer/146402?hl=fr"
          target="_blank"
          rel="noopener noreferrer"
          >À quoi servent les tags ? · YouTube</a
        >
      </div>
    </details>
  </template>
</template>
