import { selectionUnits, layoutUnits, arrangeUnits } from "./selection.js";
import { placeOnSlide } from "./slidePlacement.js";
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
  inject,
} from "vue";
import { workflowNavigation } from "./workflowNavigation.js";
import {
  createDesign,
  designPageSize,
  designColumns,
  normalizeDesign,
  normalizeDesignElement,
  designPage,
  designElement,
  designId,
  copyDesign,
  designBounds,
  duplicateDesignElements,
  paginateDesignText,
  sampleDesign,
} from "./designModel.js";
import { designRepository } from "./designRepository.js";
import {
  exportDesignSvg,
  downloadDesign,
  printDesign,
  measureDesignText,
  designTextLines,
} from "./designExport.js";
import { imageSource, imageImportError } from "./imageImport.js";
import { resizeRotated, rotationFromPointer, rotatePoint } from "./editor.js";
import { ProjectFile, fileMemory } from "./projectFile.js";
import { ProjectHistory } from "./history.js";
export function useDesignStudio(props) {
  const navigation = inject(workflowNavigation),
    store = designRepository(props.repository, props.kind),
    doc = ref(null),
    rows = ref([]),
    pageIndex = ref(0),
    selection = ref([]),
    tool = ref("select"),
    zoom = ref(80),
    pan = ref({ x: 0, y: 0 }),
    grid = ref(true),
    snapping = ref(true),
    guides = ref(true),
    loading = ref(true),
    dirty = ref(false),
    saving = ref(false),
    error = ref(""),
    notice = ref(""),
    query = ref(""),
    context = ref(null),
    pending = ref(null),
    newDialog = ref(false),
    newName = ref(""),
    newFormat = ref(0),
    textDialog = ref(null),
    flowDialog = ref(false),
    flowText = ref(""),
    flowStyle = ref("body"),
    stage = ref(null),
    viewport = ref(null),
    dragging = ref(false),
    marquee = ref(null),
    penNodes = ref([]),
    nodeEditing = ref(false),
    nodeIndex = ref(-1),
    historyVersion = ref(0),
    settings = ref(false);
  const pageSize = computed(() =>
    doc.value
      ? designPageSize(doc.value, pageIndex.value)
      : { width: 1024, height: 768 },
  );
  let loadVersion = 0,
    file,
    history,
    revision = null,
    timer,
    noticeTimer,
    queue = Promise.resolve(),
    disposed = false,
    loaded = false,
    gesture,
    space = false,
    clipboard = [];
  const page = computed(() => doc.value?.pages[pageIndex.value]),
    selected = computed(
      () =>
        page.value?.elements.filter((e) => selection.value.includes(e.id)) ||
        [],
    ),
    object = computed(() =>
      selected.value.length === 1 ? selected.value[0] : null,
    ),
    bounds = computed(() => designBounds(selected.value)),
    isLayout = props.kind === "layout";
  const canUndo = computed(() => {
      historyVersion.value;
      return history?.index > 0;
    }),
    canRedo = computed(() => {
      historyVersion.value;
      return history && history.index < history.states.length - 1;
    });
  function say(message) {
    notice.value = message;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => (notice.value = ""), 4500);
  }
  async function flush() {
    clearTimeout(timer);
    await queue.catch(() => {});
    if (!doc.value || !dirty.value) return;
    const value = copyDesign(doc.value),
      id = value.id;
    queue = queue
      .catch(() => {})
      .then(async () => {
        saving.value = true;
        try {
          const next = await store.save(value, revision);
          if (doc.value?.id === id) {
            revision = next;
            dirty.value = JSON.stringify(doc.value) !== JSON.stringify(value);
          }
          error.value = "";
        } catch (e) {
          error.value = e.message;
          throw e;
        } finally {
          saving.value = false;
        }
      });
    await queue;
    if (dirty.value) return flush();
  }
  function schedule() {
    dirty.value = true;
    clearTimeout(timer);
    if (!dragging.value) timer = setTimeout(() => flush().catch(() => {}), 500);
  }
  watch(
    doc,
    () => {
      if (loaded && doc.value) schedule();
    },
    { deep: true },
  );
  async function load() {
    const version = ++loadVersion,
      id = props.documentId;
    loading.value = true;
    loaded = false;
    clearTimeout(timer);
    try {
      const list = await store.list();
      if (version !== loadVersion) return;
      rows.value = list;
      if (id) {
        const result = await store.load(id);
        if (version !== loadVersion) return;
        doc.value = result.document;
        revision = result.revision;
        history = new ProjectHistory(doc.value);
        historyVersion.value++;
        file = new ProjectFile(window, fileMemory, {
          slot: "design:" + props.kind + ":" + doc.value.id,
          suggestedName: doc.value.name + ".frame-" + props.kind + ".json",
        });
        await file.restore(doc.value.id);
      } else {
        doc.value = null;
        file = null;
        revision = null;
      }
      if (version !== loadVersion) return;
      dirty.value = false;
      selection.value = [];
      pageIndex.value = 0;
      penNodes.value = [];
      error.value = "";
    } catch (e) {
      if (version === loadVersion) {
        doc.value = null;
        error.value = e.message;
      }
    } finally {
      if (version === loadVersion) {
        loading.value = false;
        await nextTick();
        loaded = true;
        fit();
      }
    }
  }

  watch(
    () => props.documentId,
    () => {
      load();
    },
  );
  function record() {
    history?.record(doc.value);
    historyVersion.value++;
  }
  function edit(change) {
    if (!doc.value) return;
    change();
    record();
  }
  function undo() {
    const value = history?.undo();
    if (value) {
      doc.value = value;
      selection.value = [];
      pageIndex.value = Math.min(pageIndex.value, value.pages.length - 1);
      historyVersion.value++;
    }
  }
  function redo() {
    const value = history?.redo();
    if (value) {
      doc.value = value;
      selection.value = [];
      pageIndex.value = Math.min(pageIndex.value, value.pages.length - 1);
      nodeEditing.value = false;
      historyVersion.value++;
    }
  }
  const route = (id) =>
    "#/" + (isLayout ? "mise-en-page" : "vectoriel") + (id ? "/" + id : "");
  async function open(id) {
    await navigation.navigate(route(id));
  }
  async function create(example = false) {
    try {
      await flush();
      const value = example
        ? sampleDesign(props.kind)
        : createDesign(props.kind, newName.value, newFormat.value);
      await store.save(value);
      newDialog.value = false;
      await open(value.id);
    } catch (e) {
      error.value = e.message;
    }
  }
  function confirm(title, detail, action) {
    pending.value = { title, detail, action };
  }
  async function accept() {
    const action = pending.value?.action;
    pending.value = null;
    try {
      await action?.();
    } catch (e) {
      error.value = e.message;
    }
  }
  function removeDocument(row) {
    confirm(
      "Supprimer ce document ?",
      `« ${row.name} » et son contenu seront supprimés de cet atelier.`,
      async () => {
        await store.remove(row.id);
        rows.value = await store.list();
      },
    );
  }
  function setPage(index) {
    pageIndex.value = index;
    selection.value = [];
    penNodes.value = [];
    nodeEditing.value = false;
  }
  function addPage(duplicate = false, orientation = "") {
    if (doc.value.pages.length >= 100) {
      say("Limite de 100 pages atteinte.");
      return;
    }
    edit(() => {
      const value = duplicate
        ? copyDesign(page.value)
        : designPage(
            `${isLayout ? "Page" : "Plan de travail"} ${doc.value.pages.length + 1}`,
          );
      if (!duplicate) {
        const current = pageSize.value;
        const low = Math.min(current.width, current.height),
          high = Math.max(current.width, current.height);
        value.width =
          orientation === "portrait"
            ? low
            : orientation === "landscape"
              ? high
              : current.width;
        value.height =
          orientation === "portrait"
            ? high
            : orientation === "landscape"
              ? low
              : current.height;
      }
      value.id = designId();
      if (duplicate)
        value.elements = duplicateDesignElements(value.elements, 0);
      doc.value.pages.splice(pageIndex.value + 1, 0, value);
      pageIndex.value++;
      selection.value = [];
    });
  }
  function removePage() {
    if (doc.value.pages.length === 1) {
      say("Conserve au moins une page.");
      return;
    }
    confirm("Supprimer cette page ?", page.value.name, () =>
      edit(() => {
        doc.value.pages.splice(pageIndex.value, 1);
        setPage(Math.max(0, pageIndex.value - 1));
      }),
    );
  }
  function movePage(from, to) {
    if (from === to || to < 0 || to >= doc.value.pages.length) return;
    edit(() => {
      const active = page.value.id,
        [moved] = doc.value.pages.splice(from, 1);
      doc.value.pages.splice(to, 0, moved);
      pageIndex.value = doc.value.pages.findIndex((p) => p.id === active);
    });
  }
  function add(type, options = {}, point = null) {
    if (page.value.elements.length >= 300) {
      say("Limite de 300 objets par page atteinte.");
      return;
    }
    const p = point || { x: doc.value.margin + 32, y: doc.value.margin + 32 };
    edit(() => {
      const e = designElement(type, {
        x: p.x,
        y: p.y,
        ...(type === "text" ? doc.value.styles[options.style || "body"] : {}),
        ...options,
      });
      page.value.elements.push(e);
      selection.value = [e.id];
      settings.value = false;
      tool.value = "select";
      nodeEditing.value = false;
      nodeIndex.value = -1;
      penNodes.value = [];
    });
  }
  function pick(id, event) {
    if (tool.value !== "select" || space) return;
    const e = page.value.elements.find((item) => item.id === id);
    if (!e) return;
    const ids = e.group
      ? page.value.elements
          .filter((item) => item.group === e.group)
          .map((item) => item.id)
      : [id];
    selection.value = event?.shiftKey
      ? [...new Set([...selection.value, ...ids])]
      : selection.value.includes(id)
        ? selection.value
        : ids;
    nodeEditing.value = false;
    nodeIndex.value = -1;
  }
  function change(field, value) {
    edit(() => {
      for (const e of selected.value)
        if (!e.locked)
          e[field] = normalizeDesignElement({ ...e, [field]: value })[field];
    });
  }
  function changeDoc(field, value) {
    if (field === "columns") {
      edit(() => {
        doc.value.columns = Math.max(1, Math.min(8, Number(value) || 1));
        doc.value.columnWeights = Array.from(
          { length: doc.value.columns },
          (_, i) => doc.value.columnWeights?.[i] || 1,
        );
      });
      return;
    }
    if (["width", "height"].includes(field)) {
      edit(
        () =>
          (page.value[field] = Math.max(
            128,
            Math.min(field === "width" ? 4096 : 8192, Number(value) || 128),
          )),
      );
      return;
    }

    edit(
      () =>
        (doc.value[field] = normalizeDesign(
          {
            ...doc.value,
            pages: [{ ...doc.value.pages[0], elements: [] }],
            [field]: value,
          },
          props.kind,
        )[field]),
    );
  }
  function applyStyle(style) {
    edit(() => {
      for (const e of selected.value.filter(
        (e) => e.type === "text" && !e.locked,
      ))
        Object.assign(e, doc.value.styles[style], {
          style,
          code: style === "code",
        });
    });
  }
  function changeStyle(style, field, value) {
    edit(() => {
      value =
        field === "size"
          ? Math.max(6, Math.min(300, Number(value) || 17))
          : field === "leading"
            ? Math.max(0.8, Math.min(3, Number(value) || 1.5))
            : value;
      doc.value.styles[style][field] = value;
      for (const p of doc.value.pages)
        for (const e of p.elements)
          if (field !== "name" && e.type === "text" && e.style === style)
            e[field] = value;
    });
  }
  function deleteSelection() {
    if (!selected.value.some((e) => !e.locked)) return;
    confirm(
      "Supprimer la sélection ?",
      `${selected.value.filter((e) => !e.locked).length} objet(s) seront supprimés.`,
      () =>
        edit(() => {
          page.value.elements = page.value.elements.filter(
            (e) => !selection.value.includes(e.id) || e.locked,
          );
          selection.value = [];
        }),
    );
  }
  function duplicate() {
    const sourceIds = new Set(
      selected.value
        .filter((e) => !e.locked)
        .flatMap((e) => [e.id, ...(e.cutouts || [])]),
    );
    const sources = page.value.elements.filter((e) => sourceIds.has(e.id));
    if (!sources.length) return;
    if (page.value.elements.length + sources.length > 300) {
      say("Limite de 300 objets par page.");
      return;
    }
    edit(() => {
      const copies = duplicateDesignElements(sources);
      page.value.elements.push(...copies);
      selection.value = copies.map((e) => e.id);
    });
  }
  async function copy() {
    const ids = new Set(
      selected.value.flatMap((e) => [e.id, ...(e.cutouts || [])]),
    );
    clipboard = copyDesign(page.value.elements.filter((e) => ids.has(e.id)));
    try {
      await navigator.clipboard.writeText(
        JSON.stringify({
          format: "frame-design-selection",
          elements: clipboard,
        }),
      );
      say("Sélection copiée.");
    } catch {
      say("Copie disponible dans cet atelier.");
    }
  }
  async function paste() {
    try {
      let data;
      try {
        data = JSON.parse(await navigator.clipboard.readText());
      } catch {}
      const values =
        data?.format === "frame-design-selection" &&
        Array.isArray(data.elements)
          ? data.elements
          : clipboard;
      if (!values?.length) return;
      if (page.value.elements.length + values.length > 300)
        throw Error("La sélection dépasserait 300 objets.");
      const validated = normalizeDesign({
        ...createDesign(props.kind),
        pages: [{ ...designPage(), elements: values }],
      }).pages[0].elements;
      edit(() => {
        const copies = duplicateDesignElements(validated);
        page.value.elements.push(...copies);
        selection.value = copies.map((e) => e.id);
      });
    } catch (e) {
      say(e.message);
    }
  }
  function group() {
    if (selected.value.length < 2) return;
    edit(() => {
      const id = designId();
      for (const e of selected.value) e.group = id;
    });
  }
  function ungroup() {
    change("group", "");
  }
  function boolean(mode) {
    if (
      selected.value.length !== 2 ||
      selected.value.some((e) => e.type !== "shape" || e.locked)
    ) {
      say("Sélectionne deux formes déverrouillées.");
      return;
    }
    edit(() => {
      const [base, cut] = selected.value;
      const used = page.value.elements.some(
        (e) => e.cutouts?.includes(base.id) || e.cutouts?.includes(cut.id),
      );
      if (used) {
        say("Détache d’abord les découpes existantes.");
        return;
      }
      base.cutouts = [cut.id];
      base.booleanMode = mode;
      selection.value = [base.id];
    });
  }
  function order(direction) {
    edit(() => {
      const chosen = page.value.elements.filter((e) =>
          selection.value.includes(e.id),
        ),
        rest = page.value.elements.filter(
          (e) => !selection.value.includes(e.id),
        );
      page.value.elements =
        direction === "front" ? [...rest, ...chosen] : [...chosen, ...rest];
    });
  }
  function align(axis) {
    const b = bounds.value;
    if (!b) return;
    edit(() => {
      for (const e of selected.value.filter((e) => !e.locked)) {
        if (axis === "left") e.x = b.x;
        if (axis === "right") e.x = b.x + b.w - e.w;
        if (axis === "center") e.x = b.x + (b.w - e.w) / 2;
        if (axis === "top") e.y = b.y;
        if (axis === "middle") e.y = b.y + (b.h - e.h) / 2;
        if (axis === "bottom") e.y = b.y + b.h - e.h;
      }
    });
  }
  function distribute(axis) {
    if (selected.value.length < 3) return;
    edit(() => {
      const list = [...selected.value].sort((a, b) => a[axis] - b[axis]),
        size = axis === "x" ? "w" : "h",
        first = list[0][axis],
        last = list.at(-1)[axis] + list.at(-1)[size],
        gap =
          (last - first - list.reduce((n, e) => n + e[size], 0)) /
          (list.length - 1);
      let position = first;
      for (const e of list) {
        if (!e.locked) e[axis] = position;
        position += e[size] + gap;
      }
    });
  }
  function groupUnits() {
    const positions = Object.fromEntries(selected.value.map((e) => [e.id, e])),
      groups = [
        ...new Set(selected.value.map((e) => e.group).filter(Boolean)),
      ].map((id) => ({
        id,
        keys: selected.value.filter((e) => e.group === id).map((e) => e.id),
      }));
    return {
      positions,
      units: selectionUnits(
        groups,
        selected.value.map((e) => e.id),
        positions,
      ),
    };
  }
  function arrange(axis, mode, gap) {
    const { positions, units } = groupUnits(),
      next =
        mode === "line"
          ? layoutUnits(positions, units, axis, gap)
          : arrangeUnits(positions, units, axis, mode, gap);
    edit(() => {
      for (const e of selected.value)
        if (!e.locked && next[e.id]) Object.assign(e, next[e.id]);
    });
  }
  function place(x, y) {
    const positions = Object.fromEntries(selected.value.map((e) => [e.id, e])),
      box = Object.fromEntries(selected.value.map((e) => [e.id, e])),
      keys = selected.value.map((e) => e.id),
      next = placeOnSlide(
        positions,
        box,
        [],
        keys,
        x || "center",
        y || "center",
        0,
        pageSize.value.width,
        pageSize.value.height,
      );
    edit(() => {
      for (const e of selected.value)
        if (!e.locked && next[e.id])
          Object.assign(e, {
            x: x ? next[e.id].x : e.x,
            y: y ? next[e.id].y : e.y,
          });
    });
  }
  function centerPage() {
    edit(() => {
      const b = bounds.value;
      if (!b) return;
      for (const e of selected.value.filter((e) => !e.locked)) {
        e.x += (pageSize.value.width - b.w) / 2 - b.x;
        e.y += (pageSize.value.height - b.h) / 2 - b.y;
      }
    });
  }
  function point(event) {
    const rect = stage.value.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * pageSize.value.width,
      y: ((event.clientY - rect.top) / rect.height) * pageSize.value.height,
    };
  }
  function fit() {
    if (!viewport.value || !doc.value) return;
    zoom.value = Math.max(
      10,
      Math.min(
        150,
        Math.floor(
          Math.min(
            (viewport.value.clientWidth - 160) / pageSize.value.width,
            (viewport.value.clientHeight - 120) / pageSize.value.height,
          ) * 100,
        ),
      ),
    );
    pan.value = { x: 0, y: 0 };
  }
  function wheel(event) {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    zoom.value = Math.max(
      10,
      Math.min(400, zoom.value * (event.deltaY > 0 ? 0.9 : 1.1)),
    );
  }
  function begin(event, kind = "move", handle = "") {
    if (event.button !== 0 && event.button !== 1) return;
    const target = event.target.closest?.("[data-hit]"),
      id = target?.dataset.hit;
    if (event.button === 1 || space) {
      event.preventDefault();
      gesture = {
        kind: "pan",
        x: event.clientX,
        y: event.clientY,
        origin: { ...pan.value },
      };
    } else if (tool.value === "pen") {
      event.preventDefault();
      const p = point(event);
      if (
        penNodes.value.length > 2 &&
        Math.hypot(p.x - penNodes.value[0].x, p.y - penNodes.value[0].y) <
          (12 * 100) / zoom.value
      ) {
        finishPen(true);
        return;
      }
      if (
        penNodes.value.length &&
        Math.hypot(
          p.x - penNodes.value.at(-1).x,
          p.y - penNodes.value.at(-1).y,
        ) < 2
      )
        return;
      penNodes.value.push({
        x: p.x,
        y: p.y,
        inX: p.x,
        inY: p.y,
        outX: p.x,
        outY: p.y,
      });
      gesture = { kind: "pen", index: penNodes.value.length - 1, start: p };
    } else if (kind === "node") {
      if (object.value?.locked) return;
      const p = point(event);
      gesture = {
        kind: "node",
        handle,
        start: p,
        origin: copyDesign(object.value),
        index: nodeIndex.value,
      };
    } else if (id || kind === "resize" || kind === "rotate") {
      event.preventDefault();
      if (id) pick(id, event);
      const sources = selected.value.filter((e) => !e.locked && !e.hidden);
      if (!sources.length) return;
      gesture = {
        kind,
        handle,
        start: point(event),
        origins: copyDesign(sources),
        bounds: copyDesign(bounds.value),
      };
    } else {
      selection.value = event.shiftKey ? selection.value : [];
      nodeEditing.value = false;
      const p = point(event);
      gesture = { kind: "marquee", start: p };
      marquee.value = { x: p.x, y: p.y, w: 0, h: 0 };
    }
    dragging.value = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function move(event) {
    if (!gesture) return;
    if (gesture.kind === "pan") {
      pan.value = {
        x: gesture.origin.x + event.clientX - gesture.x,
        y: gesture.origin.y + event.clientY - gesture.y,
      };
      return;
    }
    const p = point(event),
      start = gesture.start,
      dx = p.x - start.x,
      dy = p.y - start.y;
    if (gesture.kind === "pen") {
      const node = penNodes.value[gesture.index];
      node.outX = p.x;
      node.outY = p.y;
      node.inX = node.x - (p.x - node.x);
      node.inY = node.y - (p.y - node.y);
      return;
    }
    if (gesture.kind === "marquee") {
      marquee.value = {
        x: Math.min(start.x, p.x),
        y: Math.min(start.y, p.y),
        w: Math.abs(dx),
        h: Math.abs(dy),
      };
      return;
    }
    if (gesture.kind === "node") {
      const e = object.value;
      if (!e) return;
      const local = rotatePoint(p, { ...e }, -e.rotation),
        x = ((local.x - e.x) / e.w) * 100,
        y = ((local.y - e.y) / e.h) * 100,
        node = e.nodes[gesture.index];
      if (gesture.handle === "anchor") {
        const ox = x - node.x,
          oy = y - node.y;
        node.x = x;
        node.y = y;
        node.inX += ox;
        node.inY += oy;
        node.outX += ox;
        node.outY += oy;
      } else {
        node[gesture.handle + "X"] = x;
        node[gesture.handle + "Y"] = y;
      }
      return;
    }
    let moveX = dx,
      moveY = dy;
    if (gesture.kind === "move" && snapping.value) {
      const b = gesture.bounds,
        columns = designColumns(doc.value, pageIndex.value),
        xs = [
          0,
          pageSize.value.width / 2,
          pageSize.value.width,
          ...columns.flatMap((c) => [c.x, c.x + c.w]),
        ],
        ys = [
          0,
          doc.value.margin,
          pageSize.value.height / 2,
          pageSize.value.height - doc.value.margin,
          pageSize.value.height,
        ];
      const adjust = (start, size, delta, edges) => {
        let best = (7 * 100) / zoom.value,
          result = delta;
        for (const edge of edges)
          for (const anchor of [start, start + size / 2, start + size]) {
            const diff = edge - anchor - delta;
            if (Math.abs(diff) < best) {
              best = Math.abs(diff);
              result = delta + diff;
            }
          }
        return best < (7 * 100) / zoom.value
          ? result
          : Math.round((start + delta) / 8) * 8 - start;
      };
      moveX = adjust(b.x, b.w, dx, xs);
      moveY = adjust(b.y, b.h, dy, ys);
    }
    for (const original of gesture.origins) {
      const e = page.value.elements.find((item) => item.id === original.id);
      if (!e) continue;
      if (gesture.kind === "move") {
        e.x = original.x + moveX;
        e.y = original.y + moveY;
      } else if (gesture.kind === "rotate")
        e.rotation = rotationFromPointer(
          original,
          start,
          p,
          event.shiftKey,
          45,
        );
      else if (gesture.kind === "resize") {
        if (gesture.origins.length > 1) {
          const b = gesture.bounds,
            r = resizeRotated(
              b,
              gesture.handle,
              dx,
              dy,
              "shape",
              event.shiftKey,
            ),
            sx = r.w / b.w,
            sy = r.h / b.h;
          Object.assign(e, {
            x: r.x + (original.x - b.x) * sx,
            y: r.y + (original.y - b.y) * sy,
            w: original.w * sx,
            h: original.h * sy,
          });
          if (e.type === "text") e.size = original.size * Math.min(sx, sy);
        } else {
          const resized = resizeRotated(
            original,
            gesture.handle,
            dx,
            dy,
            "shape",
            event.shiftKey,
          );
          Object.assign(e, resized);
          if (event.shiftKey && e.type === "text")
            e.size = (original.size * resized.w) / original.w;
        }
      }
    }
  }
  function end(event) {
    if (!gesture) return;
    if (gesture.kind === "marquee" && marquee.value) {
      const b = marquee.value;
      selection.value = [
        ...new Set([
          ...selection.value,
          ...page.value.elements
            .filter(
              (e) =>
                !e.hidden &&
                e.x >= b.x &&
                e.y >= b.y &&
                e.x + e.w <= b.x + b.w &&
                e.y + e.h <= b.y + b.h,
            )
            .map((e) => e.id),
        ]),
      ];
    }
    if (!["pan", "marquee", "pen"].includes(gesture.kind)) record();
    gesture = null;
    dragging.value = false;
    marquee.value = null;
    if (dirty.value) schedule();
  }
  function finishPen(closed = false) {
    if (penNodes.value.length < 2) {
      penNodes.value = [];
      tool.value = "select";
      return;
    }
    const nodes = copyDesign(penNodes.value),
      b = designBounds(nodes.map((n) => ({ x: n.x, y: n.y, w: 1, h: 1 })));
    b.w = Math.max(8, b.w);
    b.h = Math.max(8, b.h);
    const converted = nodes.map((n) => ({
      x: ((n.x - b.x) / b.w) * 100,
      y: ((n.y - b.y) / b.h) * 100,
      inX: ((n.inX - b.x) / b.w) * 100,
      inY: ((n.inY - b.y) / b.h) * 100,
      outX: ((n.outX - b.x) / b.w) * 100,
      outY: ((n.outY - b.y) / b.h) * 100,
    }));
    add("shape", {
      shape: "freeform",
      name: "Tracé libre",
      ...b,
      nodes: converted,
      closed,
      filled: closed,
      outlined: true,
      strokeWidth: 3,
    });
    penNodes.value = [];
  }
  function editText(e = object.value) {
    if (e?.locked) return;
    if (e?.type === "text" || e?.type === "table")
      textDialog.value = { id: e.id, value: e.text };
    else if (e?.shape === "freeform") {
      nodeEditing.value = true;
      nodeIndex.value = 0;
    }
  }
  function commitText() {
    const value = textDialog.value;
    edit(() => {
      const e = page.value.elements.find((e) => e.id === value.id);
      if (e && !e.locked) e.text = value.value;
    });
    textDialog.value = null;
  }
  function fitText() {
    if (object.value?.type === "text")
      change(
        "h",
        Math.ceil(
          designTextLines(object.value).length *
            object.value.size *
            object.value.leading +
            4,
        ),
      );
  }
  function addNode() {
    if (
      object.value?.locked ||
      object.value?.shape !== "freeform" ||
      object.value.nodes.length >= 128
    )
      return;
    edit(() => {
      const nodes = object.value.nodes,
        i = nodeIndex.value < 0 ? nodes.length - 1 : nodeIndex.value,
        a = nodes[i],
        b = nodes[(i + 1) % nodes.length],
        x = (a.x + b.x) / 2,
        y = (a.y + b.y) / 2;
      nodes.splice(i + 1, 0, { x, y, inX: x, inY: y, outX: x, outY: y });
      nodeIndex.value = i + 1;
    });
  }
  function deleteNode() {
    if (!object.value || object.value.locked || object.value.nodes.length <= 2)
      return;
    edit(() => {
      object.value.nodes.splice(nodeIndex.value, 1);
      nodeIndex.value = Math.max(0, nodeIndex.value - 1);
    });
  }
  function curveNode(curved) {
    if (object.value?.locked || !object.value?.nodes[nodeIndex.value]) return;
    edit(() => {
      const n = object.value.nodes[nodeIndex.value];
      Object.assign(n, {
        inX: n.x - (curved ? 15 : 0),
        inY: n.y,
        outX: n.x + (curved ? 15 : 0),
        outY: n.y,
      });
    });
  }
  async function importImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const src = await imageSource(file);
      add("image", { src, name: file.name.replace(/\.[^.]+$/, "") });
    } catch (e) {
      error.value = imageImportError(e);
    }
  }
  async function importFillImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      change("imageSrc", await imageSource(file));
    } catch (e) {
      error.value = imageImportError(e);
    }
  }
  async function importProject(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 30 * 1024 * 1024) throw Error("Le projet dépasse 30 Mo.");
      const value = normalizeDesign(JSON.parse(await file.text()), props.kind);
      if (!duplicate) {
        const current = pageSize.value;
        const low = Math.min(current.width, current.height),
          high = Math.max(current.width, current.height);
        value.width =
          orientation === "portrait"
            ? low
            : orientation === "landscape"
              ? high
              : current.width;
        value.height =
          orientation === "portrait"
            ? high
            : orientation === "landscape"
              ? low
              : current.height;
      }
      value.id = designId();
      value.name = (value.name + " · import").slice(0, 100);
      await store.save(value);
      await open(value.id);
    } catch (e) {
      error.value = e.message;
    }
  }
  async function saveFile(saveAs = false) {
    if (!file?.supported) {
      exportProject();
      return;
    }
    try {
      await file.save(JSON.stringify(doc.value, null, 2), doc.value.id, saveAs);
      say("Fichier enregistré.");
    } catch (e) {
      if (e.name !== "AbortError")
        error.value =
          {
            permission:
              "Autorise l’écriture sur ce fichier ou choisis Enregistrer sous.",
            conflict:
              "Ce fichier a changé sur le disque. Utilise Enregistrer sous pour conserver les deux versions.",
            "wrong-kind": "Ce fichier appartient à un autre atelier.",
          }[e.message] || e.message;
    }
  }
  function exportProject() {
    downloadDesign(
      JSON.stringify(doc.value, null, 2),
      doc.value.name + ".frame-" + props.kind + ".json",
    );
  }
  async function svg() {
    await document.fonts.ready;
    downloadDesign(
      exportDesignSvg(doc.value, pageIndex.value),
      doc.value.name + ".svg",
      "image/svg+xml",
    );
    say(
      "SVG exporté. Tu peux l’importer dans les autres ateliers comme image vectorielle.",
    );
  }
  async function pdf() {
    try {
      await flush();
      say("Dans la fenêtre d’impression, choisis Enregistrer en PDF.");
      await printDesign(doc.value);
    } catch (e) {
      error.value = e.message;
    }
  }
  async function png() {
    try {
      const source = exportDesignSvg(doc.value, pageIndex.value),
        url = URL.createObjectURL(
          new Blob([source], { type: "image/svg+xml" }),
        ),
        image = new Image();
      try {
        image.src = url;
        await image.decode();
        const c = document.createElement("canvas");
        c.width = pageSize.value.width;
        c.height = pageSize.value.height;
        c.getContext("2d").drawImage(image, 0, 0);
        const blob = await new Promise((resolve) => c.toBlob(resolve));
        const link = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = link;
        a.download = doc.value.name + ".png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(link), 10000);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      error.value = e.message;
    }
  }
  function flow() {
    try {
      const pages = paginateDesignText(
        {
          ...doc.value,
          ...pageSize.value,
          pages: doc.value.pages.map((p) => ({ ...p, ...pageSize.value })),
        },
        flowText.value,
        flowStyle.value,
        (value, size) =>
          measureDesignText(
            value,
            size,
            doc.value.styles[flowStyle.value].weight,
            flowStyle.value === "code",
            doc.value.styles[flowStyle.value].font,
          ),
      );
      edit(() => {
        const start = doc.value.pages.length;
        doc.value.pages.push(...pages);
        setPage(start);
      });
      flowDialog.value = false;
      flowText.value = "";
      say(`${pages.length} page(s) ajoutée(s).`);
    } catch (e) {
      error.value = e.message;
    }
  }
  function openContext(event) {
    const id = event.target.closest?.("[data-hit]")?.dataset.hit;
    if (id) pick(id, event);
    context.value = {
      x: Math.min(event.clientX, window.innerWidth - 240),
      y: Math.min(event.clientY, window.innerHeight - 420),
      point: stage.value ? point(event) : null,
    };
  }
  function shortcut(event) {
    if (
      event.key === "Tab" &&
      (newDialog.value || flowDialog.value || textDialog.value || pending.value)
    ) {
      const modal = document.querySelector(".design-app .modal-backdrop"),
        items = Array.from(
          modal?.querySelectorAll(
            "button:not(:disabled),input:not(:disabled):not([type=file]),textarea,select",
          ) || [],
        ),
        first = items[0],
        last = items.at(-1);
      if (
        first &&
        (!modal.contains(document.activeElement) ||
          (!event.shiftKey && document.activeElement === last) ||
          (event.shiftKey && document.activeElement === first))
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
      return;
    }

    const editable = event.target.closest?.(
      'input,textarea,select,[contenteditable="true"]',
    );
    if (event.key === "Escape") {
      context.value = null;
      if (pending.value) {
        pending.value = null;
        return;
      }
      if (newDialog.value) {
        newDialog.value = false;
        return;
      }
      if (flowDialog.value) {
        flowDialog.value = false;
        return;
      }
      if (textDialog.value) {
        textDialog.value = null;
        return;
      }
      penNodes.value = [];
      tool.value = "select";
      nodeEditing.value = false;
      return;
    }
    if (
      editable ||
      !doc.value ||
      pending.value ||
      textDialog.value ||
      flowDialog.value ||
      newDialog.value
    )
      return;
    if (event.code === "Space") {
      event.preventDefault();
      space = true;
      return;
    }
    const cmd = event.ctrlKey || event.metaKey;
    if (cmd) {
      const key = event.key.toLowerCase();
      if (["s", "z", "y", "a", "c", "v", "d", "g"].includes(key))
        event.preventDefault();
      if (key === "s") flush().catch(() => {});
      if (key === "z") event.shiftKey ? redo() : undo();
      if (key === "y") redo();
      if (key === "a")
        selection.value = page.value.elements
          .filter((e) => !e.hidden)
          .map((e) => e.id);
      if (key === "c") copy();
      if (key === "v") paste();
      if (key === "d") duplicate();
      if (key === "g") event.shiftKey ? ungroup() : group();
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      nodeEditing.value ? deleteNode() : deleteSelection();
    }
    if (event.key === "Enter" && tool.value === "pen") {
      event.preventDefault();
      finishPen(false);
    }
    if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault();
      const amount = event.shiftKey ? 10 : 1;
      edit(() => {
        for (const e of selected.value.filter((e) => !e.locked)) {
          if (event.key === "ArrowLeft") e.x -= amount;
          if (event.key === "ArrowRight") e.x += amount;
          if (event.key === "ArrowUp") e.y -= amount;
          if (event.key === "ArrowDown") e.y += amount;
        }
      });
    }
  }
  const keyup = (event) => {
      if (event.code === "Space") space = false;
    },
    blur = () => {
      space = false;
    },
    outside = (event) => {
      if (!event.target.closest?.(".design-context")) context.value = null;
    },
    unload = (event) => {
      if (dirty.value) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
  watch([textDialog, flowDialog, newDialog, pending], async () => {
    await nextTick();
    (
      document.querySelector(
        ".design-app .modal-backdrop input:not([type=file]),.design-app .modal-backdrop textarea",
      ) || document.querySelector(".design-app .modal-backdrop button")
    )?.focus();
  });
  onMounted(() => {
    load();
    window.addEventListener("keydown", shortcut);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    window.addEventListener("beforeunload", unload);
    document.addEventListener("pointerdown", outside);
  });
  onBeforeUnmount(() => {
    disposed = true;
    clearTimeout(timer);
    clearTimeout(noticeTimer);
    window.removeEventListener("keydown", shortcut);
    window.removeEventListener("keyup", keyup);
    window.removeEventListener("blur", blur);
    window.removeEventListener("beforeunload", unload);
    document.removeEventListener("pointerdown", outside);
  });
  return {
    doc,
    pageSize,
    place,
    arrange,
    rows,
    pageIndex,
    page,
    selection,
    selected,
    object,
    bounds,
    tool,
    zoom,
    pan,
    grid,
    snapping,
    guides,
    loading,
    dirty,
    saving,
    error,
    notice,
    query,
    context,
    pending,
    newDialog,
    newName,
    newFormat,
    textDialog,
    flowDialog,
    flowText,
    flowStyle,
    stage,
    viewport,
    dragging,
    marquee,
    penNodes,
    nodeEditing,
    nodeIndex,
    settings,
    canUndo,
    canRedo,
    isLayout,
    load,
    flush,
    open,
    create,
    removeDocument,
    setPage,
    addPage,
    removePage,
    movePage,
    add,
    pick,
    change,
    changeDoc,
    applyStyle,
    changeStyle,
    deleteSelection,
    duplicate,
    copy,
    paste,
    group,
    ungroup,
    boolean,
    order,
    align,
    distribute,
    centerPage,
    fit,
    wheel,
    begin,
    move,
    end,
    finishPen,
    editText,
    commitText,
    fitText,
    addNode,
    deleteNode,
    curveNode,
    importImage,
    importFillImage,
    importProject,
    exportProject,
    saveFile,
    svg,
    pdf,
    png,
    flow,
    openContext,
    accept,
    undo,
    redo,
    edit,
    say,
  };
}
