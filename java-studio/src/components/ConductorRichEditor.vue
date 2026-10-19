<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { documentDropSlot } from "../conductorDrop.js";
import { codeExitDirection } from "../conductorNavigation.js";
import {useUndoNotifications} from "../undoNotifications.js";
import { useExpiringUndo } from "../useExpiringUndo.js";
import {
  conductorCodeLanguages,
  codeLanguageOf,
  fencedCode,
} from "../conductorCode.js";
import { GripVertical, Plus, Copy, Check } from "lucide-vue-next";
import { renderConductor as renderConductorBase } from "../notebookMarkdown.js";
const renderConductor=(value,images=[])=>renderConductorBase(value,images,{includePrivate:true});
import { richMarkdown } from "../conductorRichText.js";
import { highlightColors } from "../videoWorkflow.js";
import { imageSource, imageImportError } from "../imageImport.js";
import { findConductorCommands } from "../conductorCommands.js";
const props = defineProps({
  documentMode: Boolean,
  noteLinks: Boolean,
  modelValue: { type: String, default: "" },
  images: { type: Array, default: () => [] },
  otherContent: { type: String, default: "" },
  maxLength: { type: Number, default: 50000 },
  label: String,
  toolsHost: Object,
  hideTools: Boolean,
  blockMode: Boolean,
  sourceMode: Boolean,
});
const emit = defineEmits([
  "update:modelValue",
  "update:images",
  "error",
  "resize",
  "request-note-link",
]);
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
  linkUrl = ref(""),
  codeLanguage = ref("java");
const slash = ref(null),
  slashIndex = ref(0),
  imageInput = ref(null);
const slashItems = computed(() => {
 const query=(slash.value?.query||'').toLowerCase(),base=findConductorCommands(query);
 if(props.noteLinks&&['lien','note','note-link','link','page'].some(word=>word.includes(query))){const command=['note-link','Lien vers une note','note lien'];return query?[command,...base]:[...base,command];}
 return base;
});
const windowWidth = ref(window.innerWidth);
const documentMenu = ref(null);
const documentShell = ref(null),
  blockRows = ref([]),
  hoveredBlock = ref(null),
  dropMarker = ref(null),
  submenu = ref(""),
  blockUndo = ref(null);
const copiedCode = ref(null);
useExpiringUndo(blockUndo);
const notices=useUndoNotifications();
useExpiringUndo(copiedCode, { duration: 2000 });
let contextBlock = null,
  draggedBlock = null,
  blockObserver,
  blockResizeObserver,
  blockFrame;
function topBlock(node) {
  let element = node?.nodeType === 3 ? node.parentElement : node;
  while (element && element.parentElement !== editor.value)
    element = element.parentElement;
  return element?.parentElement === editor.value ? element : null;
}
function measureBlocks() {
  if (!props.documentMode || !editor.value || !documentShell.value) return;
  const rect = documentShell.value.getBoundingClientRect();
  blockRows.value = Array.from(editor.value.children).map((node, index) => ({
    node,
    index,
    top: node.getBoundingClientRect().top - rect.top,
    bottom: node.getBoundingClientRect().bottom - rect.top,
    language: node.tagName === "PRE" ? codeLanguageOf(node) : null,
  }));
}
function scheduleBlocks() {
  windowWidth.value = window.innerWidth;
  cancelAnimationFrame(blockFrame);
  blockFrame = requestAnimationFrame(measureBlocks);
}
function selectBlock(node) {
  if (!node || !editor.value.contains(node)) return;
  const r = document.createRange();
  r.selectNodeContents(node);
  editor.value.focus({ preventScroll: true });
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
  remember();
}
function focusDocumentMenu() {
  nextTick(() =>
    documentMenu.value?.querySelector("button")?.focus({ preventScroll: true }),
  );
}
function menuKeys(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    menu.value = null;
    restore();
    return;
  }
  if (event.target.matches("input,select,textarea")) return;
  if (
    event.key === "ArrowRight" &&
    event.target.getAttribute("aria-haspopup") === "menu"
  ) {
    event.preventDefault();
    event.target.click();
    nextTick(() =>
      documentMenu.value?.querySelector(".document-submenu button")?.focus(),
    );
    return;
  }
  if (event.key === "ArrowLeft" && event.target.closest(".document-submenu")) {
    event.preventDefault();
    const parent = event.target
      .closest(".document-submenu-row")
      ?.querySelector("button");
    submenu.value = "";
    parent?.focus();
    return;
  }
  if (["ArrowDown", "ArrowUp"].includes(event.key)) {
    event.preventDefault();
    const scope =
      event.target.closest(".document-submenu") || documentMenu.value;
    const buttons = Array.from(scope.querySelectorAll("button")).filter(
      (b) =>
        !b.disabled &&
        b.getBoundingClientRect().height > 0 &&
        (scope !== documentMenu.value || !b.closest(".document-submenu")),
    );
    const index = buttons.indexOf(event.target),
      delta = event.key === "ArrowDown" ? 1 : -1;
    buttons[(index + delta + buttons.length) % buttons.length]?.focus();
  }
}
function blockMenu(event, node) {
  selectBlock(node);
  contextBlock = node;
  contextPicture();
  submenu.value = "";
  slash.value = null;
  menu.value = {
    x: Math.max(8, Math.min(event.clientX, innerWidth - 265)),
    y: Math.max(8, Math.min(event.clientY, innerHeight - 390)),
  };
  focusDocumentMenu();
}
function contextPicture() {
  const img = contextBlock?.matches("img")
    ? contextBlock
    : contextBlock?.querySelector("img[data-frame-image]");
  picture.value =
    props.images.find((image) => image.id === img?.dataset.frameImage) || null;
}
function setBlockLanguage(node, lang) {
  if (!node || !editor.value.contains(node)) return;
  const holder = document.createElement("div");
  holder.innerHTML = renderConductor(
    fencedCode(node.innerText ?? node.textContent ?? "", lang),
    props.images,
  );
  node.replaceWith(...holder.childNodes);
  changed();
  menu.value = null;
  measureBlocks();
}
async function copyCode(node, index) {
  node =
    editor.value.children[index]?.tagName === "PRE"
      ? editor.value.children[index]
      : node;
  try {
    await navigator.clipboard.writeText(
      node.innerText || node.textContent || "",
    );
    copiedCode.value = node;
  } catch {
    emit(
      "error",
      "La copie n’est pas disponible dans ce navigateur. Sélectionne le code puis utilise Ctrl C.",
    );
  }
}
function changeCodeLanguage(lang) {
  codeLanguage.value = lang;
  if (contextBlock?.tagName === "PRE") setBlockLanguage(contextBlock, lang);
  else contextCommand("code");
}

function blockAction(action) {
  const node = contextBlock;
  if (!node || !editor.value.contains(node)) return;
  const before = richMarkdown(editor.value),
    images = [...props.images];
  if (action === "duplicate") node.after(node.cloneNode(true));
  else node.remove();
  if (!editor.value.children.length) editor.value.innerHTML = "<p><br></p>";
  changed();
  const after = richMarkdown(editor.value);
  if (before !== after) {
    const state={before,after,images};blockUndo.value=state;
    if(action !== 'duplicate')state.noticeId=notices.push('Bloc supprimé.',()=>undoBlock(state),()=>!!editor.value&&richMarkdown(editor.value)===state.after);
  }
  menu.value = null;
  contextBlock = null;
  scheduleBlocks();
}
async function undoBlock(state=blockUndo.value) {
  // Vue passes a MouseEvent for @click; keep the current snapshot in that case.
  if(!state?.before)state=blockUndo.value;
  if (!state || !editor.value || richMarkdown(editor.value)!==state.after) return false;
  emit("update:images", state.images);
  emit("update:modelValue", state.before);
  last = state.before;
  await nextTick();
  draw();
  if(blockUndo.value?.after===state.after)blockUndo.value = null;
  if(state.noticeId)notices.dismiss(state.noticeId);
  menu.value = null;
  return true;
}
function startBlockDrag(event, node) {
  draggedBlock = node;
  node.classList.add("document-drag-source");
  menu.value = null;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("application/x-frame-document-block", "move");
}
function endBlockDrag() {
  draggedBlock?.classList.remove("document-drag-source");
  draggedBlock = null;
  dropMarker.value = null;
}
function dragOverBlock(event) {
  if (!draggedBlock) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const nodes = Array.from(editor.value.children).filter(
    (node) => node !== draggedBlock,
  );
  const slot = documentDropSlot(
    nodes.map((node) => node.getBoundingClientRect()),
    event.clientY,
  );
  if (!slot) {
    dropMarker.value = null;
    return;
  }
  const anchor = nodes[slot.index] || null;
  if (anchor === draggedBlock.nextElementSibling) {
    dropMarker.value = null;
    return;
  }
  dropMarker.value = {
    anchor,
    top: slot.top - documentShell.value.getBoundingClientRect().top,
  };
}
function dropBlock(event) {
  if (!draggedBlock) return false;
  event.preventDefault();
  event.stopPropagation();
  if (dropMarker.value) {
    const before = richMarkdown(editor.value),
      images = [...props.images];
    editor.value.insertBefore(draggedBlock, dropMarker.value.anchor);
    changed();
    const value = richMarkdown(editor.value);
    if (value !== before) blockUndo.value = { before, after: value, images };
  }
  endBlockDrag();
  scheduleBlocks();
  return true;
}

function contextCommand(id) {
  if (range?.collapsed && contextBlock) selectBlock(contextBlock);
  if (id === "image") imageInput.value?.click();
  else if (id === "code") code();
  else if (id === "hr") separator();
  else if (id === "table") table();
  else if (id === "ul" || id === "ol")
    command(id === "ul" ? "insertUnorderedList" : "insertOrderedList");
  else command("formatBlock", id);
  menu.value = null;
}
function formatSelection(name) {
  if (range?.collapsed && contextBlock) selectBlock(contextBlock);
  command(name);
  menu.value = null;
}
let slashRange = null;
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
const insertionRows = computed(() => {
  const rows = blockRows.value;
  if (!rows.length) return [{ index: 0, top: 18 }];
  return [
    { index: 0, top: Math.max(4, rows[0].top - 14) },
    ...rows.map((row, i) => ({
      index: i + 1,
      top: rows[i + 1] ? (row.bottom + rows[i + 1].top) / 2 : row.bottom + 14,
    })),
  ];
});
function focusParagraph(node, atEnd = false) {
  editor.value.focus({ preventScroll: true });
  const caret = document.createRange();
  caret.selectNodeContents(node);
  caret.collapse(!atEnd);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(caret);
  remember();
  node.scrollIntoView({ block: "nearest" });
}
function insertParagraph(index) {
  const rows = Array.from(editor.value.children),
    previous = rows[index - 1],
    next = rows[index];
  const blank = (node) =>
    node?.tagName === "P" &&
    !node.textContent.trim() &&
    !node.querySelector("img");
  let target = blank(next) ? next : blank(previous) ? previous : null;
  if (!target) {
    target = document.createElement("p");
    target.append(document.createElement("br"));
    editor.value.insertBefore(target, next || null);
  }
  menu.value = null;
  slash.value = null;
  focusParagraph(target);
  changed();
  scheduleBlocks();
}
let pointerOrigin = null,
  selectionDragged = false;
function beginSelectionPointer(event) {
  pointerOrigin = { x: event.clientX, y: event.clientY };
  selectionDragged = false;
}
function finishSelectionPointer(event) {
  if (pointerOrigin)
    selectionDragged =
      Math.hypot(
        event.clientX - pointerOrigin.x,
        event.clientY - pointerOrigin.y,
      ) > 4;
}
function insertFromPointer(index, event) {
  if (!event.detail || !selectionDragged) insertParagraph(index);
}
function blankDocumentClick(event) {
  if (
    !props.documentMode ||
    event.target !== editor.value ||
    selectionDragged ||
    !window.getSelection()?.isCollapsed
  )
    return;
  const rows = Array.from(editor.value.children);
  let index = rows.findIndex(
    (node) => node.getBoundingClientRect().top > event.clientY,
  );
  if (index < 0) index = rows.length;
  insertParagraph(index);
}
function exitCode(event, block) {
  if (!props.documentMode || !block) return false;
  const selection = window.getSelection();
  if (!selection?.rangeCount) return false;
  const selected = selection.getRangeAt(0),
    before = document.createRange(),
    after = document.createRange();
  before.selectNodeContents(block);
  before.setEnd(selected.startContainer, selected.startOffset);
  after.selectNodeContents(block);
  after.setStart(selected.endContainer, selected.endOffset);
  const direction = codeExitDirection(event.key, {
    collapsed: selection.isCollapsed,
    atStart: before.toString().length === 0,
    atEnd: after.toString().replace(/\n$/, "").length === 0,
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    alt: event.altKey,
    shift: event.shiftKey,
  });
  if (!direction) return false;
  event.preventDefault();
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    const index = Array.from(editor.value.children).indexOf(block);
    insertParagraph(index + (direction > 0 ? 1 : 0));
    return true;
  }
  const adjacent =
    direction < 0 ? block.previousElementSibling : block.nextElementSibling;
  if (
    adjacent &&
    /^(P|H[1-6]|BLOCKQUOTE)$/.test(adjacent.tagName) &&
    !adjacent.querySelector("img")
  )
    focusParagraph(adjacent, direction < 0);
  else {
    const index = Array.from(editor.value.children).indexOf(block);
    insertParagraph(index + (direction > 0 ? 1 : 0));
  }
  return true;
}
function trackSlash() {
  if (!props.documentMode) return;
  const selection = window.getSelection();
  if (
    !selection?.isCollapsed ||
    !editor.value?.contains(selection.anchorNode) ||
    selection.anchorNode.nodeType !== 3 ||
    selection.anchorNode.parentElement.closest("pre")
  ) {
    slash.value = null;
    return;
  }
  const node = selection.anchorNode,
    offset = selection.anchorOffset;
  const match = node.textContent
    .slice(0, offset)
    .match(/(?:^|\s)\/([^/\n]{0,32})$/);
  if (!match) {
    slash.value = null;
    return;
  }
  const r = document.createRange();
  r.setStart(node, offset - match[1].length - 1);
  r.setEnd(node, offset);
  slashRange = r;
  const rect = r.getBoundingClientRect();
  slash.value = {
    query: match[1],
    x: Math.max(8, Math.min(rect.left, innerWidth - 290)),
    y: Math.max(8, Math.min(rect.bottom + 8, innerHeight - 350)),
  };
  slashIndex.value = 0;
}
function runSlash(id) {
  if (!slashRange || !editor.value.contains(slashRange.commonAncestorContainer))
    return;
  editor.value.focus({ preventScroll: true });
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(slashRange);
  document.execCommand("delete");
  remember();
  slash.value = null;
  slashRange = null;
  if (id === "image") {
    changed();
    imageInput.value?.click();
    return;
  }
  if(id==='note-link'){changed();emit('request-note-link');return;}
  if (id === "comment") privateComment();
  else if (id === "code") code();
  else if (id === "hr") separator();
  else if (id === "table") table();
  else if (id === "ul" || id === "ol")
    command(id === "ul" ? "insertUnorderedList" : "insertOrderedList");
  else command("formatBlock", id);
}
function inputChanged() {
  changed();
  trackSlash();
}
function changed() {
  const value = richMarkdown(editor.value);
  if (value.length > props.maxLength) {
    emit(
      "error",
      `Cette zone accepte ${props.maxLength.toLocaleString("fr-FR")} caractères. La dernière modification a été annulée.`,
    );
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
  scheduleBlocks();
}
function draw() {
  if (!editor.value) return;
  last = props.modelValue;
  editor.value.innerHTML = renderConductor(last, props.images) || "<p><br></p>";
  for (const node of editor.value.querySelectorAll("pre"))
    node.spellcheck = false;
  picture.value = null;
  range = null;
  scheduleBlocks();
  nextTick(() => emit("resize"));
}
watch(
  () => props.sourceMode,
  () => nextTick(draw),
);
function sourceChanged(event) {
  const value = event.target.value;
  if (value.length > props.maxLength) return;
  last = value;
  emit("update:modelValue", value);
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
  if (props.sourceMode) return;
  restore();
  document.execCommand(name, false, value);
  changed();
}
function highlight(color) {
  if (props.sourceMode) return;
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
  if (props.documentMode) {
    event.preventDefault();
    contextBlock = topBlock(event.target);
    contextPicture();
    submenu.value = "";
    slash.value = null;
    if (window.getSelection()?.isCollapsed && contextBlock)
      selectBlock(contextBlock);
    menu.value = {
      x: Math.max(8, Math.min(event.clientX, innerWidth - 265)),
      y: Math.max(8, Math.min(event.clientY, innerHeight - 390)),
    };
    focusDocumentMenu();
    return;
  }
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
function privateComment() {
  restore();
  const id='private-'+crypto.randomUUID();
  document.execCommand('insertHTML',false,'<aside data-private-note="true" class="conductor-private-note" id="'+id+'"><p>Note de travail…</p></aside><p><br></p>');
  const note=editor.value.querySelector('#'+id);note?.removeAttribute('id');
  if(note){const range=document.createRange();range.selectNodeContents(note.firstElementChild||note);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);remember();}
  changed();
}
function separator() {
  restore();
  document.execCommand("insertHTML", false, "<hr><p><br></p>");
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
    renderConductor(
      fence + codeLanguage.value + "\n" + value + "\n" + fence + "\n\n",
    ),
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
  if (dropBlock(event)) return;
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
  if (event.target.closest("a")) event.preventDefault();
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
  if (!event.target.closest(".conductor-slash-menu,.rich-document"))
    slash.value = null;
}
function keys(event) {
  if (
    props.documentMode &&
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "z" &&
    !event.shiftKey &&
    blockUndo.value?.after === richMarkdown(editor.value)
  ) {
    event.preventDefault();
    undoBlock();
    return;
  }
  if (event.key === "Escape") {
    menu.value = null;
    submenu.value = "";
  }
  if (slash.value) {
    if (event.key === "Escape") {
      event.preventDefault();
      slash.value = null;
      return;
    }
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      const n = slashItems.value.length;
      if (n)
        slashIndex.value =
          (slashIndex.value + (event.key === "ArrowDown" ? 1 : -1) + n) % n;
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const row = slashItems.value[slashIndex.value];
      if (row) runSlash(row[0]);
      return;
    }
  }
  const anchor = window.getSelection()?.anchorNode;
  const block = (
    anchor?.nodeType === 3 ? anchor.parentElement : anchor
  )?.closest?.("pre");
  const privateBlock=(anchor?.nodeType===3?anchor.parentElement:anchor)?.closest?.('aside[data-private-note]');
  if (exitCode(event, block || privateBlock)) return;
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
function insertNoteLink(note){
 if(!note?.id||!/^[-\w]{1,100}$/.test(note.id))return;
 restore();const selection=window.getSelection();
 if(range&&selection&&!selection.isCollapsed)document.execCommand('createLink',false,'#/notes/'+note.id);
 else{if(!range){const r=document.createRange();r.selectNodeContents(editor.value);r.collapse(false);selection.removeAllRanges();selection.addRange(r);}const label=String(note.title||'Sans titre').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');document.execCommand('insertHTML',false,` <a href="#/notes/${note.id}">${label}</a> `);}
 changed();
}
defineExpose({ flush, insertNoteLink });
onMounted(() => {
  draw();
  if (props.documentMode) {
    blockObserver = new MutationObserver(scheduleBlocks);
    blockObserver.observe(editor.value, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    blockResizeObserver = new ResizeObserver(scheduleBlocks);
    blockResizeObserver.observe(editor.value);
    window.addEventListener("resize", scheduleBlocks);
  }
  document.addEventListener("selectionchange", remember);
  window.addEventListener("pointerdown", outside);
});
onBeforeUnmount(() => {
  blockObserver?.disconnect();
  blockResizeObserver?.disconnect();
  cancelAnimationFrame(blockFrame);
  window.removeEventListener("resize", scheduleBlocks);
  document.removeEventListener("selectionchange", remember);
  window.removeEventListener("pointerdown", outside);
  resizeCleanup?.();
});
</script>
<template>
  <section
    class="conductor-rich-editor"
    :class="{ 'document-editor': documentMode }"
  >
    <Teleport :to="toolsHost || 'body'" :disabled="!toolsHost"
      ><div
        v-show="documentMode ? linkDialog : !hideTools || toolsHost"
        class="rich-control-stack"
      >
        <div
          v-if="!sourceMode && !documentMode"
          class="rich-tools"
          aria-label="Mise en forme"
          @mousedown.prevent
        >
          <button
            v-for="[tag, title] in [
              ['p', 'Texte'],
              ['h1', 'Titre'],
              ['h2', 'Sous-titre'],
              ['h3', 'Intertitre'],
              ['blockquote', 'Citation'],
            ]"
            :key="tag"
            class="btn"
            @click="command('formatBlock', tag)"
          >
            {{ title }}
          </button>
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
          ><button class="btn" @click="separator">Séparateur</button
          ><select
            v-model="codeLanguage"
            aria-label="Langage du code"
            @mousedown.stop
          >
            <option
              v-for="[lang, label] in conductorCodeLanguages"
              :key="lang"
              :value="lang"
            >
              {{ label }}
            </option></select
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
          <div v-if="!blockMode" class="rich-palette" aria-label="Surlignage">
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
          <label v-if="!blockMode" class="btn rich-image-upload" @mousedown.stop
            >{{ busy ? "Préparation…" : "Image"
            }}<input
              ref="imageInput"
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
        <div v-if="picture && !documentMode" class="rich-picture-tools">
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
      </div></Teleport
    >
    <textarea
      v-if="sourceMode"
      class="rich-markdown-source"
      :value="modelValue"
      :maxlength="maxLength"
      :aria-label="label + ' · Source Markdown'"
      spellcheck="false"
      @input="sourceChanged"
    />
    <div
      v-else
      ref="documentShell"
      class="document-block-shell"
      @dragend="endBlockDrag"
      @dragover.prevent="dragOverBlock"
      @drop="dropImage"
      @pointerdown.capture="beginSelectionPointer"
      @pointerup.capture="finishSelectionPointer"
    >
      <div
        ref="editor"
        role="textbox"
        aria-multiline="true"
        :aria-label="label"
        class="rich-document notebook-preview"
        contenteditable="true"
        spellcheck="true"
        @input="inputChanged"
        @dragstart="dragImage"
        @paste="paste"
        @contextmenu="context"
        @pointermove="hoveredBlock = topBlock($event.target)"
        @click="
          choosePicture($event);
          trackSlash();
          blankDocumentClick($event);
        "
        @keydown="keys"
      />
      <template v-if="documentMode"
        ><div
          v-for="row in blockRows.filter((row) => row.node.tagName === 'PRE')"
          :key="'code-' + row.index"
          class="document-code-tools"
          :style="{ top: row.top + 8 + 'px' }"
          @mousedown.stop
        >
          <select
            :value="row.language"
            :aria-label="'Langage du bloc de code ' + (row.index + 1)"
            @change="setBlockLanguage(row.node, $event.target.value)"
          >
            <option
              v-if="
                row.language &&
                !conductorCodeLanguages.some(([id]) => id === row.language)
              "
              :value="row.language"
            >
              {{ row.language }}
            </option>
            <option
              v-for="[id, label] in conductorCodeLanguages"
              :key="id"
              :value="id"
            >
              {{ label }}
            </option></select
          ><button
            class="icon-btn"
            :aria-label="'Copier le code du bloc ' + (row.index + 1)"
            :title="copiedCode === row.node ? 'Code copié' : 'Copier le code'"
            @click="copyCode(row.node, row.index)"
          >
            <Check v-if="copiedCode === row.node" :size="14" /><Copy
              v-else
              :size="14"
            /></button
          ><span v-if="copiedCode === row.node" role="status">Copié</span>
        </div></template
      >
      <template v-if="documentMode"
        ><button
          v-for="slot in insertionRows"
          :key="'insert-' + slot.index"
          class="document-insert-line"
          :style="{ top: slot.top + 'px' }"
          :aria-label="
            slot.index === blockRows.length
              ? 'Ajouter du texte après le dernier bloc'
              : 'Ajouter du texte avant le bloc ' + (slot.index + 1)
          "
          title="Ajouter du texte ici"
          @mousedown.prevent
          @click="insertFromPointer(slot.index, $event)"
        >
          <Plus :size="13" aria-hidden="true" /></button
      ></template>
      <template v-if="documentMode"
        ><button
          v-for="row in blockRows"
          :key="row.index"
          class="document-block-grip"
          :class="{ visible: hoveredBlock === row.node }"
          :style="{ top: row.top + 'px' }"
          contenteditable="false"
          draggable="true"
          :aria-label="'Options et déplacement du bloc ' + (row.index + 1)"
          title="Déplacer le bloc · cliquer pour les options"
          @mouseenter="hoveredBlock = row.node"
          @mousedown.stop
          @click="blockMenu($event, row.node)"
          @contextmenu.prevent="blockMenu($event, row.node)"
          @dragstart.stop="startBlockDrag($event, row.node)"
        >
          <GripVertical :size="16" :stroke-width="1.8" aria-hidden="true" />
        </button>
        <div
          v-if="dropMarker"
          class="document-block-drop"
          :style="{ top: dropMarker.top + 'px' }"
        >
          <span>Déposer ici</span>
        </div></template
      >
    </div>
    <input
      v-if="documentMode"
      ref="imageInput"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      multiple
      hidden
      :disabled="busy || images.length >= 32"
      @change="insertImages"
    />
    <Teleport to="body"
      ><div
        v-if="slash"
        class="conductor-slash-menu"
        role="menu"
        aria-label="Insérer dans le document"
        :style="{ left: slash.x + 'px', top: slash.y + 'px' }"
        @mousedown.prevent
      >
        <small>INSÉRER UN BLOC · ↑ ↓ Entrée</small
        ><button
          v-for="(row, i) in slashItems"
          :key="row[0]"
          role="menuitem"
          :class="{ active: i === slashIndex }"
          @click="runSlash(row[0])"
        >
          <strong>{{ row[1] }}</strong
          ><span>/{{ row[0] }}</span>
        </button>
        <p v-if="!slashItems.length">Aucune commande</p>
      </div></Teleport
    >
    <Teleport to="body"
      ><div
        v-if="menu && !documentMode"
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
    <Teleport to="body"
      ><div
        v-if="menu && documentMode"
        ref="documentMenu"
        @keydown="menuKeys"
        class="document-context rich-highlight-menu"
        :class="{ 'opens-left': menu.x > windowWidth - 550 }"
        role="menu"
        aria-label="Actions du document"
        :style="{ left: menu.x + 'px', top: menu.y + 'px' }"
        @mousedown.prevent
      >
        <div class="document-submenu-row" @mouseenter="submenu = 'format'">
          <button
            role="menuitem"
            aria-haspopup="menu"
            :aria-expanded="submenu === 'format'"
            @click="submenu = 'format'"
          >
            Mise en forme <span>›</span>
          </button>
          <div
            v-if="submenu === 'format'"
            class="document-submenu"
            role="menu"
            aria-label="Mise en forme"
          >
            <button role="menuitem" @click="formatSelection('bold')">
              <b>Gras</b><small>Ctrl B</small></button
            ><button role="menuitem" @click="formatSelection('italic')">
              <em>Italique</em><small>Ctrl I</small></button
            ><button role="menuitem" @click="formatSelection('strikeThrough')">
              <s>Barré</s></button
            ><button role="menuitem" @click="formatSelection('removeFormat')">
              Retirer la mise en forme
            </button>
          </div>
        </div>
        <div class="document-submenu-row" @mouseenter="submenu = 'highlight'">
          <button
            role="menuitem"
            aria-haspopup="menu"
            :aria-expanded="submenu === 'highlight'"
            @click="submenu = 'highlight'"
          >
            Surligner <span>›</span>
          </button>
          <div
            v-if="submenu === 'highlight'"
            class="document-submenu"
            role="menu"
            aria-label="Couleurs du surlignage"
          >
            <button
              v-for="(color, id) in highlightColors"
              :key="id"
              role="menuitem"
              @click="highlight(id)"
            >
              <i :style="{ background: color }" />{{ colorNames[id] }}</button
            ><button role="menuitem" @click="removeHighlight">
              Retirer le surlignage
            </button>
          </div>
        </div>
        <div class="document-submenu-row" @mouseenter="submenu = 'block'">
          <button
            role="menuitem"
            aria-haspopup="menu"
            :aria-expanded="submenu === 'block'"
            @click="submenu = 'block'"
          >
            Transformer / insérer <span>›</span>
          </button>
          <div
            v-if="submenu === 'block'"
            class="document-submenu"
            role="menu"
            aria-label="Types de blocs"
          >
            <button
              v-for="row in findConductorCommands()"
              :key="row[0]"
              role="menuitem"
              @click="contextCommand(row[0])"
            >
              {{ row[1] }}
            </button>
          </div>
        </div>
        <div class="document-submenu-row" @mouseenter="submenu = 'code'">
          <button
            role="menuitem"
            aria-haspopup="menu"
            :aria-expanded="submenu === 'code'"
            @click="submenu = 'code'"
          >
            Langage du code <span>›</span>
          </button>
          <div
            v-if="submenu === 'code'"
            class="document-submenu"
            role="menu"
            aria-label="Langage du code"
          >
            <button
              v-for="[lang, label] in conductorCodeLanguages"
              :key="lang"
              role="menuitem"
              @click="changeCodeLanguage(lang)"
            >
              {{ label }}
            </button>
          </div>
        </div>
        <div
          v-if="picture"
          class="document-submenu-row"
          @mouseenter="submenu = 'image'"
        >
          <button
            role="menuitem"
            aria-haspopup="menu"
            :aria-expanded="submenu === 'image'"
            @click="submenu = 'image'"
          >
            Image <span>›</span>
          </button>
          <div
            v-if="submenu === 'image'"
            class="document-submenu document-image-settings"
            role="group"
            aria-label="Options de l’image"
            @mousedown.stop
          >
            <label
              >Description<input
                :value="picture.alt"
                @input="
                  updatePicture({ alt: $event.target.value.slice(0, 300) })
                " /></label
            ><label
              >Largeur (%)<input
                type="number"
                min="10"
                max="100"
                :value="picture.width"
                @input="
                  updatePicture({
                    width: Math.max(
                      10,
                      Math.min(100, Number($event.target.value) || 50),
                    ),
                  })
                " /></label
            ><label
              >Alignement<select
                :value="picture.align"
                @change="updatePicture({ align: $event.target.value })"
              >
                <option value="left">Gauche</option>
                <option value="center">Centré</option>
                <option value="right">Droite</option>
              </select></label
            >
          </div>
        </div>
        <button
          role="menuitem"
          @mouseenter="submenu = ''"
          @click="
            linkDialog = true;
            menu = null;
          "
        >
          Ajouter un lien
        </button>
        <button v-if="noteLinks" role="menuitem" @click="menu=null;emit('request-note-link')">Lien vers une note…</button>
        <hr />
        <button
          role="menuitem"
          :disabled="!contextBlock"
          @mouseenter="submenu = ''"
          @click="blockAction('duplicate')"
        >
          Dupliquer le bloc</button
        ><button
          role="menuitem"
          class="danger"
          :disabled="!contextBlock"
          @mouseenter="submenu = ''"
          @click="blockAction('remove')"
        >
          Supprimer le bloc</button
        ><button v-if="blockUndo" role="menuitem" @click="undoBlock">
          Annuler l’action sur le bloc
        </button>
      </div></Teleport
    >
  </section>
</template>
