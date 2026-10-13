import test from "node:test";
import assert from "node:assert/strict";
import { renderNotebook } from "../src/notebookMarkdown.js";
import { videoRoute } from "../src/videoProjects.js";
test("dedicated notebook route preserves video identity on reload", () => {
  assert.deepEqual(videoRoute("#/videos/abc-123/notes"), {
    videoId: "abc-123",
    app: null,
    creationId: null,
    notes: true,
  });
  assert.equal(videoRoute("#/videos/abc-123/notes/other"), null);
});
test("all six heading levels render with content and raw Markdown stays unchanged", () => {
  const text = Array.from(
    { length: 6 },
    (_, i) => "#".repeat(i + 1) + " Titre " + (i + 1),
  ).join("\n\n");
  const html = renderNotebook(text);
  for (let i = 1; i <= 6; i++)
    assert.match(html, new RegExp("<h" + i + ">Titre " + i + "</h" + i + ">"));
  assert.match(text, /###### Titre 6/);
});
test("fenced Java code has safe syntax tokens and unknown languages stay readable", () => {
  const html = renderNotebook(
    '```java\nint count = 42;\nString text = "<script>";\n```',
  );
  assert.match(html, /token keyword/);
  assert.match(html, /token number/);
  assert.match(html, /&lt;script/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(
    renderNotebook("```unknown\n<script>unsafe</script>\n```"),
    /&lt;script&gt;/,
  );
});
test("notebook refuses active HTML, image requests and unsafe links", () => {
  const html = renderNotebook(
    "<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n![image](https://example.com/private.png)",
  );
  assert.doesNotMatch(html, /<script|<img|href="javascript/);
});
