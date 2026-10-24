import { randomBytes } from "node:crypto";
import { mkdtemp, open, rm } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeVideoFile } from "./video-encoder.mjs";
// The capture is appended directly to disk. No total-byte or duration threshold
// ends a presentation; only the explicit finish request starts transcoding.
export function presentationRecordings({
  token,
  binary,
  available = () => true,
  encoder = encodeVideoFile,
}) {
  let job;
  const json = (res, status, data) => {
    if (!res.destroyed) {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    }
  };
  async function dispose(current) {
    if (!current) return;
    if (job === current) job = null;
    clearTimeout(current.expiry);
    current.controller.abort();
    await current.handle?.close().catch(() => {});
    if (current.folder)
      await rm(current.folder, { recursive: true, force: true });
  }
  async function handle(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    let current,
      creating = false;
    try {
      const host = req.headers.host || "",
        hostname = new URL("http://" + host).hostname,
        url = new URL(req.url, "http://" + host),
        parts = url.pathname.split("/").filter(Boolean);
      if (
        !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
          req.socket.remoteAddress,
        ) ||
        !["localhost", "127.0.0.1", "[::1]"].includes(hostname) ||
        req.headers["sec-fetch-site"] === "cross-site" ||
        (req.headers.origin &&
          !["http://" + host, "https://" + host].includes(req.headers.origin))
      )
        return json(res, 403, { error: "Accès local uniquement." });
      const download = req.method === "GET" && parts[1] === "download";
      if (!download && req.headers["x-frame-video-token"] !== token)
        return json(res, 403, { error: "Session d’enregistrement expirée." });
      if (req.method === "POST" && parts.length === 0) {
        if ((job && !job.completed) || !available())
          return json(res, 409, {
            error: "Un enregistrement ou export est déjà en cours.",
          });
        const previous = job;
        const format = url.searchParams.get("format");
        if (!["mp4", "mov", "mkv"].includes(format))
          return json(res, 400, { error: "Format de présentation inconnu." });
        current = job = {
          id: randomBytes(24).toString("hex"),
          format,
          controller: new AbortController(),
          locked: true,
          next: 0,
          bytes: 0,
        };
        creating = true;
        if (previous) await dispose(previous);
        current.folder = await mkdtemp(join(tmpdir(), "frame-presentation-"));
        current.input = join(current.folder, "capture.webm");
        current.output = join(current.folder, "presentation." + format);
        current.handle = await open(current.input, "wx", 0o600);
        current.locked = false;
        return json(res, 201, { id: current.id });
      }
      current = job;
      if (!current || parts[0] !== current.id)
        return json(res, 404, { error: "Enregistrement introuvable." });
      if (req.method === "DELETE") {
        current.controller.abort();
        if (current.idle) await current.idle;
        await dispose(current);
        return json(res, 200, { cancelled: true });
      }
      if (download) {
        if (!current.completed)
          return json(res, 409, { error: "Le fichier n’est pas encore prêt." });
        res.setHeader("Content-Type", current.encoded.mime);
        res.setHeader("Content-Length", current.encoded.size);
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="frame-presentation.' + current.format + '"',
        );
        await pipeline(createReadStream(current.output), res);
        return;
      }
      if (current.locked)
        return json(res, 409, { error: "Une opération est déjà en cours." });
      if (current.completed)
        return json(res, 409, { error: "Cet enregistrement est terminé." });
      if (current.failed)
        return json(res, 409, {
          error:
            "Capture interrompue. Annule cette session avant de réessayer.",
        });
      current.locked = true;
      current.idle = new Promise((resolve) => {
        current.release = resolve;
      });
      try {
        if (req.method === "POST" && parts[1] === "chunk") {
          if (Number(url.searchParams.get("index")) !== current.next)
            throw Error("Ordre de capture invalide.");
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 16 * 1024 * 1024)
              throw Error("Fragment de capture trop volumineux.");
            await current.handle.writeFile(chunk);
          }
          if (!size) throw Error("Fragment vide.");
          current.bytes += size;
          current.next++;
          return json(res, 200, { next: current.next });
        }
        if (req.method === "POST" && parts[1] === "finish") {
          await current.handle.close();
          current.handle = null;
          if (!current.bytes) throw Error("Aucune vidéo enregistrée.");
          current.encoded = await encoder(
            current.input,
            current.output,
            current.format,
            {
              binary,keepAudio:true,
              signal: current.controller.signal,
              maxBytes: Infinity,
              timeout: null,
              preset: "veryfast",
            },
          );
          current.completed = true;
          // Only completed downloads expire; there is no timer on a live recording.
          current.expiry = setTimeout(
            () => {
              void dispose(current).catch(() => {});
            },
            6 * 60 * 60 * 1000,
          );
          current.expiry.unref?.();
          return json(res, 200, {
            size: current.encoded.size,
            name: "frame-presentation." + current.format,
            url: "/__frame_presentation__/" + current.id + "/download",
          });
        }
        return json(res, 404, { error: "Route inconnue." });
      } finally {
        current.locked = false;
        current.release();
        current.idle = null;
      }
    } catch (error) {
      if (creating && current) await dispose(current).catch(() => {});
      if (current && job === current && !current.completed) {
        current.failed = true;
      }
      if (!res.headersSent)
        json(res, 500, {
          error: error.message || "Enregistrement local impossible.",
        });
      else res.destroy();
    }
  }
  return {
    handle,
    get active() {
      return !!job && !job.completed;
    },
    async close() {
      const current = job;
      current?.controller.abort();
      if (current?.idle) await current.idle;
      await dispose(current);
    },
  };
}
