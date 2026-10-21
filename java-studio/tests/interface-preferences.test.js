import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeInterfacePreferences,
  setReorderArrows,
  setTypographyPreference,
  typographyPreferences,
} from "../src/interfacePreferences.js";
test("typography preferences validate font identifiers and migrate arrow-only preferences", () => {
  assert.deepEqual(normalizeInterfacePreferences({ showReorderArrows: true }), {
    showReorderArrows: true,
    interfaceFont: "default",
    writingFont: "interface",
    tabularNumbers: true,
  });
  assert.equal(
    normalizeInterfacePreferences({
      writingFont: "untrusted",
      interfaceFont: "unknown",
    }).writingFont,
    "interface",
  );
  assert.equal(
    normalizeInterfacePreferences({
      writingFont: "mono",
      tabularNumbers: false,
    }).writingFont,
    "mono",
  );
});
test("changing reorder arrows preserves typography and changing fonts preserves arrow preferences", () => {
  setTypographyPreference("writingFont", "mono");
  setTypographyPreference("tabularNumbers", false);
  setReorderArrows(true);
  assert.equal(typographyPreferences.value.writingFont, "mono");
  assert.equal(typographyPreferences.value.tabularNumbers, false);
  setTypographyPreference("interfaceFont", "inter");
  assert.equal(typographyPreferences.value.showReorderArrows, true);
  setTypographyPreference("writingFont", "invalid");
  assert.equal(typographyPreferences.value.writingFont, "interface");
});
