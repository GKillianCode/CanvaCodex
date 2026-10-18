import { ref, computed, watch } from "vue";
import { visibleBlocks } from "./model.js";
import { normalizeShape } from "./shapes.js";
import { canvasPoint, selectRegion } from "./regionSelection.js";
import {
  normalizePathNodes,
  frameFreeform,
  worldNodes,
  localPoint,
  reframeFreeform,
  splitFreeform,
} from "./freeform.js";
const copy = (v) => JSON.parse(JSON.stringify(v));
export function useDrawingTools(s) {
  const tool = ref("move"),
    mode = ref("replace"),
    draft = ref(null),
    region = ref(null),
    activeNode = ref(0),
    hover = ref(null);
  let drag = null,
    regionBase = [],
    regionBounds = {},
    gestureScene = "";
  const selectedPath = computed(() => {
    const key =
        s.selectedKeys.value.length === 1 ? s.selectedKeys.value[0] : null,
      e = s.current.value.elements[key];
    return key && e?.shape === "freeform" && !s.locked(key)
      ? { key, element: e, position: s.scene().positions[key] }
      : null;
  });
  const nodes = computed(() =>
    selectedPath.value
      ? worldNodes(
          selectedPath.value.element.pathNodes,
          selectedPath.value.position,
        )
      : [],
  );
  const tolerance = () =>
    ((10 * 1920) /
      Math.max(1, s.canvas.value?.getBoundingClientRect().width || 900)) *
    (s.isAnimation ? 4 / 3 : 1);
  function select(keys) {
    s.selectedKeys.value = keys;
    s.selected.value = keys.length === 1 ? keys[0] : null;
    s.draw();
  }
  function cancel() {
    if (drag?.kind === "node") {
      if (s.current.value.elements[drag.key])
        s.current.value.elements[drag.key].pathNodes = drag.original;
      s.end();
    }
    if (region.value) select(regionBase);
    draft.value = null;
    region.value = null;
    drag = null;
    hover.value = null;
    s.draw();
  }
  function setTool(value) {
    cancel();
    s.closeEdit();
    tool.value = value;
    if (value === "nodes" && !selectedPath.value)
      s.notify("Sélectionne une forme libre pour modifier ses points.");
  }
  function regionUpdate() {
    if (region.value)
      select(
        selectRegion(
          regionBounds,
          s.current.value.groups,
          region.value,
          regionBase,
          region.value.mode,
        ),
      );
  }
  function beginRegion(p, e) {
    regionBase = s.selectedKeys.value.slice();
    regionBounds = s.bounds();
    region.value = {
      type: tool.value,
      points: [canvasPoint(p)],
      mode: e.altKey
        ? "subtract"
        : e.shiftKey || e.ctrlKey || e.metaKey
          ? "add"
          : mode.value,
    };
    gestureScene = s.current.value.id;
  }
  function down(e) {
    if (tool.value === "move" || e.button !== 0) return false;
    const p = s.coords(e);
    hover.value = p;
    s.canvas.value?.focus({ preventScroll: true });
    s.closeEdit();
    if (tool.value === "nodes") return false;
    if (tool.value === "pen") {
      if (
        draft.value?.length >= 3 &&
        Math.hypot(p.x - draft.value[0].x, p.y - draft.value[0].y) < tolerance()
      ) {
        finish(true);
        return true;
      }
      if ((draft.value?.length || 0) >= 128) {
        s.notify("Limite de 128 points atteinte.");
        return true;
      }
      if (
        draft.value?.length &&
        Math.hypot(p.x - draft.value.at(-1).x, p.y - draft.value.at(-1).y) <
          tolerance() / 3
      )
        return true;
      if (!draft.value) draft.value = [];
      draft.value.push({
        x: p.x,
        y: p.y,
        inX: p.x,
        inY: p.y,
        outX: p.x,
        outY: p.y,
      });
      drag = { kind: "pen", index: draft.value.length - 1 };
      e.currentTarget.setPointerCapture(e.pointerId);
      return true;
    }
    if (tool.value === "polygon") {
      if (!region.value) beginRegion(p, e);
      else if (
        region.value.points.length >= 3 &&
        Math.hypot(
          p.x - region.value.points[0].x,
          p.y - region.value.points[0].y,
        ) < tolerance()
      ) {
        finishRegion();
        return true;
      } else if (
        region.value.points.length < 512 &&
        Math.hypot(
          p.x - region.value.points.at(-1).x,
          p.y - region.value.points.at(-1).y,
        ) > 1
      )
        region.value.points.push(canvasPoint(p));
      return true;
    }
    beginRegion(p, e);
    drag = { kind: "region" };
    e.currentTarget.setPointerCapture(e.pointerId);
    return true;
  }
  function move(e) {
    const p = s.coords(e);
    hover.value = p;
    if (
      drag?.kind === "node" &&
      (s.locked(drag.key) || !s.current.value.elements[drag.key])
    ) {
      cancel();
      return true;
    }
    if (drag?.kind === "node") {
      const node = s.current.value.elements[drag.key].pathNodes[drag.index],
        v = localPoint(p, drag.position),
        old = drag.original[drag.index];
      if (!v) {
        cancel();
        return true;
      }
      if (drag.part === "anchor") {
        const dx = v.x - old.x,
          dy = v.y - old.y;
        Object.assign(node, {
          x: v.x,
          y: v.y,
          inX: old.inX + dx,
          inY: old.inY + dy,
          outX: old.outX + dx,
          outY: old.outY + dy,
        });
      } else {
        const prefix = drag.part,
          other = prefix === "in" ? "out" : "in";
        node[prefix + "X"] = v.x;
        node[prefix + "Y"] = v.y;
        if (!e.altKey) {
          node[other + "X"] = node.x * 2 - v.x;
          node[other + "Y"] = node.y * 2 - v.y;
        }
      }
      s.draw();
      return true;
    }
    if (drag?.kind === "pen") {
      const n = draft.value?.[drag.index];
      if (n) {
        Object.assign(n, {
          outX: p.x,
          outY: p.y,
          inX: n.x * 2 - p.x,
          inY: n.y * 2 - p.y,
        });
      }
      return true;
    }
    if (drag?.kind === "region" && region.value) {
      const r = region.value,
        q = canvasPoint(p);
      if (r.type === "lasso") {
        if (
          Math.hypot(q.x - r.points.at(-1).x, q.y - r.points.at(-1).y) >
          tolerance() / 4
        ) {
          if (r.points.length >= 512)
            r.points = r.points.filter(
              (_, i) => i % 2 === 0 || i === r.points.length - 1,
            );
          r.points.push(q);
        }
      } else r.points = [r.points[0], q];
      regionUpdate();
      return true;
    }
    return false;
  }
  function up(e) {
    if (!drag) return false;
    if (e.type === "pointercancel" || e.type === "lostpointercapture") {
      cancel();
      return true;
    }
    if (drag.kind === "node") {
      commitNodes();
      drag = null;
      return true;
    }
    if (drag.kind === "region") {
      move(e);
      region.value = null;
    }
    drag = null;
    return true;
  }
  function finishRegion() {
    if (region.value?.points.length >= 3) regionUpdate();
    else select(regionBase);
    region.value = null;
  }
  function finish(closed = false) {
    if (!draft.value) return;
    if (draft.value.length < (closed ? 3 : 2)) {
      s.notify(
        closed
          ? "Il faut au moins trois points pour fermer la forme."
          : "Ajoute au moins deux points.",
      );
      return;
    }
    if (Object.keys(s.current.value.elements).length >= 100) {
      s.notify("Limite de 100 éléments atteinte.");
      return;
    }
    const framed = frameFreeform(draft.value, closed),
      key = "shape" + crypto.randomUUID().replaceAll("-", "").slice(0, 10);
    s.begin();
    s.current.value.elements[key] = normalizeShape({
      shape: "freeform",
      name: "Forme libre",
      pathNodes: framed.nodes,
      closed,
      fill: s.theme.value.accent,
      stroke: s.theme.value.accent,
      filled: closed,
      outlined: true,
      strokeWidth: 4,
    });
    s.current.value.positions[key] = framed.position;
    s.current.value.fragments[key] = { order: 0, animation: "none" };
    s.end();
    draft.value = null;
    drag = null;
    select([key]);
    tool.value = "nodes";
  }
  function startNode(e, index, part) {
    const path = selectedPath.value;
    if (!path || e.button !== 0) return;
    if (!localPoint(s.coords(e), path.position)) {
      s.notify("Réduis la déformation aplatie avant d’éditer ses points.");
      return;
    }
    s.animation()?.stop();
    s.begin();
    activeNode.value = index;
    drag = {
      kind: "node",
      key: path.key,
      index,
      part,
      position: copy(path.position),
      original: copy(path.element.pathNodes),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function commitNodes() {
    const path = selectedPath.value;
    if (!path || s.locked(path.key)) {
      s.end();
      return;
    }
    const base = s.scene().positions[path.key],
      framed = reframeFreeform(
        normalizePathNodes(path.element.pathNodes),
        path.element.closed,
        base,
      );
    path.element.pathNodes = framed.nodes;
    const a = s.animation();
    if (
      a &&
      ["x", "y", "w", "h"].some(
        (k) => Math.abs(framed.position[k] - base[k]) > 1e-6,
      )
    )
      a.commitPose(
        { [path.key]: framed.position },
        { [path.key]: base },
        false,
      );
    else if (!a) s.current.value.positions[path.key] = framed.position;
    s.end();
    s.draw();
  }
  function changeNodes(fn) {
    const path = selectedPath.value;
    if (!path) return;
    s.begin();
    path.element.pathNodes = fn(copy(path.element.pathNodes));
    commitNodes();
  }
  function addNode() {
    const path = selectedPath.value;
    if (!path) return;
    changeNodes((nodes) =>
      splitFreeform(
        nodes,
        Math.min(activeNode.value, nodes.length - 1),
        path.element.closed,
      ),
    );
    activeNode.value = Math.min(
      activeNode.value + 1,
      path.element.pathNodes.length - 1,
    );
  }
  function removeNode() {
    const path = selectedPath.value;
    if (!path) return;
    if (path.element.pathNodes.length <= (path.element.closed ? 3 : 2)) {
      s.notify("Cette forme doit conserver ses points minimum.");
      return;
    }
    changeNodes((nodes) => nodes.filter((_, i) => i !== activeNode.value));
    activeNode.value = Math.max(0, activeNode.value - 1);
  }
  function toggleClosed() {
    const path = selectedPath.value;
    if (!path) return;
    if (!path.element.closed && path.element.pathNodes.length < 3) return;
    s.begin();
    path.element.closed = !path.element.closed;
    path.element.filled = path.element.closed;
    commitNodes();
  }
  function smoothNode() {
    changeNodes((nodes) => {
      const i = Math.min(activeNode.value, nodes.length - 1),
        n = nodes[i],
        a =
          nodes[
            selectedPath.value?.element.closed
              ? (i - 1 + nodes.length) % nodes.length
              : Math.max(0, i - 1)
          ],
        b =
          nodes[
            selectedPath.value?.element.closed
              ? (i + 1) % nodes.length
              : Math.min(nodes.length - 1, i + 1)
          ],
        dx = (b.x - a.x) / 6,
        dy = (b.y - a.y) / 6;
      Object.assign(n, {
        inX: n.x - dx,
        inY: n.y - dy,
        outX: n.x + dx,
        outY: n.y + dy,
      });
      return nodes;
    });
  }
  function cornerNode() {
    changeNodes((nodes) => {
      const n = nodes[activeNode.value];
      if (n) Object.assign(n, { inX: n.x, inY: n.y, outX: n.x, outY: n.y });
      return nodes;
    });
  }
  function key(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.key === "Escape") {
      if (draft.value || region.value || drag) {
        cancel();
        return true;
      }
      if (tool.value !== "move") {
        setTool("move");
        return true;
      }
    }
    if (e.key === "Enter") {
      if (draft.value) {
        finish(e.shiftKey);
        return true;
      }
      if (region.value?.type === "polygon") {
        finishRegion();
        return true;
      }
    }
    if (e.key === "Backspace" && draft.value) {
      draft.value.pop();
      return true;
    }
    if (e.key === "Backspace" && region.value?.type === "polygon") {
      region.value.points.pop();
      return true;
    }
    if (
      ["Delete", "Backspace"].includes(e.key) &&
      tool.value === "nodes" &&
      selectedPath.value
    ) {
      removeNode();
      return true;
    }
    const t = {
      v: "move",
      m: "rect",
      e: "ellipse",
      l: "lasso",
      g: "polygon",
      p: "pen",
      a: "nodes",
    }[e.key.toLowerCase()];
    if (t) {
      setTool(t);
      return true;
    }
    return false;
  }
  function doubleClick() {
    if (draft.value) {
      finish(false);
      return true;
    }
    if (region.value?.type === "polygon") {
      finishRegion();
      return true;
    }
    return false;
  }
  watch(
    () => s.current.value.id,
    () => {
      draft.value = null;
      region.value = null;
      drag = null;
      activeNode.value = 0;
    },
  );
  watch(
    () => selectedPath.value?.key,
    (key) => {
      if (drag?.kind === "node" && drag.key !== key) cancel();
      activeNode.value = 0;
    },
  );
  return {
    tool,
    mode,
    draft,
    region,
    hover,
    nodes,
    selectedPath,
    activeNode,
    down,
    move,
    up,
    key,
    doubleClick,
    setTool,
    cancel,
    finish,
    finishRegion,
    startNode,
    addNode,
    removeNode,
    toggleClosed,
    cornerNode,
    smoothNode,
  };
}
