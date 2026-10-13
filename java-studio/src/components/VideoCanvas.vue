<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";
import {
  X,
  Plus,
  Link2,
  MousePointer2,
  Trash2,
  Search,
  ArrowUpRight,
} from "lucide-vue-next";
import LibraryPreview from "./LibraryPreview.vue";
import { videoStatuses } from "../videoProjects.js";
import {
  normalizeVideoCanvas,
  connectVideoCanvas,
  removeCanvasNode,
  canvasEdgePath,
  freeCanvasPosition,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  snapCanvasPosition,
  groupCanvasNodes,
  canvasGroupBounds,
  CANVAS_LIMIT,
  canvasWorldBounds,
  nodesInCanvasRect,
  panCanvasScroll,
  assignCanvasGroups,
  availableCanvasVideos,
} from "../videoCanvas.js";
const props = defineProps({ repository: Object, videos: Array });
const emit = defineEmits(["close", "open"]);
const canvas = ref(normalizeVideoCanvas()),
  loading = ref(true),
  saving = ref(false),
  error = ref(""),
  dirty = ref(false),
  zoom = ref(0.8),
  viewport = ref(null),
  panel = ref(null),
  selected = ref(null),
  edge = ref(null),
  source = ref(null),
  linking = ref(false),
  picker = ref(false),
  query = ref(""),
  page = ref(1),
  checked = ref([]),
  selectedIds = ref([]),
  selectedGroup = ref(null),
  menu = ref(null),
  connectionPoint = ref(null);
const space = ref(false),
  panning = ref(false),
  marquee = ref(null),
  extent = ref({ x: -6000, y: -4000, right: 6000, bottom: 4000 });
const world = computed(() =>
  canvasWorldBounds(
    [
      ...canvas.value.nodes,
      ...canvas.value.groups
        .filter((g) => g.bounds)
        .flatMap((g) => [
          { x: g.bounds.x, y: g.bounds.y },
          { x: g.bounds.x + g.bounds.width, y: g.bounds.y + g.bounds.height },
        ]),
    ],
    extent.value,
  ),
);
function extendWorld() {
  if (!viewport.value) return;
  const box = viewport.value,
    x = box.scrollLeft / zoom.value + world.value.x,
    y = box.scrollTop / zoom.value + world.value.y;
  if (box.scrollLeft < 300)
    extent.value.x = Math.max(-CANVAS_LIMIT - 4000, world.value.x - 4000);
  if (box.scrollTop < 300)
    extent.value.y = Math.max(-CANVAS_LIMIT - 4000, world.value.y - 4000);
  if (
    x + box.clientWidth / zoom.value >
    world.value.x + world.value.width - 400
  )
    extent.value.right = Math.min(
      CANVAS_LIMIT + 4000,
      world.value.x + world.value.width + 4000,
    );
  if (
    y + box.clientHeight / zoom.value >
    world.value.y + world.value.height - 400
  )
    extent.value.bottom = Math.min(
      CANVAS_LIMIT + 4000,
      world.value.y + world.value.height + 4000,
    );
}
watch(
  () => [world.value.x, world.value.y],
  ([x, y], [oldX, oldY]) => {
    if (viewport.value) {
      viewport.value.scrollLeft += (oldX - x) * zoom.value;
      viewport.value.scrollTop += (oldY - y) * zoom.value;
    }
  },
  { flush: "post" },
);
let gesture = null,
  ignoreClick = false;
function editable(event) {
  return (
    event.target?.matches("input,textarea,select") ||
    event.target?.isContentEditable
  );
}
function canvasKey(event) {
  if (editable(event) || picker.value || editingCard.value) return;
  if (event.code === "Space") {
    event.preventDefault();
    space.value = true;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
    event.preventDefault();
    selectedIds.value = canvas.value.nodes.map((n) => n.id);
    selected.value = null;
    selectedGroup.value = null;
    edge.value = null;
  }
}
function releaseKey(event) {
  if (event.code === "Space") space.value = false;
}
function resetPointer() {
  space.value = false;
  endResize();
  finishGesture();
  endDrag();
  cancelConnection();
}
function startViewport(event) {
  if (event.button === 1 || (event.button === 0 && space.value)) {
    event.preventDefault();
    panning.value = true;
    gesture = {
      type: "pan",
      px: event.clientX,
      py: event.clientY,
      x: viewport.value.scrollLeft / zoom.value + world.value.x,
      y: viewport.value.scrollTop / zoom.value + world.value.y,
    };
  } else if (
    event.button === 0 &&
    !event.target.closest(".canvas-node,.canvas-group button,.canvas-link-hit")
  ) {
    event.preventDefault();
    const point = worldPoint(event);
    if (!event.shiftKey) clearSelection();
    gesture = { type: "select", initial: [...selectedIds.value] };
    marquee.value = { x1: point.x, y1: point.y, x2: point.x, y2: point.y };
  } else return;
  window.addEventListener("pointermove", moveGesture);
  window.addEventListener("pointerup", finishGesture);
  window.addEventListener("pointercancel", finishGesture);
}
function moveGesture(event) {
  if (!gesture) return;
  event.preventDefault();
  if (gesture.type === "pan") {
    const scroll = panCanvasScroll(
      gesture,
      { x: gesture.px - event.clientX, y: gesture.py - event.clientY },
      zoom.value,
      world.value,
    );
    viewport.value.scrollLeft = scroll.left;
    viewport.value.scrollTop = scroll.top;
  } else {
    const point = worldPoint(event);
    marquee.value.x2 = point.x;
    marquee.value.y2 = point.y;
    selectedIds.value = [
      ...new Set([
        ...gesture.initial,
        ...nodesInCanvasRect(canvas.value.nodes, marquee.value),
      ]),
    ];
    selected.value = null;
    selectedGroup.value = null;
    edge.value = null;
  }
}
function finishGesture() {
  if (gesture?.type === "pan") {
    ignoreClick = true;
    setTimeout(() => (ignoreClick = false), 0);
  }
  gesture = null;
  panning.value = false;
  marquee.value = null;
  window.removeEventListener("pointermove", moveGesture);
  window.removeEventListener("pointerup", finishGesture);
  window.removeEventListener("pointercancel", finishGesture);
}
function captureClick(event) {
  if (ignoreClick) {
    event.preventDefault();
    event.stopPropagation();
  }
}
const marqueeStyle = computed(() =>
  marquee.value
    ? {
        left:
          Math.min(marquee.value.x1, marquee.value.x2) - world.value.x + "px",
        top:
          Math.min(marquee.value.y1, marquee.value.y2) - world.value.y + "px",
        width: Math.abs(marquee.value.x2 - marquee.value.x1) + "px",
        height: Math.abs(marquee.value.y2 - marquee.value.y1) + "px",
      }
    : {},
);
const currentGroup = computed(() =>
  canvas.value.groups.find((g) => g.id === selectedGroup.value),
);
const groups = computed(() =>
  canvas.value.groups.map((g) => ({
    ...g,
    ...canvasGroupBounds(canvas.value, g),
  })),
);
function clearSelection() {
  selected.value = null;
  selectedIds.value = [];
  selectedGroup.value = null;
  edge.value = null;
}
function contextMenu(event) {
  event.preventDefault();
  menu.value = {
    x: Math.min(event.clientX, window.innerWidth - 260),
    y: Math.max(8, Math.min(event.clientY, window.innerHeight - 440)),
  };
  const id = event.target.closest(".canvas-node")?.dataset.nodeId;
  if (id && !selectedIds.value.includes(id)) {
    selectedIds.value = [id];
    selected.value = id;
    selectedGroup.value = null;
  }
}
function groupSelection() {
  try {
    const id = crypto.randomUUID();
    canvas.value = groupCanvasNodes(canvas.value, selectedIds.value, id);
    selectedGroup.value = id;
    selected.value = null;
    changed();
  } catch (e) {
    error.value = e.message;
  }
  menu.value = null;
}
function ungroup() {
  canvas.value.groups = canvas.value.groups.filter(
    (g) => g.id !== selectedGroup.value,
  );
  selectedGroup.value = null;
  changed();
  menu.value = null;
}
function connectTo(node) {
  try {
    canvas.value = connectVideoCanvas(canvas.value, source.value, node.id);
    changed();
  } catch (e) {
    error.value = e.message;
  }
  source.value = null;
  linking.value = false;
  connectionPoint.value = null;
}
function worldPoint(event) {
  const box = viewport.value.getBoundingClientRect();
  return {
    x:
      (event.clientX - box.left + viewport.value.scrollLeft) / zoom.value +
      world.value.x,
    y:
      (event.clientY - box.top + viewport.value.scrollTop) / zoom.value +
      world.value.y,
  };
}
function startConnection(event, node) {
  if (event.button !== 0 || space.value) return;
  event.preventDefault();
  event.stopPropagation();
  source.value = node.id;
  connectionPoint.value = worldPoint(event);
  window.addEventListener("pointermove", moveConnection);
  window.addEventListener("pointerup", endConnection);
  window.addEventListener("pointercancel", cancelConnection);
}
function moveConnection(event) {
  event.preventDefault();
  connectionPoint.value = worldPoint(event);
}
function cancelConnection() {
  window.removeEventListener("pointermove", moveConnection);
  window.removeEventListener("pointerup", endConnection);
  window.removeEventListener("pointercancel", cancelConnection);
  connectionPoint.value = null;
  source.value = null;
}
function endConnection(event) {
  const id = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest(".canvas-node")?.dataset.nodeId;
  const node = canvas.value.nodes.find((n) => n.id === id);
  if (node && source.value && node.id !== source.value) connectTo(node);
  cancelConnection();
}
const draftConnection = computed(() => {
  const node = canvas.value.nodes.find((n) => n.id === source.value);
  if (!node || !connectionPoint.value) return "";
  return canvasEdgePath(node, {
    x: connectionPoint.value.x,
    y: connectionPoint.value.y - 120,
  });
});
const videoMap = computed(() => new Map(props.videos.map((v) => [v.id, v])));
const editingCard = ref(false);
watch(editingCard, async (open) => {
  await nextTick();
  if (open) panel.value?.querySelector(".canvas-card-editor input")?.focus();
  else panel.value?.focus();
});
const selectedNode = computed(() =>
  canvas.value.nodes.find((n) => n.id === selected.value),
);
const availableVideos = computed(() =>
  availableCanvasVideos(canvas.value, props.videos),
);
const statusTitle = (id) =>
  videoStatuses.find(([key]) => key === id)?.[1] || "Création";
const candidates = computed(() =>
  availableVideos.value.filter((v) =>
    v.name.toLocaleLowerCase().includes(query.value.toLocaleLowerCase()),
  ),
);
const pickerPages = computed(() =>
  Math.max(1, Math.ceil(candidates.value.length / 24)),
);
const pickerRows = computed(() =>
  candidates.value.slice((page.value - 1) * 24, page.value * 24),
);
watch(query, () => (page.value = 1));
watch(pickerPages, (count) => (page.value = Math.min(page.value, count)));
let timer,
  active = true,
  writing = false,
  pending = null;
async function flush() {
  clearTimeout(timer);
  if (writing || !pending) return;
  writing = true;
  saving.value = true;
  error.value = "";
  const value = pending;
  pending = null;
  try {
    await props.repository.saveCanvas(value);
    if (!pending) dirty.value = false;
  } catch (e) {
    pending = pending || value;
    error.value = e.message || "Le canvas n’a pas été enregistré.";
  } finally {
    writing = false;
    saving.value = false;
    if (pending && !error.value) flush();
  }
}
function changed() {
  dirty.value = true;
  pending = JSON.parse(JSON.stringify(canvas.value));
  clearTimeout(timer);
  timer = setTimeout(flush, 300);
}
async function close() {
  if (loading.value && !dirty.value) {
    emit("close");
    return;
  }
  await flush();
  if (writing || dirty.value || error.value) return;
  emit("close");
}
function trapTab(event) {
  const scope = panel.value.querySelector(".canvas-picker") || panel.value;
  const fields = [
    ...scope.querySelectorAll(
      'button:not([disabled]),input:not([disabled]),textarea,select,[role="button"]',
    ),
  ].filter((el) => el.getClientRects().length);
  const first = fields[0],
    last = fields.at(-1);
  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === panel.value)
  ) {
    event.preventDefault();
    last?.focus();
  } else if (
    !event.shiftKey &&
    (document.activeElement === last || document.activeElement === panel.value)
  ) {
    event.preventDefault();
    first?.focus();
  }
}
function center() {
  const nodes = canvas.value.nodes;
  const x = nodes.length ? Math.min(...nodes.map((n) => n.x)) : 500,
    y = nodes.length ? Math.min(...nodes.map((n) => n.y)) : 350;
  viewport.value?.scrollTo(
    Math.max(0, (x - world.value.x) * zoom.value - 60),
    Math.max(0, (y - world.value.y) * zoom.value - 70),
  );
}
async function loadCanvas() {
  error.value = "";
  try {
    canvas.value = await props.repository.canvas();
    await nextTick();
    loading.value = false;
    center();
  } catch (e) {
    error.value = e.message;
  }
}
function warnUnsaved(event) {
  if (dirty.value) {
    event.preventDefault();
    event.returnValue = "";
  }
}
onMounted(() => {
  window.addEventListener("beforeunload", warnUnsaved);
  window.addEventListener("keydown", canvasKey);
  window.addEventListener("keyup", releaseKey);
  window.addEventListener("blur", resetPointer);
  panel.value?.focus();
  loadCanvas();
});
onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", warnUnsaved);
  window.removeEventListener("keydown", canvasKey);
  window.removeEventListener("keyup", releaseKey);
  window.removeEventListener("blur", resetPointer);
  endResize();
  finishGesture();
  active = false;
  clearTimeout(timer);
  endDrag();
  cancelConnection();
});
function addNote() {
  if (canvas.value.nodes.length >= 500) {
    error.value = "Limite de 500 cartes atteinte.";
    return;
  }
  const node = {
    id: crypto.randomUUID(),
    type: "note",
    videoId: "",
    title: "Nouvelle étape",
    text: "",
    x: Math.min(
      CANVAS_LIMIT,
      (viewport.value.scrollLeft + 100) / zoom.value + world.value.x,
    ),
    y: Math.min(
      CANVAS_LIMIT,
      (viewport.value.scrollTop + 100) / zoom.value + world.value.y,
    ),
  };
  Object.assign(node, freeCanvasPosition(canvas.value.nodes, node.x, node.y));
  node.x = snapCanvasPosition(node.x, CANVAS_LIMIT, canvas.value.snap);
  node.y = snapCanvasPosition(node.y, CANVAS_LIMIT, canvas.value.snap);
  canvas.value.nodes.push(node);
  selected.value = node.id;
  selectedIds.value = [node.id];
  selectedGroup.value = null;
  changed();
}
function addVideos() {
  const ids = [...new Set(checked.value)].filter((id) =>
    availableVideos.value.some((v) => v.id === id),
  );
  if (canvas.value.nodes.length + ids.length > 500) {
    error.value = "Limite de 500 cartes atteinte.";
    return;
  }
  const x = (viewport.value.scrollLeft + 100) / zoom.value + world.value.x,
    y = (viewport.value.scrollTop + 100) / zoom.value + world.value.y;
  ids.forEach((id, i) => {
    const v = videoMap.value.get(id);
    if (v) {
      const node = {
        id: crypto.randomUUID(),
        type: "video",
        videoId: id,
        title: v.name,
        text: "",
        ...freeCanvasPosition(canvas.value.nodes, x, y),
      };
      node.x = snapCanvasPosition(node.x, CANVAS_LIMIT, canvas.value.snap);
      node.y = snapCanvasPosition(node.y, CANVAS_LIMIT, canvas.value.snap);
      canvas.value.nodes.push(node);
    }
  });
  checked.value = [];
  picker.value = false;
  changed();
}
function selectNode(node, event) {
  if (linking.value && source.value) {
    connectTo(node);
    return;
  }
  edge.value = null;
  selectedGroup.value = null;
  selected.value = node.id;
  if (event?.shiftKey)
    selectedIds.value = selectedIds.value.includes(node.id)
      ? selectedIds.value.filter((id) => id !== node.id)
      : [...selectedIds.value, node.id];
  else selectedIds.value = [node.id];
}
function removeSelected() {
  if (edge.value) {
    canvas.value.edges = canvas.value.edges.filter(
      (e) => !(e.from === edge.value.from && e.to === edge.value.to),
    );
    edge.value = null;
  } else if (selected.value || selectedIds.value.length) {
    for (const id of selectedIds.value.length
      ? selectedIds.value
      : [selected.value])
      canvas.value = removeCanvasNode(canvas.value, id);
    selected.value = null;
    source.value = null;
    selectedIds.value = [];
  }
  changed();
}
function title(node) {
  return node.type === "video"
    ? videoMap.value.get(node.videoId)?.name || node.title + " (introuvable)"
    : node.title;
}
const paths = computed(() =>
  canvas.value.edges.map((e) => {
    const from = canvas.value.nodes.find((n) => n.id === e.from),
      to = canvas.value.nodes.find((n) => n.id === e.to);
    return { ...e, path: canvasEdgePath(from, to) };
  }),
);
let drag = null;
function beginDrag(event, ids, groupId = null) {
  event.preventDefault();
  for (const g of canvas.value.groups)
    g.bounds ||= canvasGroupBounds(canvas.value, g);
  drag = {
    items: canvas.value.nodes
      .filter((n) => ids.includes(n.id))
      .map((n) => ({ id: n.id, x: n.x, y: n.y })),
    px: event.clientX,
    py: event.clientY,
    moved: false,
    groupId,
    bounds: groupId
      ? canvasGroupBounds(
          canvas.value,
          canvas.value.groups.find((g) => g.id === groupId),
        )
      : null,
  };
  window.addEventListener("pointermove", moveDrag);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
}
function startDrag(event, node) {
  if (event.button !== 0 || loading.value || linking.value || space.value)
    return;
  if (!selectedIds.value.includes(node.id)) selectNode(node, event);
  beginDrag(event, selectedIds.value);
}
function startGroupDrag(event, group) {
  if (event.button !== 0 || space.value) return;
  selectedGroup.value = group.id;
  selected.value = null;
  selectedIds.value = [...group.members];
  beginDrag(event, group.members, group.id);
}
function moveDrag(event) {
  if (!drag) return;
  event.preventDefault();
  const dx = (event.clientX - drag.px) / zoom.value,
    dy = (event.clientY - drag.py) / zoom.value;
  const anchor = drag.items[0] || drag.bounds;
  const sx = canvas.value.snap
      ? Math.round((anchor.x + dx) / 24) * 24 - anchor.x
      : dx,
    sy = canvas.value.snap
      ? Math.round((anchor.y + dy) / 24) * 24 - anchor.y
      : dy;
  const boundedX = Math.max(
    -CANVAS_LIMIT - Math.min(anchor.x, ...drag.items.map((n) => n.x)),
    Math.min(
      CANVAS_LIMIT - Math.max(anchor.x, ...drag.items.map((n) => n.x)),
      sx,
    ),
  );
  const boundedY = Math.max(
    -CANVAS_LIMIT - Math.min(anchor.y, ...drag.items.map((n) => n.y)),
    Math.min(
      CANVAS_LIMIT - Math.max(anchor.y, ...drag.items.map((n) => n.y)),
      sy,
    ),
  );
  drag.items.forEach((item) => {
    const node = canvas.value.nodes.find((n) => n.id === item.id);
    node.x = item.x + boundedX;
    node.y = item.y + boundedY;
  });
  if (drag.groupId) {
    const group = canvas.value.groups.find((g) => g.id === drag.groupId);
    group.bounds = {
      ...drag.bounds,
      x: drag.bounds.x + boundedX,
      y: drag.bounds.y + boundedY,
    };
  }
  drag.moved = true;
}
function endDrag(event) {
  if (drag?.moved) {
    if (!drag.groupId && event?.type !== "pointercancel") {
      for (const g of canvas.value.groups)
        g.bounds ||= canvasGroupBounds(canvas.value, g);
      canvas.value = assignCanvasGroups(
        canvas.value,
        drag.items.map((n) => n.id),
      );
    }
    changed();
  }
  drag = null;
  window.removeEventListener("pointermove", moveDrag);
  window.removeEventListener("pointerup", endDrag);
  window.removeEventListener("pointercancel", endDrag);
}
let resizing = null;
function startResize(event, group, corner) {
  if (event.button !== 0 || space.value) return;
  event.preventDefault();
  event.stopPropagation();
  selectedGroup.value = group.id;
  resizing = {
    id: group.id,
    corner,
    x: event.clientX,
    y: event.clientY,
    bounds: canvasGroupBounds(canvas.value, group),
  };
  window.addEventListener("pointermove", resizeGroup);
  window.addEventListener("pointerup", endResize);
  window.addEventListener("pointercancel", endResize);
}
function resizeGroup(event) {
  const r = resizing;
  if (!r) return;
  const b = r.bounds,
    dx = (event.clientX - r.x) / zoom.value,
    dy = (event.clientY - r.y) / zoom.value;
  let left = b.x,
    top = b.y,
    right = b.x + b.width,
    bottom = b.y + b.height;
  if (r.corner.includes("w")) left = snapCanvasPosition(b.x + dx);
  else if (r.corner.includes("e")) right = snapCanvasPosition(right + dx);
  if (r.corner.includes("n")) top = snapCanvasPosition(b.y + dy);
  else if (r.corner.includes("s")) bottom = snapCanvasPosition(bottom + dy);
  const members = canvas.value.nodes.filter((n) =>
    canvas.value.groups.find((g) => g.id === r.id).members.includes(n.id),
  );
  left = Math.min(left, right - 328, ...members.map((n) => n.x - 12));
  top = Math.min(top, bottom - 320, ...members.map((n) => n.y - 48));
  right = Math.max(right, left + 328, ...members.map((n) => n.x + 292));
  bottom = Math.max(bottom, top + 320, ...members.map((n) => n.y + 252));
  canvas.value.groups.find((g) => g.id === r.id).bounds = {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}
function endResize() {
  if (resizing) changed();
  resizing = null;
  window.removeEventListener("pointermove", resizeGroup);
  window.removeEventListener("pointerup", endResize);
  window.removeEventListener("pointercancel", endResize);
}
function keyboardMove(event, node) {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key))
    return;
  event.preventDefault();
  const amount = event.shiftKey ? 96 : 24;
  node.x = snapCanvasPosition(
    node.x +
      (event.key === "ArrowLeft"
        ? -amount
        : event.key === "ArrowRight"
          ? amount
          : 0),
    CANVAS_LIMIT,
    canvas.value.snap,
  );
  node.y = snapCanvasPosition(
    node.y +
      (event.key === "ArrowUp"
        ? -amount
        : event.key === "ArrowDown"
          ? amount
          : 0),
    CANVAS_LIMIT,
    canvas.value.snap,
  );
  changed();
}
function setZoom(value, event) {
  const old = zoom.value,
    next = Math.max(0.25, Math.min(1.5, value));
  const box = viewport.value.getBoundingClientRect(),
    px = event ? event.clientX - box.left : box.width / 2,
    py = event ? event.clientY - box.top : box.height / 2;
  const x = (viewport.value.scrollLeft + px) / old + world.value.x,
    y = (viewport.value.scrollTop + py) / old + world.value.y;
  zoom.value = next;
  requestAnimationFrame(() => {
    if (active)
      viewport.value?.scrollTo(
        (x - world.value.x) * next - px,
        (y - world.value.y) * next - py,
      );
  });
}
function wheel(event) {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  setZoom(zoom.value * (event.deltaY > 0 ? 0.9 : 1.1), event);
}
function selectEdge(value) {
  edge.value = value;
  selected.value = null;
  selectedIds.value = [];
  selectedGroup.value = null;
}
</script>
<template>
  <section
    ref="panel"
    tabindex="-1"
    @keydown.tab="trapTab"
    class="learning-canvas"
    @pointerdown="menu = null"
    role="dialog"
    aria-modal="true"
    aria-label="Canvas des parcours"
    @keydown.esc="
      menu
        ? (menu = null)
        : editingCard
          ? (editingCard = false)
          : picker
            ? (picker = false)
            : source
              ? cancelConnection()
              : close()
    "
  >
    <header class="learning-canvas-header">
      <div>
        <span class="eyebrow">PARCOURS PÉDAGOGIQUES</span>
        <h2>Ton canvas</h2>
        <p>
          Clic droit pour ajouter · Espace ou molette pour se déplacer · Tire
          les flèches depuis les cartes
        </p>
      </div>
      <button class="icon-btn" aria-label="Fermer le canvas" @click="close">
        <X :size="22" />
      </button>
    </header>
    <div class="canvas-workspace">
      <div
        ref="viewport"
        class="canvas-viewport"
        @wheel="wheel"
        @scroll="extendWorld"
        @pointerdown="startViewport"
        @click.capture="captureClick"
        :class="{ 'is-panning': panning, 'can-pan': space }"
        @contextmenu="contextMenu"
      >
        <div
          :style="{
            width: world.width * zoom + 'px',
            height: world.height * zoom + 'px',
          }"
        >
          <div
            class="canvas-world"
            :style="{
              width: world.width + 'px',
              height: world.height + 'px',
              transform: 'scale(' + zoom + ')',
            }"
          >
            <div
              v-for="group in groups"
              :key="group.id"
              class="canvas-group"
              @dblclick="
                selectedGroup = group.id;
                selected = null;
                editingCard = true;
              "
              :class="{ selected: selectedGroup === group.id }"
              :style="{
                left: group.x - world.x + 'px',
                top: group.y - world.y + 'px',
                width: group.width + 'px',
                height: group.height + 'px',
              }"
            >
              <button
                :aria-label="'Déplacer le groupe ' + group.title"
                @pointerdown="startGroupDrag($event, group)"
                @click="
                  selectedGroup = group.id;
                  selected = null;
                  selectedIds = group.members;
                "
                @contextmenu="
                  selectedGroup = group.id;
                  selected = null;
                  selectedIds = group.members;
                "
              >
                {{ group.title }}<span>{{ group.members.length }} cartes</span>
              </button>
              <button
                v-for="corner in ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']"
                :key="corner"
                class="canvas-group-resize"
                :class="corner"
                :aria-label="'Redimensionner le groupe ' + group.title"
                @pointerdown.stop="startResize($event, group, corner)"
              />
            </div>
            <svg
              class="canvas-connections"
              :width="world.width"
              :height="world.height"
            >
              <defs>
                <marker
                  id="learning-arrow"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="5"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5e8cc" />
                </marker>
              </defs>
              <g :transform="'translate(' + -world.x + ',' + -world.y + ')'">
                <path
                  v-if="draftConnection"
                  :d="draftConnection"
                  class="canvas-link draft"
                  marker-end="url(#learning-arrow)"
                />
                <g v-for="link in paths" :key="link.from + ':' + link.to">
                  <path
                    :d="link.path"
                    class="canvas-link-hit"
                    role="button"
                    tabindex="0"
                    :aria-label="
                      'Lien de ' +
                      title(canvas.nodes.find((n) => n.id === link.from)) +
                      ' vers ' +
                      title(canvas.nodes.find((n) => n.id === link.to))
                    "
                    @click="selectEdge(link)"
                    @keydown.enter="selectEdge(link)"
                  />
                  <path
                    :d="link.path"
                    class="canvas-link"
                    :class="{
                      selected:
                        edge?.from === link.from && edge?.to === link.to,
                    }"
                    marker-end="url(#learning-arrow)"
                  />
                </g>
              </g>
            </svg>
            <div v-if="marquee" class="canvas-marquee" :style="marqueeStyle" />
            <article
              v-for="node in canvas.nodes"
              :key="node.id"
              class="canvas-node"
              :data-node-id="node.id"
              :data-status="
                node.type === 'video'
                  ? videoMap.get(node.videoId)?.status || 'preparation'
                  : null
              "
              :class="{
                selected: selectedIds.includes(node.id),
                source: source === node.id,
                note: node.type === 'note',
              }"
              :style="{
                left: node.x - world.x + 'px',
                top: node.y - world.y + 'px',
              }"
            >
              <button
                class="canvas-port input"
                :aria-label="'Entrée de ' + title(node)"
                title="Dépose une flèche ici"
                @click="linking && source ? connectTo(node) : selectNode(node)"
              />
              <button
                class="canvas-port output"
                :aria-label="'Relier depuis ' + title(node)"
                title="Tirer une flèche vers une autre carte"
                @pointerdown="startConnection($event, node)"
                @keydown.enter.prevent="
                  source = node.id;
                  linking = true;
                "
              />
              <button
                class="canvas-node-handle"
                :aria-label="'Déplacer la carte ' + title(node)"
                @pointerdown="startDrag($event, node)"
                @keydown="keyboardMove($event, node)"
                @keydown.enter.prevent="selectNode(node, $event)"
              >
                <MousePointer2 :size="14" />{{
                  node.type === "note" ? "ÉTAPE" : "VIDÉO"
                }}<span v-if="videoMap.get(node.videoId)?.archived">
                  · ARCHIVÉE</span
                ></button
              ><button
                class="canvas-node-content"
                @click="selectNode(node, $event)"
                @dblclick="node.type === 'note' && (editingCard = true)"
              >
                <LibraryPreview
                  v-if="node.type === 'video'"
                  :repository="repository"
                  :project-id="node.videoId"
                />
                <div v-else class="canvas-note-visual">
                  <Link2 :size="28" /><span>ÉTAPE DU PARCOURS</span>
                </div>
                <strong>{{ title(node) }}</strong>
                <span
                  v-if="node.type === 'video'"
                  class="canvas-video-status"
                  :data-status="
                    videoMap.get(node.videoId)?.status || 'preparation'
                  "
                  >{{ statusTitle(videoMap.get(node.videoId)?.status) }}</span
                >
                <p v-if="node.type === 'note'">
                  {{ node.text || "Double-clique pour définir cette étape." }}
                </p></button
              ><button
                v-if="node.type === 'video' && videoMap.has(node.videoId)"
                class="canvas-open-video"
                @click="
                  flush().then(() => {
                    if (!dirty && !error) emit('open', node.videoId);
                  })
                "
              >
                <ArrowUpRight :size="14" />Ouvrir la vidéo
              </button>
            </article>
          </div>
        </div>
      </div>
    </div>
    <footer class="canvas-status">
      <span role="status" aria-live="polite"
        >{{
          loading
            ? "Chargement…"
            : error ||
              (saving
                ? "Enregistrement…"
                : dirty
                  ? "Modifications en attente"
                  : "Enregistré")
        }}
        ·
        {{
          canvas.snap ? "Aimantation active" : "Aimantation désactivée"
        }}</span
      ><button
        v-if="error"
        class="btn"
        @click="loading ? loadCanvas() : flush()"
      >
        Réessayer
      </button>
      <div class="canvas-bottom-tools">
        <button
          class="icon-btn"
          aria-label="Dézoomer le canvas"
          @click="setZoom(zoom - 0.1)"
        >
          −</button
        ><select
          :value="zoom"
          aria-label="Zoom du canvas"
          @change="setZoom(Number($event.target.value))"
        >
          <option
            v-for="v in [0.25, 0.5, 0.8, 1, 1.25, 1.5]"
            :key="v"
            :value="v"
          >
            {{ Math.round(v * 100) }} %
          </option>
          <option
            v-if="![0.25, 0.5, 0.8, 1, 1.25, 1.5].includes(zoom)"
            :value="zoom"
          >
            {{ Math.round(zoom * 100) }} %
          </option></select
        ><button
          class="icon-btn"
          aria-label="Zoomer le canvas"
          @click="setZoom(zoom + 0.1)"
        >
          +
        </button>
      </div>
    </footer>
    <div
      v-if="menu"
      class="canvas-context-menu"
      role="menu"
      :style="{ left: menu.x + 'px', top: menu.y + 'px' }"
      @pointerdown.stop
    >
      <button
        role="menuitem"
        :disabled="loading"
        @click="
          picker = true;
          menu = null;
        "
      >
        <Plus :size="16" />Ajouter des vidéos</button
      ><button
        role="menuitem"
        :disabled="loading"
        @click="
          addNote();
          menu = null;
        "
      >
        Ajouter une étape
      </button>
      <hr />
      <button
        v-if="currentGroup || selectedNode?.type === 'note'"
        role="menuitem"
        @click="
          editingCard = true;
          menu = null;
        "
      >
        {{ currentGroup ? "Renommer le groupe" : "Modifier l’étape" }}
      </button>
      <button
        role="menuitem"
        :disabled="selectedIds.length < 2"
        @click="groupSelection"
      >
        Grouper la sélection ({{ selectedIds.length }})</button
      ><button v-if="currentGroup" role="menuitem" @click="ungroup">
        Dégrouper</button
      ><button
        role="menuitem"
        :disabled="!selected && !edge && !selectedIds.length"
        @click="
          removeSelected();
          menu = null;
        "
      >
        Retirer la sélection
      </button>
      <hr />
      <button
        role="menuitemcheckbox"
        :aria-checked="canvas.snap"
        @click="
          canvas.snap = !canvas.snap;
          changed();
          menu = null;
        "
      >
        {{ canvas.snap ? "✓ " : "" }}Aimantation à la grille</button
      ><button
        role="menuitem"
        @click="
          center();
          menu = null;
        "
      >
        Recentrer les cartes</button
      ><button
        role="menuitem"
        @click="
          setZoom(1);
          menu = null;
        "
      >
        Zoom à 100 %</button
      ><button
        role="menuitem"
        @click="
          setZoom(zoom + 0.1);
          menu = null;
        "
      >
        Zoomer</button
      ><button
        role="menuitem"
        @click="
          setZoom(zoom - 0.1);
          menu = null;
        "
      >
        Dézoomer
      </button>
    </div>
    <div
      v-if="editingCard && (currentGroup || selectedNode?.type === 'note')"
      class="canvas-picker-backdrop"
      @click.self="editingCard = false"
    >
      <section
        class="canvas-card-editor canvas-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Modifier la carte"
      >
        <header>
          <h3>
            {{ currentGroup ? "Modifier le groupe" : "Modifier l’étape" }}
          </h3>
          <button
            class="icon-btn"
            aria-label="Fermer la modification"
            @click="editingCard = false"
          >
            <X :size="20" />
          </button>
        </header>
        <label v-if="currentGroup"
          >Nom du groupe<input
            v-model="currentGroup.title"
            maxlength="200"
            @input="changed"
        /></label>
        <template v-else
          ><label
            >Titre<input
              v-model="selectedNode.title"
              maxlength="200"
              @input="changed" /></label
          ><label
            >Description<textarea
              v-model="selectedNode.text"
              maxlength="4000"
              rows="6"
              @input="changed"
            /></label
        ></template>
        <button class="btn primary" @click="editingCard = false">
          Terminer
        </button>
      </section>
    </div>
    <div v-if="picker" class="canvas-picker-backdrop">
      <section
        class="canvas-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Ajouter des vidéos au canvas"
      >
        <header>
          <h3>Ajouter depuis ta bibliothèque</h3>
          <button
            class="icon-btn"
            aria-label="Fermer la liste des vidéos"
            @click="picker = false"
          >
            <X :size="20" />
          </button>
        </header>
        <label class="canvas-picker-search"
          ><Search :size="16" /><input
            v-model="query"
            placeholder="Rechercher une vidéo"
            aria-label="Rechercher une vidéo à ajouter"
        /></label>
        <div class="canvas-picker-list">
          <label
            v-for="video in pickerRows"
            :key="video.id"
            :class="{ checked: checked.includes(video.id) }"
            ><input
              type="checkbox"
              v-model="checked"
              :value="video.id"
            /><LibraryPreview
              :repository="repository"
              :project-id="video.id"
            /><span
              ><strong>{{ video.name }}</strong
              ><small>{{ video.playlist || "Sans playlist" }}</small></span
            ></label
          >
          <p v-if="!pickerRows.length">Aucune vidéo correspondante.</p>
        </div>
        <nav>
          <button class="btn" :disabled="page === 1" @click="page--">
            Précédent</button
          ><span>{{ page }} / {{ pickerPages }}</span
          ><button class="btn" :disabled="page === pickerPages" @click="page++">
            Suivant
          </button>
        </nav>
        <button
          class="btn primary"
          :disabled="!checked.length"
          @click="addVideos"
        >
          Ajouter {{ checked.length }} vidéo{{ checked.length > 1 ? "s" : "" }}
        </button>
        <p>
          Les cartes référencent tes vidéos existantes ; leurs documents ne sont
          pas copiés.
        </p>
      </section>
    </div>
  </section>
</template>
