import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assetLibraryPlugin } from "../scripts/asset-library-plugin.mjs";
import { normalizeThemes } from "../src/themes.js";
test("local asset files persist atomically, reject stale writes and preserve a backup", async () => {
  const directory = await mkdtemp(join(tmpdir(), "frame-assets-test-"));
  let middleware;
  const plugin = assetLibraryPlugin({ directory });
  plugin.configResolved({ root: directory });
  plugin.configureServer({
    middlewares: {
      use(prefix, handler) {
        middleware = handler;
      },
    },
  });
  const server = http.createServer((req, res) => middleware(req, res));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = "http://127.0.0.1:" + server.address().port;
  try {
    const initial = await (await fetch(url + "/themes")).json();
    assert.equal(initial.revision, "empty");
    const value = {
        format: "frame-theme-library",
        version: 1,
        themes: [{ ...normalizeThemes()[0], id: "orange", name: "Orange" }],
        removed: [],
      },
      headers = {
        "Content-Type": "application/json",
        "X-Frame-Assets-Token": initial.token,
        "If-Match": "empty",
      };
    assert.equal(
      (
        await fetch(url + "/themes", {
          method: "PUT",
          headers: { ...headers, "X-Frame-Assets-Token": "wrong" },
          body: JSON.stringify(value),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(url + "/themes", {
          headers: { Origin: "https://example.com" },
        })
      ).status,
      403,
    );
    const writes = await Promise.all(
      [1, 2].map(() =>
        fetch(url + "/themes", {
          method: "PUT",
          headers,
          body: JSON.stringify(value),
        }),
      ),
    );
    assert.deepEqual(writes.map((v) => v.status).sort(), [200, 409]);
    const current = await (await fetch(url + "/themes")).json();
    assert.equal(
      JSON.parse(await readFile(join(directory, "themes.json"), "utf8"))
        .themes[0].name,
      "Orange",
    );
    assert.equal(
      (
        await fetch(url + "/themes", {
          headers: { "If-None-Match": current.revision },
        })
      ).status,
      304,
    );
    value.themes[0].name = "Orange modifié";
    const saved = await fetch(url + "/themes", {
      method: "PUT",
      headers: { ...headers, "If-Match": current.revision },
      body: JSON.stringify(value),
    });
    assert.equal(saved.status, 200);
    assert.equal(
      JSON.parse(await readFile(join(directory, "themes.json.bak"), "utf8"))
        .themes[0].name,
      "Orange",
    );
    assert.equal(
      JSON.parse(await readFile(join(directory, "themes.json"), "utf8"))
        .themes[0].name,
      "Orange modifié",
    );
    const old = await (await fetch(url + "/components")).json();
    assert.equal(old.data.components.length, 0);
  } finally {
    await new Promise((r) => server.close(r));
    await rm(directory, { recursive: true, force: true });
  }
});
