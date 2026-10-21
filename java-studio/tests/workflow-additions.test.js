import test from "node:test";
import assert from "node:assert/strict";
import {
  canvasSelectionCopy,
  pasteCanvasSelection,
  normalizeVideoCanvas,
} from "../src/videoCanvas.js";
import {
  normalizeMusicLibrary,
  musicCredits,
} from "../src/publicationMusic.js";
import { normalizePublication } from "../src/videoWorkflow.js";
test("copied canvas groups keep references and internal edges with fresh identities", () => {
  const canvas = normalizeVideoCanvas({
    nodes: [
      { id: "a", type: "video", videoId: "video-a", x: 0, y: 0 },
      { id: "b", type: "note", title: "Étape", x: 100, y: 0 },
      { id: "c", type: "note", x: 300, y: 0 },
    ],
    edges: [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ],
    groups: [
      {
        id: "g",
        title: "Groupe",
        color: "blue",
        members: ["a", "b"],
        bounds: { x: 0, y: 0, width: 200, height: 100 },
      },
    ],
  });
  const payload = canvasSelectionCopy(canvas, [], "g"),
    result = pasteCanvasSelection(canvas, payload, 32);
  assert.equal(result.canvas.nodes.length, 5);
  assert.equal(result.canvas.edges.length, 3);
  assert.equal(result.canvas.groups.length, 2);
  const a = result.canvas.nodes.find((n) => n.id === result.ids[0]);
  assert.equal(a.videoId, "video-a");
  assert.equal(a.x, 32);
  assert.notEqual(a.id, "a");
  assert.deepEqual(result.canvas.groups[1].members, result.ids);
  assert.equal(result.canvas.groups[1].color, "blue");
  assert.equal(canvas.nodes.length, 3);
});
test("music selection is per video while credits come from the shared catalog", () => {
  const library = normalizeMusicLibrary([
    {
      id: "one",
      title: " A ",
      artist: "Artiste",
      url: "https://example.org",
      license: "CC BY",
    },
    { id: "two", title: "B" },
    { id: "one", title: "Duplicate" },
    null,
  ]);
  const a = normalizePublication({ musicIds: ["one", "one", "bad id"] }),
    b = normalizePublication({ musicIds: ["two"] });
  assert.deepEqual(a.musicIds, ["one"]);
  assert.deepEqual(b.musicIds, ["two"]);
  assert.equal(
    musicCredits(library, a.musicIds),
    "A — Artiste\nhttps://example.org\nCC BY",
  );
  assert.equal(musicCredits(library, b.musicIds), "B");
  assert.equal(musicCredits(library, ["missing"]), "");
});
