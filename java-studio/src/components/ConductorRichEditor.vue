<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { renderConductor } from "../notebookMarkdown.js";
import { richMarkdown } from "../conductorRichText.js";
import { highlightColors } from "../videoWorkflow.js";
import { imageSource, imageImportError } from "../imageImport.js";
const props = defineProps({
  modelValue: { type: String, default: "" },
  images: { type: Array, default: () => [] },
  otherContent: { type: String, default: "" },
  maxLength: { type: Number, default: 50000 },
  label: String,
});
const emit = defineEmits(["update:modelValue", "update:images", "error"]);
const colorNames = {
  yellow: "Jaune",
  mint: "Menthe",
  blue: "Bleu",
  pink: "Rose",
  orange: "Orange",
};
const editor = ref(null),
  menu = ref(null),
  picture = ref(null),
  busy = ref(false),
  linkDialog = ref(false),
  linkUrl = ref("");
let last = "",
  range = null,
  upload = null,
  resizeCleanup;
function remember() {
  const selection = window.getSelection();
  if (
    selection?.rangeCount &&
    editor.value?.contains(selection.anchorNode) &&
    editor.value.contains(selection.focusNode)
  )
    range = selection.getRangeAt(0).cloneRange();
}
function restore() {
  editor.value.focus({ preventScroll: true });
  if (range && editor.value.contains(range.commonAncestorContainer)) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
function changed() {
  const value = richMarkdown(editor.value);
  if (value.length > props.maxLength) {
    emit("error", `Cette zone accepte ${props.maxLength.toLocaleString("fr-FR")} caractères. La dernière modification a été annulée.`);
    draw();
    return;
  }
  last = value;
  emit("update:modelValue", last);
  const used = last + "\n" + props.otherContent;
  const images = props.images.filter((image) =>
    used.includes("(frame-image:" + image.id + ")"),
  );
  if (images.length !== props.images.length) emit("update:images", images);
  remember();
}
function draw() {
  last = props.modelValue;
  editor.value.innerHTML = renderConductor(last, props.images) || "<p><br></p>";
  picture.value = null;
  range = null;
}
watch(
  () => props.modelValue,
  (value) => {
    if (editor.value && value !== last) draw();
  },
);
watch(
  () => props.images,
  () => {
    if (!editor.value) return;
    for (const node of editor.value.querySelectorAll("img[data-frame-image]")) {
      const asset = props.images.find((i) => i.id === node.dataset.frameImage);
      if (asset) {
        node.src = asset.src;
        node.alt = asset.alt;
        node.style.width = asset.width + "%";
        node.style.float = ["left", "right"].includes(asset.align)
          ? asset.align
          : "none";
        node.style.display = ["left", "right"].includes(asset.align)
          ? "inline"
          : "block";
        node.style.margin = ["left", "right"].includes(asset.align)
          ? "12px 20px 12px 0"
          : "18px auto";
      }
    }
  },
  { deep: true },
);
function command(name, value) {
  restore();
  document.execCommand(name, false, value);
  changed();
}
function highlight(color) {
  restore();
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) {
    menu.value = null;
    return;
  }
  const selected = selection.getRangeAt(0);
  const mark = document.createElement("mark");
  mark.dataset.highlight = color;
  mark.style.background = highlightColors[color];
  mark.style.color = "#17231f";
  const fragment = selected.extractContents();
  for (const old of Array.from(fragment.querySelectorAll("mark")))
    old.replaceWith(...old.childNodes);
  mark.append(fragment);
  selected.insertNode(mark);
  selection.removeAllRanges();
  selected.selectNodeContents(mark);
  selection.addRange(selected);
  changed();
  menu.value = null;
}
function removeHighlight() {
  restore();
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const selected = selection.getRangeAt(0);
  for (const mark of Array.from(editor.value.querySelectorAll("mark")))
    if (selected.intersectsNode(mark)) mark.replaceWith(...mark.childNodes);
  changed();
  menu.value = null;
}
function context(event) {
  remember();
  const selection = window.getSelection();
  if (selection?.isCollapsed || !editor.value.contains(selection?.anchorNode))
    return;
  event.preventDefault();
  menu.value = {
    x: Math.max(5, Math.min(event.clientX, innerWidth - 235)),
    y: Math.max(5, Math.min(event.clientY, innerHeight - 285)),
  };
}
function paste(event) {
  event.preventDefault();
  const value = event.clipboardData.getData("text/plain");
  restore();
  document.execCommand(
    "insertHTML",
    false,
    renderConductor(value, props.images),
  );
  changed();
}
function table() {
  restore();
  document.execCommand(
    "insertHTML",
    false,
    renderConductor(
      "| Colonne 1 | Colonne 2 |\n| --- | --- |\n| Texte | Texte |\n| Texte | Texte |\n",
    ),
  );
  changed();
}
function code() {
  restore();
  const value = window.getSelection()?.toString() || "// Ton code";
  const fence = "`".repeat(
    Math.max(3, ...Array.from(value.matchAll(/`+/g), (m) => m[0].length + 1)),
  );
  document.execCommand(
    "insertHTML",
    false,
    renderConductor(fence + "java\n" + value + "\n" + fence + "\n\n"),
  );
  changed();
}
function addLink() {
  restore();
  if (!/^(https?:\/\/|mailto:|#)/i.test(linkUrl.value)) {
    emit("error", "Utilise une adresse https://, http:// ou une ancre #.");
    return;
  }
  document.execCommand("createLink", false, linkUrl.value);
  changed();
  linkDialog.value = false;
  linkUrl.value = "";
}
function insertImages(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = "";
  remember();
  busy.value = true;
  upload = (async () => {
    try {
      let images = [...props.images];
      for (const file of files.slice(0, 32 - images.length)) {
        if (file.type === "image/svg+xml")
          throw Error("Choisis une image PNG, JPEG ou WebP.");
        const image = {
          id: crypto.randomUUID(),
          src: await imageSource(file),
          alt: "",
          width: 50,
          align: "center",
        };
        images.push(image);
        emit("update:images", [...images]);
        await nextTick();
        restore();
        document.execCommand(
          "insertHTML",
          false,
          renderConductor("![](frame-image:" + image.id + ")\n\n", [image]) +
            "<p><br></p>",
        );
        changed();
      }
    } catch (error) {
      emit(
        "error",
        error.imageImport ? imageImportError(error) : error.message,
      );
    } finally {
      busy.value = false;
      upload = null;
    }
  })();
}
function dragImage(event) {
  const node = event.target.closest("img[data-frame-image]");
  if (node)
    event.dataTransfer.setData(
      "application/x-frame-image",
      node.dataset.frameImage,
    );
}
function dropImage(event) {
  const id = event.dataTransfer.getData("application/x-frame-image");
  if (!id) return;
  event.preventDefault();
  const node = Array.from(editor.value.querySelectorAll("img")).find(
    (n) => n.dataset.frameImage === id,
  );
  if (!node) return;
  const position = document.caretPositionFromPoint?.(
    event.clientX,
    event.clientY,
  );
  let target = document.caretRangeFromPoint?.(event.clientX, event.clientY);
  if (position) {
    target = document.createRange();
    target.setStart(position.offsetNode, position.offset);
    target.collapse(true);
  }
  if (
    target &&
    editor.value.contains(target.commonAncestorContainer) &&
    target.commonAncestorContainer !== node
  ) {
    target.insertNode(node);
    changed();
  }
}
function choosePicture(event) {
  const node = event.target.closest("img[data-frame-image]");
  picture.value = node
    ? props.images.find((i) => i.id === node.dataset.frameImage)
    : null;
  remember();
}
function updatePicture(patch) {
  if (!picture.value) return;
  const images = props.images.map((image) =>
    image.id === picture.value.id ? { ...image, ...patch } : image,
  );
  picture.value = images.find((image) => image.id === picture.value.id);
  emit("update:images", images);
}
function removePicture() {
  const id = picture.value?.id;
  if (!id) return;
  const node = Array.from(editor.value.querySelectorAll("img")).find(
    (n) => n.dataset.frameImage === id,
  );
  node?.remove();
  picture.value = null;
  changed();
  emit(
    "update:images",
    props.images.filter((image) => image.id !== id),
  );
}
function resize(event) {
  event.preventDefault();
  const node = Array.from(editor.value.querySelectorAll("img")).find(
    (n) => n.dataset.frameImage === picture.value?.id,
  );
  if (!node) return;
  const start = event.clientX,
    width = node.getBoundingClientRect().width,
    parent = editor.value.clientWidth;
  const move = (e) =>
    updatePicture({
      width: Math.round(
        Math.max(
          10,
          Math.min(100, ((width + e.clientX - start) / parent) * 100),
        ),
      ),
    });
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    resizeCleanup = null;
  };
  resizeCleanup = end;
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
}
function outside(event) {
  if (!event.target.closest(".rich-highlight-menu")) menu.value = null;
}
function keys(event) {
  const block = window
    .getSelection()
    ?.anchorNode?.parentElement?.closest("pre");
  if (block && event.key === "Enter") {
    event.preventDefault();
    document.execCommand("insertText", false, "\n");
    changed();
    return;
  }
  if (block && event.key === "Tab") {
    event.preventDefault();
    document.execCommand("insertText", false, "  ");
    changed();
    return;
  }
  if (event.key === "Escape") {
    menu.value = null;
    linkDialog.value = false;
  }
  if (event.key === "Tab") {
    event.preventDefault();
    command(event.shiftKey ? "outdent" : "indent");
  }
}
async function flush() {
  if (upload) await upload;
}
defineExpose({ flush });
onMounted(() => {
  draw();
  document.addEventListener("selectionchange", remember);
  window.addEventListener("pointerdown", outside);
});
onBeforeUnmount(() => {
  document.removeEventListener("selectionchange", remember);
  window.removeEventListener("pointerdown", outside);
  resizeCleanup?.();
});
</script>
<template>
  <section class="conductor-rich-editor">
    <div class="rich-tools" aria-label="Mise en forme" @mousedown.prevent>
      <select
        aria-label="Style du paragraphe"
        @change="
          command('formatBlock', $event.target.value);
          $event.target.value = '';
        "
        @mousedown.stop
      >
        <option value="">Texte / titre…</option>
        <option value="p">Texte</option>
        <option value="h1">Titre</option>
        <option value="h2">Sous-titre</option>
        <option value="h3">Intertitre</option>
        <option value="blockquote">Citation</option>
      </select>
      <button
        class="btn"
        title="Gras · Ctrl B"
        aria-label="Gras"
        @click="command('bold')"
      >
        <b>B</b></button
      ><button
        class="btn"
        title="Italique · Ctrl I"
        aria-label="Italique"
        @click="command('italic')"
      >
        <i>I</i></button
      ><button
        class="btn"
        aria-label="Liste à puces"
        @click="command('insertUnorderedList')"
      >
        • Liste</button
      ><button
        class="btn"
        aria-label="Liste numérotée"
        @click="command('insertOrderedList')"
      >
        1. Liste</button
      ><button class="btn" @click="code">Code</button
      ><button class="btn" @click="table">Tableau</button
      ><button
        class="btn"
        @click="
          remember();
          linkDialog = true;
        "
      >
        Lien
      </button>
      <div class="rich-palette" aria-label="Surlignage">
        <button
          v-for="(color, id) in highlightColors"
          :key="id"
          :style="{ background: color }"
          :aria-label="'Surligner en ' + colorNames[id]"
          :title="'Surligner · ' + colorNames[id]"
          @click="highlight(id)"
        /><button
          class="btn"
          title="Retirer le surlignage de la sélection"
          aria-label="Retirer le surlignage"
          @click="removeHighlight"
        >
          ×
        </button>
      </div>
      <label class="btn rich-image-upload" @mousedown.stop
        >{{ busy ? "Préparation…" : "Image"
        }}<input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          :disabled="busy || images.length >= 32"
          @change="insertImages"
      /></label>
    </div>
    <div v-if="linkDialog" class="rich-link-form">
      <input
        v-model="linkUrl"
        aria-label="Adresse du lien"
        placeholder="https://…"
        @keydown.enter.prevent="addLink"
      /><button class="btn" @click="addLink">Appliquer</button
      ><button class="btn" @click="linkDialog = false">Annuler</button>
    </div>
    <div v-if="picture" class="rich-picture-tools">
      <span>Image sélectionnée</span
      ><input
        :value="picture.alt"
        placeholder="Légende"
        aria-label="Légende de l’image"
        @input="updatePicture({ alt: $event.target.value.slice(0, 300) })"
      /><label
        >Largeur
        <input
          type="number"
          min="10"
          max="100"
          :value="picture.width"
          aria-label="Largeur de l’image en pourcentage"
          @input="
            updatePicture({
              width: Math.max(
                10,
                Math.min(100, Number($event.target.value) || 50),
              ),
            })
          "
        />
        %</label
      ><select
        aria-label="Placement de l’image"
        :value="picture.align"
        @change="updatePicture({ align: $event.target.value })"
      >
        <option value="left">À gauche du texte</option>
        <option value="right">À droite du texte</option>
        <option value="center">Centrée sur sa ligne</option>
        <option value="block">Sur sa propre ligne</option></select
      ><button
        class="btn"
        @pointerdown="resize"
        title="Maintenir et glisser horizontalement"
      >
        ↔ Étirer</button
      ><button class="btn" @click="removePicture">Retirer l’image</button>
    </div>
    <div
      ref="editor"
      role="textbox"
      aria-multiline="true"
      :aria-label="label"
      class="rich-document notebook-preview"
      contenteditable="true"
      spellcheck="true"
      @input="changed"
      @dragstart="dragImage"
      @dragover.prevent
      @drop="dropImage"
      @paste="paste"
      @contextmenu="context"
      @click="choosePicture"
      @keydown="keys"
    />
    <Teleport to="body"
      ><div
        v-if="menu"
        class="conductor-context rich-highlight-menu"
        role="menu"
        aria-label="Surligner la sélection"
        :style="{ left: menu.x + 'px', top: menu.y + 'px' }"
        @mousedown.prevent
      >
        <span>Surligner la sélection</span
        ><button
          v-for="(color, id) in highlightColors"
          :key="id"
          role="menuitem"
          @click="highlight(id)"
        >
          <i :style="{ background: color }" />{{
            {
              yellow: "Jaune",
              mint: "Menthe",
              blue: "Bleu",
              pink: "Rose",
              orange: "Orange",
            }[id]
          }}</button
        ><button role="menuitem" @click="removeHighlight">
          Retirer le surlignage
        </button>
      </div></Teleport
    >
  </section>
</template>
