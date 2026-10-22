import test from "node:test";
import assert from "node:assert/strict";
import { defaultThemeId, saveDefaultTheme } from "../src/themeLibrary.js";
test("new workshops inherit the chosen theme and fall back after its removal", () => {
  const data = new Map([
      ["frame-slides-project", JSON.stringify({ themeId: "paper" })],
    ]),
    storage = {
      getItem: (k) => data.get(k),
      setItem: (k, v) => data.set(k, v),
    },
    palette = [{ id: "terminal" }, { id: "paper" }];
  assert.equal(defaultThemeId(storage, palette), "paper");
  saveDefaultTheme(storage, "terminal");
  assert.equal(defaultThemeId(storage, palette), "terminal");
  data.set("frame-default-theme", "deleted");
  assert.equal(defaultThemeId(storage, palette), "paper");
  assert.equal(defaultThemeId(storage, [palette[0]]), "terminal");
});
