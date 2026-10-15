import test from "node:test";
import assert from "node:assert/strict";
import { richMarkdown } from "../src/conductorRichText.js";
import { renderConductor } from "../src/notebookMarkdown.js";
import { normalizeConductor } from "../src/videoWorkflow.js";
const text = (value) => ({ nodeType: 3, textContent: value });
const node = (tag, children = [], attrs = {}) => ({
  nodeType: 1,
  tagName: tag.toUpperCase(),
  childNodes: children,
  children: children.filter((c) => c.nodeType === 1),
  getAttribute: (key) => attrs[key] || null,
});
test("visual document serializes headings, lists, formatting and image references without HTML", () => {
  const source = richMarkdown(
    node("div", [
      node("h2", [text("Une règle")]),
      node("p", [
        node("strong", [text("Important")]),
        text(" et "),
        node("mark", [text("visible")], { "data-highlight": "blue" }),
      ]),
      node("ul", [node("li", [text("Un")]), node("li", [text("Deux")])]),
      node("p", [
        node("img", [], { "data-frame-image": "image-1", alt: "Exemple" }),
      ]),
    ]),
  );
  assert.match(source, /## Une règle/);
  assert.match(source, /\*\*Important\*\* et ==blue\|visible==/);
  assert.match(source, /- Un\n- Deux/);
  assert.match(source, /!\[Exemple\]\(frame-image:image-1\)/);
  assert.doesNotMatch(source, /<\/?[a-z]/);
});
test("changing a highlight color preserves surrounding highlighted text", () => {
  const source = richMarkdown(
    node("div", [
      node(
        "mark",
        [
          text("Avant "),
          node("mark", [text("mot")], { "data-highlight": "blue" }),
          text(" après"),
        ],
        { "data-highlight": "yellow" },
      ),
    ]),
  );
  assert.equal(source, "==yellow|Avant ====blue|mot====yellow| après==");
  const html = renderConductor(source);
  assert.match(html, /data-highlight="blue">mot<\/mark>/);
  assert.match(html, /data-highlight="yellow">Avant /);
});
test("conductor image rendering accepts only known local images and preserves size and placement", () => {
  const images = [
    {
      id: "picture",
      src: "data:image/png;base64,YQ==",
      alt: "Illustration",
      width: 35,
      align: "right",
    },
  ];
  const html = renderConductor(
    "Texte avant\n\n![](frame-image:picture)\n\nTexte après",
    images,
  );
  assert.match(html, /width:35%/);
  assert.match(html, /float:right/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /Texte après/);
  assert.doesNotMatch(
    renderConductor("![](https://example.com/tracker.png)", images),
    /<img/,
  );
  const old = normalizeConductor({
    sequences: [
      { id: "part", script: "Ancien texte", images: [{ src: images[0].src }] },
    ],
  }).sequences[0];
  assert.match(old.script, /frame-image:legacy-0/);
  assert.equal(old.images.length, 1);
  const removed = normalizeConductor({
    sequences: [{ ...old, script: "Image retirée du texte" }],
  }).sequences[0];
  assert.equal(removed.script, "Image retirée du texte");
});

test("visual tables retain their cells in Markdown", () => {
  const cell = (value) => node("td", [text(value)]),
    rows = [
      node("tr", [cell("Type"), cell("Octets")]),
      node("tr", [cell("long"), cell("8")]),
    ];
  const table = node("table", rows);
  table.querySelectorAll = () => rows;
  const source = richMarkdown(node("div", [table]));
  assert.equal(source, "| Type | Octets |\n| --- | --- |\n| long | 8 |");
  assert.match(renderConductor(source), /<td>long<\/td>/);
});
