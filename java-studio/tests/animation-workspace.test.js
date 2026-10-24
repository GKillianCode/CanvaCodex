import test from "node:test";
import assert from "node:assert/strict";
import {
  timelineView,
  timelineTime,
  snapTimelineTime,
  orderedTracks,
  reorderTrack,
} from "../src/animationTimelineView.js";
import { normalizeAnimation } from "../src/animationModel.js";
test("padded time coordinates retain exact scene times at every zoom", () => {
  for (const zoom of [25, 100, 400, 1600]) {
    const v = timelineView(60, zoom, true);
    for (const t of [0, 33, 60])
      assert.ok(
        Math.abs(
          timelineTime(
            10 + ((t + v.offset) / v.span) * 1000,
            10,
            1000,
            v.span,
            v.offset,
          ) - t,
        ) < 1e-8,
      );
    assert.ok(v.offset > 0);
    assert.ok(v.span - v.offset > 60);
  }
});
test("magnet threshold uses visible pixels and supports nonintegral frames", () => {
  assert.equal(snapTimelineTime(5.1, 5, 60), 5);
  assert.equal(snapTimelineTime(5.2, 5, 60), 5.2);
  assert.equal(snapTimelineTime(5.1, 5, 600), 5.1);
});
test("visual order appends new objects, ignores removed objects, survives normalization", () => {
  const keys = ["text1", "shape1", "text2", "text3"];
  const order = reorderTrack(keys, "text3", "text2");
  assert.deepEqual(order, ["text1", "shape1", "text3", "text2"]);
  assert.deepEqual(orderedTracks([...keys, "text4"], order), [
    ...order,
    "text4",
  ]);
  assert.deepEqual(orderedTracks(["text2", "text3"], order), [
    "text3",
    "text2",
  ]);
  assert.deepEqual(
    normalizeAnimation({ timelineOrder: order }).timelineOrder,
    order,
  );
  assert.deepEqual(keys, ["text1", "shape1", "text2", "text3"]);
});

import { validEditorView } from "../src/useEditorViewState.js";
test("malformed configuration is refused before restoring UI", () => {
  assert.equal(
    validEditorView({ scenes: { test: { selection: { length: 4 } } } }),
    false,
  );
  assert.equal(
    validEditorView({ scenes: { test: { timeline: { expanded: "broken" } } } }),
    false,
  );
  assert.equal(validEditorView({ inspector: { section: "unknown" } }), false);
  assert.equal(
    validEditorView({
      timeline: { panel: "audio" },
      scenes: {
        test: { selection: ["image1"], timeline: { expanded: ["image1"] } },
      },
      inspector: {
        section: "slide",
        drawers: { scene: true },
        scrolls: { slide: 100 },
      },
    }),
    true,
  );
});
