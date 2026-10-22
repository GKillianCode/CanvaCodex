import { ensureVideoEncoder } from "./videoEncoding.js";
// MediaRecorder supplies timestamped, compressed chunks. Send each to the local
// spool instead of retaining a whole presentation in browser memory.
export async function createPresentationRecording(
  canvas,
  {
    format = "mp4",
    fps = 30,
    fetcher = globalThis.fetch,
    Recorder = globalThis.MediaRecorder,
    onError = () => {},
  } = {},
) {
  if (!Recorder || !canvas?.captureStream)
    throw Error("La capture vidéo est indisponible dans ce navigateur.");
  const mime = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ].find((value) => Recorder.isTypeSupported(value));
  if (!mime) throw Error("Ce navigateur ne propose pas de capture WebM.");
  const token = await ensureVideoEncoder(format, { fetcher });
  async function request(path, options = {}) {
    const response = await fetcher("/__frame_presentation__/" + path, {
      ...options,
      headers: { "X-Frame-Video-Token": token, ...options.headers },
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw Error("Réponse du service vidéo local invalide.");
    }
    if (!response.ok)
      throw Error(data.error || "Enregistrement local impossible.");
    return data;
  }
  const { id } = await request("?format=" + format, { method: "POST" });
  if (!/^[a-f0-9]{48}$/.test(id || "")) throw Error("Session vidéo invalide.");
  const controller = new AbortController();
  let stream,
    recorder,
    queue = Promise.resolve(),
    index = 0,
    failed,
    cancelled = false,
    requestedStop = false,
    stopPromise,
    complete;
  const ended = new Promise((resolve) => {
    complete = resolve;
  });
  const onPageHide = () => {
    void cancel();
  };
  const detach = () => globalThis.removeEventListener?.("pagehide", onPageHide);
  async function cancel() {
    if (cancelled) return;
    cancelled = true;
    detach();
    controller.abort();
    if (recorder?.state === "recording" || recorder?.state === "paused")
      recorder.stop();
    stream?.getTracks().forEach((t) => t.stop());
    const cleanup = request(id, { method: "DELETE", keepalive: true }).catch(
      () => {},
    );
    await queue.catch(() => {});
    await cleanup;
  }
  function fail(error) {
    if (failed || cancelled) return;
    failed = error;
    onError(error);
    void cancel();
  }
  try {
    stream = canvas.captureStream(fps);
    recorder = new Recorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: Math.round((16000000 * canvas.width) / 1920),
    });
    recorder.ondataavailable = (event) => {
      if (!event.data?.size || cancelled) return;
      queue = queue
        .then(async () => {
          for (let start = 0; start < event.data.size; start += 8 * 1024 * 1024)
            await request(id + "/chunk?index=" + index++, {
              method: "POST",
              headers: { "Content-Type": "application/octet-stream" },
              body: event.data.slice(start, start + 8 * 1024 * 1024),
              signal: controller.signal,
            });
        })
        .catch((error) => {
          fail(error);
          throw error;
        });
      queue.catch(() => {});
    };
    recorder.onerror = (event) =>
      fail(Error(event.error?.message || "La capture a rencontré une erreur."));
    recorder.onstop = () => {
      complete();
      if (!requestedStop && !cancelled)
        fail(
          Error(
            "La capture a été interrompue par le navigateur. Aucun export automatique n’a été lancé.",
          ),
        );
    };
    recorder.start(1000);
    globalThis.addEventListener?.("pagehide", onPageHide);
  } catch (error) {
    await cancel();
    throw error;
  }
  return {
    remote: true,
    cancel,
    stop() {
      if (stopPromise) return stopPromise;
      requestedStop = true;
      stopPromise = (async () => {
        if (failed) throw failed;
        if (cancelled) throw Error("Enregistrement annulé.");
        recorder.stop();
        await ended;
        stream.getTracks().forEach((t) => t.stop());
        await queue;
        if (failed) throw failed;
        const result = await request(id + "/finish", {
          method: "POST",
          signal: controller.signal,
        });
        detach();
        return {
          ...result,
          url: "/__frame_presentation__/" + id + "/download",
        };
      })().catch(async (error) => {
        await cancel();
        throw error;
      });
      return stopPromise;
    },
  };
}
