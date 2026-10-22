import test from "node:test";
import assert from "node:assert/strict";
import {
  createDesign,
  normalizeDesign,
  designElement,
  duplicateDesignElements,
  paginateDesignText,
  sampleDesign,
} from "../src/designModel.js";
import { exportDesignSvg, designPrintHtml } from "../src/designExport.js";
import { designRepository } from "../src/designRepository.js";
import { workspaceTools } from "../src/workflowNavigation.js";
import {
  applicationFromHash,
  applicationHash,
} from "../src/applicationRoutes.js";
test("new ateliers have independent typed documents and stable document routes; Notes stays first", () => {
  for (const kind of ["vector", "layout"]) {
    const d = createDesign(kind);
    assert.equal(normalizeDesign(d, kind).kind, kind);
    assert.throws(() =>
      normalizeDesign(d, kind === "layout" ? "vector" : "layout"),
    );
    assert.equal(applicationFromHash(applicationHash(kind)), kind);
    assert.equal(applicationFromHash(applicationHash(kind) + "/" + d.id), kind);
  }
  assert.equal(workspaceTools[0].id, "notes");
  assert.equal(createDesign("vector").transparent, true);
  assert.equal(createDesign("layout").transparent, false);
});
test("import normalizes unsafe values and export escapes all user text, never raw markup or external images", () => {
  const d = createDesign("vector", "<script>alert(1)</script>");
  d.pages[0].elements = [
    designElement("text", { text: '<img src=x onerror="bad()"> & références' }),
    designElement("image", { src: "https://example.com/tracker.png" }),
    designElement("shape", { fill: "url(evil)", w: -1 }),
  ];
  const restored = normalizeDesign(d),
    svg = exportDesignSvg(restored);
  assert.ok(!svg.includes("<script>"));
  assert.ok(!svg.includes("<img"));
  assert.match(svg, /&lt;img/);
  assert.ok(!svg.includes("https://example.com"));
  assert.equal(restored.pages[0].elements[2].w, 4);
  assert.equal(restored.pages[0].elements[1].src, "");
  assert.throws(() => normalizeDesign({ ...d, pages: [] }));
  assert.throws(() =>
    normalizeDesign({ ...d, pages: [{ elements: Array(301).fill({}) }] }),
  );
});
test("continuous text creates bounded pages/columns without losing words or touching existing pages", () => {
  const d = createDesign("layout");
  d.columns = 2;
  const words = Array.from({ length: 1600 }, (_, i) => "mot" + i),
    text = words.join(" "),
    pages = paginateDesignText(
      d,
      text,
      "body",
      (s, size) => s.length * size * 0.5,
    );
  assert.ok(pages.length > 1);
  assert.equal(d.pages.length, 1);
  const output = pages
    .flatMap((p) => p.elements.map((e) => e.text))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  assert.equal(output, text);
  for (const p of pages)
    for (const e of p.elements) {
      assert.ok(e.x >= d.margin);
      assert.ok(e.x + e.w <= d.width - d.margin + 0.01);
      assert.ok(e.y + e.h <= d.height - d.margin + 0.01);
    }
  d.margin = 1000;
  assert.throws(() => paginateDesignText(d, "texte"));
});
test("duplicate preserves internal group relationships without joining the source group", () => {
  const a = designElement("shape", { group: "old" }),
    b = designElement("text", { group: "old" }),
    copies = duplicateDesignElements([a, b]);
  assert.notEqual(copies[0].id, a.id);
  assert.equal(copies[0].group, copies[1].group);
  assert.notEqual(copies[0].group, a.group);
  assert.equal(copies[0].x, a.x + 24);
});
test("freeform curves, non-destructive masks and multipage PDF furniture are serialized", () => {
  const d = sampleDesign("vector"),
    base = designElement("shape"),
    cut = designElement("shape", { shape: "circle" }),
    path = designElement("shape", {
      shape: "freeform",
      nodes: [
        { x: 0, y: 0, outX: 30, outY: 50 },
        { x: 100, y: 100, inX: 60, inY: 90 },
      ],
      closed: false,
    });
  base.cutouts = [cut.id];
  d.pages[0].elements = [base, cut, path];
  const svg = exportDesignSvg(d);
  assert.match(svg, /<mask /);
  assert.match(svg, / C 30 50 60 90 100 100/);
  assert.equal((svg.match(/data-design-id=/g) || []).length, 3);
  const layout = sampleDesign("layout"),
    html = designPrintHtml(layout);
  assert.equal((html.match(/<section\b/g) || []).length, 2);
  assert.match(html, /2 \/ 2/);
  assert.match(html, /@page sheet0\{size:/);
  assert.ok(!html.includes("design-guides"));
});
test("document repository separates ateliers, rejects stale revisions and only loads document bodies on demand", async () => {
  const map = new Map(),
    reads = [],
    repo = {
      getSetting: async (k) => {
        reads.push(k);
        return structuredClone(map.get(k));
      },
      setSetting: async (k, v) => map.set(k, structuredClone(v)),
    },
    vector = designRepository(repo, "vector"),
    layout = designRepository(repo, "layout"),
    d = createDesign("vector");
  let revision = await vector.save(d);
  reads.length = 0;
  assert.equal((await vector.list()).length, 1);
  assert.ok(reads.every((k) => k.endsWith(":index")));
  assert.equal((await layout.list()).length, 0);
  const loaded = await vector.load(d.id);
  assert.equal(loaded.revision, revision);
  d.name = "Modifié";
  revision = await vector.save(d, revision);
  await assert.rejects(() =>
    vector.save({ ...d, name: "Ancien" }, loaded.revision),
  );
  assert.equal((await vector.load(d.id)).document.name, "Modifié");
  await vector.remove(d.id);
  assert.equal((await vector.list()).length, 0);
  await assert.rejects(() => vector.load(d.id));
});
test("copies of cutouts refer to the copied sources rather than the original drawing", () => {
  const base = designElement("shape"),
    cut = designElement("shape");
  base.cutouts = [cut.id];
  const copies = duplicateDesignElements([base, cut]);
  assert.equal(copies[0].cutouts[0], copies[1].id);
  assert.notEqual(copies[0].cutouts[0], cut.id);
});
test("linked design files cannot overwrite a file belonging to another atelier", async () => {
  const { ProjectFile } = await import("../src/projectFile.js");
  let writes = 0;
  const handle = {
    getFile: async () => ({
      text: async () =>
        JSON.stringify({ format: "frame-workspace", kind: "slides" }),
    }),
    createWritable: async () => ({
      write: async () => writes++,
      close: async () => {},
    }),
  };
  const file = new ProjectFile(
    { showSaveFilePicker: async () => handle },
    async () => {},
  );
  await assert.rejects(
    () => file.save(JSON.stringify(createDesign("layout")), "layout-doc"),
    /wrong-kind/,
  );
  assert.equal(writes, 0);
});

test("cropped exports retain only selected roots and their cutters, including rotation and stroke", async () => {
  const { exportDesignRegion, designExportArea } =
    await import("../src/designExport.js");
  const d = createDesign("vector");
  const a = designElement("shape", {
    id: "a",
    x: 500,
    y: 400,
    w: 100,
    h: 50,
    rotation: 90,
    outlined: true,
    strokeWidth: 10,
  });
  const cutter = designElement("shape", {
    id: "cut",
    x: 540,
    y: 420,
    w: 20,
    h: 20,
  });
  a.cutouts = ["cut"];
  d.pages[0].elements = [
    a,
    cutter,
    designElement("text", { text: "unselected", x: 0, y: 0 }),
  ];
  const result = exportDesignRegion(d, 0, {
    scope: "selection",
    selection: ["a"],
  });
  assert.equal(result.w, 60);
  assert.equal(result.h, 110);
  assert.equal(result.elements.length, 2);
  assert.match(result.svg, /<mask/);
  assert.ok(!result.svg.includes("unselected"));
  assert.throws(() =>
    designExportArea(d, 0, { scope: "selection", selection: [] }),
  );
  const margin = designExportArea(d, 0, {
    scope: "selection",
    selection: ["a"],
    padding: 12,
  });
  assert.equal(margin.w, result.w + 24);
  assert.equal(margin.h, result.h + 24);
});
test("code and tables keep their content, safe tokens and transparency through save/export", () => {
  const d = createDesign("layout");
  d.pages[0].elements = [
    designElement("text", {
      code: true,
      language: "java",
      text: "int count = 42; // <script>",
      style: "code",
    }),
    designElement("table", {
      rows: 2,
      columns: 2,
      text: "A\tB\nC\tD",
      filled: false,
      outlined: false,
    }),
  ];
  const saved = normalizeDesign(JSON.parse(JSON.stringify(d))),
    svg = exportDesignSvg(saved);
  assert.equal(saved.pages[0].elements[1].type, "table");
  assert.equal(saved.pages[0].elements[0].language, "java");
  assert.match(svg, /fill="#7940a0">int/);
  assert.match(svg, /&lt;script&gt;/);
  assert.match(svg, />D<\/text>/);
  assert.ok(!svg.includes("<script>"));
});

test('named styles, all Frame fonts and mixed page dimensions survive normalization and PDF generation', async()=>{
 const {designPageSize,designColumns,rebalanceColumns}=await import('../src/designModel.js');
 const d=createDesign('layout');d.styles['style-custom']={name:'Titre personnel',font:'dm-sans',weight:600,size:33,leading:1.2};d.pages[0].elements=[designElement('text',{style:'style-custom',font:'dm-sans',weight:600})];d.pages.push({...d.pages[0],id:'landscape',width:1123,height:794,elements:[]});
 d.columns=3;d.columnWeights=rebalanceColumns([1,1,1],0,60);const n=normalizeDesign(d);assert.equal(n.styles['style-custom'].name,'Titre personnel');assert.equal(n.pages[0].elements[0].weight,600);assert.equal(designPageSize(n,1).width,1123);const cols=designColumns(n),total=cols.reduce((sum,c)=>sum+c.w,0);assert.ok(Math.abs(cols[0].w/total-.6)<1e-8);assert.ok(cols.every(c=>c.w>0));const html=designPrintHtml(n);assert.match(html,/@page sheet1/);assert.match(html,/font-family="&quot;DM Sans&quot;, sans-serif"/);
});
