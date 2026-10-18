import { ensureVideoEncoder } from "./videoEncoding.js";

export async function exportAnimationFrames({
  canvas,
  draw,
  duration,
  fps,
  format,
  quality = "balanced",
  signal,
  onProgress = () => {},
  fetcher = globalThis.fetch,
}) {
  const token = await ensureVideoEncoder(format, { signal, fetcher }),
    headers = { "X-Frame-Video-Token": token };
  let id;
  async function request(path, options = {}) {
    let response;
    try {
      response = await fetcher("/__frame_video_frames__/" + path, {
        ...options,
        headers: { ...headers, ...options.headers },
        signal,
      });
    } catch (error) {
      if (error.name === "AbortError") throw error;
      throw Error(
        "La connexion au serveur d’export a été interrompue. Garde Frame ouvert puis réessaie.",
      );
    }
    if (!response.ok) {
      let value;
      try {
        value = await response.json();
      } catch {}
      throw Error(
        value?.error ||
          "Le serveur d’export ne répond pas. Relance Frame puis réessaie.",
      );
    }
    return response;
  }
  const count = Math.max(1, Math.round(duration * fps));
  try {
    const response = await request("", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        width: canvas.width,
        height: canvas.height,
        fps,
        count,
        format,
        quality,
      }),
    });
    ({ id } = await response.json());
    for (let start = 0; start < count;) {
      const batch = [];
      let next = start,
        bytes = 0;
      for (; next < Math.min(count, start + 12); next++) {
        const i = next;
        if (signal?.aborted)
          throw new DOMException("Export annulé.", "AbortError");
        draw(i / fps);
        const blob = await new Promise((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(Error("Image indisponible."))),
            "image/png",
          ),
        );
        const size = new Uint8Array(4);
        new DataView(size.buffer).setUint32(0, blob.size);
        batch.push(size, new Uint8Array(await blob.arrayBuffer()));
        bytes += blob.size + 4;
        if (bytes >= 16 * 1024 * 1024) {
          next++;
          break;
        }
      }
      const payload = new Uint8Array(bytes);
      let offset = 0;
      for (const part of batch) {
        payload.set(part, offset);
        offset += part.byteLength;
      }
      await request(id + "/batch?start=" + start, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: payload,
      });
      start = next;
      onProgress((start / count) * 0.9, "images");
    }
    onProgress(0.92, "encoding");
    const encoded = await request(id + "/finish", { method: "POST" }),
      blob = await encoded.blob();
    if (!blob.size) throw Error("Le fichier encodé est vide.");
    onProgress(1, "done");
    return blob;
  } finally {
    if (id)
      await fetcher("/__frame_video_frames__/" + id, {
        method: "DELETE",
        headers,
      }).catch(() => {});
  }
}
