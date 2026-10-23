import { prepareAudioPlayback } from "./audioPlayback.js";
import { computed, ref, shallowRef, watch, onUnmounted } from "vue";
import { importAnimationAudio, loadAudioAsset } from "./animationAudioMedia.js";
import { audioSourceTime, normalizeSceneAudio } from "./animationAudioModel.js";
export function useAnimationAudio(s, playback) {
  const asset = shallowRef(null),
    loading = ref(false),
    importing = ref(false),
    error = ref(""),
    muted = ref(false),
    timeUnit = ref("ms");
  try {
    timeUnit.value =
      localStorage.getItem("frame-animation-audio-time-unit") === "frames"
        ? "frames"
        : "ms";
    muted.value =
      localStorage.getItem("frame-animation-audio-muted") === "true";
  } catch {}
  const frameRate = computed(() =>
    timeUnit.value === "frames" ? s.current.value.animation.fps : 0,
  );
  function setTimeUnit(value) {
    timeUnit.value = value === "frames" ? "frames" : "ms";
    try {
      localStorage.setItem("frame-animation-audio-time-unit", timeUnit.value);
    } catch {}
  }
  const settings = computed(() => s.current.value.animation.audio);
  const position = computed(() =>
    audioSourceTime(
      settings.value,
      playback.time.value,
      s.current.value.animation.duration,
    ),
  );
  const media = document.createElement("audio");
  media.preload = "auto";
  let url = "",
    generation = 0,
    disposed = false,
    playPending = false,
    forceSeek = false,
    blocked = false;
  const clear = () => {
    media.pause();
    media.removeAttribute("src");
    media.load();
    if (url) URL.revokeObjectURL(url);
    url = "";
    asset.value = null;
    playPending = false;
    forceSeek = false;
    blocked = false;
  };
  function sync() {
    media.muted = muted.value;
    const duration = s.current.value.animation.duration;
    const target = position.value;
    const active =
      asset.value && !loading.value && !importing.value && !playback.busy.value;
    const shouldPlay =
      active &&
      playback.playing.value &&
      playback.time.value < duration &&
      target < asset.value.duration;
    if (!shouldPlay) media.pause();
    if (!active || !media.src || media.readyState < 1) return;
    // Never queue play while the decoder is still seeking/loading the excerpt.
    if (media.seeking) return;
    const desired = Math.min(target, asset.value.duration);
    // The animation is the master clock: seek on scrub/scene change and correct audible drift.
    if (
      Math.abs(media.currentTime - desired) >
      (forceSeek ? 0.000001 : shouldPlay ? 0.12 : 0.005)
    ) {
      try {
        media.currentTime = desired;
        forceSeek = false;
        return; // seeked/loadeddata will recheck the current scene time before play.
      } catch {
        return;
      }
    }
    forceSeek = false;
    if (media.readyState < 2) return;
    if (shouldPlay && media.paused && !playPending && !blocked) {
      playPending = true;
      const token = generation;
      media
        .play()
        .then(() => {
          if (!disposed && token === generation) error.value = "";
        })
        .catch((e) => {
          if (disposed || token !== generation || e.name === "AbortError")
            return;
          blocked = true;
          error.value =
            "Lecture audio impossible. Relance la lecture ou réimporte un fichier compatible.";
        })
        .finally(() => {
          if (token === generation) playPending = false;
        });
    }
  }
  media.onloadedmetadata = sync;
  media.onloadeddata = sync;
  media.oncanplay = sync;
  media.onseeked = sync;
  media.onerror = () => {
    if (!disposed && url)
      error.value =
        "Le navigateur ne peut pas lire cet audio. Essaie un fichier MP3 ou WAV.";
  };
  watch(
    () => settings.value?.src || "",
    async (src) => {
      const token = ++generation;
      clear();
      error.value = "";
      if (!src) {
        loading.value = false;
        return;
      }
      loading.value = true;
      try {
        const record = await loadAudioAsset(src);
        if (disposed || token !== generation) return;
        const blob = await prepareAudioPlayback(record);
        if (disposed || token !== generation) return;
        asset.value = record;
        url = URL.createObjectURL(blob);
        media.src = url;
        media.load();
      } catch (e) {
        if (!disposed && token === generation) error.value = e.message;
      } finally {
        if (!disposed && token === generation) {
          loading.value = false;
          sync();
        }
      }
    },
    { immediate: true },
  );
  watch(
    [
      playback.time,
      playback.playing,
      playback.busy,
      importing,
      muted,
      () => settings.value?.start,
      () => s.current.value.animation.duration,
    ],
    sync,
    { flush: "post" },
  );
  watch(playback.playing, () => {
    blocked = false;
  });
  function toggleMute() {
    muted.value = !muted.value;
    try {
      localStorage.setItem("frame-animation-audio-muted", String(muted.value));
    } catch {}
    sync();
  }
  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || importing.value || playback.busy.value) return;
    playback.stop();
    importing.value = true;
    error.value = "";
    const scenes = s.slides.value;
    try {
      const { id } = await importAnimationAudio(file);
      if (disposed || s.slides.value !== scenes) return;
      s.beginGesture();
      let offset = 0;
      for (const scene of scenes) {
        const previous = normalizeSceneAudio(scene.animation.audio);
        scene.animation.audio = {
          src: id,
          start: previous.src ? previous.start : offset,
        };
        offset += scene.animation.duration;
      }
      s.endGesture();
      s.notify(
        "Audio importé. Les extraits suivent les scènes ; ajuste leur début dans Scène.",
      );
    } catch (e) {
      if (!disposed) {
        error.value = e.message;
        s.notify(e.message);
      }
    } finally {
      if (!disposed) importing.value = false;
    }
  }
  function setStart(value) {
    const start = Number(value);
    if (!Number.isFinite(start) || playback.busy.value) return;
    playback.stop();
    s.beginGesture();
    s.current.value.animation.audio = normalizeSceneAudio({
      ...settings.value,
      start,
    });
    s.endGesture();
    // An explicit source start is auditioned at scene zero, never at the old playhead.
    playback.seek(0);
    forceSeek = true;
    sync();
  }
  function remove() {
    const src = settings.value?.src;
    playback.requestDelete("l’audio de référence de cette animation", () => {
      s.beginGesture();
      for (const scene of s.slides.value)
        if (scene.animation.audio?.src === src)
          scene.animation.audio = normalizeSceneAudio();
      s.endGesture();
    });
  }
  onUnmounted(() => {
    disposed = true;
    generation++;
    media.onloadedmetadata = null;
    media.onloadeddata = null;
    media.oncanplay = null;
    media.onseeked = null;
    media.onerror = null;
    clear();
  });
  return {
    settings,
    timeUnit,
    frameRate,
    setTimeUnit,
    position,
    asset,
    loading,
    importing,
    error,
    muted,
    toggleMute,
    importFile,
    setStart,
    remove,
  };
}
