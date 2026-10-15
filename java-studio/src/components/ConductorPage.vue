<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import {
  Maximize2,
  Minimize2,
  Plus,
  ImagePlus,
  Move,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
} from "lucide-vue-next";
import ConductorRichEditor from "./ConductorRichEditor.vue";
import { renderConductor } from "../notebookMarkdown.js";
import {
  pageMarkdown,
  pageHeight,
  pageGeometry,
  PAGE_WIDTH,
} from "../conductorPage.js";
import { imageSource, imageImportError } from "../imageImport.js";
const props = defineProps({
  modelValue: String,
  layout: Array,
  images: { type: Array, default: () => [] },
  otherContent: String,
  label: String,
  readonly: Boolean,
  maxLength: { type: Number, default: 50000 },
});
const emit = defineEmits([
  "update:modelValue",
  "update:layout",
  "update:images",
  "error",
]);
// Existing documents keep their text and gain independently movable image blocks.
function initialBlocks() {
  if (props.layout) return JSON.parse(JSON.stringify(props.layout));
  const pictures = [];
  const content = (props.modelValue || "")
    .replace(/!\[[^\]\n]*\]\(frame-image:([\w-]+)\)/g, (source, id) => {
      const image = props.images.find((i) => i.id === id);
      if (!image) return source;
      pictures.push(image);
      return "";
    })
    .trim();
  const rows = [
    {
      id: crypto.randomUUID(),
      kind: "text",
      name: "Texte principal",
      content,
      imageId: "",
      x: 40,
      y: 40,
      width: 920,
      height: 380,
    },
  ];
  for (const [index, image] of pictures.entries()) {
    const width = Math.round((920 * image.width) / 100);
    rows.push({
      id: crypto.randomUUID(),
      kind: "image",
      name: image.alt || "Illustration",
      content: "",
      imageId: image.id,
      x: image.align === "right" ? 960 - width : 40,
      y: 460 + index * 360,
      width: Math.max(100, width),
      height: 300,
    });
  }
  return rows;
}
const blocks = ref(initialBlocks());
const selected = ref(""),
  expanded = ref(false),
  snap = ref(true),
  viewport = ref(null),
  scale = ref(1),
  tools = ref(null),
  busy = ref(false),
  editors = ref({});
let observer,
  cleanup,
  upload,
  oldOverflow = "";
const active = computed(() =>
  blocks.value.find((b) => b.id === selected.value),
);
const height = computed(() => pageHeight(blocks.value, !props.readonly));
const usedContent = computed(
  () =>
    blocks.value
      .map((b) =>
        b.kind === "image" ? "![](frame-image:" + b.imageId + ")" : b.content,
      )
      .join("\n") +
    "\n" +
    (props.otherContent || ""),
);
watch(
  () => props.layout,
  (value) => {
    if (value && JSON.stringify(value) !== JSON.stringify(blocks.value))
      blocks.value = JSON.parse(JSON.stringify(value));
  },
  { deep: true },
);
function publish() {
  emit("update:layout", JSON.parse(JSON.stringify(blocks.value)));
  const content = pageMarkdown(blocks.value, props.images);
  emit("update:modelValue", content);
  const used = content + "\n" + (props.otherContent || "");
  const kept = props.images.filter((image) =>
    used.includes("(frame-image:" + image.id + ")"),
  );
  if (kept.length !== props.images.length) emit("update:images", kept);
}
function patch(value) {
  if (!active.value) return;
  Object.assign(active.value, pageGeometry(active.value, value));
  publish();
}
function addText() {
  if (blocks.value.length >= 100) return;
  const row = {
    id: crypto.randomUUID(),
    kind: "text",
    name: "Texte",
    content: "",
    imageId: "",
    x: 40,
    y: blocks.value.length
      ? Math.ceil(Math.max(...blocks.value.map((b) => b.y + b.height)) / 20) *
          20 +
        40
      : 40,
    width: 600,
    height: 180,
  };
  blocks.value.push(row);
  selected.value = row.id;
  publish();
  nextTick(() =>
    viewport.value?.scrollTo({
      top: row.y * scale.value - 80,
      behavior: "smooth",
    }),
  );
}
async function addImage(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = "";
  busy.value = true;
  upload = (async () => {
    try {
      let images = [...props.images];
      for (const file of files.slice(
        0,
        Math.min(32 - images.length, 100 - blocks.value.length),
      )) {
        const src = await imageSource(file);
        const image = {
          id: crypto.randomUUID(),
          src,
          alt: file.name.slice(0, 300),
          width: 100,
          align: "block",
        };
        images.push(image);
        emit("update:images", [...images]);
        await nextTick();
        const row = {
          id: crypto.randomUUID(),
          kind: "image",
          name: file.name.slice(0, 100),
          content: "",
          imageId: image.id,
          x: 40,
          y: blocks.value.length
            ? Math.max(...blocks.value.map((b) => b.y + b.height)) + 40
            : 40,
          width: 480,
          height: 300,
        };
        blocks.value.push(row);
        selected.value = row.id;
        publish();
        await nextTick();
        viewport.value?.scrollTo({
          top: row.y * scale.value - 80,
          behavior: "smooth",
        });
      }
    } catch (e) {
      emit("error", e.imageImport ? imageImportError(e) : e.message);
    } finally {
      busy.value = false;
      upload = null;
    }
  })();
}
function contentChanged(block, value) {
  const length = blocks.value.reduce(
    (sum, b) => sum + (b.id === block.id ? value.length : b.content.length),
    0,
  );
  if (length > props.maxLength) {
    emit("error", "La limite de texte de cette page est atteinte.");
    return;
  }
  block.content = value;
  publish();
  nextTick(() => fitText(block));
}
function fitText(block) {
  const node = viewport.value?.querySelector(
    '[data-block-id="' + block.id + '"] .rich-document',
  );
  if (!node) return;
  const needed = Math.ceil(node.scrollHeight + 16);
  if (needed > block.height) {
    block.height = Math.min(10000, needed);
    publish();
  }
}
function remove() {
  if (!active.value) return;
  blocks.value = blocks.value.filter((b) => b.id !== selected.value);
  selected.value = "";
  publish();
}
function duplicate() {
  if (!active.value || blocks.value.length >= 100) return;
  const row = {
    ...active.value,
    id: crypto.randomUUID(),
    name: active.value.name + " · copie",
    y: active.value.y + active.value.height + 20,
  };
  blocks.value.push(row);
  selected.value = row.id;
  publish();
}
function layer(delta) {
  const i = blocks.value.findIndex((b) => b.id === selected.value),
    to = i + delta;
  if (to < 0 || to >= blocks.value.length) return;
  const [row] = blocks.value.splice(i, 1);
  blocks.value.splice(to, 0, row);
  publish();
}
function gesture(event, block, handle = "move") {
  if (props.readonly || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  selected.value = block.id;
  cleanup?.();
  const initial = { ...block },
    startX = event.clientX,
    startY = event.clientY;
  const move = (e) => {
    const dx = (e.clientX - startX) / scale.value,
      dy = (e.clientY - startY) / scale.value;
    let patch = {};
    if (handle === "move") patch = { x: initial.x + dx, y: initial.y + dy };
    else {
      if (handle.includes("e")) patch.width = initial.width + dx;
      if (handle.includes("s")) patch.height = initial.height + dy;
      if (handle.includes("w")) {
        const width = Math.max(
          100,
          Math.min(initial.x + initial.width, initial.width - dx),
        );
        patch = { ...patch, width, x: initial.x + initial.width - width };
      }
      if (handle.includes("n")) {
        const h = Math.max(
          60,
          Math.min(initial.y + initial.height, initial.height - dy),
        );
        patch = { ...patch, height: h, y: initial.y + initial.height - h };
      }
    }
    Object.assign(block, pageGeometry(initial, patch, snap.value));
  };
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    cleanup = null;
    publish();
    if (block.kind === "text") nextTick(() => fitText(block));
  };
  cleanup = end;
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
}
function measure() {
  scale.value = Math.min(
    1,
    Math.max(0.15, ((viewport.value?.clientWidth || 1000) - 48) / PAGE_WIDTH),
  );
}
function key(event) {
  if (!expanded.value) return;
  if (event.key === "Escape") {
    event.stopImmediatePropagation();
    expanded.value = false;
  }
}
watch(expanded, (value) => {
  if (value) {
    oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  } else document.body.style.overflow = oldOverflow;
  nextTick(measure);
});
async function flush() {
  if (upload) await upload;
  for (const editor of Object.values(editors.value)) await editor?.flush();
}
defineExpose({ flush });
onMounted(() => {
  observer = new ResizeObserver(measure);
  observer.observe(viewport.value);
  measure();
  window.addEventListener("keydown", key, true);
  if (!props.layout && !props.readonly) publish();
  nextTick(() => {
    for (const block of blocks.value) if (block.kind === "text") fitText(block);
  });
});
onBeforeUnmount(() => {
  observer?.disconnect();
  cleanup?.();
  window.removeEventListener("keydown", key, true);
  if (expanded.value) document.body.style.overflow = oldOverflow;
});
</script>
<template>
  <section
    class="conductor-page"
    :class="{ 'page-expanded': expanded, 'page-readonly': readonly }"
  >
    <header v-if="expanded" class="page-topbar">
      <div>
        <strong>{{ label }}</strong
        ><small>Page libre · largeur fixe de 1 000 px</small>
      </div>
      <button class="btn" @click="expanded = false">
        <Minimize2 :size="16" />Revenir à la partie
      </button>
    </header>
    <div class="page-workspace">
      <div
        ref="viewport"
        class="page-viewport"
        @pointerdown.self="selected = ''"
      >
        <div
          class="page-size"
          :style="{
            width: PAGE_WIDTH * scale + 'px',
            height: height * scale + 'px',
          }"
        >
          <div
            class="page-sheet"
            :class="{ 'page-grid': !readonly && snap }"
            :style="{
              width: PAGE_WIDTH + 'px',
              height: height + 'px',
              transform: 'scale(' + scale + ')',
            }"
            @pointerdown.self="selected = ''"
          >
            <article
              v-for="block in blocks"
              :key="block.id"
              :data-block-id="block.id"
              class="page-block"
              :class="{
                selected: !readonly && selected === block.id,
                'page-text-block': block.kind === 'text',
              }"
              :style="{
                left: block.x + 'px',
                top: block.y + 'px',
                width: block.width + 'px',
                minHeight: block.height + 'px',
                height:
                  block.kind === 'image' ? block.height + 'px' : undefined,
              }"
              @pointerdown.stop="selected = block.id"
            >
              <template v-if="block.kind === 'text'"
                ><div
                  v-if="readonly"
                  class="notebook-preview page-reading-text"
                  v-html="renderConductor(block.content, images)" />
                <ConductorRichEditor
                  v-else
                  :ref="
                    (el) => {
                      if (el) editors[block.id] = el;
                      else delete editors[block.id];
                    }
                  "
                  :model-value="block.content"
                  :images="images"
                  :other-content="usedContent"
                  :max-length="
                    Math.max(
                      0,
                      maxLength -
                        blocks.reduce(
                          (sum, b) =>
                            sum + (b.id === block.id ? 0 : b.content.length),
                          0,
                        ),
                    )
                  "
                  :label="label + ' · ' + block.name"
                  :tools-host="selected === block.id ? tools : null"
                  hide-tools
                  block-mode
                  @update:model-value="contentChanged(block, $event)"
                  @update:images="emit('update:images', $event)"
                  @error="emit('error', $event)"
              /></template>
              <img
                v-else-if="images.find((i) => i.id === block.imageId)"
                :src="images.find((i) => i.id === block.imageId).src"
                :alt="images.find((i) => i.id === block.imageId).alt"
                draggable="false"
                loading="lazy"
                decoding="async"
                @pointerdown="gesture($event, block)"
              />
              <template v-if="!readonly && selected === block.id"
                ><button
                  class="page-block-grip"
                  :aria-label="'Déplacer ' + block.name"
                  title="Glisser pour déplacer"
                  @pointerdown="gesture($event, block)"
                >
                  <Move :size="14" />{{ block.name }}</button
                ><button
                  v-for="handle in ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']"
                  :key="handle"
                  class="page-resize"
                  :class="handle"
                  :aria-label="'Redimensionner ' + block.name + ' ' + handle"
                  @pointerdown="gesture($event, block, handle)"
              /></template>
            </article>
          </div>
        </div>
      </div>
      <aside v-if="!readonly" class="page-inspector">
        <div class="page-insert">
          <span class="eyebrow">AJOUTER UN BLOC</span
          ><button
            class="btn"
            :disabled="blocks.length >= 100"
            @click="addText"
          >
            <Plus :size="15" />Texte</button
          ><label class="btn"
            ><ImagePlus :size="15" />{{ busy ? "Préparation…" : "Image"
            }}<input
              type="file"
              hidden
              multiple
              accept="image/png,image/jpeg,image/webp"
              :disabled="busy || images.length >= 32 || blocks.length >= 100"
              @change="addImage"
          /></label>
        </div>
        <label class="page-snap"
          ><input v-model="snap" type="checkbox" />Aligner sur la grille</label
        >
        <template v-if="active"
          ><details open class="property-details">
            <summary>Bloc sélectionné</summary>
            <label
              >Nom<input
                :value="active.name"
                maxlength="100"
                aria-label="Nom du bloc"
                @input="patch({ name: $event.target.value })"
            /></label>
            <div class="page-dimensions">
              <label
                v-for="[field, title] in [
                  ['x', 'X'],
                  ['y', 'Y'],
                  ['width', 'Largeur'],
                  ['height', 'Hauteur'],
                ]"
                :key="field"
                >{{ title
                }}<input
                  type="number"
                  :aria-label="title + ' du bloc'"
                  :value="Math.round(active[field])"
                  :min="['width', 'height'].includes(field) ? 60 : 0"
                  @input="patch({ [field]: Number($event.target.value) })"
              /></label>
            </div>
            <div class="page-actions">
              <button
                class="icon-btn"
                title="Dupliquer le bloc"
                aria-label="Dupliquer le bloc"
                @click="duplicate"
              >
                <Copy :size="16" /></button
              ><button
                class="icon-btn"
                title="Reculer"
                aria-label="Reculer le bloc"
                @click="layer(-1)"
              >
                <ChevronDown :size="16" /></button
              ><button
                class="icon-btn"
                title="Avancer"
                aria-label="Avancer le bloc"
                @click="layer(1)"
              >
                <ChevronUp :size="16" /></button
              ><button
                class="icon-btn"
                title="Supprimer le bloc"
                aria-label="Supprimer le bloc"
                @click="remove"
              >
                <Trash2 :size="16" />
              </button>
            </div>
            <p v-if="active.kind === 'image'" class="field-help">
              L’image conserve ses proportions dans le bloc. Étire une poignée
              pour régler son cadre.
            </p>
          </details></template
        >
        <p v-else class="field-help">
          Sélectionne un bloc pour le déplacer, le redimensionner ou modifier
          son contenu.
        </p>
        <div ref="tools" class="page-format-tools" />
      </aside>
    </div>
    <footer v-if="!readonly" class="page-status">
      <span
        >{{ blocks.length }} bloc{{ blocks.length > 1 ? "s" : "" }} ·
        {{ Math.round(scale * 100) }} % · Molette pour défiler</span
      ><button
        class="icon-btn"
        :aria-label="expanded ? 'Réduire le canevas' : 'Agrandir le canevas'"
        :title="expanded ? 'Réduire · Échap' : 'Ouvrir sur toute la page'"
        @click="expanded = !expanded"
      >
        <Minimize2 v-if="expanded" :size="17" /><Maximize2 v-else :size="17" />
      </button>
    </footer>
  </section>
</template>
