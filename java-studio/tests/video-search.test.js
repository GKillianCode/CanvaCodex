import test from "node:test";
import assert from "node:assert/strict";
import {
  parseVideoSearch,
  matchesVideoSearch,
  activeSearchField,
  normalizeLibraryView,
  readLibraryView,
  libraryPreferenceKey,
} from "../src/videoSearch.js";
const row = {
  name: "Les primitives Java",
  playlist: "Java débutant",
  videoType: "course",
};
test("search combines playlist union with type and title, ignoring accents and case", () => {
  const search = parseVideoSearch(
    'playlist:"Java débutant" playlist:IA type:cours vidéo:PRIMITIVES',
  );
  assert(matchesVideoSearch(row, search));
  assert(!matchesVideoSearch({ ...row, playlist: "DevOps" }, search));
  assert(!matchesVideoSearch({ ...row, videoType: "demo" }, search));
  assert(
    matchesVideoSearch(
      { ...row, videoType: "demo" },
      parseVideoSearch("type:cours type:démonstration"),
    ),
  );
  assert(
    matchesVideoSearch(
      { ...row, videoType: "" },
      parseVideoSearch("type:non défini"),
    ),
  );
  assert(
    matchesVideoSearch(
      { ...row, playlist: "" },
      parseVideoSearch('playlist:"Sans playlist"'),
    ),
  );
  assert(matchesVideoSearch(row, parseVideoSearch("primitives")));
});
test("quoted names preserve embedded prefixes, quotes and plain title terms", () => {
  const value = 'Java type: avancé "suite"';
  const q =
    "primitives playlist:" + JSON.stringify(value) + ' type:"Cours" Java';
  const parsed = parseVideoSearch(q);
  assert.deepEqual(parsed.playlist, [value.toLowerCase().replace("é", "e")]);
  assert.equal(parsed.text, "primitives java");
  assert.deepEqual(parsed.type, ["cours"]);
  assert.equal(activeSearchField('playlist:"Java" '), null);
  assert.equal(activeSearchField('playlist:"Java" type:de').field, "type");
  const active = activeSearchField("playlist:Ja type:cours", 11);
  assert.equal(active.field, "playlist");
  assert.equal(active.end, 11);
});
test("library preferences retain hidden states, empty selection, page size, archives, query and page", () => {
  const view = normalizeLibraryView({
    query: "playlist:Java",
    visibleStatuses: ["ready", "obsolete"],
    archives: true,
    sortMode: "playlist",
    pageSize: 30,
    page: 3,
  });
  assert.deepEqual(view.visibleStatuses, ["ready"]);
  assert.equal(view.pageSize, 30);
  assert.equal(view.page, 3);
  assert.deepEqual(
    readLibraryView({
      getItem: (key) =>
        key === libraryPreferenceKey ? JSON.stringify(view) : null,
    }),
    view,
  );
  assert.deepEqual(
    normalizeLibraryView({ visibleStatuses: [] }).visibleStatuses,
    [],
  );
  assert.equal(normalizeLibraryView({ pageSize: 999, page: -4 }).pageSize, 20);
  assert.equal(
    readLibraryView({
      getItem() {
        throw Error("blocked");
      },
    }).page,
    1,
  );
});
