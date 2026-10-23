import {enclosingBounds} from './selection.js';
import {patternChannels,normalizeBackground,backgroundModes} from './sceneBackground.js';
import {normalizeCounter,counterText} from "./animationCounter.js";
import {normalizePresence} from "./animationPresence.js";
import {useAnimationAudio} from './useAnimationAudio.js';
import {makeEffectsDemo} from "./animationEffectExamples.js";
import {parseEffectField,effectField,effectProgress,effectCatalog} from "./animationEffectCatalog.js";
import {seekVideos} from './videoMedia.js';
import { resolveAnimationFormat, hasTransparentScenes } from "./animationExportSettings.js";
import {makeWorkflowExample} from "./animationWorkflowExample.js";
import {cameraFields} from "./animationWorkflow.js";
import {editableClip,copyKeySelection} from "./animationEditing.js";
import {splitSpline,removeSplinePoint} from "./splines.js";
import { boundColor } from "./colors.js";
import { storyboardAt, storyboardDuration } from "./animationStoryboard.js";
import { normalizeEffect } from "./animationEffects.js";
import { addSceneEngine } from "./animationEngines.js";
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import {
  normalizeAnimation,
  animationFields,
  animationScene,
  addAnimationKey,
  frameValue,
  engineAnimationFields,
  shapeAnimationFields,
  discreteAnimationFields,
  colorAnimationFields,
  backgroundAnimationFields,
} from "./animationModel.js";
import {renderAnimationStoryboard} from "./animationStoryboardRender.js";
import { renderAnimation } from "./animationRender.js";
import { prepareImages } from "./render.js";
import { prepareFonts } from "./fontAssets.js";
import { exportAnimationFrames } from "./animationVideoExport.js";
import { ensureVideoEncoder } from "./videoEncoding.js";
import {makeSlimeDemo} from "./animationSlimeDemo.js";
import { makeAnimationExample } from "./animationExamples.js";
const copy = (v) => JSON.parse(JSON.stringify(v));
export function useAnimationStudio(s) {
  const panX = ref(0),
    panY = ref(0),
    spaceHeld = ref(false),
    panning = ref(false);
  let panCleanup = () => {};
  const time = ref(0),
    playing = ref(false),
    preview = ref(true),
    loop = ref(true),
    selectedClip = ref(""),
    field = ref("x"),
    ease = ref("smooth"),
    format = ref("auto"),
    exportQuality = ref("balanced"),
    exportBackground = ref("#ffffff"),
    busy = ref(false),
    progress = ref(0),
    exportWidth = ref(1920),
    pathEditing = ref(false),
    activePath = ref("");
  const exportError = ref(""), exportPhase = ref("");
  // Editing preference only: scene data continues to use the shared keyframe model.
  const autoKey = ref(false);
  try { autoKey.value = localStorage.getItem('frame-animation-auto-key') === 'true'; } catch {}
  function setAutoKey(enabled) {
    stop();
    autoKey.value = !!enabled;
    preview.value = true;
    try { localStorage.setItem('frame-animation-auto-key', String(autoKey.value)); } catch {}
  }
  function commonField(scope, property) {
    if (scope === 'position' && animationFields.includes(property)) return property;
    if (scope === 'style' && property === 'color') return 'color';
    if (scope !== 'element' || s.selectedKeys.value.some(key => s.current.value.elements[key]?.type !== 'shape')) return null;
    if (property === 'fill') return 'color';
    return Object.keys(shapeAnimationFields).find(field => shapeAnimationFields[field] === property) || null;
  }
  function shouldKey(name) {
    return autoKey.value || !!clip.value?.frames.some(f => f.field === name);
  }
  const inspectedEffect=ref(null);
  function inspectEffect(id){const e=config.value.effects.find(e=>e.id===id);if(!e||!s.current.value.positions[e.key])return;stop();s.selected.value=e.key;s.selectedKeys.value=[e.key];activeKey.value=null;activeFrame.value=null;inspectedEffect.value={id,sequence:(inspectedEffect.value?.sequence||0)+1};}
  const construction = ref(true);
  function setConstruction(value) { stop(); construction.value = value; preview.value = true; }
  const editorScene = computed(() => preview.value ? animationScene(s.current.value, config.value, time.value).scene : s.current.value);
  const motionPrefs=ref({name:'Mon mouvement',duration:1,motion:'builtin-fade'});
  const keySelection=ref([]),keyClipboard=ref([]);
  const diagnostics=ref({bounds:false,collisions:false,contacts:false,attachments:false,forces:false,camera:true,paths:false});
  const selectedPathPoint=ref(0);
  const previewOpen = ref(false),
    activeKey = ref(null),
    activeFrame = ref(null),
    pendingDelete = ref(null),
    allScenes = ref(false),
    exportOpen = ref(false);
  const totalDuration = computed(() =>
    allScenes.value
      ? storyboardDuration(s.slides.value)
      : config.value.duration,
  );
  const playbackTime = computed(() =>
    allScenes.value
      ? s.slides.value
          .slice(0, s.index.value)
          .reduce((n, scene) => n + (scene.animation?.duration || 8), 0) +
        time.value
      : time.value,
  );
  let advancing = false;
  let raf = 0,
    controller,
    clock = 0,
    offset = 0;
  const config = computed(() => s.current.value.animation),
    clip = computed(() =>
      config.value?.clips.find((c) => c.id === selectedClip.value),
    ),
    engine = computed(() =>
      config.value?.engines?.find((e) => e.key === s.selected.value),
    ),
    path = computed(() =>
      config.value?.paths.find((p) => p.id === activePath.value),
    );
  watch(
    s.current,
    (scene, previous) => {
      if (!advancing) stop();
      keySelection.value=[];
      const same = scene.id === previous?.id,
        oldKey = activeKey.value;
      if (!scene.animation) scene.animation = normalizeAnimation();
      selectedClip.value = scene.animation.clips.some(
        (c) => c.id === selectedClip.value,
      )
        ? selectedClip.value
        : scene.animation.clips[0]?.id || "";
      activePath.value = scene.animation.paths.some(
        (p) => p.id === activePath.value,
      )
        ? activePath.value
        : scene.animation.paths[0]?.id || "";
      activeKey.value =
        same && oldKey
          ? clip.value?.frames.find(
              (f) => f.field === oldKey.field && f.time === oldKey.time,
            ) || null
          : null;
      time.value = same ? Math.min(time.value, scene.animation.duration) : 0;
    },
    { immediate: true },
  );
  const audio = useAnimationAudio(s, {time,playing,busy,stop,seek,requestDelete});
  watch([time, preview, construction, pathEditing], s.requestDraw);
  watch(diagnostics,s.requestDraw,{deep:true});
  watch(
    () => config.value?.duration,
    () => {
      const duration = normalizeAnimation(config.value).duration;
      if (config.value.duration !== duration) config.value.duration = duration;
      if (time.value > duration) seek(duration);
    },
  );
  watch(
    s.selectedKeys,
    (keys) => {
      if (keys.length && !keys.some((k) => clip.value?.keys.includes(k))) {
        selectedClip.value =
          config.value.clips.find((c) => keys.some((k) => c.keys.includes(k)))
            ?.id || "";
        activeKey.value = null;
      }
    },
    { deep: true },
  );
  function addEngine(kind, point) {
    stop();
    setConstruction(true);
    s.beginGesture();
    try {
      const e = addSceneEngine(
        s.current.value,
        kind,
        point,
        s.selectedKeys.value.filter(
          (k) => !s.current.value.elements[k]?.engineKind,
        ),
      );
      s.selectedKeys.value = [e.key];
      s.selected.value = e.key;
      s.notify("Moteur ajouté : déplace son repère sur la scène.");
      return e;
    } catch (error) {
      s.notify(error.message);
    } finally {
      s.endGesture();
      s.requestDraw();
    }
  }
  function duplicateEngine() {
    const original = engine.value;
    if (!original) return;
    const p = s.current.value.positions[original.key];
    s.beginGesture();
    try {
      const next = addSceneEngine(
        s.current.value,
        original.kind,
        { x: p.x + p.w / 2 + 40, y: p.y + p.h / 2 + 40 },
        original.targets,
      );
      const id = next.id,
        key = next.key;
      Object.assign(next, copy(original), { id, key });
      s.current.value.elements[key].name =
        s.current.value.elements[original.key].name + " · copie";
      s.selectedKeys.value = [key];
      s.selected.value = key;
    } catch (error) {
      s.notify(error.message);
    } finally {
      s.endGesture();
    }
  }
  function selectEngine(id) {
    stop();
    setConstruction(true);
    const e = config.value.engines.find((e) => e.id === id);
    if (e && s.current.value.positions[e.key]) {
      s.selectedKeys.value = [e.key];
      s.selected.value = e.key;
    }
  }
  function removeEngine(id) {
    const e = config.value.engines.find((e) => e.id === id);
    if (!e) return;
    s.beginGesture();
    s.selectedKeys.value = [e.key];
    s.selected.value = e.key;
    s.removeBlock();
    s.endGesture();
  }
  function detachLegacy(c) {
    const p = s.current.value.positions[c.keys[0]];
    if (!p) return;
    stop();
    s.beginGesture();
    try {
      const e = addSceneEngine(s.current.value, "particles", {
        x: p.x + (p.w || 0) / 2,
        y: p.y + (p.h || 0) / 2,
      });
      e.start = c.start;
      e.duration = c.duration;
      e.particles = copy(c.particles);
      e.gravity = c.gravity;
      c.particles.enabled = false;
      setConstruction(true);
      s.selectedKeys.value = [e.key];
      s.selected.value = e.key;
    } catch (error) {
      s.notify(error.message);
    } finally {
      s.endGesture();
    }
  }
  function focusKey(c, key) {
    selectClip(c.id);
    activeKey.value = key;
    field.value = key.field;
    seek(c.start + key.time);
    preview.value = true;
    s.requestDraw();
    if (s.panels) s.panels.value.properties = true;
  }
  function deleteKey(c, key) {
    requestDelete(
      "la clé de cette propriété à " + key.time.toFixed(2) + " s",
      () => {
        s.beginGesture();
        c.frames = c.frames.filter((f) => f !== key);
        if (activeKey.value === key) activeKey.value = null;
        s.endGesture();
      },
    );
  }
  function duplicateKey(c, key) {
    s.beginGesture();
    const time = Math.min(
      c.duration,
      Math.round(
        (key.time + Math.max(1 / config.value.fps, c.duration / 20)) *
          config.value.fps,
      ) / config.value.fps,
    );
    if (time === key.time) {
      s.notify("Décale la clé avant de la dupliquer en fin de séquence.");
      s.endGesture();
      return;
    }
    addAnimationKey(c, key.field, time, key.value, key.ease);
    const next = c.frames.find((f) => f.field === key.field && f.time === time);
    next.curve = copy(key.curve || [0.25, 0.1, 0.25, 1]);
    activeKey.value = next;
    s.endGesture();
  }
  function keyboard(event) {
    if (
      event.code !== "Space" ||
      event.target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
    )
      return;
    if (event.type === "keydown") {
      spaceHeld.value = true;
      event.preventDefault();
    } else spaceHeld.value = false;
  }
  function blur() {
    spaceHeld.value = false;
    panCleanup();
  }
  function panStart(event) {
    if (event.button !== 1 && !(event.button === 0 && spaceHeld.value)) return;
    event.preventDefault();
    event.stopPropagation();
    panCleanup();
    panning.value = true;
    const pointerId = event.pointerId;
    const target = event.currentTarget;
    target.setPointerCapture?.(pointerId);
    const x = event.clientX,
      y = event.clientY,
      left = panX.value,
      top = panY.value;
    const move = (e) => {
      if (e.pointerId !== pointerId) return;
      e.preventDefault();
      e.stopPropagation();
      panX.value = left + e.clientX - x;
      panY.value = top + e.clientY - y;
    };
    const end = (e) => {
      if (e && e.pointerId !== pointerId) return;
      panning.value = false;
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", end, true);
      window.removeEventListener("pointercancel", end, true);
      target.removeEventListener("lostpointercapture", end);
      if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
      panCleanup = () => {};
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", end, true);
    window.addEventListener("pointercancel", end, true);
    target.addEventListener("lostpointercapture", end);
    panCleanup = end;
  }
  onMounted(() => {
    window.addEventListener("keydown", keyboard);
    window.addEventListener("keyup", keyboard);
    window.addEventListener("blur", blur);
  });
  function stop() {
    playing.value = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }
  function seekGlobal(value) {
    stop();
    const part = storyboardAt(s.slides.value, value);
    if (!part) return;
    advancing = true;
    s.index.value = part.index;
    time.value = part.time;
    preview.value = true;
    queueMicrotask(() => {
      advancing = false;
      time.value = part.time;
      s.requestDraw();
    });
  }
  function seekPlayback(value) {
    if (allScenes.value) seekGlobal(value);
    else seek(value);
  }
  function seek(value) {
    stop();
    time.value = Math.max(
      0,
      Math.min(config.value.duration, Number(value) || 0),
    );
    preview.value = true;
    s.requestDraw();
  }
  function play() {
    if (playing.value) {
      stop();
      return;
    }
    preview.value = true;
    clock = performance.now();
    offset = playbackTime.value >= totalDuration.value ? 0 : playbackTime.value;
    playing.value = true;
    const tick = (now) => {
      const value = offset + (now - clock) / 1000;
      let t = value;
      if (t >= totalDuration.value) {
        if (loop.value) {
          clock = now;
          offset = 0;
          t = 0;
        } else {
          t = totalDuration.value;
          stop();
        }
      }
      if (allScenes.value) {
        const part = storyboardAt(s.slides.value, t);
        if (part) {
          advancing = true;
          s.index.value = part.index;
          time.value = part.time;
          queueMicrotask(() => {
            advancing = false;
            time.value = part.time;
          });
        }
      } else time.value = t;
      if (!playing.value) return;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function addClip() {
    if (!s.selectedKeys.value.length) {
      s.notify("Sélectionne les objets à animer.");
      return;
    }
    if (config.value.clips.length >= 100) return;
    const c = normalizeAnimation({
      clips: [
        {
          id: crypto.randomUUID(),
          name: "Séquence " + (config.value.clips.length + 1),
          duration: config.value.duration,
          keys: [...s.selectedKeys.value],
          groupTransform:s.selectedKeys.value.length>1,
        },
      ],
    }).clips[0];
    config.value.clips.push(c);
    selectedClip.value = c.id;
    setConstruction(true);
  }
  function duplicateClip() {
    if (!clip.value || config.value.clips.length >= 100) return;
    const c = copy(clip.value);
    c.id = crypto.randomUUID();
    c.name += " · copie";
    config.value.clips.push(c);
    selectedClip.value = c.id;
  }
  function requestDelete(label, action) {
    stop();
    pendingDelete.value = { label, action };
  }
  function confirmDelete() {
    const pending = pendingDelete.value;
    pendingDelete.value = null;
    pending?.action();
  }
  function removeTracks(clipIds = [], effectIds = [], label = 'ces animations') {
    if (busy.value || (!clipIds.length && !effectIds.length)) return;
    const scene = s.current.value, clips = new Set(clipIds), effects = new Set(effectIds);
    requestDelete(label, () => {
      s.beginGesture();
      const animation = scene.animation;
      animation.clips = animation.clips.filter(c => !clips.has(c.id));
      animation.events = animation.events.filter(e =>
        !(e.action === 'startClip' && clips.has(e.target)) &&
        !(e.trigger === 'clipEnd' && clips.has(e.source)));
      animation.effects = animation.effects.filter(e => !effects.has(e.id));
      for (const c of animation.clips)
        c.frames = c.frames.filter(f => !effects.has(parseEffectField(f.field)?.id));
      keySelection.value = keySelection.value.filter(r =>
        !clips.has(r.clipId) && !effects.has(parseEffectField(r.key.field)?.id));
      if (clips.has(selectedClip.value)) selectedClip.value = '';
      activeKey.value = null;
      activeFrame.value = null;
      if (effects.has(inspectedEffect.value?.id)) inspectedEffect.value = null;
      s.endGesture();
    });
  }
  function removeClip() {
    const c = config.value.clips.find(c => c.id === selectedClip.value);
    if (c) removeTracks([c.id], [], 'la séquence « ' + c.name + ' »');
  }
  function addFrame() {
    const c = ensureClip();
    if (!c) return;
    const local = Math.max(
      0,
      Math.min(
        c.duration,
        Math.round((time.value - c.start) * config.value.fps) /
          config.value.fps,
      ),
    );
    s.beginGesture();
    c.markers ||= [];
    if (!c.markers.some((t) => Math.abs(t - local) < 0.0001))
      c.markers.push(local);
    c.markers.sort((a, b) => a - b);
    s.endGesture();
    focusFrame(c, local);
  }
  function focusFrame(c, local) {
    selectClip(c.id);
    activeKey.value =
      c.frames.find((f) => Math.abs(f.time - local) < 0.0001) || null;
    activeFrame.value = { clipId: c.id, time: local };
    seek(c.start + local);
    preview.value = true;
    s.requestDraw();
  }
  function removeFrame(c, local) {
    requestDelete(
      "l’image clé à " + local.toFixed(2) + " s et ses propriétés",
      () => {
        s.beginGesture();
        c.frames = c.frames.filter((f) => Math.abs(f.time - local) > 0.0001);
        c.markers = (c.markers || []).filter(
          (t) => Math.abs(t - local) > 0.0001,
        );
        activeKey.value = null;
        activeFrame.value = null;
        s.endGesture();
      },
    );
  }
  function addKey() {
    if (!clip.value) addClip();
    if (!clip.value) return;
    const key =
        s.selectedKeys.value.find((k) => clip.value.keys.includes(k)) ||
        clip.value.keys[0],
      p = (
        preview.value
          ? animationScene(s.current.value, config.value, time.value).scene
          : s.current.value
      ).positions[key];
    if (!p) return;
    const value =
      field.value === "progress"
        ? Math.max(
            0,
            Math.min(1, (time.value - clip.value.start) / clip.value.duration),
          )
        : field.value === "color"
          ? s.current.value.elements[key]?.fill ||
            p.textStyle?.color ||
            s.theme.value.ink
          : (p[field.value] ??
            (field.value === "opacity"
              ? 100
              : field.value === "contentScale"
                ? 1
                : 0));
    addAnimationKey(
      clip.value,
      field.value,
      Math.max(0, Math.min(clip.value.duration, time.value - clip.value.start)),
      value,
      clip.value.easing || ease.value,
    );
  }
  function addPath() {
    if (s.selectedKeys.value.length && !clip.value) ensureClip();
    if (config.value.paths.length >= 50) return;
    const p = normalizeAnimation({
      paths: [
        {
          id: crypto.randomUUID(),
          name: "Trajectoire " + (config.value.paths.length + 1),
        },
      ],
    }).paths[0];
    config.value.paths.push(p);
    activePath.value = p.id;
    pathEditing.value = true;
    if (clip.value) {
      clip.value.pathId = p.id;
      field.value = "progress";
    }
    s.notify(
      "Spline ajoutée : ses quatre poignées sont visibles sur la scène.",
    );
    s.requestDraw();
  }
  function addLink() {
    const keys = s.selectedKeys.value;
    if (keys.length !== 2) {
      s.notify("Sélectionne deux objets pour créer une référence.");
      return;
    }
    if (config.value.links.length >= 100) return;
    config.value.links.push({
      id: crypto.randomUUID(),
      from: keys[0],
      to: keys[1],
      color: s.theme.value.accent,
      width: 4,
    });
    s.requestDraw();
  }
  function addPathPoint(index=Math.max(0,Math.floor((path.value?.points.length-4)/3)),t=.5){if(!path.value)return;s.beginGesture();const point=splitSpline(path.value,index,t);if(point===false)s.notify('Limite de 32 segments atteinte.');else selectedPathPoint.value=point;s.endGesture();s.requestDraw();}
  function removePathPoint(index=selectedPathPoint.value){const p=path.value;if(!p||p.points.length<=4){s.notify('Une spline conserve au moins deux points d’ancrage.');return;}requestDelete('ce point de la spline',()=>{s.beginGesture();removeSplinePoint(p,index);selectedPathPoint.value=0;s.endGesture();s.requestDraw();});}
  function removePath(confirmed = false) {
    if (!confirmed) {
      requestDelete("cette spline", () => removePath(true));
      return;
    }
    const id = activePath.value;
    config.value.paths = config.value.paths.filter((p) => p.id !== id);
    for (const c of config.value.clips) if (c.pathId === id) c.pathId = "";
    activePath.value = config.value.paths[0]?.id || "";
  }
  function selectClip(id) {
    stop();
    selectedClip.value = id;
    const c = clip.value;
    if (c) {
      s.selectedKeys.value = c.keys.filter((k) => s.current.value.positions[k]);
      s.selected.value =
        s.selectedKeys.value.length === 1 ? s.selectedKeys.value[0] : null;
    }
  }
  function example(kind) {
    if(kind==='effects'){const scenes=makeEffectsDemo();if(s.slides.value.length+scenes.length>100){s.notify('Quatre places de scène sont nécessaires.');return;}stop();s.beginGesture();const offset=Math.max(0,...s.slides.value.map(s=>s.grid.x))+1;for(const scene of scenes)scene.grid.x+=offset;const index=s.slides.value.length;s.slides.value.push(...scenes);s.index.value=index;s.endGesture();preview.value=true;s.notify('Laboratoire d’effets ajouté : quatre scènes modifiables.');return;}
    if(kind==='reference'){if(s.slides.value.length>=100)return;stop();s.beginGesture();const scene=makeWorkflowExample().slides[0];scene.id=crypto.randomUUID();scene.grid={x:Math.max(0,...s.slides.value.map(s=>s.grid.x))+1,y:0};s.slides.value.push(scene);s.index.value=s.slides.value.length-1;s.endGesture();preview.value=true;return;}
    if(kind === "slime") {
      if(s.slides.value.length>95){s.notify("Cinq places de scène sont nécessaires.");return;}
      stop();s.beginGesture();
      const scenes=makeSlimeDemo().slides;
      let offset=0;
      while(scenes.some(scene=>s.slides.value.some(existing=>existing.grid.x===scene.grid.x+offset&&existing.grid.y===scene.grid.y)))offset++;
      for(const scene of scenes){scene.id=crypto.randomUUID();scene.grid.x+=offset;}
      const first=s.slides.value.length;
      s.slides.value.push(...scenes);s.index.value=first;
      s.endGesture();preview.value=true;
      s.notify("Parcours Slime ajouté : cinq scènes, un personnage continu et 31 effets.");return;
    }
    if (s.slides.value.length >= 100) {
      s.notify("Limite de 100 scènes.");
      return;
    }
    stop();
    const next = makeAnimationExample(kind);
    s.slides.value.push(next);
    s.index.value = s.slides.value.length - 1;
    preview.value = true;
    s.notify("Exemple ajouté dans une nouvelle scène.");
  }
  async function exportVideo() {
    if (busy.value || s.videoEncoding.recovery.value) return;
    stop();
    busy.value = true;
    exportError.value = ""; exportPhase.value = "Préparation…";
    progress.value = 0;
    controller = new AbortController();
    const signal = controller.signal;
    try {
    const scenes = copy(allScenes.value ? s.slides.value : [s.current.value]),
      scene = scenes[0],
      theme = copy(s.theme.value),
      config = {
        ...normalizeAnimation(scene.animation),
        duration: storyboardDuration(scenes),
      },
      outputFormat = resolveAnimationFormat(format.value, scenes),
      quality = exportQuality.value,
      background = exportBackground.value,
      width = exportWidth.value;
      if (
        outputFormat === "webm" &&
        hasTransparentScenes(scenes)
      )
        throw Error(
          "Pour conserver la transparence, choisis MOV ou MKV. WebM utilise un fond uni ou vert.",
        );
      if (config.duration > 600)
        throw Error(
          "L’export est limité à 10 minutes. Exporte une scène ou raccourcis l’animation.",
        );
      await ensureVideoEncoder(outputFormat, { signal });
      await prepareFonts(scenes);
      await prepareImages(scenes, theme);
      if(signal.aborted)throw new DOMException("Export annulé.","AbortError");
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = (canvas.width * 9) / 16;
      const ctx = canvas.getContext("2d");
      if (outputFormat === "webm") {
        if (!canvas.captureStream || !globalThis.MediaRecorder)
          throw Error("WebM indisponible. Choisis MOV ou MKV.");
        const mime = ["video/webm;codecs=vp9", "video/webm"].find((v) =>
          MediaRecorder.isTypeSupported(v),
        );
        if (!mime) throw Error("WebM indisponible.");
        exportPhase.value="Enregistrement WebM…";
        await new Promise((resolve, reject) => {
          let timer,
            stream,
            recorder,
            done = false,
            bytes = 0;
          const chunks = [];
          const cleanup = () => {
            clearTimeout(timer);
            signal.removeEventListener("abort", abort);
            document.removeEventListener("visibilitychange", visibility);
            stream?.getTracks().forEach((t) => t.stop());
          };
          const fail = (e) => {
            if (done) return;
            done = true;
            cleanup();
            if (recorder?.state === "recording") recorder.stop();
            reject(e);
          };
          const abort = () =>
            fail(new DOMException("Export annulé.", "AbortError"));
          const visibility = () => {
            if (document.hidden)
              fail(
                Error(
                  "Garde cet onglet visible pour WebM, ou utilise MOV/MKV.",
                ),
              );
          };
          try {
            draw(0);
            stream = canvas.captureStream(config.fps);
            recorder = new MediaRecorder(stream, { mimeType: mime });
            recorder.ondataavailable = (e) => {
              bytes += e.data.size;
              if (bytes > 256 * 1024 * 1024) {
                fail(Error("Capture supérieure à 256 Mo."));
                return;
              }
              if (e.data.size) chunks.push(e.data);
            };
            recorder.onerror = () => fail(Error("Capture WebM interrompue."));
            recorder.onstop = () => {
              if (done) return;
              done = true;
              cleanup();
              if (!chunks.length) {
                reject(Error("Vidéo vide."));
                return;
              }
              s.download(
                new Blob(chunks, { type: mime }),
                "frame-animation.webm",
                false,
              );
              resolve();
            };
            signal.addEventListener("abort", abort, { once: true });
            document.addEventListener("visibilitychange", visibility);
            recorder.start(500);
            const start = performance.now();
            function tick() {
              if (done) return;
              const t = Math.min(
                config.duration,
                (performance.now() - start) / 1000,
              );
              try {
                draw(t);
                progress.value = t / config.duration;
                if (t === config.duration) recorder.stop();
                else timer = setTimeout(tick, 1000 / config.fps);
              } catch(error) { fail(error); }
            }
            tick();
          } catch (e) {
            fail(e);
          }
        });
      } else {
        const output = await exportAnimationFrames({
          canvas, draw:async t=>{const part=storyboardAt(scenes,t);if(part){await seekVideos([part.scene],part.time);if(scenes[part.index+1])await seekVideos([scenes[part.index+1]],0);}draw(t);}, duration: config.duration, fps: config.fps,
          format: outputFormat, quality, signal,
          onProgress(value,phase) { progress.value=value; exportPhase.value=phase==='encoding'?'Encodage…':'Création des images…'; },
        });
        if(signal.aborted)throw new DOMException('Export annulé.','AbortError');
        s.download(output, 'frame-animation.' + outputFormat, false);
      }
      progress.value = 1;
      s.notify("Animation exportée.");
      function draw(t) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if(outputFormat === "mp4") { ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height); }
        ctx.save();
        ctx.scale(canvas.width / 1920, canvas.height / 1080);
        renderAnimationStoryboard(ctx,scenes,theme,t);
        ctx.restore();
      }
    } catch (e) {
      if (e.name !== "AbortError") { exportError.value=e.message||"L’export a échoué."; s.notify(exportError.value); }
      else exportError.value="Export annulé.";
    } finally {
      exportPhase.value="";
      busy.value = false;
      controller = null;
    }
  }
  function propertyValue(name, animated = preview.value, targetKey = null) {
    if(patternChannels[name]) {
      const background=normalizeBackground((animated?animationScene(s.current.value,config.value,time.value).scene:s.current.value).background);
      const prop=patternChannels[name][0];
      return prop==='mode'?backgroundModes.findIndex(([id])=>id===background.mode):prop==='stagger'?Number(background.stagger):['base','color','color2'].includes(prop)?boundColor(background,prop,s.theme.value):background[prop];
    }
    const ef=parseEffectField(name);
    if(ef){const cfg=animated?animationScene(s.current.value,config.value,time.value).config:config.value;const e=cfg.effects.find(e=>e.id===ef.id);return e?(ef.property==='progress'?effectProgress(e,time.value):e[ef.property]):0;}
    if(name==='scale'){if(!targetKey&&s.selectedKeys.value.length>1&&!clip.value?.groupTransform)return 100;const c=targetKey?editableClip(config.value.clips,selectedClip.value,targetKey,time.value):clip.value;return c?frameValue(c.frames,'scale',time.value-c.start,100):100;}
    if([...backgroundAnimationFields,...cameraFields].includes(name)) {
      if(cameraFields.includes(name)){const cfg=animated?animationScene(s.current.value,config.value,time.value).config:config.value;const p=name.slice(6);return cfg.camera[p[0].toLowerCase()+p.slice(1)];}
      const cfg=animated?animationScene(s.current.value,config.value,time.value).config:config.value;
      return name==='backgroundColor'?boundColor(cfg,'color',s.theme.value):name==='backgroundColor2'?cfg.color2:cfg.gradientAngle;
    }
    if(!targetKey && s.selectedKeys.value.length>1) {
      if(['x','y','w','h'].includes(name)) {
        const scene=animated?animationScene(s.current.value,config.value,time.value).scene:s.current.value;
        return enclosingBounds(s.selectedKeys.value.map(k=>scene.positions[k]).filter(Boolean))?.[name]||0;
      }
      if(name==='rotation')return clip.value?.groupTransform?frameValue(clip.value.frames,name,time.value-clip.value.start,0):0;
    }
    const key = targetKey ||
      clip.value?.keys.find((k) => s.selectedKeys.value.includes(k)) ||
      s.selected.value ||
      s.selectedKeys.value[0];
    const scene = animated
        ? animationScene(s.current.value, config.value, time.value).scene
        : s.current.value,
      p = scene.positions[key];
    if (engine.value && (engineAnimationFields[name] || name === "color")) {
      const e = animated
        ? animationScene(
            s.current.value,
            config.value,
            time.value,
          ).config.engines.find((e) => e.id === engine.value.id)
        : engine.value;
      return name === "color"
        ? boundColor(e.particles, "color", s.theme.value)
        : name === "engineGravity"
          ? e.gravity
          : e.particles[engineAnimationFields[name]];
    }
    if (
      name === "progress" &&
      clip.value?.frames.some((f) => f.field === "progress")
    )
      return frameValue(
        clip.value.frames,
        "progress",
        time.value - clip.value.start,
        0,
      );
    if (name === "progress")
      return Math.max(
        0,
        Math.min(
          1,
          (time.value - (clip.value?.start || 0)) /
            (clip.value?.duration || config.value.duration),
        ),
      );
    if (shapeAnimationFields[name]) {
      const e = scene.elements[key],
        prop = shapeAnimationFields[name];
      return name === "strokeColor"
        ? boundColor(e, "stroke", s.theme.value)
        : discreteAnimationFields.includes(name)
          ? e?.[prop]
            ? 1
            : 0
          : (e?.[prop] ?? 0);
    }
    if (name === "color")
      return scene.elements[key]?.type === "shape"
        ? boundColor(scene.elements[key], "fill", s.theme.value)
        : p?.textStyle?.colorRole
          ? boundColor(p.textStyle, "color", s.theme.value)
          : p?.textStyle?.color || s.theme.value.ink;
    return (
      p?.[name] ?? (name === "opacity" ? 100 : name === "contentScale" ? 1 : 0)
    );
  }
  function keyAt(name) {
    const target=[...backgroundAnimationFields,...cameraFields].includes(name)?config.value.clips.find(c=>c.keys.length===0&&c.frames.some(f=>(cameraFields.includes(name)?cameraFields:backgroundAnimationFields).includes(f.field))):clip.value;
    return target?.frames.find(
      (f) =>
        f.field === name &&
        Math.abs(f.time - (time.value - target.start)) < 0.0001,
    );
  }
  function ensureClip() {
    if(s.selectedKeys.value.length>1 && clip.value?.keys.length>1 && !clip.value.groupTransform) {
      // Add a group-frame layer at the cursor; never reinterpret existing group keys.
      const previousId=clip.value.id;addClip();
      if(clip.value?.id===previousId)return null;
      if(clip.value){clip.value.start=time.value;clip.value.duration=Math.max(.1,config.value.duration-time.value);}
      return clip.value;
    }
    if (
      !clip.value ||
      (s.selectedKeys.value.length>1 && (clip.value.keys.length!==s.selectedKeys.value.length || !s.selectedKeys.value.every(k=>clip.value.keys.includes(k)))) ||
      !s.selectedKeys.value.some((k) => clip.value.keys.includes(k))
    ) {
      const previousId=clip.value?.id;addClip();
      if(clip.value?.id===previousId)return null;
    }
    return clip.value;
  }
  function ensureBackgroundClip(field){
    const fields=cameraFields.includes(field)?cameraFields:backgroundAnimationFields;
    let c=config.value.clips.find(c=>c.keys.length===0&&c.frames.some(f=>fields.includes(f.field)));
    if(!c){if(config.value.clips.length>=100)return null;c=normalizeAnimation({clips:[{id:crypto.randomUUID(),name:cameraFields.includes(field)?'Caméra':'Fond de scène',keys:[],duration:config.value.duration}]}).clips[0];config.value.clips.push(c);}
    if(c.start){for(const f of c.frames)f.time+=c.start;c.start=0;}c.duration=config.value.duration;
    selectedClip.value=c.id;return c;
  }
  function setProperty(name, value, force = false, manageHistory = true) {
    if (!Number.isFinite(Number(value)) && !colorAnimationFields.includes(name))
      return;
    stop();
    if(manageHistory)s.beginGesture();
    try {
      const sceneProperty = [...backgroundAnimationFields,...cameraFields].includes(name);
      const grouped = s.selectedKeys.value.length>1 && s.current.value.groups?.some(g=>g.keys.length===s.selectedKeys.value.length&&g.keys.every(k=>s.selectedKeys.value.includes(k)));
      const targets = autoKey.value && !sceneProperty && !grouped
        ? s.selectedKeys.value.filter(key => s.current.value.positions[key] && (!parseEffectField(name) || config.value.effects.find(e => e.id === parseEffectField(name).id)?.key === key)) : [null];
      for (const key of targets) {
        const previous = propertyValue(name, true, key);
        if (autoKey.value && !force && (previous === value ||
            !colorAnimationFields.includes(name) && Math.abs(Number(previous) - Number(value)) < 0.0001)) continue;
        const c = sceneProperty ? ensureBackgroundClip(name) : key ? objectClip(key) : ensureClip();
        if (!c) continue;
        const local = Math.max(0, Math.min(c.duration, time.value - c.start));
        const interpolation =
          c.frames.filter((f) => f.field === name && f.time <= local).at(-1)
            ?.ease ||
          c.frames.find((f) => f.field === name)?.ease ||
          c.easing;
        if (local > 0 && !c.frames.some((f) => f.field === name && f.time < local))
          addAnimationKey(
            c,
            name,
            0,
            previous,
            discreteAnimationFields.includes(name) ? "hold" : interpolation,
          );
        addAnimationKey(
          c,
          name,
          local,
          colorAnimationFields.includes(name) ? value : Number(value),
          discreteAnimationFields.includes(name) ? "hold" : interpolation,
        );
        activeKey.value=null;activeFrame.value=null;
        preview.value = true;
      }
    } finally {
      if(manageHistory)s.endGesture();
      s.requestDraw();
    }
  }
  function objectClip(key) {
    let c = editableClip(config.value.clips, selectedClip.value, key, time.value);
    if (!c) {
      if (config.value.clips.length >= 100) return null;
      const start=Math.min(config.value.duration-1/config.value.fps,config.value.presences[key]?.start??0);
      c = normalizeAnimation({clips:[{id:crypto.randomUUID(), name:s.current.value.elements[key]?.name || "Mouvement", keys:[key], start, duration:config.value.duration-start}]}).clips[0];
      config.value.clips.push(c);
    }
    // Editing before a track starts must not silently clamp the new key to its start.
    if (time.value < c.start) {
      for (const f of c.frames) f.time += c.start;
      c.duration += c.start;
      c.start = 0;
    }
    if (time.value > c.start + c.duration) c.duration = time.value - c.start;
    selectedClip.value = c.id;
    return c;
  }
  function introduceObjects(keys) {
    for (const key of keys) config.value.presences[key] = normalizePresence({start: time.value});
  }
  function setPresence(keys, field, value) {
    if (busy.value) return;
    s.beginGesture();
    for (const key of keys) {
      if (!s.current.value.positions[key]) continue;
      const range = normalizePresence(config.value.presences[key]);
      if (field === 'start') {
        range.start = Math.max(0,Math.min(config.value.duration - 1/config.value.fps,Number(value)||0));
        if (range.end != null && range.end <= range.start) range.end = Math.min(config.value.duration, range.start+1/config.value.fps);
      } else if (field === 'end') range.end = value == null ? null : Math.max(range.start+1/config.value.fps,Math.min(config.value.duration, Number(value)||0));
      else range[field] = value;
      config.value.presences[key] = normalizePresence(range);
    }
    s.endGesture(); s.requestDraw();
  }
  function setCounter(key, field, value, manageHistory = true) {
    if(busy.value || s.current.value.elements[key]?.type !== 'text')return;
    if(manageHistory)s.beginGesture();
    const counter=normalizeCounter({...config.value.counters[key],[field]:value});
    config.value.counters[key]=counter;
    s.current.value.elements[key].text=counterText(counter,counter.from);
    if(manageHistory)s.endGesture();s.requestDraw();
  }
  function commitPose(positions, origins, manageHistory = true) {
    if(manageHistory)s.beginGesture();
    try {
      for (const [key, p] of Object.entries(positions)) {
        const before = origins[key];
        if (!before) continue;
        const c = objectClip(key);
        if (!c) continue;
        const local = Math.max(0, Math.min(c.duration,time.value-c.start));
        for(const field of ["x","y","w","h","rotation","size","contentScale"]) {
          if(c.pathId && ["x","y"].includes(field)) continue;
          if(!Number.isFinite(p[field]) || Math.abs(p[field]-(before[field]||0))<0.0001) continue;
          if(local>0 && !c.frames.some(f=>f.field===field)) addAnimationKey(c,field,0,before[field]||0,c.easing);
          addAnimationKey(c,field,local,p[field],c.easing);
        }
        selectedClip.value=c.id;
      }
    } finally { if(manageHistory)s.endGesture(); s.requestDraw(); }
  }
  function toggleProperty(name) {
    const f = keyAt(name);
    if (f) deleteKey([...backgroundAnimationFields,...cameraFields].includes(name)?config.value.clips.find(c=>c.frames.includes(f)):clip.value, f);
    else setProperty(name, propertyValue(name));
  }
  function setClipEasing(c, value) {
    s.beginGesture();
    c.easing = value;
    for (const f of c.frames) f.ease = value;
    s.endGesture();
  }
  function addEffect(kind,settings={}) {
    if (!s.selectedKeys.value.length) {
      s.notify("Sélectionne un objet.");
      return;
    }
    s.beginGesture();
    for (const key of s.selectedKeys.value) {
      if (config.value.effects.length >= 100) break;
      config.value.effects.push(
        normalizeEffect({ id: crypto.randomUUID(), kind, key, start:Math.min(time.value,Math.max(0,config.value.duration-.05)),duration:Math.min(1.5,Math.max(.05,config.value.duration-time.value)),...settings }),
      );
    }
    s.endGesture();
  }
  function removeEffect(id) {
    removeTracks([], [id], 'cet effet');
  }
  function moveEffect(id,beforeId,after=false){
    const list=config.value.effects,from=list.findIndex(e=>e.id===id),to=list.findIndex(e=>e.id===beforeId);
    if(from<0||to<0||from===to)return;
    s.beginGesture();const [e]=list.splice(from,1);list.splice(list.findIndex(e=>e.id===beforeId)+(after?1:0),0,e);s.endGesture();
  }
  function duplicateEffect(id){const e=config.value.effects.find(e=>e.id===id);if(!e||config.value.effects.length>=100)return;s.beginGesture();const next=normalizeEffect({...copy(e),id:crypto.randomUUID(),name:(e.name||effectCatalog.find(c=>c.id===e.kind)?.name||'Effet')+' · copie'});config.value.effects.splice(config.value.effects.indexOf(e)+1,0,next);for(const c of config.value.clips){const frames=c.frames.filter(f=>parseEffectField(f.field)?.id===id).map(f=>({...copy(f),field:effectField(next.id,parseEffectField(f.field).property)}));c.frames.push(...frames);c.frames.sort((a,b)=>a.time-b.time);}s.endGesture();}
  function resetEffect(id){const e=config.value.effects.find(e=>e.id===id);if(!e)return;requestDelete('les réglages et clés de cet effet',()=>{s.beginGesture();Object.assign(e,normalizeEffect({id:e.id,kind:e.kind,key:e.key,start:e.start}));for(const c of config.value.clips)c.frames=c.frames.filter(f=>parseEffectField(f.field)?.id!==id);s.endGesture();});}
  function attachEngine(parent) {
    const e = engine.value,
      p = s.current.value.positions[e?.key],
      target = s.current.value.positions[parent];
    if (!e || !p) return;
    s.beginGesture();
    if (target && parent !== e.key) {
      const state = animationScene(
          s.current.value,
          config.value,
          time.value,
        ).scene,
        world = state.positions[e.key],
        t = state.positions[parent];
      e.parent = parent;
      e.offsetX = world.x + world.w / 2 - t.x - t.w / 2;
      e.offsetY = world.y + world.h / 2 - t.y - (t.h || 0) / 2;
    } else {
      const world = animationScene(s.current.value, config.value, time.value)
        .scene.positions[e.key];
      const wasPreview = preview.value;
      preview.value = true;
      e.parent = "";
      const free = animationScene(s.current.value, config.value, time.value)
          .scene.positions[e.key],
        dx = world.x - free.x,
        dy = world.y - free.y;
      p.x += dx;
      p.y += dy;
      for (const c of config.value.clips.filter((c) =>
        c.keys.includes(e.key),
      )) {
        for (const f of c.frames) {
          if (f.field === "x") f.value += dx;
          if (f.field === "y") f.value += dy;
        }
        if (c.pathId) {
          const path = config.value.paths.find((p) => p.id === c.pathId);
          if (path && config.value.paths.length < 50) {
            const detached = copy(path);
            detached.id = crypto.randomUUID();
            detached.name += " · détaché";
            detached.points.forEach((p) => {
              p.x += dx;
              p.y += dy;
            });
            config.value.paths.push(detached);
            c.pathId = detached.id;
          }
        }
      }
      preview.value = wasPreview;
    }
    s.endGesture();
    s.requestDraw();
  }
  // Moving the emitter's rest pose translates its own keys too, rather than snapping back at playback.
  watch(
    () =>
      config.value.engines.map((e) => {
        const p = s.current.value.positions[e.key];
        return [e.key, p?.x, p?.y];
      }),
    (next, old) => {
      if (preview.value || s.restoring?.() || !old) return;
      for (const [key, x, y] of next) {
        const before = old.find((v) => v[0] === key);
        if (!before) continue;
        for (const c of config.value.clips.filter(
          (c) => c.keys.length === 1 && c.keys[0] === key && !c.pathId,
        ))
          for (const f of c.frames) {
            if (f.field === "x") f.value += x - before[1];
            if (f.field === "y") f.value += y - before[2];
          }
      }
    },
    { flush: "sync" },
  );
  function selectKey(c,key,add=false){
    selectClip(c.id);activeKey.value=key;
    const found=keySelection.value.find(r=>r.clipId===c.id&&r.key===key);
    if(add){if(found)keySelection.value=keySelection.value.filter(r=>r!==found);else keySelection.value.push({clipId:c.id,key});}
    else if(!found)keySelection.value=[{clipId:c.id,key}];
  }
  function keyEntries(){return keySelection.value.map(r=>({clip:config.value.clips.find(c=>c.id===r.clipId),key:r.key})).filter(r=>r.clip?.frames.includes(r.key));}
  function copyKeys(){keyClipboard.value=copyKeySelection(keyEntries());s.notify(keyClipboard.value.length+" clé(s) copiée(s).");}
  function pasteKeys(){const c=clip.value;if(!c||!keyClipboard.value.length)return;const start=time.value-c.start;if(start<0||keyClipboard.value.some(f=>start+f.time>c.duration)){s.notify("Les clés dépassent la durée de cette séquence.");return;}s.beginGesture();keySelection.value=[];for(const f of keyClipboard.value){addAnimationKey(c,f.field,start+f.time,f.value,f.ease);const key=c.frames.find(k=>k.field===f.field&&Math.abs(k.time-start-f.time)<1e-6);key.curve=copy(f.curve);keySelection.value.push({clipId:c.id,key});}s.endGesture();s.requestDraw();}
  function deleteKeys(){const entries=keyEntries();if(!entries.length)return;requestDelete(entries.length+" clé(s) sélectionnée(s)",()=>{s.beginGesture();for(const r of entries)r.clip.frames=r.clip.frames.filter(k=>k!==r.key);keySelection.value=[];activeKey.value=null;s.endGesture();});}
  function cancel() {
    controller?.abort();
  }
  onUnmounted(() => {
    stop();
    cancel();
    blur();
    window.removeEventListener("keydown", keyboard);
    window.removeEventListener("keyup", keyboard);
    window.removeEventListener("blur", blur);
  });
  return {
    audio,
    exportQuality,exportBackground,exportError,exportPhase,construction,setConstruction,editorScene,
    autoKey,setAutoKey,shouldKey,commonField,introduceObjects,setPresence,setCounter,
    inspectedEffect,inspectEffect,
    motionPrefs,keySelection,keyClipboard,selectKey,keyEntries,copyKeys,pasteKeys,deleteKeys,diagnostics,commitPose,selectedPathPoint,addPathPoint,removePathPoint,
    activeFrame,
    pendingDelete,
    requestDelete,
    confirmDelete,
    addFrame,
    focusFrame,
    removeFrame,
    allScenes,
    totalDuration,
    playbackTime,
    seekPlayback,
    exportOpen,
    propertyValue,
    keyAt,
    setProperty,
    toggleProperty,
    recordProperty:(name)=>setProperty(name,propertyValue(name),true),
    setClipEasing,
    addEffect,
    removeEffect,moveEffect,duplicateEffect,resetEffect,
    attachEngine,
    previewOpen,
    activeKey,
    engine,
    duplicateEngine,
    addEngine,
    selectEngine,
    removeEngine,
    detachLegacy,
    focusKey,
    deleteKey,
    duplicateKey,
    beginGesture: s.beginGesture,
    endGesture: s.endGesture,
    panning,
    panX,
    panY,
    spaceHeld,
    panStart,
    time,
    playing,
    preview,
    loop,
    selectedClip,
    field,
    ease,
    format,
    busy,
    progress,
    exportWidth,
    pathEditing,
    activePath,
    config,
    clip,
    path,
    stop,
    seek,
    play,
    addClip,
    duplicateClip,
    removeClip,removeTracks,
    addKey,
    addPath,
    removePath,
    addLink,
    selectClip,
    example,
    exportVideo,
    cancel,
    evaluate: () => animationScene(s.current.value, config.value, time.value),
  };
}
