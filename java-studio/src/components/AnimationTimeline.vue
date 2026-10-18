<script setup>
import { reactive, ref, computed, onMounted, onUnmounted, nextTick } from "vue";
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
  Maximize2,
  Minus,
} from "lucide-vue-next";
import { animationFields, animationEasings } from "../animationModel.js";
import { timelineView, timelineTime } from "../animationTimelineView.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation,
  height = ref(260),
  zoom = ref(100),
  tracks = ref(null),
  world = ref(null),
  menu = ref(null);
const view = computed(() => timelineView(a.config.duration, zoom.value));
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
const easeLabels = {
  linear: "Linéaire",
  smooth: "Progressive",
  easeIn: "Accélération",
  easeOut: "Décélération",
  hold: "Instantanée",
  bezier: "Bézier",
};
let cleanup = () => {};
function gesture(move) {
  cleanup();
  a.beginGesture();
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    a.endGesture();
    cleanup = () => {};
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  cleanup = end;
}
function dragKey(event, c, key) {
  event.preventDefault();
  event.stopPropagation();
  a.activeKey = key;
  const rect = event.currentTarget.parentElement.getBoundingClientRect();
  gesture((e) => {
    key.time = Math.max(
      0,
      Math.min(
        c.duration,
        Math.round(
          timelineTime(
            e.clientX,
            rect.left,
            rect.width,
            view.value.span,
            c.start,
          ) * a.config.fps,
        ) / a.config.fps,
      ),
    );
    c.frames.sort((x, y) => x.time - y.time);
  });
}
function scrub(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const update = (e) =>
    a.seek(timelineTime(e.clientX, rect.left, rect.width, view.value.span));
  update(event);
  gesture(update);
}
function resize(event) {
  const y = event.clientY,
    h = height.value;
  gesture(
    (e) => (height.value = Math.max(180, Math.min(650, h + y - e.clientY))),
  );
}
function dragClip(event, c) {
  event.preventDefault();
  a.selectClip(c.id);
  const rect = event.currentTarget.parentElement.getBoundingClientRect(),
    x = event.clientX,
    start = c.start;
  gesture(
    (e) =>
      (c.start = Math.max(
        0,
        Math.min(
          a.config.duration - 0.1,
          Math.round(
            (start + ((e.clientX - x) / rect.width) * view.value.span) *
              a.config.fps,
          ) / a.config.fps,
        ),
      )),
  );
}
async function zoomAt(value, event) {
  const el = tracks.value;
  if (!el) return;
  const rect = el.getBoundingClientRect(),
    pointer = event ? event.clientX - rect.left : rect.width / 2,
    oldWidth = world.value.getBoundingClientRect().width,
    time =
      ((el.scrollLeft + pointer - 210) / Math.max(1, oldWidth - 210)) *
      view.value.span;
  zoom.value = timelineView(a.config.duration, value).zoom;
  await nextTick();
  const width = world.value.getBoundingClientRect().width;
  el.scrollLeft = Math.max(
    0,
    210 + (time / view.value.span) * (width - 210) - pointer,
  );
}
function wheel(event) {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  zoomAt(zoom.value * Math.exp(-event.deltaY * 0.002), event);
}
function context(event, c, key) {
  event.preventDefault();
  event.stopPropagation();
  a.selectClip(c.id);
  a.activeKey = key;
  menu.value = {
    c,
    key,
    x: Math.min(innerWidth - 210, event.clientX),
    y: Math.min(innerHeight - 130, event.clientY),
  };
}
function outside(event) {
  if (!event.target.closest(".animation-key-context")) menu.value = null;
}
function deleteEvent(event) {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
  event.preventDefault();
  if (a.clip && a.activeKey) a.deleteKey(a.clip, a.activeKey);
}
onMounted(() => {
  tracks.value.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("pointerdown", outside);
});
onUnmounted(() => {
  cleanup();
  tracks.value?.removeEventListener("wheel", wheel);
  window.removeEventListener("pointerdown", outside);
});
</script>
<template>
  <section
    class="animation-timeline"
    :style="{ height: height + 'px' }"
    aria-label="Timeline de l’animation"
    @keydown.delete.stop="deleteEvent($event)"
    @keydown.left.stop
    @keydown.right.stop
    @keydown.up.stop
    @keydown.down.stop
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
            step=".01"
            aria-label="Temps en secondes"
            @change="a.seek($event.target.value)"
          />
          s</label
        ><label><input type="checkbox" v-model="a.loop" />Boucle</label>
        <div
          class="workspace-switch"
          title="Base des objets : disposition hors animation. État animé : rendu à l’instant du curseur."
        >
          <button
            :class="{ active: !a.preview }"
            @click="
              a.stop();
              a.preview = false;
            "
          >
            Base des objets</button
          ><button :class="{ active: a.preview }" @click="a.preview = true">
            État animé
          </button>
        </div>
        <button
          class="btn"
          @click="
            a.preview = true;
            a.previewOpen = true;
          "
        >
          <Maximize2 :size="15" />Aperçu plein écran
        </button>
      </div>
      <div class="bottom-tools">
        <button
          class="icon-btn"
          aria-label="Dézoomer la timeline"
          @click="zoomAt(zoom / 1.25)"
        >
          <Minus :size="14" /></button
        ><label
          ><input
            type="number"
            :value="Math.round(zoom)"
            min="25"
            max="1600"
            aria-label="Zoom de la timeline"
            @change="zoomAt($event.target.value)"
          />
          %</label
        ><button
          class="icon-btn"
          aria-label="Zoomer la timeline"
          @click="zoomAt(zoom * 1.25)"
        >
          <Plus :size="14" />
        </button>
        <details class="animation-menu">
          <summary>Export et exemples</summary>
          <div>
            <label
              >Format<select v-model="a.format">
                <option value="mov">MOV · QTRLE</option>
                <option value="mkv">MKV · FFV1</option>
                <option value="webm">WebM · fond uni</option>
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
          a.activeKey = null;
        "
      >
        <Trash2 :size="14" /></button
      ><select v-model="a.field" aria-label="Propriété à animer">
        <option
          v-for="f in animationFields"
          :key="f"
          :value="f"
          :disabled="!!a.clip?.pathId && ['x', 'y'].includes(f)"
        >
          {{ labels[f] }}
        </option></select
      ><select v-model="a.ease" aria-label="Interpolation des nouvelles clés">
        <option v-for="e in animationEasings" :key="e" :value="e">
          {{ easeLabels[e] }}
        </option></select
      ><button class="btn" @click="a.addKey()">
        <Diamond :size="14" />Ajouter une clé</button
      ><button class="btn" @click="a.addLink()">Référence</button
      ><button class="btn" @click="a.addPath()">
        <Route :size="14" />Spline</button
      ><span class="field-help"
        >Double-clic : voir et régler la clé. Clic droit : dupliquer ou
        supprimer.</span
      >
    </div>
    <div ref="tracks" class="animation-tracks">
      <div
        ref="world"
        class="animation-tracks-world"
        :style="{ width: view.widthPercent + '%' }"
      >
        <div class="animation-ruler">
          <span>Séquences</span>
          <div class="timeline-ruler" @pointerdown="scrub">
            <span
              v-for="i in 9"
              :key="i"
              :style="{ left: ((i - 1) / 8) * 100 + '%' }"
              >{{ (((i - 1) * view.span) / 8).toFixed(1) }}</span
            ><i :style="{ left: (a.time / view.span) * 100 + '%' }"></i>
          </div>
        </div>
        <template v-for="c in a.config.clips" :key="c.id"
          ><div
            :class="['animation-track', { active: a.selectedClip === c.id }]"
          >
            <button
              class="track-name"
              @click="
                a.selectClip(c.id);
                a.activeKey = null;
              "
            >
              <span :class="{ 'track-disabled': !c.enabled }">{{ c.name }}</span
              ><small>{{ c.keys.length }} objets</small>
            </button>
            <div class="track-lane" @pointerdown.self="a.selectClip(c.id)">
              <span
                class="clip-span"
                :style="{
                  left: (c.start / view.span) * 100 + '%',
                  width: (c.duration / view.span) * 100 + '%',
                }"
                title="Glisser pour décaler la séquence"
                @pointerdown="dragClip($event, c)"
              ></span
              ><i
                class="track-cursor"
                :style="{ left: (a.time / view.span) * 100 + '%' }"
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
                  :class="['key-diamond', { selected: a.activeKey === key }]"
                  :style="{
                    left: ((c.start + key.time) / view.span) * 100 + '%',
                    top: '6px',
                  }"
                  :aria-label="
                    labels[key.field] + ' à ' + key.time + ' secondes'
                  "
                  :title="
                    labels[key.field] + ' · ' + key.time + ' s · ' + key.value
                  "
                  @pointerdown="dragKey($event, c, key)"
                  @dblclick.stop.prevent="a.focusKey(c, key)"
                  @contextmenu="context($event, c, key)"
                >
                  ◆</button
                ><i
                  class="track-cursor"
                  :style="{ left: (a.time / view.span) * 100 + '%' }"
                ></i>
              </div></div></template
        ></template>
        <p v-if="!a.config.clips.length" class="animation-empty">
          Sélectionne un objet puis « Animer la sélection ». Ajoute un moteur
          par clic droit sur la scène.
        </p>
      </div>
    </div>
    <div
      v-if="menu"
      class="animation-key-context"
      role="menu"
      :style="{ left: menu.x + 'px', top: menu.y + 'px' }"
      @pointerdown.stop
    >
      <button
        role="menuitem"
        @click="
          a.focusKey(menu.c, menu.key);
          menu = null;
        "
      >
        Afficher cet état</button
      ><button
        role="menuitem"
        @click="
          a.duplicateKey(menu.c, menu.key);
          menu = null;
        "
      >
        Dupliquer la clé</button
      ><button
        role="menuitem"
        @click="
          a.deleteKey(menu.c, menu.key);
          menu = null;
        "
      >
        Supprimer la clé
      </button>
    </div>
  </section>
</template>
