import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { advancedDesign } from "../src/designExamples.js";
import {
  normalizeDesign,
  designElement,
  createDesign,
} from "../src/designModel.js";
import {
  exportDesignSvg,
  designPrintHtml,
  designTextLines,
} from "../src/designExport.js";
test("advanced projects are independent native documents with editable, valid relations", () => {
  for (const [kind, count] of [
    ["vector", 4],
    ["layout", 7],
  ]) {
    const d = advancedDesign(kind),
      again = advancedDesign(kind);
    assert.notEqual(d.id, again.id);
    assert.equal(d.pages.length, count);
    assert.equal(
      normalizeDesign(JSON.parse(JSON.stringify(d))).pages.length,
      count,
    );
    const ids = d.pages.flatMap((p) => p.elements.map((e) => e.id));
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.length > 180);
    for (const p of d.pages) {
      assert.ok(p.elements.length <= 300);
      for (const e of p.elements) {
        assert.ok(
          e.x >= 0 &&
            e.y >= 0 &&
            e.x + e.w <= p.width + 0.1 &&
            e.y + e.h <= p.height + 0.1,
          e.name,
        );
        for (const id of e.cutouts)
          assert.ok(p.elements.some((x) => x.id === id));
      }
      assert.doesNotMatch(
        exportDesignSvg(d, d.pages.indexOf(p)),
        /NaN|undefined/,
      );
    }
    const original = d.pages[0].elements[0].x;
    again.pages[0].elements[0].x += 10;
    assert.equal(d.pages[0].elements[0].x, original);
  }
});
test("dossier has a mixed orientation poster, editable code and table; atlas preserves paths and cutouts", () => {
  const vector = advancedDesign("vector"),
    layout = advancedDesign("layout");
  assert.ok(
    vector.pages.flatMap((p) => p.elements).some((e) => e.cutouts.length),
  );
  assert.ok(vector.pages.flatMap((p) => p.elements).some((e) => e.imageSrc));
  assert.ok(
    vector.pages.flatMap((p) => p.elements).filter((e) => e.nodes.length)
      .length > 10,
  );
  assert.ok(layout.pages[4].width > layout.pages[4].height);
  assert.match(designPrintHtml(layout), /@page sheet4\{size:297mm 210mm/);
  assert.ok(
    layout.pages.flatMap((p) => p.elements).some((e) => e.type === "table"),
  );
  assert.ok(layout.pages.flatMap((p) => p.elements).some((e) => e.code));
});
test("code and table exports keep selected font and weight", () => {
  const d = createDesign("vector");
  d.pages[0].elements = [
    designElement("text", {
      code: true,
      font: "jetbrains-mono",
      weight: 600,
      text: "int x = 1;",
    }),
    designElement("table", { font: "inter", weight: 700 }),
  ];
  const svg = exportDesignSvg(d);
  assert.match(svg, /JetBrains Mono/);
  assert.match(svg, /font-weight="600"/);
  assert.match(svg, /font-weight="700"/);
});
test("wrapping includes letter spacing rather than clipping spaced headings", () => {
  const base = designElement("text", {
    text: "a a a",
    font: "inter",
    size: 20,
    w: 70,
    h: 100,
  });
  assert.equal(designTextLines(base).length, 1);
  assert.ok(designTextLines({ ...base, letterSpacing: 0.5 }).length > 1);
});

test("downloadable projects match the live example content and contain portable preview fonts", () => {
  for (const [kind, name] of [
    ["vector", "atlas-jvm"],
    ["layout", "memoire-java"],
  ]) {
    const file = JSON.parse(
        readFileSync(
          new URL(
            "../public/examples/" + name + ".frame.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ),
      live = advancedDesign(kind);
    const signature = (d) =>
      d.pages.map((p) => ({
        name: p.name,
        width: p.width,
        height: p.height,
        text: p.elements
          .filter((e) => e.type === "text" || e.type === "table")
          .map((e) => [e.text, e.x, e.y, e.w, e.h, e.font, e.size]),
        objects: p.elements.length,
      }));
    assert.deepEqual(signature(file), signature(live));
    assert.match(
      readFileSync(
        new URL("../public/examples/" + name + ".svg", import.meta.url),
        "utf8",
      ),
      /SIL OPEN FONT LICENSE/,
    );
  }
});
