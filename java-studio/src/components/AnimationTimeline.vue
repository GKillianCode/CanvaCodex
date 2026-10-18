<script setup>
import { reactive, ref, onUnmounted } from "vue";
import {
  Play,
  Pause,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Diamond,
  Download,
  Route,
} from "lucide-vue-next";
import { animationFields, animationEasings } from "../animationModel.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation,
  selected = ref(null),
  height = ref(260),
  ruler = ref(null);
const labels = {
  x: "Position X",
  y: "Position Y",
  w: "Largeur",
  h: "Hauteur",
  rotation: "Rotation",
  skewX: "Inclinaison X",
  skewY: "Inclinaison Y",
  opacity: "Opacité",
  size: "Taille du texte",
  contentScale: "Échelle du contenu",
  progress: "Progression du chemin",
  color: "Couleur",
};
let cleanup = () => {};
function gesture(event, move) {
  cleanup();
  a.beginGesture();
  const onMove = (e) => move(e);
  const end = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    a.endGesture();
    cleanup = () => {};
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  cleanup = end;
}
function dragKey(event, clip, key) {
  event.preventDefault();
  event.stopPropagation();
  selected.value = key;
  const rect = event.currentTarget.parentElement.getBoundingClientRect();
  gesture(event, (e) => {
    key.time = Math.max(
      0,
      Math.min(
        clip.duration,
        Math.round(
          (((e.clientX - rect.left) / rect.width) * a.config.duration -
            clip.start) *
            a.config.fps,
        ) / a.config.fps,
      ),
    );
    clip.frames.sort((x, y) => x.time - y.time);
  });
}
function scrub(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const update = (e) =>
    a.seek(((e.clientX - rect.left) / rect.width) * a.config.duration);
  update(event);
  gesture(event, update);
}
function resize(event) {
  const y = event.clientY,
    h = height.value;
  gesture(
    event,
    (e) => (height.value = Math.max(180, Math.min(650, h + y - e.clientY))),
  );
}
function dragClip(event, clip) {
  event.preventDefault();
  event.stopPropagation();
  a.selectClip(clip.id);
  const rect = event.currentTarget.parentElement.getBoundingClientRect(),
    x = event.clientX,
    start = clip.start;
  gesture(event, (e) => {
    clip.start = Math.max(
      0,
      Math.min(
        a.config.duration - 0.1,
        Math.round(
          (start + ((e.clientX - x) / rect.width) * a.config.duration) *
            a.config.fps,
        ) / a.config.fps,
      ),
    );
  });
}
function deleteEvent(event) {
  if (
    ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName) ||
    event.target.isContentEditable
  )
    return;
  event.preventDefault();
  delKey();
}
function delKey() {
  if (a.clip && selected.value)
    a.clip.frames = a.clip.frames.filter((k) => k !== selected.value);
  selected.value = null;
}
onUnmounted(() => cleanup());
</script>
<template>
  <section
    @keydown.delete.stop="deleteEvent($event)"
    @keydown.left.stop
    @keydown.right.stop
    @keydown.up.stop
    @keydown.down.stop
    class="animation-timeline"
    :style="{ height: height + 'px' }"
    aria-label="Timeline de l’animation"
  >
    <button
      class="timeline-resizer"
      aria-label="Redimensionner la timeline"
      @pointerdown="resize"
    ></button>
    <div class="animation-transport">
      <div class="bottom-tools">
        <button class="icon-btn" title="Début" @click="a.seek(0)">
          <SkipBack :size="16" /></button
        ><button
          class="icon-btn"
          title="Image précédente"
          @click="a.seek(a.time - 1 / a.config.fps)"
        >
          <ChevronLeft :size="16" /></button
        ><button class="btn primary" @click="a.play()">
          <component :is="a.playing ? Pause : Play" :size="16" />{{
            a.playing ? "Pause" : "Lire"
          }}</button
        ><button
          class="icon-btn"
          title="Image suivante"
          @click="a.seek(a.time + 1 / a.config.fps)"
        >
          <ChevronRight :size="16" /></button
        ><label class="timeline-time"
          ><input
            type="number"
            :value="a.time.toFixed(2)"
            min="0"
            :max="a.config.duration"
            step="0.01"
            aria-label="Temps en secondes"
            @change="a.seek($event.target.value)"
          />
          s</label
        ><label><input type="checkbox" v-model="a.loop" />Boucle</label>
        <div class="workspace-switch">
          <button
            :class="{ active: !a.preview }"
            @click="
              a.stop();
              a.preview = false;
            "
          >
            Composer</button
          ><button :class="{ active: a.preview }" @click="a.preview = true">
            Aperçu
          </button>
        </div>
      </div>
      <div class="bottom-tools">
        <label
          >Durée
          <input
            type="number"
            v-model.number="a.config.duration"
            min="0.1"
            max="120"
            step="0.1"
          />
          s</label
        ><label
          >FPS<select v-model.number="a.config.fps">
            <option v-for="n in [24, 30, 60]" :value="n" :key="n">
              {{ n }}
            </option>
          </select></label
        >
        <details class="animation-menu">
          <summary>Export et exemples</summary>
          <div>
            <label
              >Fond<select v-model="a.config.background">
                <option value="transparent">Transparent</option>
                <option value="solid">Couleur unie / vert</option>
              </select></label
            ><input
              v-if="a.config.background === 'solid'"
              type="color"
              v-model="a.config.color"
              aria-label="Couleur du fond"
            /><label
              >Format<select v-model="a.format">
                <option value="mov">MOV · QTRLE</option>
                <option value="mkv">MKV · FFV1</option>
                <option value="webm">WebM</option>
              </select></label
            ><label
              >Résolution<select v-model.number="a.exportWidth">
                <option :value="1280">1280 × 720</option>
                <option :value="1920">1920 × 1080</option>
                <option :value="2560">2560 × 1440</option>
              </select></label
            ><button class="btn" :disabled="a.busy" @click="a.exportVideo()">
              <Download :size="14" />Exporter
            </button>
            <hr />
            <button class="btn" @click="a.example('gc')">
              Exemple Garbage Collector</button
            ><button class="btn" @click="a.example('pool')">
              Exemple String Pool
            </button>
          </div>
        </details>
      </div>
    </div>
    <div v-if="a.busy" class="animation-export-progress" role="status">
      Export · {{ Math.round(a.progress * 100) }} %<progress
        :value="a.progress"
        max="1"
      ></progress
      ><button class="btn" @click="a.cancel()">Annuler</button>
    </div>
    <div class="animation-key-tools">
      <button class="btn" @click="a.addClip()">
        <Plus :size="14" />Animer la sélection</button
      ><button
        class="icon-btn"
        :disabled="!a.clip"
        title="Dupliquer la séquence"
        @click="a.duplicateClip()"
      >
        <Copy :size="14" /></button
      ><button
        class="icon-btn"
        :disabled="!a.clip"
        title="Supprimer la séquence"
        @click="
          a.removeClip();
          selected = null;
        "
      >
        <Trash2 :size="14" /></button
      ><select v-model="a.field" aria-label="Propriété à animer">
        <option v-for="f in animationFields" :key="f" :value="f">
          {{ labels[f] }}
        </option></select
      ><select v-model="a.ease" aria-label="Interpolation des nouvelles clés">
        <option v-for="e in animationEasings" :value="e" :key="e">
          {{
            {
              linear: "Linéaire",
              smooth: "Progressive",
              easeIn: "Accélération",
              easeOut: "Décélération",
              hold: "Instantanée",
              bezier: "Courbe de Bézier",
            }[e]
          }}
        </option></select
      ><button class="btn" @click="a.addKey()">
        <Diamond :size="14" />Ajouter une clé</button
      ><button class="btn" @click="a.addLink()">Référence</button
      ><button class="btn" @click="a.addPath()">
        <Route :size="14" />Spline</button
      ><span class="field-help"
        >Ajuste la valeur d’une clé ci-dessous. Composer modifie la base.</span
      >
    </div>
    <div class="animation-tracks">
      <div class="animation-ruler">
        <span>Séquences</span>
        <div ref="ruler" class="timeline-ruler" @pointerdown="scrub">
          <span
            v-for="i in 9"
            :key="i"
            :style="{ left: ((i - 1) / 8) * 100 + '%' }"
            >{{ (((i - 1) * a.config.duration) / 8).toFixed(1) }}</span
          ><i :style="{ left: (a.time / a.config.duration) * 100 + '%' }"></i>
        </div>
      </div>
      <template v-for="c in a.config.clips" :key="c.id"
        ><div :class="['animation-track', { active: a.selectedClip === c.id }]">
          <button
            class="track-name"
            @click="
              a.selectClip(c.id);
              selected = null;
            "
          >
            <span :class="{ 'track-disabled': !c.enabled }">{{ c.name }}</span
            ><small>{{ c.keys.length }} objets</small>
          </button>
          <div class="track-lane" @pointerdown.self="a.selectClip(c.id)">
            <span
              class="clip-span"
              :style="{
                left: (c.start / a.config.duration) * 100 + '%',
                width: (c.duration / a.config.duration) * 100 + '%',
              }"
              title="Glisser pour décaler la séquence"
              @pointerdown="dragClip($event, c)"
            ></span
            ><i
              class="track-cursor"
              :style="{ left: (a.time / a.config.duration) * 100 + '%' }"
            ></i>
          </div>
        </div>
        <template v-if="a.selectedClip === c.id"
          ><div
            v-for="f in animationFields.filter((f) =>
              c.frames.some((k) => k.field === f),
            )"
            :key="f"
            class="animation-property-track"
          >
            <span class="property-track-label">{{ labels[f] }}</span>
            <div class="track-lane">
              <button
                v-for="(key, n) in c.frames.filter((k) => k.field === f)"
                :key="n"
                :class="['key-diamond', { selected: selected === key }]"
                :style="{
                  left: ((c.start + key.time) / a.config.duration) * 100 + '%',
                  top: '6px',
                }"
                :aria-label="labels[key.field] + ' à ' + key.time + ' secondes'"
                :title="
                  labels[key.field] + ' · ' + key.time + ' s · ' + key.value
                "
                @pointerdown="dragKey($event, c, key)"
              >
                ◆</button
              ><i
                class="track-cursor"
                :style="{ left: (a.time / a.config.duration) * 100 + '%' }"
              ></i>
            </div></div></template
      ></template>
      <p v-if="!a.config.clips.length" class="animation-empty">
        Sélectionne un objet, puis « Animer la sélection ». Les exemples sont
        disponibles dans « Export et exemples ».
      </p>
    </div>
    <div
      v-if="selected && a.clip?.frames.includes(selected)"
      class="animation-key-editor"
    >
      <strong>{{ labels[selected.field] }}</strong
      ><label
        >Temps local · s<input
          type="number"
          v-model.number="selected.time"
          min="0"
          :max="a.clip.duration"
          step="0.01"
          @change="a.clip.frames.sort((x, y) => x.time - y.time)" /></label
      ><label
        >Valeur<input
          :type="selected.field === 'color' ? 'color' : 'number'"
          :value="selected.value"
          step="0.1"
          @input="
            selected.value =
              selected.field === 'color'
                ? $event.target.value
                : Number($event.target.value)
          " /></label
      ><label
        >Vers la clé suivante<select v-model="selected.ease">
          <option v-for="e in animationEasings" :value="e" :key="e">
            {{ e }}
          </option>
        </select></label
      ><template v-if="selected.ease === 'bezier'"
        ><label v-for="(name, i) in ['X1', 'Y1', 'X2', 'Y2']" :key="i"
          >{{ name
          }}<input
            type="number"
            v-model.number="selected.curve[i]"
            :min="i % 2 ? -2 : 0"
            :max="i % 2 ? 3 : 1"
            step="0.05" /></label></template
      ><button class="icon-btn" title="Supprimer la clé" @click="delKey">
        <Trash2 :size="15" />
      </button>
    </div>
  </section>
</template>
