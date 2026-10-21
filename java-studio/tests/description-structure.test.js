import test from "node:test";
import assert from "node:assert/strict";
import {
  descriptionSections,
  sectionsBody,
  moveDescriptionSection,
  legacyDescriptionBody,
} from "../src/descriptionStructure.js";
test("section parsing retains literal content, custom and unknown tags", () => {
  const body =
    "Avant\nPlus de texte\n\n{{programme}}\n\n{{bloc:one}}\n\n{{partie:mine}}\n\n{{inconnu}}\n\nAprès";
  const sections = descriptionSections(body);
  assert.equal(sections.length, 6);
  assert.equal(sections[0].value, "Avant\nPlus de texte");
  assert.equal(sectionsBody(sections), body);
});
test("moving a section respects insertion boundaries in either direction", () => {
  const body = "{{introduction}}\n\n{{programme}}\n\n{{chapitrage}}";
  assert.equal(
    moveDescriptionSection(body, 2, 0),
    "{{chapitrage}}\n\n{{introduction}}\n\n{{programme}}",
  );
  assert.equal(
    moveDescriptionSection(body, 0, 3),
    "{{programme}}\n\n{{chapitrage}}\n\n{{introduction}}",
  );
  assert.equal(moveDescriptionSection(body, 1, 1), body);
  assert.equal(moveDescriptionSection(body, 1, 2), body);
});
test("invalid and same-position moves preserve existing formatting exactly", () => {
  const body = "  Before {{programme}} after  ";
  for (const [from, to] of [
    [-1, 0],
    [0, -1],
    [10, 0],
    [0, 10],
    [0, 0],
    [0, 1],
  ])
    assert.equal(moveDescriptionSection(body, from, to), body);
});

test("legacy structure conversion retains fixed text and every interchangeable part", () => {
  const template = {
    intro: "Avant\nUn autre paragraphe",
    slots: [{ id: "one" }, { id: "two" }],
    outro: "Après",
  };
  assert.equal(
    legacyDescriptionBody(template),
    "Avant\nUn autre paragraphe\n\n{{partie:one}}\n\n{{partie:two}}\n\nAprès",
  );
  assert.equal(template.intro, "Avant\nUn autre paragraphe");
});
