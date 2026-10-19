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

test('conductor Markdown renders semantic headings, separators and highlighted code languages safely',()=>{
 const html=renderConductor('## Une règle\n\nUn paragraphe\n\n---\n\n```java\nint n = 151;\n```\n\n```python\nprint(151)\n```\n\n<script>bad()</script>');
 assert.match(html,/<h2>Une règle<\/h2>/);assert.match(html,/<hr>/);assert.match(html,/language-java/);assert.match(html,/language-python/);assert.match(html,/class="token keyword"/);assert.ok(!html.includes('<script>'));
});

test("empty heading placeholders do not create phantom headings in reading", () => {
 const source=richMarkdown(node("div",[node("h2",[node("br")]),node("h2",[text("Titre réel")])]));
 assert.equal(source,"## Titre réel");
});

test("code serialization includes lines entered next to the original code node", () => {
 const code=node("code",[text("int valeur = 151;")]);
 code.className="language-java";
 const pre=node("pre",[code]);
 pre.querySelector=()=>code;
 code.innerText="int valeur = 151;";
 pre.innerText="int valeur = 151;\n\n// Suite saisie dans le même bloc\nSystem.out.println(valeur);\n";
 const source=richMarkdown(node("div",[pre]));
 assert.equal(source,"```java\nint valeur = 151;\n\n// Suite saisie dans le même bloc\nSystem.out.println(valeur);\n```");
 assert.match(renderConductor(source),/Suite saisie/);
});

test("multiple blank lines inside code survive document spacing normalization", () => {
 const code=node("code",[]);code.className="language-java";
 const pre=node("pre",[code]);pre.querySelector=()=>code;
 pre.innerText="int a = 1;\n\n\n\nSystem.out.println(a);\n";
 const source=richMarkdown(node("div",[node("p",[text("Avant")]),pre,node("p",[text("Après")])]));
 assert.ok(source.includes("int a = 1;\n\n\n\nSystem.out.println(a);"));
 assert.equal((source.match(/```java/g)||[]).length,1);
 assert.ok(source.endsWith("Après"));
});

test('private comments serialize to Markdown and render only in the editor',()=>{
 const source=richMarkdown(node('div',[node('p',[text('Visible avant')]),node('aside',[node('p',[text('Slide manquant '),node('strong',[text('à créer')])])],{'data-private-note':'true'}),node('p',[text('Visible après')])]));
 assert.match(source,/:::comment\nSlide manquant \*\*à créer\*\*\n:::/);
 const reader=renderConductor(source);assert.doesNotMatch(reader,/Slide manquant|à créer|private-note|:::comment/);assert.match(reader,/Visible avant/);assert.match(reader,/Visible après/);
 const editor=renderConductor(source,[],{includePrivate:true});assert.match(editor,/data-private-note="true"/);assert.match(editor,/Slide manquant <strong>à créer/);
});
test('unfinished comments stay private, code examples remain literal, HTML stays escaped',()=>{
 assert.doesNotMatch(renderConductor('Texte\n\n:::comment\nNe pas diffuser'),/Ne pas diffuser/);
 assert.match(renderConductor('```text\n:::comment\nExemple public\n:::\n```'),/Exemple public/);
 assert.match(renderConductor(':::comment\n<script>alert(1)</script>\n:::',[],{includePrivate:true}),/&lt;script&gt;/);
 const source=richMarkdown(node('div',[node('aside',[node('p',[text(':::')])],{'data-private-note':'true'})]));
 assert.match(source,/::::comment/);assert.equal(renderConductor(source),'');
});

test('nested lists from browser indentation do not create a phantom parent bullet',()=>{
 const nested=node('ul',[node('li',[text('Sous-liste 1')]),node('li',[text('Sous-liste 2')])]);
 for(const child of [nested,node('li',[nested])]){
  const source=richMarkdown(node('div',[node('ul',[node('li',[text('Parent')]),child,node('li',[text('Suivant')])])]));
  const html=renderConductor(source);
  assert.equal((html.match(/<li>/g)||[]).length,4);
  assert.match(html,/<li>\s*(?:<p>)?Parent[\s\S]*<ul>/);
  assert.doesNotMatch(source,/^-\s*$/m);
 }
});
test('ordered nested lists preserve numbering and indentation beyond nine items',()=>{
 const children=Array.from({length:10},(_,i)=>node('li',[text('Point '+(i+1)),...(i===9?[node('ul',[node('li',[text('Enfant')])])]:[])]));
 const source=richMarkdown(node('div',[node('ol',children)]));
 const html=renderConductor(source);
 assert.equal((html.match(/<li>/g)||[]).length,11);
 assert.match(html,/<li>\s*(?:<p>)?Point 10[\s\S]*<ul>/);
});

test('legacy empty parent wrappers render as a sublist in both Markdown surfaces',async()=>{
 const {renderNotebook}=await import('../src/notebookMarkdown.js');
 for(const render of [renderConductor,renderNotebook]){
  const html=render('- Parent\n- \n  - Enfant A\n  - Enfant B\n- Suivant');
  assert.equal((html.match(/<li>/g)||[]).length,4);
  assert.match(html,/<li>Parent\s*<ul>/);
  assert.equal((render('- Parent\n- Un vrai item\n  - Enfant').match(/<li>/g)||[]).length,3);
 }
});
