import { videoPlaybackState } from "./videoPlayback.js";
import { normalizeVideoProperties } from "./videoProperties.js";
import {
  portableAudioProject,
  restoreAudioProject,
} from "./animationAudioMedia.js";
// Videos are stored once in IndexedDB settings; documents retain small stable references.
const entries = new Map();
let repository;
async function store() {
  return (repository ||= (
    await import("./videoProjects.js")
  ).videoRepository());
}
export const validVideoReference = (src) =>
  typeof src === "string" && /^frame-video:[a-f0-9-]{36}$/.test(src);
const validData = (src) =>
  typeof src === "string" &&
  src.length < 90000000 &&
  /^data:video\/(mp4|webm|ogg|quicktime);base64,[A-Za-z0-9+/=]+$/.test(src);
const notify = () => window.dispatchEvent(new Event("frame-images-ready"));
export const VIDEO_FILE_ACCEPT =
  "video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogv,.ogg,.mov,.m4v";
export function videoFileType(file) {
  const type = file?.type?.toLowerCase() || "";
  if (type === "video/x-m4v") return "video/mp4";
  if (
    ["video/mp4", "video/webm", "video/ogg", "video/quicktime"].includes(type)
  )
    return type;
  if (type && type !== "application/octet-stream") return "";
  return (
    {
      mp4: "video/mp4",
      m4v: "video/mp4",
      webm: "video/webm",
      ogv: "video/ogg",
      ogg: "video/ogg",
      mov: "video/quicktime",
    }[file?.name?.split(".").pop()?.toLowerCase()] || ""
  );
}
export async function importVideoFile(file) {
  const type = videoFileType(file);
  if (!type)
    throw Error(
      "Choisis une vidéo MP4, WebM, Ogg ou MOV lisible par ce navigateur.",
    );
  if (file.size > 64 * 1024 * 1024)
    throw Error("Cette vidéo dépasse 64 Mo. Prépare un extrait plus court.");
  const src = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(Error("Lecture de la vidéo impossible."));
    reader.readAsDataURL(
      file.type === type ? file : file.slice(0, file.size, type),
    );
  });
  const id = "frame-video:" + crypto.randomUUID();
  await (await store()).setSetting(id, { src, name: file.name });
  return id;
}
export function videoAsset(scene, key, src) {
  const id = scene + ":" + key;
  if (entries.get(id)?.src === src) {
    entries.get(id).used = performance.now();
    return entries.get(id);
  }
  const old = entries.get(id);
  if (old) {
    old.audioGain?.disconnect();
    old.audioSource?.disconnect();
    old.video.pause();
    old.video.removeAttribute("src");
    old.video.load();
    URL.revokeObjectURL(old.url || "");
  }
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  const entry = {
    video,
    image: video,
    ready: false,
    src,
    url: "",
    manual: false,
    error: "",
  };
  entries.set(id, entry);
  entry.promise = (async () => {
    try {
      const data = await (await store()).getSetting(src);
      if (!validData(data?.src))
        throw Error(
          "Vidéo introuvable dans le stockage local. Réimporte le fichier.",
        );
      const blob = await (await fetch(data.src)).blob();
      entry.url = URL.createObjectURL(blob);
      video.src = entry.url;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(Error("Chargement de la vidéo trop long.")),
          20000,
        );
        video.onloadeddata = () => {
          clearTimeout(timer);
          resolve();
        };
        video.onerror = () => {
          clearTimeout(timer);
          reject(
            Error(
              "Ce codec vidéo ne peut pas être lu par le navigateur. Essaie MP4 H.264.",
            ),
          );
        };
      });
      video.width = video.videoWidth;
      video.height = video.videoHeight;
      entry.ready = true;
      entry.used = performance.now();
      trimVideos(id);
      notify();
    } catch (e) {
      entry.error = e.message;
      notify();
    }
  })();
  return entry;
}
export function videoElements(scenes) {
  return scenes.flatMap((s) =>
    Object.entries(s.elements || {})
      .filter(([, e]) => e.mediaKind === "video" && validVideoReference(e.src))
      .map(([key, e]) => ({ s, key, e })),
  );
}
function trimVideos(keep) {
  const candidates = [...entries.entries()]
    .filter(
      ([id, e]) => id !== keep && !e.exportLocks && e.ready && e.video.paused,
    )
    .sort((a, b) => (a[1].used || 0) - (b[1].used || 0));
  while (entries.size > 8 && candidates.length) {
    const [id, e] = candidates.shift();
    entries.delete(id);
    e.audioGain?.disconnect();
    e.audioSource?.disconnect();
    e.video.removeAttribute("src");
    e.video.load();
    URL.revokeObjectURL(e.url || "");
  }
}
export async function prepareVideos(scenes) {
  const list = videoElements(scenes)
    .slice(0, 8)
    .map(({ s, key, e }) => videoAsset(s.id, key, e.src));
  await Promise.all(list.map((e) => e.promise));
  const bad = list.find((e) => e.error);
  if (bad) throw Error(bad.error);
}
export function targetTime(entry, e, time) {
  const duration = entry.video.duration || 0,
    start = Math.max(0, e.videoStart || 0),
    t =
      e.videoClock ??
      start +
        (e.autoplay !== false
          ? Math.max(0, time || 0) * normalizeVideoProperties(e).videoRate
          : 0);
  return e.videoLoop && duration > 0
    ? t % duration
    : Math.min(Math.max(0, duration - 0.001), t);
}
export function syncVideo(entry, e, time = 0, live = false) {
  if (!entry.ready || entry.exportLocks) return;
  if (entry.timelinePlaying && !live) return;
  entry.video.loop = e.videoLoop === true;
  const props = normalizeVideoProperties(e);
  entry.video.playbackRate = props.videoRate;
  entry.video.preservesPitch = false;
  setVideoGain(entry, props.videoVolume / 100, live || entry.manual);
  if (live && (e.autoplay !== false || entry.manual)) {
    const t = targetTime(entry, e, time);
    if (!e.videoLoop && t >= entry.video.duration - 0.001) {
      entry.video.pause();
      if (Math.abs(entry.video.currentTime - t) > 0.01)
        entry.video.currentTime = t;
      entry.wasLive = false;
      return;
    }
    if (entry.wasLive && entry.video.ended && !e.videoLoop) return;
    if (
      !entry.wasLive ||
      (e.videoClock != null && Math.abs(entry.video.currentTime - t) > 0.15)
    )
      entry.video.currentTime = t;
    entry.wasLive = true;
    entry.video.play().catch(() => {});
    return;
  }
  entry.wasLive = false;
  if (!entry.manual) entry.video.pause();
  const t = targetTime(entry, e, time);
  if (
    !entry.manual &&
    Math.abs(entry.video.currentTime - t) > 0.025 &&
    !entry.video.seeking
  )
    entry.video.currentTime = t;
  entry.video.onseeked = notify;
}
export async function seekVideos(scenes, time) {
  await prepareVideos(scenes);
  await Promise.all(
    videoElements(scenes).map(async ({ s, key, e }) => {
      if (s.animation)
        e = { ...e, videoClock: videoPlaybackState(s, key, time).time };
      const entry = videoAsset(s.id, key, e.src);
      await entry.promise;
      if (entry.error) throw Error(entry.error);
      const v = entry.video,
        t = targetTime(entry, e, time);
      v.pause();
      entry.manual = false;
      const needsSeek=Math.abs(v.currentTime-t)>=.00001;
      if (!needsSeek&&!v.seeking) return;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(Error("Recherche d’image vidéo interrompue.")),
          10000,
        );
        v.addEventListener(
          "seeked",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
        if(needsSeek)v.currentTime = t;
      });
    }),
  );
}
export function toggleVideo(scene, key, e) {
  const entry = videoAsset(scene, key, e.src);
  if (!entry.ready || entry.exportLocks) return;
  entry.manual = entry.video.paused;
  syncVideo(entry, e, 0, false);
  if (entry.manual) entry.video.play().catch(() => {});
  else entry.video.pause();
  notify();
}
export function videosPlaying() {
  return [...entries.values()].some((e) => !e.video.paused && !e.video.ended);
}
export function stopVideos(release = false) {
  for (const entry of entries.values()) {
    entry.video.pause();
    entry.manual = false;
    entry.timelinePlaying = false;
    entry.wasLive = false;
    if (release) {
      entry.audioGain?.disconnect();
      entry.audioSource?.disconnect();
      entry.video.removeAttribute("src");
      entry.video.load();
      URL.revokeObjectURL(entry.url || "");
    }
  }
  if (release) entries.clear();
}
export async function portableVideoProject(project) {
  const clone = JSON.parse(JSON.stringify(project)),
    refs = new Set();
  const walk = (v) => {
    if (!v || typeof v !== "object") return;
    if (v.mediaKind === "video" && validVideoReference(v.src)) refs.add(v.src);
    Object.values(v).forEach(walk);
  };
  walk(clone);
  if (refs.size) {
    clone.videoMedia = {};
    for (const src of refs) {
      const asset = await (await store()).getSetting(src);
      if (!validData(asset?.src))
        throw Error(
          "Une vidéo est introuvable. Réimporte-la avant de sauvegarder le fichier.",
        );
      clone.videoMedia[src] = asset;
    }
  }
  return portableAudioProject(clone);
}
export async function restoreVideoProject(project) {
  const media = project?.videoMedia;
  if (media) {
    if (typeof media !== "object" || Object.keys(media).length > 100)
      throw Error("Bibliothèque vidéo invalide.");
    for (const [key, value] of Object.entries(media)) {
      if (!validVideoReference(key) || !validData(value?.src))
        throw Error("Média vidéo invalide.");
      const existing = await (await store()).getSetting(key);
      if (existing && existing.src !== value.src)
        throw Error(
          "Une vidéo portant cet identifiant existe déjà avec un contenu différent. Le fichier existant est conservé.",
        );
      await (
        await store()
      ).setSetting(key, {
        src: value.src,
        name: String(value.name || "Vidéo").slice(0, 200),
      });
    }
  }
  return restoreAudioProject(project);
}

export async function videoSourceData(src) {
  return (await store()).getSetting(src);
}
export function syncSceneVideos(scene, time, playing) {
  const active = new Set();
  for (const { key, e } of videoElements([scene])) {
    const entry = videoAsset(scene.id, key, e.src),
      state = videoPlaybackState(scene, key, time);
    active.add(entry);
    const controlled = entry.timelinePlaying;
    if (playing || controlled) entry.manual = false;
    entry.timelinePlaying = false;
    syncVideo(
      entry,
      {
        ...e,
        videoClock: state.time,
        videoVolume: state.volume * 100,
        videoRate: state.rate,
      },
      time,
      playing &&
        e.autoplay !== false &&
        time >= (scene.animation?.presences?.[key]?.start || 0) &&
        time <
          (scene.animation?.presences?.[key]?.end ??
            scene.animation?.duration ??
            Infinity),
    );
    entry.timelinePlaying = playing;
  }
  for (const entry of entries.values())
    if (!active.has(entry) && entry.timelinePlaying) {
      entry.video.pause();
      entry.timelinePlaying = false;
      entry.wasLive = false;
    }
}
let audioContext;
const audioDestinations = new Set();
function ensureGraph(entry) {
  if (entry.audioGain || !audioContext) return;
  const source = audioContext.createMediaElementSource(entry.video),
    gain = audioContext.createGain();
  source.connect(gain);
  gain.connect(audioContext.destination);
  for (const dest of audioDestinations) gain.connect(dest);
  entry.audioSource = source;
  entry.audioGain = gain;
  gain.gain.value = entry.audioAudible ? entry.audioVolume : 0;
  entry.video.volume = 1;
  entry.video.muted = false;
}
function setVideoGain(entry, volume, audible) {
  entry.audioVolume = volume;
  entry.audioAudible = audible;
  ensureGraph(entry);
  if (entry.audioGain) {
    entry.video.volume = 1;
    entry.video.muted = false;
    entry.audioGain.gain.value = audible ? volume : 0;
  } else {
    entry.video.volume = volume;
    entry.video.muted = !audible || volume === 0;
  }
}
export async function captureVideoAudio() {
  if (!entries.size || !globalThis.AudioContext) return null;
  audioContext ||= new AudioContext();
  await audioContext.resume();
  const destination = audioContext.createMediaStreamDestination();
  audioDestinations.add(destination);
  for (const entry of entries.values()) {
    const existing = entry.audioGain;
    ensureGraph(entry);
    if (existing) entry.audioGain.connect(destination);
  }
  return {
    stream: destination.stream,
    dispose() {
      audioDestinations.delete(destination);
      for (const entry of entries.values())
        try {
          entry.audioGain?.disconnect(destination);
        } catch {}
      destination.stream.getTracks().forEach((t) => t.stop());
    },
  };
}

// Export owns the decoded frames until it is done; editor/thumbnail renders
// must not seek the same media element back to their own paused cursor.
export function lockVideoFrames(scenes) {
  const assets = videoElements(scenes).map(({ s, key, e }) =>
    videoAsset(s.id, key, e.src),
  );
  for (const entry of assets) entry.exportLocks = (entry.exportLocks || 0) + 1;
  return () => {
    for (const entry of assets)
      entry.exportLocks = Math.max(0, (entry.exportLocks || 0) - 1);
    notify();
  };
}
