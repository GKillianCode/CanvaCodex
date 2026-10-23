<script setup>
import { reactive, computed } from "vue";
import { Music2, Upload, Trash2 } from "lucide-vue-next";
import TimecodeInput from "./TimecodeInput.vue";
import InspectorDrawer from "./InspectorDrawer.vue";
import { audioTimeLabel } from "../animationAudioModel.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation;
const end = computed(() => a.config.audio.start + a.config.duration);
</script>
<template>
  <InspectorDrawer
    id="animation-audio"
    class="animation-audio-properties"
    title="Audio de référence"
    :icon="Music2"
  >
    <label
      class="btn animation-audio-import"
      :class="{ disabled: a.audio.importing || a.busy }"
    >
      <Upload :size="14" />{{
        a.audio.importing
          ? "Analyse de l’audio…"
          : a.config.audio.src
            ? "Remplacer l’audio"
            : "Importer un audio"
      }}
      <input
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm"
        aria-label="Importer l’audio de référence"
        :disabled="a.audio.importing || a.busy"
        @change="a.audio.importFile"
      />
    </label>
    <p class="field-help">
      Un fichier partagé par les scènes de cette animation. Écoute de référence,
      sans ajout au fichier vidéo exporté.
    </p>
    <template v-if="a.config.audio.src">
      <strong class="animation-audio-filename">{{
        a.audio.asset?.name ||
        (a.audio.loading ? "Chargement…" : "Audio de référence")
      }}</strong>
      <TimecodeInput
        label="Début dans le fichier"
        :model-value="a.config.audio.start"
        :disabled="a.busy"
        @update:model-value="a.audio.setStart"
      />
      <dl class="animation-audio-interval">
        <div>
          <dt>Début de l’extrait</dt>
          <dd>{{ audioTimeLabel(a.config.audio.start) }}</dd>
        </div>
        <div>
          <dt>Fin calculée</dt>
          <dd>{{ audioTimeLabel(end) }}</dd>
        </div>
        <div>
          <dt>Durée de la scène</dt>
          <dd>{{ audioTimeLabel(a.config.duration) }}</dd>
        </div>
      </dl>
      <p
        v-if="a.audio.asset && end > a.audio.asset.duration"
        class="field-help"
      >
        L’extrait dépasse la fin de l’audio ({{
          audioTimeLabel(a.audio.asset.duration)
        }}). La partie restante sera silencieuse.
      </p>
      <button
        class="btn"
        :disabled="a.busy || a.audio.importing"
        @click="a.audio.remove"
      >
        <Trash2 :size="14" />Retirer l’audio
      </button>
    </template>
    <p v-if="a.audio.error" role="alert" class="field-help">
      {{ a.audio.error }}
    </p>
  </InspectorDrawer>
</template>
