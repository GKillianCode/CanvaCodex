<script setup>
import { useModalScroll } from "../modalScroll.js";
import {
  resolveAnimationFormat,
  hasTransparentScenes,
} from "../animationExportSettings.js";
import {
  reactive,
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
} from "vue";
import {
  Play,
  Pause,
  X,
  Download,
  SkipBack,
  Film,
  Layers,
  Settings2,
  CheckCircle2,
  AlertCircle,
} from "lucide-vue-next";
import { renderAnimationStoryboard } from "../animationStoryboardRender.js";
import { renderAnimation } from "../animationRender.js";
import { prepareImages } from "../render.js";
import { prepareFonts } from "../fontAssets.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation,
  canvas = ref(null),
  root = ref(null),
  ready = ref(false),
  error = ref("");
const exportScenes = computed(() => (a.allScenes ? s.slides : [s.current]));
const resolvedFormat = computed(() =>
  resolveAnimationFormat(a.format, exportScenes.value),
);
const hasAlpha = computed(() => hasTransparentScenes(exportScenes.value));
const formatHelp = computed(
  () =>
    ({
      mp4: "Fichier léger, fond opaque. Idéal pour cette animation complète.",
      mkv: "Transparence conservée, compression sans perte optimisée.",
      mov: "Compatibilité QTRLE et transparence. Fichiers volumineux.",
      webm: "Capture en temps réel sur fond opaque.",
    })[resolvedFormat.value],
);
useModalScroll(() => true);
let disposed = false, previousFocus;
function draw() {
  if (!canvas.value || !ready.value) return;
  const ctx = canvas.value.getContext("2d");
  ctx.clearRect(0, 0, 1920, 1080);
  if (resolvedFormat.value === "mp4") {
    ctx.fillStyle = a.exportBackground;
    ctx.fillRect(0, 0, 1920, 1080);
  }
  if (a.allScenes)
    renderAnimationStoryboard(ctx, s.slides, s.theme, a.playbackTime);
  else renderAnimation(ctx, s.current, s.theme, a.config, a.time);
}
watch(
  () => [a.time, a.allScenes, a.format, a.exportBackground, s.current, s.theme],
  draw,
  { deep: true },
);
function close() {
  if (a.busy) return;
  a.stop();
  a.previewOpen = false;
}
function keyboard(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopImmediatePropagation();
    close();
  }
  if (e.key === "Tab") {
    const list = [
      ...root.value.querySelectorAll(
        "button:not(:disabled),input:not(:disabled),select:not(:disabled),a",
      ),
    ].filter((x) => !x.matches(":disabled") && x.getClientRects().length);
    if (!list.length) return;
    const first = list[0],
      last = list.at(-1);
    if (!list.includes(document.activeElement)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
      return;
    }
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
onMounted(async () => {
  previousFocus = document.activeElement;
  root.value?.focus();
  window.addEventListener("keydown", keyboard, true);
  try {
    await prepareFonts(s.slides);
    await prepareImages(s.slides, s.theme);
    if (disposed) return;
    ready.value = true;
    await nextTick();
    draw();
  } catch (e) {
    if (!disposed) error.value = e.message;
  }
});
onUnmounted(() => {
  disposed = true;
  a.stop();
  window.removeEventListener("keydown", keyboard, true);
  previousFocus?.focus?.({ preventScroll: true });
});
</script>
<template>
  <div class="animation-export-backdrop" @pointerdown.stop @click.self="close">
    <section
      ref="root"
      tabindex="-1"
      class="animation-preview-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Aperçu de l’animation"
    >
      <header class="animation-preview-heading">
        <div class="animation-export-title">
          <span class="animation-export-symbol"><Film :size="20" /></span>
          <div>
            <h2>Exporter l’animation</h2>
            <small>{{ s.current.title || "Animation" }}</small>
          </div>
        </div>
        <button
          class="icon-btn"
          :disabled="a.busy"
          aria-label="Fermer l’aperçu"
          @click="close"
        >
          <X :size="19" />
        </button>
      </header>
      <div class="animation-export-body">
        <div class="animation-export-player">
          <div class="animation-preview-screen">
            <canvas
              ref="canvas"
              width="1920"
              height="1080"
              aria-label="Rendu de l’animation à l’instant courant"
            />
          </div>
          <fieldset
            class="animation-export-transport"
            :disabled="a.busy || !ready || !!error"
          >
            <div class="workspace-switch">
              <button
                title="Revenir au début"
                aria-label="Revenir au début"
                @click="a.seekPlayback(0)"
              >
                <SkipBack :size="16" /></button
              ><button
                :title="a.playing ? 'Pause' : 'Lire l’aperçu'"
                :aria-label="a.playing ? 'Pause' : 'Lire l’aperçu'"
                @click="a.play()"
              >
                <component :is="a.playing ? Pause : Play" :size="17" />
              </button>
            </div>
            <input
              type="range"
              min="0"
              :max="a.totalDuration"
              :step="1 / a.config.fps"
              :value="a.playbackTime"
              aria-label="Position de lecture"
              @input="a.seekPlayback($event.target.value)"
            />
            <label class="animation-export-time"
              ><input
                type="number"
                min="0"
                :max="a.totalDuration"
                step=".01"
                :value="a.playbackTime.toFixed(2)"
                aria-label="Temps de l’aperçu"
                @change="a.seekPlayback($event.target.value)"
              /><span>/ {{ a.totalDuration }} s</span></label
            >
            <label
              class="animation-export-loop"
              title="Boucler la lecture de l’aperçu"
              ><input type="checkbox" v-model="a.loop" />Boucle</label
            >
          </fieldset>
          <div class="animation-export-summary">
            <span>{{
              a.allScenes ? s.slides.length + " scènes" : "Scène actuelle"
            }}</span
            ><span>{{ a.totalDuration }} s</span
            ><span>{{ a.config.fps }} images/s</span>
          </div>
        </div>
        <fieldset
          class="animation-export-options"
          :disabled="a.busy || !ready || !!error"
          aria-label="Réglages de l’export"
        >
          <div class="animation-export-section">
            <h3><Layers :size="15" />Contenu</h3>
            <label class="animation-export-check"
              ><span
                >Toutes les scènes<small
                  >Assembler l’animation complète</small
                ></span
              ><input
                type="checkbox"
                v-model="a.allScenes"
                @change="a.stop()"
                aria-label="Toutes les scènes"
            /></label>
          </div>
          <div class="animation-export-section">
            <h3><Settings2 :size="15" />Fichier vidéo</h3>
            <label class="animation-export-field"
              >Format<select
                v-model="a.format"
                aria-label="Format vidéo de l’aperçu"
              >
                <option value="auto">Automatique · recommandé</option>
                <option value="mp4">MP4 · léger, fond opaque</option>
                <option value="mkv">MKV · transparent, sans perte</option>
                <option value="mov">MOV · QTRLE compatible</option>
                <option value="webm">WebM · fond opaque</option>
              </select></label
            >
            <p class="animation-export-hint">
              <strong v-if="a.format === 'auto'"
                >{{ resolvedFormat.toUpperCase() }} · </strong
              >{{ formatHelp }}
            </p>
            <label class="animation-export-field"
              >Résolution<select
                v-model.number="a.exportWidth"
                aria-label="Résolution de l’export"
              >
                <option :value="1280">HD · 1280 × 720</option>
                <option :value="1920">Full HD · 1920 × 1080</option>
                <option :value="2560">QHD · 2560 × 1440</option>
              </select></label
            >
            <label
              v-if="resolvedFormat === 'mp4'"
              class="animation-export-field"
              >Qualité<select
                v-model="a.exportQuality"
                aria-label="Qualité vidéo"
              >
                <option value="balanced">Équilibrée · recommandée</option>
                <option value="fine">Élevée · détails plus fins</option>
                <option value="small">Compacte · fichier plus petit</option>
              </select></label
            >
            <label
              v-if="resolvedFormat === 'mp4' && hasAlpha"
              class="animation-export-background"
              >Fond de remplacement<input
                type="color"
                v-model="a.exportBackground"
                aria-label="Fond opaque du MP4"
            /></label>
            <p
              v-if="resolvedFormat === 'mp4' && hasAlpha"
              class="animation-export-hint"
            >
              Le MP4 remplace la transparence par cette couleur. Pour la
              conserver, choisis MKV ou MOV.
            </p>
          </div>
        </fieldset>
      </div>
      <p
        v-if="error || a.exportError"
        class="animation-export-error"
        role="alert"
      >
        <AlertCircle :size="17" />{{ error || a.exportError }}
      </p>
      <footer class="animation-export-footer">
        <div v-if="a.busy" class="animation-export-progress" role="status">
          <div>
            <span>{{ a.exportPhase }}</span
            ><strong>{{ Math.round(a.progress * 100) }} %</strong>
          </div>
          <progress
            :value="a.progress"
            max="1"
            aria-label="Progression de l’export"
          />
        </div>
        <span v-else class="animation-export-ready"
          ><CheckCircle2 :size="16" />{{
            ready ? "Prêt à exporter" : "Préparation de l’aperçu…"
          }}</span
        >
        <button v-if="a.busy" class="btn" @click="a.cancel()">
          Annuler l’export
        </button>
        <button
          v-else
          class="btn primary"
          :disabled="!ready || !!error"
          @click="a.exportVideo()"
        >
          <Download :size="17" />Exporter en {{ resolvedFormat.toUpperCase() }}
        </button>
      </footer>
    </section>
  </div>
</template>
