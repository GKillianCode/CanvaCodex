import { randomBytes } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeVideoFile, encodingFormats } from "./video-encoder.mjs";

// Bounded browser memory: spool PNG batches to a private temporary folder.
export function videoFrameJobs({ token, binary, available = () => true }) {
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
    if (current.disposing) return current.disposing;
    clearTimeout(current?.timer);
    current?.controller.abort();
    current.disposing = current.folder
      ? rm(current.folder, { recursive: true, force: true })
      : Promise.resolve();
    await current.disposing;
  }
  function touch(current) {
    clearTimeout(current.timer);
    current.timer = setTimeout(() => {
      if (!current.locked) void dispose(current);
      else touch(current);
    }, 120000);
    current.timer.unref?.();
  }
  async function body(req, max) {
    const chunks = [];
    let bytes = 0;
    for await (const c of req) {
      bytes += c.length;
      if (bytes > max) throw Error("Lot d’images trop volumineux.");
      chunks.push(c);
    }
    return Buffer.concat(chunks);
  }
  async function handle(req, res) {
    let current, abort;
    res.setHeader("Cache-Control", "no-store");
    try {
      const host = req.headers.host || "",
        hostname = new URL("http://" + host).hostname;
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
      if (req.headers["x-frame-video-token"] !== token)
        return json(res, 403, {
          error: "Session d’encodage expirée. Réessaie.",
        });
      const url = new URL(req.url, "http://" + host),
        parts = url.pathname.split("/").filter(Boolean);
      if (req.method === "POST" && parts.length === 0) {
        if (job || !available())
          return json(res, 409, { error: "Un autre export est en cours." });
        // Reserve synchronously before reading the request.
        current = job = {
          id: randomBytes(24).toString("hex"),
          controller: new AbortController(),
          locked: true,
        };
        const spec = JSON.parse((await body(req, 2048)).toString());
        if (
          !Object.hasOwn(encodingFormats, spec.format) ||
          !Number.isInteger(spec.width) ||
          spec.width < 16 ||
          spec.width > 2560 ||
          !Number.isInteger(spec.height) ||
          spec.height < 16 ||
          spec.height > 1440 ||
          !Number.isInteger(spec.fps) ||
          spec.fps < 1 ||
          spec.fps > 60 ||
          !Number.isInteger(spec.count) ||
          spec.count < 1 ||
          spec.count > 36000 ||
          spec.count / spec.fps > 600
        )
          throw Error("Paramètres d’export invalides.");
        Object.assign(current, {
          format: spec.format,
          width: spec.width,
          height: spec.height,
          fps: spec.fps,
          count: spec.count,
          next: 0,
          bytes: 0,
          folder: await mkdtemp(join(tmpdir(), "frame-animation-")),
        });
        current.locked = false;
        touch(current);
        return json(res, 201, { id: current.id });
      }
      current = job;
      if (!current || parts[0] !== current.id) {
        current = null;
        return req.method === "DELETE"
          ? json(res, 200, { cancelled: true })
          : json(res, 404, { error: "Export expiré. Relance l’export." });
      }
      if (req.method === "DELETE") {
        if (current.locked) {
          const target = current;
          current = null;
          target.controller.abort();
          await target.idle;
          await dispose(target);
          return json(res, 200, { cancelled: true });
        }
        await dispose(current);
        return json(res, 200, { cancelled: true });
      }
      if (current.locked) {
        current = null;
        return json(res, 409, { error: "Un lot est déjà en cours." });
      }
      current.locked = true;
      current.idle = new Promise(resolve => { current.release = resolve; });
      touch(current);
      abort = () => {
        if (!res.writableEnded) current.controller.abort();
      };
      req.once("aborted", abort);
      res.once("close", abort);
      if (req.method === "POST" && parts[1] === "batch") {
        if (Number(url.searchParams.get("start")) !== current.next)
          throw Error("Ordre des images invalide.");
        const data = await body(req, 32 * 1024 * 1024);
        let offset = 0,
          n = 0;
        while (offset < data.length) {
          if (current.controller.signal.aborted)
            throw new DOMException("Export annulé.", "AbortError");
          if (
            ++n > 12 ||
            offset + 4 > data.length ||
            current.next >= current.count
          )
            throw Error("Lot d’images invalide.");
          const size = data.readUInt32BE(offset);
          offset += 4;
          if (size < 33 || offset + size > data.length)
            throw Error("Image PNG invalide.");
          const png = data.subarray(offset, offset + size);
          offset += size;
          if (
            png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
            png.toString("ascii", 12, 16) !== "IHDR" ||
            png.readUInt32BE(16) !== current.width ||
            png.readUInt32BE(20) !== current.height
          )
            throw Error("Dimensions PNG invalides.");
          current.bytes += size;
          if (current.bytes > 4 * 1024 * 1024 * 1024)
            throw Error(
              "Les images temporaires dépassent 4 Go. Réduis la résolution ou la durée.",
            );
          await writeFile(
            join(
              current.folder,
              String(current.next).padStart(6, "0") + ".png",
            ),
            png,
            { flag: "wx", mode: 0o600 },
          );
          current.next++;
        }
        if (!n) throw Error("Lot vide.");
        return json(res, 200, { next: current.next });
      }
      if (req.method === "POST" && parts[1] === "finish") {
        if (current.next !== current.count)
          throw Error("Capture incomplète. Relance l’export.");
        const output = join(current.folder, "output." + current.format);
        const encoded = await encodeVideoFile(
          join(current.folder, "%06d.png"),
          output,
          current.format,
          {
            binary,
            signal: current.controller.signal,
            inputOptions: ["-framerate", String(current.fps)],
            maxBytes: 2 * 1024 * 1024 * 1024,
          },
        );
        res.setHeader("Content-Type", encoded.mime);
        res.setHeader("Content-Length", encoded.size);
        res.once("finish", () => {
          void dispose(current).catch(() => {});
        });
        await pipeline(createReadStream(output), res);
        await dispose(current);
        return;
      }
      throw Error("Route d’export inconnue.");
    } catch (e) {
      if (current) await dispose(current);
      if (!res.headersSent)
        json(res, e.name === "AbortError" ? 499 : 500, {
          error: e.message || "Export impossible.",
        });
      else res.destroy();
    } finally {
      if (abort) {
        req.off("aborted", abort);
        res.off("close", abort);
      }
      if (current && job === current) {
        current.locked = false;
        touch(current);
        if (current.controller.signal.aborted) await dispose(current);
      }
      current?.release?.();
    }
  }
  return {
    handle,
    get active() {
      return !!job;
    },
    close: () => dispose(job),
  };
}
