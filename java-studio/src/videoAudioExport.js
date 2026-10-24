import { videoElements, videoSourceData } from "./videoMedia.js";
import { videoTimeline } from "./videoPlayback.js";
import { pcmWaveBlob, playbackSampleRate } from "./audioPlayback.js";
// Mix only media placed on the scene. The reference recording remains a reference.
export async function mixVideoAudio(scenes, { signal } = {}) {
  if (
    !scenes.some((s) =>
      videoElements([s]).some(({ e }) => e.autoplay !== false),
    )
  )
    return null;
  const duration = scenes.reduce((sum, s) => sum + s.animation.duration, 0),
    rate = Math.min(24000, playbackSampleRate(duration));
  const Decoder =
    globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Decoder)
    throw Error(
      "La préparation du son des vidéos n’est pas disponible dans ce navigateur.",
    );
  const context = new Decoder(2, 1, rate),
    output = context.createBuffer(2, Math.ceil(duration * rate), rate),
    decoded = new Map();
  const abort = () => {
    if (signal?.aborted) throw new DOMException("Export annulé.", "AbortError");
  };
  let offset = 0,
    hasAudio = false;
  for (const scene of scenes) {
    for (const { key, e } of videoElements([scene])) {
      abort();
      if (e.autoplay === false) continue;
      if (!decoded.has(e.src)) {
        const asset = await videoSourceData(e.src);
        abort();
        const data = await (await fetch(asset.src)).arrayBuffer();
        try {
          decoded.set(e.src, await context.decodeAudioData(data));
        } catch {
          decoded.set(e.src, null);
        }
      }
      const source = decoded.get(e.src);
      if (!source) continue;
      hasAudio = true;
      const table = videoTimeline(scene, key),
        samples = source.length,
        channels = [
          source.getChannelData(0),
          source.getChannelData(Math.min(1, source.numberOfChannels - 1)),
        ],
        out = [output.getChannelData(0), output.getChannelData(1)];
      const start = Math.round(offset * rate),
        count = Math.min(
          Math.round(scene.animation.duration * rate),
          output.length - start,
        );
      for (let n = 0; n < count; n++) {
        if (n % (rate * 2) === 0) {
          abort();
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        const t = n / rate,
          pos = t / table.step,
          i = Math.floor(pos),
          j = Math.min(table.clock.length - 1, i + 1),
          f =
            j === i
              ? 0
              : (t - i * table.step) /
                (Math.min(table.duration, j * table.step) - i * table.step);
        const time = table.clock[i] + (table.clock[j] - table.clock[i]) * f,
          volume = table.volumes[i] + (table.volumes[j] - table.volumes[i]) * f;
        if (!volume) continue;
        const at =
          (e.videoLoop ? time % source.duration : time) * source.sampleRate;
        if (at >= samples - 1) continue;
        const a = Math.floor(at),
          blend = at - a;
        for (let ch = 0; ch < 2; ch++)
          out[ch][start + n] +=
            (channels[ch][a] +
              (channels[ch][a + 1] - channels[ch][a]) * blend) *
            volume;
      }
    }
    offset += scene.animation.duration;
  }
  abort();
  return hasAudio ? { buffer: output, blob: pcmWaveBlob(output) } : null;
}
export async function audioBufferStream(buffer) {
  if (!buffer) return null;
  const context = new AudioContext({ sampleRate: buffer.sampleRate }),
    destination = context.createMediaStreamDestination(),
    source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(destination);
  await context.resume();
  return {
    stream: destination.stream,
    start: () => source.start(),
    dispose() {
      try {
        source.stop();
      } catch {}
      destination.stream.getTracks().forEach((t) => t.stop());
      void context.close();
    },
  };
}
