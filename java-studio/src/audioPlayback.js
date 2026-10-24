// Native MP3 seeking can use an approximate VBR index. Decode once, then seek
// sample-addressable PCM through the existing media element and transport.
export function playbackSampleRate(duration) {
  // Budget the decoded stereo buffer; only the selected reference is prepared.
  const budget = 128 * 1024 * 1024;
  return (
    [48000, 44100, 32000, 24000, 16000, 12000, 8000].find(
      (rate) => duration * rate * 2 * 4 <= budget,
    ) || 8000
  );
}
export function pcmWaveBlob(buffer) {
  const channels = Math.min(2, buffer.numberOfChannels),
    frames = buffer.length,
    bytes = frames * channels * 2;
  const header = new ArrayBuffer(44),
    view = new DataView(header);
  const tag = (offset, text) =>
    [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  tag(0, "RIFF");
  view.setUint32(4, 36 + bytes, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, bytes, true);
  const data = Array.from({ length: channels }, (_, c) =>
    buffer.getChannelData(c),
  );
  const parts = [header];
  for (let offset = 0; offset < frames; offset += 65536) {
    const length = Math.min(65536, frames - offset),
      chunk = new ArrayBuffer(length * channels * 2),
      pcm = new DataView(chunk);
    for (let i = 0; i < length; i++)
      for (let c = 0; c < channels; c++) {
        const sample = Math.max(-1, Math.min(1, data[c][offset + i]));
        pcm.setInt16(
          (i * channels + c) * 2,
          Math.round(sample * (sample < 0 ? 32768 : 32767)),
          true,
        );
      }
    parts.push(chunk);
  }
  return new Blob(parts, { type: "audio/wav" });
}
export async function prepareAudioPlayback(asset) {
  const original = await (await fetch(asset.src)).blob();
  // PCM WAV already provides sample-accurate seeking without preparation.
  if (/^audio\/(?:x-)?wav$/.test(original.type)) return original;
  const Decoder =
    globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Decoder)
    throw Error(
      "La préparation audio précise n’est pas disponible dans ce navigateur.",
    );
  const buffer = await new Decoder(
    1,
    1,
    playbackSampleRate(asset.duration),
  ).decodeAudioData(await original.arrayBuffer());
  return pcmWaveBlob(buffer);
}
