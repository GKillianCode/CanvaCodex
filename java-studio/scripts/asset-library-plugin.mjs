import { randomBytes, createHash } from "node:crypto";
import {
  readFile,
  writeFile,
  mkdir,
  rename,
  copyFile,
  stat,
  rm,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { normalizeComponents } from "../src/componentsLibrary.js";
import { normalizeThemes } from "../src/themes.js";
const max = 64 * 1024 * 1024;
export const assetRevision = (text) =>
  createHash("sha256").update(text).digest("hex");
export function normalizeAssetFile(kind, raw) {
  if (
    !raw ||
    raw.version !== 1 ||
    raw.format !==
      "frame-" + (kind === "themes" ? "theme" : "component") + "-library"
  )
    throw Error("Bibliothèque invalide.");
  const list = raw[kind];
  if (!Array.isArray(list) || list.length > 100)
    throw Error("Bibliothèque trop volumineuse.");
  const normalized =
    kind === "themes"
      ? list.length
        ? normalizeThemes(list)
        : []
      : normalizeComponents(list);
  if (normalized.length !== list.length)
    throw Error("Éléments invalides dans la bibliothèque.");
  return {
    format: raw.format,
    version: 1,
    [kind]: normalized,
    ...(kind === "themes"
      ? {
          removed: Array.isArray(raw.removed)
            ? raw.removed
                .filter((v) => typeof v === "string" && v.length <= 100)
                .slice(-1000)
            : [],
        }
      : {}),
  };
}
export function assetLibraryPlugin({
  directory = process.env.FRAME_ASSETS_DIR,
} = {}) {
  const token = randomBytes(32).toString("hex");
  let root,
    tail = Promise.resolve();
  const cache = new Map();
  const empty = (kind) => ({
    format: "frame-" + (kind === "themes" ? "theme" : "component") + "-library",
    version: 1,
    [kind]: [],
    ...(kind === "themes" ? { removed: [] } : {}),
  });
  async function read(kind) {
    const file = join(root, kind + ".json");
    try {
      const st = await stat(file);
      if (st.size > max) throw Error("Bibliothèque trop volumineuse.");
      const signature = st.ino + ":" + st.size + ":" + st.mtimeMs;
      if (cache.get(kind)?.signature === signature)
        return cache.get(kind).value;
      const text = await readFile(file, "utf8"),
        value = {
          data: normalizeAssetFile(kind, JSON.parse(text)),
          revision: assetRevision(text),
        };
      cache.set(kind, { signature, value });
      return value;
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      return { data: empty(kind), revision: "empty" };
    }
  }
  function install(server) {
    server.middlewares.use("/__frame_assets__", async (req, res) => {
      const json = (status, value) => {
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(value));
      };
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
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
          return json(403, { error: "Accès local uniquement." });
        const kind = new URL(req.url, "http://" + host).pathname.slice(1);
        if (!["themes", "components"].includes(kind))
          return json(404, { error: "Bibliothèque inconnue." });
        if (req.method === "GET") {
          const current = await read(kind);
          res.setHeader("ETag", current.revision);
          if (req.headers["if-none-match"] === current.revision) {
            res.statusCode = 304;
            return res.end();
          }
          return json(200, {
            ...current,
            token,
            path: join(root, kind + ".json"),
          });
        }
        if (req.method !== "PUT")
          return json(405, { error: "Méthode refusée." });
        if (req.headers["x-frame-assets-token"] !== token)
          return json(403, {
            error: "Session expirée. Actualise la bibliothèque.",
          });
        if (!String(req.headers["content-type"]).startsWith("application/json"))
          return json(415, { error: "JSON attendu." });
        const chunks = [];
        let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > max)
            return json(413, { error: "Bibliothèque supérieure à 64 Mo." });
          chunks.push(chunk);
        }
        const data = normalizeAssetFile(
            kind,
            JSON.parse(Buffer.concat(chunks).toString("utf8")),
          ),
          text = JSON.stringify(data, null, 2);
        if (Buffer.byteLength(text) > max)
          return json(413, { error: "Bibliothèque supérieure à 64 Mo." });
        const write = async () => {
          const current = await read(kind);
          if (req.headers["if-match"] !== current.revision)
            return json(409, {
              error: "Le fichier a changé. Actualise avant d’enregistrer.",
            });
          await mkdir(root, { recursive: true, mode: 0o700 });
          const file = join(root, kind + ".json"),
            temporary = file + "." + randomBytes(8).toString("hex") + ".tmp";
          if (current.revision !== "empty") await copyFile(file, file + ".bak");
          try {
            await writeFile(temporary, text, { mode: 0o600, flag: "wx" });
            await rename(temporary, file);
          } finally {
            await rm(temporary, { force: true }).catch(() => {});
          }
          cache.delete(kind);
          json(200, { data, revision: assetRevision(text), token, path: file });
        };
        const pending = tail.then(write);
        tail = pending.catch(() => {});
        await pending;
      } catch (e) {
        if (!res.headersSent)
          json(500, { error: e.message || "Fichier local inaccessible." });
        else res.destroy();
      }
    });
  }
  return {
    name: "frame-local-asset-library",
    configResolved(config) {
      root = resolve(directory || join(config.root, "..", ".frame-data"));
    },
    configureServer: install,
    configurePreviewServer: install,
  };
}
