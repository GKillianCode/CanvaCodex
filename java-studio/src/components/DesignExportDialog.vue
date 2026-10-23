<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { X, Download } from "lucide-vue-next";
import {
  exportDesignRegion,
  downloadDesign,
  embedDesignFonts,
  loadDesignFonts,
  rasterizeDesignSvg,
} from "../designExport.js";
const props = defineProps({
    document: Object,
    pageIndex: Number,
    selection: Array,
  }),
  emit = defineEmits(["close", "pdf"]);
const format = ref(props.document.kind === "layout" ? "pdf" : "svg"),
  scope = ref(props.selection.length ? "selection" : "page"),
  transparent = ref(props.document.transparent),
  padding = ref(0),
  scale = ref(1),
  busy = ref(false),
  error = ref(""),
  dialog = ref(null);
const result = computed(() => {
  try {
    return exportDesignRegion(props.document, props.pageIndex, {
      scope: format.value === "pdf" ? "page" : scope.value,
      selection: props.selection,
      transparent: format.value === "pdf" ? false : transparent.value,
      padding: padding.value,
    });
  } catch (e) {
    return { error: e.message };
  }
});
const preview = ref(""),
  preparing = ref(false);
let generation = 0,
  preparation = Promise.resolve("");
watch(
  result,
  (r) => {
    const current = ++generation;
    preview.value = "";
    error.value = "";
    preparing.value = true;
    const source = props.document,
      index = props.pageIndex,
      options = {
        scope: format.value === "pdf" ? "page" : scope.value,
        selection: [...props.selection],
        transparent: format.value === "pdf" ? false : transparent.value,
        padding: padding.value,
      };
    preparation = r.svg
      ? loadDesignFonts(r.elements).then(() =>
          embedDesignFonts(
            exportDesignRegion(source, index, options).svg,
            r.elements,
          ),
        )
      : Promise.resolve("");
    preparation
      .then((svg) => {
        if (current === generation)
          preview.value = svg
            ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
            : "";
      })
      .catch((e) => {
        if (current === generation) error.value = e.message;
      })
      .finally(() => {
        if (current === generation) preparing.value = false;
      });
  },
  { immediate: true },
);
async function download() {
  error.value = "";
  busy.value = true;
  try {
    await document.fonts.ready;
    if (format.value === "pdf") {
      emit("pdf");
      return;
    }
    const r = result.value;
    if (r.error) throw Error(r.error);
    if (format.value === "svg") {
      downloadDesign(
        await preparation,
        props.document.name + ".svg",
        "image/svg+xml",
      );
      return;
    }
    const w = Math.ceil(r.w * scale.value),
      h = Math.ceil(r.h * scale.value);
    const blob = await rasterizeDesignSvg(await preparation, w, h);
    downloadDesign(blob, props.document.name + ".png", "image/png");
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
function key(e) {
  if (e.key === "Escape" && !busy.value) {
    e.stopPropagation();
    emit("close");
  }
  if (e.key === "Tab") {
    const nodes = [
      ...dialog.value.querySelectorAll("button:not(:disabled),select,input"),
    ];
    const i = nodes.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) {
      e.preventDefault();
      nodes.at(-1)?.focus();
    } else if (!e.shiftKey && i === nodes.length - 1) {
      e.preventDefault();
      nodes[0]?.focus();
    }
  }
}
let previous;
onMounted(() => {
  previous = document.activeElement;
  dialog.value?.focus();
});
onBeforeUnmount(() => {
  generation++;
  previous?.focus();
});
</script>
<template>
  <div
    class="modal-backdrop design-export-backdrop"
    @click.self="!busy && emit('close')"
  >
    <section
      ref="dialog"
      class="design-export-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Exporter le document"
      tabindex="-1"
      @keydown.stop="key"
    >
      <header>
        <div>
          <span class="eyebrow">EXPORT</span>
          <h2>{{ document.name }}</h2>
        </div>
        <button
          class="icon-btn"
          :disabled="busy"
          aria-label="Fermer l’export"
          @click="emit('close')"
        >
          <X :size="19" />
        </button>
      </header>
      <div class="design-export-body">
        <div class="design-export-preview">
          <img
            v-if="preview"
            :src="preview"
            alt="Aperçu exact de la zone exportée"
          />
          <p v-else>
            {{ preparing ? "Préparation de l’aperçu…" : error || result.error }}
          </p>
        </div>
        <aside>
          <label
            >Format<select
              aria-label="Format"
              v-model="format"
              :disabled="busy"
            >
              <option value="svg">SVG · vectoriel</option>
              <option value="png">PNG · image</option>
              <option v-if="document.kind === 'layout'" value="pdf">
                PDF · toutes les pages
              </option>
            </select></label
          ><template v-if="format !== 'pdf'"
            ><label
              >Zone à exporter<select
                aria-label="Zone à exporter"
                v-model="scope"
                :disabled="busy"
              >
                <option value="page">Plan de travail entier</option>
                <option value="drawing">Dessin · recadrage automatique</option>
                <option value="selection" :disabled="!selection.length">
                  Sélection uniquement
                </option>
              </select></label
            ><label v-if="scope !== 'page'"
              >Marge autour · px<input
                v-model.number="padding"
                type="number"
                min="0"
                max="500"
                :disabled="busy" /></label
            ><label class="checkbox-label"
              ><input
                v-model="transparent"
                type="checkbox"
                :disabled="busy"
              />Fond transparent</label
            ><label v-if="format === 'png'"
              >Échelle<select
                aria-label="Échelle PNG"
                v-model.number="scale"
                :disabled="busy"
              >
                <option :value="1">1×</option>
                <option :value="2">2×</option>
                <option :value="3">3×</option>
              </select></label
            >
            <p class="field-help" v-if="!result.error">
              {{ Math.ceil(result.w * (format === "png" ? scale : 1)) }} ×
              {{ Math.ceil(result.h * (format === "png" ? scale : 1)) }} px
            </p></template
          >
          <p v-else class="field-help">
            {{ document.pages.length }} pages. L’aperçu montre la page active.
            Choisis « Enregistrer en PDF » dans la fenêtre d’impression.
          </p>
          <p v-if="error" role="alert">{{ error }}</p>
          <button
            class="btn primary"
            :disabled="busy || preparing || !!result.error || !!error"
            @click="download"
          >
            <Download :size="16" />{{
              busy ? "Préparation…" : "Exporter " + format.toUpperCase()
            }}
          </button>
        </aside>
      </div>
    </section>
  </div>
</template>
