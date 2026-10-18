import { addSceneEngine } from "./animationEngines.js";
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import {
  normalizeAnimation,
  animationScene,
  addAnimationKey,
} from "./animationModel.js";
import { renderAnimation } from "./animationRender.js";
import { prepareImages } from "./render.js";
import { prepareFonts } from "./fontAssets.js";
import { pngMovie } from "./pngMovie.js";
import { ensureVideoEncoder } from "./videoEncoding.js";
import { makeAnimationExample } from "./animationExamples.js";
const copy = (v) => JSON.parse(JSON.stringify(v));
export function useAnimationStudio(s) {
  const panX = ref(0),
    panY = ref(0),
    spaceHeld = ref(false);
  let panCleanup = () => {};
  const time = ref(0),
    playing = ref(false),
    preview = ref(false),
    loop = ref(true),
    selectedClip = ref(""),
    field = ref("x"),
    ease = ref("smooth"),
    format = ref("mov"),
    busy = ref(false),
    progress = ref(0),
    exportWidth = ref(1920),
    pathEditing = ref(false),
    activePath = ref("");
  const previewOpen = ref(false),
    activeKey = ref(null);
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
      stop();
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
  watch([time, preview, pathEditing], s.requestDraw);
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
    preview.value = false;
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
    preview.value = false;
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
      preview.value = false;
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
    if (s.panels) s.panels.value.slides = true;
  }
  function deleteKey(c, key) {
    s.beginGesture();
    c.frames = c.frames.filter((f) => f !== key);
    if (activeKey.value === key) activeKey.value = null;
    s.endGesture();
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
    const x = event.clientX,
      y = event.clientY,
      left = panX.value,
      top = panY.value;
    const move = (e) => {
      panX.value = left + e.clientX - x;
      panY.value = top + e.clientY - y;
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      panCleanup = () => {};
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
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
  function seek(value) {
    stop();
    time.value = Math.max(
      0,
      Math.min(config.value.duration, Number(value) || 0),
    );
    s.requestDraw();
  }
  function play() {
    if (playing.value) {
      stop();
      return;
    }
    preview.value = true;
    clock = performance.now();
    offset = time.value >= config.value.duration ? 0 : time.value;
    playing.value = true;
    const tick = (now) => {
      const value = offset + (now - clock) / 1000;
      if (value >= config.value.duration) {
        if (loop.value) {
          clock = now;
          offset = 0;
          time.value = 0;
        } else {
          time.value = config.value.duration;
          stop();
          return;
        }
      } else time.value = value;
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
        },
      ],
    }).clips[0];
    config.value.clips.push(c);
    selectedClip.value = c.id;
    preview.value = false;
  }
  function duplicateClip() {
    if (!clip.value || config.value.clips.length >= 100) return;
    const c = copy(clip.value);
    c.id = crypto.randomUUID();
    c.name += " · copie";
    config.value.clips.push(c);
    selectedClip.value = c.id;
  }
  function removeClip() {
    config.value.clips = config.value.clips.filter(
      (c) => c.id !== selectedClip.value,
    );
    selectedClip.value = config.value.clips[0]?.id || "";
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
      ease.value,
    );
  }
  function addPath() {
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
  function removePath() {
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
    progress.value = 0;
    controller = new AbortController();
    const signal = controller.signal;
    const scene = copy(s.current.value),
      theme = copy(s.theme.value),
      config = normalizeAnimation(scene.animation),
      outputFormat = format.value,
      width = exportWidth.value;
    try {
      if (outputFormat === "webm" && config.background === "transparent")
        throw Error(
          "Pour conserver la transparence, choisis MOV ou MKV. WebM utilise un fond uni ou vert.",
        );
      await ensureVideoEncoder(outputFormat, { signal });
      await prepareFonts([scene]);
      await prepareImages([scene], theme);
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
              draw(t);
              progress.value = t / config.duration;
              if (t === config.duration) recorder.stop();
              else timer = setTimeout(tick, 1000 / config.fps);
            }
            tick();
          } catch (e) {
            fail(e);
          }
        });
      } else {
        const frames = [],
          count = Math.max(1, Math.round(config.duration * config.fps));
        let bytes = 0;
        for (let i = 0; i < count; i++) {
          if (signal.aborted)
            throw new DOMException("Export annulé.", "AbortError");
          draw(i / config.fps);
          const blob = await new Promise((resolve, reject) =>
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(Error("Image indisponible."))),
              "image/png",
            ),
          );
          bytes += blob.size;
          if (bytes > 256 * 1024 * 1024)
            throw Error(
              "Capture supérieure à 256 Mo. Réduis la résolution ou la durée.",
            );
          frames.push(blob);
          progress.value = ((i + 1) / count) * 0.85;
          if (i % 6 === 0)
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        const source = await pngMovie(frames, {
          width: canvas.width,
          height: canvas.height,
          fps: config.fps,
        });
        await s.videoEncoding.save(
          source,
          outputFormat,
          "frame-animation." + outputFormat,
          { signal, preview: false },
        );
      }
      progress.value = 1;
      s.notify("Animation exportée.");
      function draw(t) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(canvas.width / 1920, canvas.height / 1080);
        renderAnimation(ctx, scene, theme, config, t);
        ctx.restore();
      }
    } catch (e) {
      if (e.name !== "AbortError") s.notify(e.message);
    } finally {
      busy.value = false;
      controller = null;
    }
  }
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
    removeClip,
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
