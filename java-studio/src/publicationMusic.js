export const musicLibraryKey = "publication-music-library";
export function normalizeMusicLibrary(value) {
  const ids = new Set();
  return (Array.isArray(value) ? value : []).slice(0, 500).flatMap((row) => {
    if (
      !row ||
      typeof row.id !== "string" ||
      !/^[\w-]{1,100}$/.test(row.id) ||
      ids.has(row.id)
    )
      return [];
    ids.add(row.id);
    const text = (key, max) =>
      typeof row[key] === "string" ? row[key].trim().slice(0, max) : "";
    return [
      {
        id: row.id,
        title: text("title", 200),
        artist: text("artist", 200),
        url: text("url", 2000),
        license: text("license", 2000),
      },
    ];
  });
}
export function musicCredits(library, selected) {
  const ids = new Set(selected || []);
  return library
    .filter((row) => ids.has(row.id))
    .map((row) =>
      [
        `${row.title}${row.artist ? " — " + row.artist : ""}`,
        row.url,
        row.license,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}
