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
  Route,
  Maximize2,
  Eye,
  EyeOff,
  Power,
  ChevronDown,
} from "lucide-vue-next";
import {
  animationFields,
  animationEasings,
  discreteAnimationFields,
} from "../animationModel.js";
import { timelineView, timelineTime } from "../animationTimelineView.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation,
  height = ref(260),
  zoom = ref(100),
  tracks = ref(null),
  world = ref(null),
  menu = ref(null),
  showHidden = ref(false);
const view = computed(() => timelineView(a.config.duration, zoom.value));
const labels = {
  fillEnabled: "Remplissage activé",
  strokeEnabled: "Contour activé",
  dashed: "Pointillés",
  strokeWidth: "Épaisseur du contour",
  radius: "Arrondi",
  points: "Branches",
  innerRatio: "Profondeur",
  strokeColor: "Couleur du contour",
  engineGravity: "Force de gravité",
  particleForce: "Force d’émission",
  particleSpeed: "Vitesse des particules",
  particleSize: "Taille des particules",
  particleCount: "Quantité de particules",
  particleLife: "Vie des particules",
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
  color: "Couleur du remplissage",
  backgroundColor:"Fond · couleur 1",backgroundColor2:"Fond · couleur 2",backgroundAngle:"Fond · angle",
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
  event.preventDefault();
  const rect = (
    event.currentTarget.closest(".timeline-ruler") || event.currentTarget
  ).getBoundingClientRect();
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
      ((el.scrollLeft + pointer - 280) / Math.max(1, oldWidth - 280)) *
      view.value.span;
  zoom.value = timelineView(a.config.duration, value).zoom;
  await nextTick();
  const width = world.value.getBoundingClientRect().width;
  el.scrollLeft = Math.max(
    0,
    280 + (time / view.value.span) * (width - 280) - pointer,
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
function addFrameAt(event, c) {
  if (event.target.closest("button")) return;
  const rect = event.currentTarget.getBoundingClientRect();
  a.selectClip(c.id);
  a.seek(timelineTime(event.clientX, rect.left, rect.width, view.value.span));
  a.addFrame();
}
function frameTimes(c) {
  return [
    ...new Set([...(c.markers || []), ...c.frames.map((f) => f.time)]),
  ].sort((a, b) => a - b);
}
function deleteEvent(event) {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
  event.preventDefault();
  if (a.clip && a.activeKey) a.deleteKey(a.clip, a.activeKey);
  else if (a.clip && a.activeFrame) a.removeFrame(a.clip, a.activeFrame.time);
  else if (a.clip) a.removeClip();
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
        ><button
          class="btn primary"
          title="Lire ou mettre en pause l’animation"
          @click="a.play()"
        >
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
        ><label title="Recommencer la scène à la fin"
          ><input type="checkbox" v-model="a.loop" />Boucle</label
        >
        <div
          class="workspace-switch"
          title="Disposition initiale : disposition hors animation. État animé : rendu à l’instant du curseur."
        >
          <button
            :class="{ active: !a.preview }"
            @click="
              a.stop();
              a.preview = false;
            "
          >
            Disposition initiale</button
          ><button :class="{ active: a.preview }" @click="a.preview = true">
            État animé
          </button>
        </div>
        <button
          class="icon-btn"
          title="Ouvrir l’aperçu plein écran"
          aria-label="Aperçu plein écran"
          @click="
            a.preview = true;
            a.previewOpen = true;
          "
        >
          <Maximize2 :size="15" />
        </button>
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
      <button
        class="btn primary"
        title="Poser une image clé à cet instant, puis lui associer des propriétés avec les losanges"
        @click="a.addFrame()"
      >
        <Diamond :size="14" />Ajouter une image clé
      </button>
      <button
        class="btn"
        title="Créer une séquence pour les objets sélectionnés"
        @click="a.addClip()"
      >
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
        @click="a.removeClip()"
      >
        <Trash2 :size="14" /></button
      ><button
        class="btn"
        title="Relier les deux objets sélectionnés par une flèche"
        @click="a.addLink()"
      >
        Référence</button
      ><button
        class="btn"
        title="Créer une trajectoire pour la séquence sélectionnée"
        @click="a.addPath()"
      >
        <Route :size="14" />Spline</button
      ><label title="Réafficher les séquences masquées"
        ><input type="checkbox" v-model="showHidden" />Pistes masquées</label
      ><span class="field-help"
        >Losanges dans les propriétés · Ctrl + molette : zoom temporel.</span
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
            ><button
              class="playhead-head"
              :style="{ left: (a.time / view.span) * 100 + '%' }"
              title="Glisser pour déplacer la tête de lecture"
              aria-label="Tête de lecture"
              @pointerdown.stop="scrub"
            ></button
            ><i :style="{ left: (a.time / view.span) * 100 + '%' }"></i>
          </div>
        </div>
        <template
          v-for="c in a.config.clips.filter((c) => !c.hidden || showHidden)"
          :key="c.id"
          ><div
            :class="[
              'animation-track',
              { active: a.selectedClip === c.id, muted: !c.enabled },
            ]"
          >
            <div class="track-name" @click="a.selectClip(c.id)">
              <button
                class="icon-btn"
                :title="
                  c.collapsed
                    ? 'Déplier les propriétés'
                    : 'Replier les propriétés'
                "
                @click.stop="c.collapsed = !c.collapsed"
              >
                <ChevronDown
                  :size="12"
                  :style="{ transform: c.collapsed ? 'rotate(-90deg)' : '' }"
                /></button
              ><input
                :aria-label="'Nom de la séquence ' + c.name"
                v-model="c.name"
                maxlength="100"
                title="Renommer la séquence"
                @pointerdown.stop
              /><button
                class="icon-btn"
                :title="
                  c.enabled
                    ? 'Désactiver cette animation'
                    : 'Réactiver cette animation'
                "
                :aria-pressed="c.enabled"
                @click.stop="c.enabled = !c.enabled"
              >
                <Power
                  :size="12"
                  :style="{ opacity: c.enabled ? 1 : 0.35 }"
                /></button
              ><button
                class="icon-btn"
                :title="c.hidden ? 'Réafficher la piste' : 'Masquer la piste'"
                @click.stop="c.hidden = !c.hidden"
              >
                <component :is="c.hidden ? EyeOff : Eye" :size="12" /></button
              ><button
                class="icon-btn"
                title="Supprimer cette séquence"
                @click.stop="
                  a.selectClip(c.id);
                  a.removeClip();
                "
              >
                <Trash2 :size="12" />
              </button>
            </div>
            <div
              class="track-lane"
              @pointerdown.self="a.selectClip(c.id)"
              @dblclick.stop.prevent="addFrameAt($event, c)"
            >
              <span
                class="clip-span"
                :style="{
                  left: (c.start / view.span) * 100 + '%',
                  width: (c.duration / view.span) * 100 + '%',
                }"
                title="Glisser pour décaler la séquence"
                @pointerdown="dragClip($event, c)"
              ></span
              ><button
                v-for="t in frameTimes(c)"
                :key="t"
                class="frame-marker"
                :class="{
                  empty: !c.frames.some((f) => Math.abs(f.time - t) < 0.0001),
                }"
                :style="{ left: ((c.start + t) / view.span) * 100 + '%' }"
                :aria-label="'Image clé à ' + t + ' secondes'"
                :title="
                  'Image clé · ' + t + ' s · double-clic : afficher cet état'
                "
                @pointerdown.stop
                @click.stop="a.focusFrame(c, t)"
                @dblclick.stop.prevent="a.focusFrame(c, t)"
                @contextmenu.prevent.stop="
                  menu = {
                    c,
                    frameTime: t,
                    x: Math.min(innerWidth - 210, $event.clientX),
                    y: Math.min(innerHeight - 180, $event.clientY),
                  }
                "
              >
                ◆</button
              ><i
                class="track-cursor"
                :style="{ left: (a.time / view.span) * 100 + '%' }"
              ></i>
            </div>
          </div>
          <template v-if="a.selectedClip === c.id && !c.collapsed"
            ><div
              v-for="f in animationFields.filter((f) =>
                c.frames.some((k) => k.field === f),
              )"
              :key="f"
              class="animation-property-track"
            >
              <span class="property-track-label"
                >{{ labels[f]
                }}<select
                  :aria-label="'Interpolation · ' + labels[f]"
                  :value="c.frames.find((k) => k.field === f)?.ease || c.easing"
                  title="Interpolation de cette propriété"
                  :disabled="discreteAnimationFields.includes(f)"
                  @change="
                    a.beginGesture();
                    c.frames
                      .filter((k) => k.field === f)
                      .forEach((k) => (k.ease = $event.target.value));
                    a.endGesture();
                  "
                >
                  <option
                    v-for="ease in animationEasings"
                    :key="ease"
                    :value="ease"
                  >
                    {{ easeLabels[ease] }}
                  </option>
                </select></span
              >
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
      <template v-if="menu.frameTime !== undefined"
        ><button
          role="menuitem"
          @click="
            a.focusFrame(menu.c, menu.frameTime);
            menu = null;
          "
        >
          Afficher cet état</button
        ><button
          role="menuitem"
          @click="
            a.removeFrame(menu.c, menu.frameTime);
            menu = null;
          "
        >
          Supprimer l’image clé
        </button></template
      ><template v-else
        ><button
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
        </button></template
      >
    </div>
  </section>
</template>
