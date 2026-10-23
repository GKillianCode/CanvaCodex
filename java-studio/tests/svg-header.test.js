import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSvgHeader, safeSvg } from "../src/svg.js";
test("legacy Illustrator SVG namespace aliases are resolved without loading its external DTD", () => {
  const raw = `<?xml version="1.0"?><!-- Adobe Illustrator --><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY ns_svg "http://www.w3.org/2000/svg"><!ENTITY ns_xlink "http://www.w3.org/1999/xlink">]><svg xmlns="&ns_svg;" xmlns:xlink="&ns_xlink;"><path fill="#0074BD" d="M0 0H10V10Z"/></svg>`;
  const clean = normalizeSvgHeader(raw);
  assert.ok(!clean.includes("<!DOCTYPE"));
  assert.ok(!clean.includes("<!ENTITY"));
  assert.match(clean, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.equal(safeSvg(clean), true);
});
test("external entities, nested entities and unclosed DTDs remain rejected", () => {
  for (const raw of [
    `<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>`,
    `<!DOCTYPE svg [<!ENTITY x "&y;">]><svg>&x;</svg>`,
    `<!DOCTYPE svg [<svg/>`,
  ])
    assert.throws(() => normalizeSvgHeader(raw));
  assert.equal(safeSvg("<svg><script/></svg>"), false);
});
