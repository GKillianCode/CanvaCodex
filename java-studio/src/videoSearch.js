import { videoTypes, videoStatuses } from "./videoProjects.js";
export const libraryPreferenceKey = "frame-video-library-view";
export const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
// Quoted values may contain spaces, escaped quotes and even field names.
function searchTokens(query) {
  const marker = /(?:^|\s)(playlist|vidéo|video|type)\s*:\s*/gi,
    tokens = [];
  let match;
  while ((match = marker.exec(query))) {
    const start = match.index + (/\s/.test(match[0][0]) ? 1 : 0),
      valueStart = marker.lastIndex;
    let end = query.length,
      value,
      complete = false;
    if (query[valueStart] === '"') {
      let i = valueStart + 1;
      for (; i < query.length; i++) {
        if (query[i] === "\\") {
          i++;
          continue;
        }
        if (query[i] === '"') {
          complete = true;
          break;
        }
      }
      end = complete ? i + 1 : query.length;
      const raw = query.slice(valueStart, end);
      try {
        value = JSON.parse(raw);
      } catch {
        value = raw.slice(1);
      }
    } else {
      const next = /(?:\s)(?:playlist|vidéo|video|type)\s*:/i.exec(
        query.slice(valueStart),
      );
      end = next ? valueStart + next.index : query.length;
      value = query.slice(valueStart, end);
    }
    tokens.push({
      field: fold(match[1]),
      start,
      end,
      value: fold(value),
      complete,
    });
    marker.lastIndex = end;
  }
  return tokens;
}
export function parseVideoSearch(query) {
  query = String(query);
  const result = { playlist: [], video: [], type: [], text: "" };
  let end = 0;
  for (const token of searchTokens(query)) {
    result.text += " " + query.slice(end, token.start);
    result[token.field].push(token.value);
    end = token.end;
  }
  result.text = fold(result.text + " " + query.slice(end));
  return result;
}
export function matchesVideoSearch(row, search) {
  const title = fold(row.name),
    playlist = fold(row.playlist || "Sans playlist");
  const type = fold(
    videoTypes.find(([id]) => id === row.videoType)?.[1] || "Non défini",
  );
  return (
    (!search.text ||
      search.text.split(" ").every((word) => title.includes(word))) &&
    (!search.playlist.length || search.playlist.some((v) => v === playlist)) &&
    (!search.video.length || search.video.some((v) => title.includes(v))) &&
    (!search.type.length ||
      search.type.some((v) => v === type || v === fold(row.videoType)))
  );
}
export function activeSearchField(query, caret = query.length) {
  const token = searchTokens(query).find(
    (t) => caret >= t.start && caret <= t.end,
  );
  if (!token || (token.complete && caret >= token.end)) return null;
  const prefix = /^(?:playlist|vidéo|video|type)\s*:\s*/i.exec(
    query.slice(token.start),
  );
  if (!prefix || caret < token.start + prefix[0].length) return null;
  return {
    ...token,
    value: fold(
      query.slice(token.start + prefix[0].length, caret).replace(/^"/, ""),
    ),
  };
}
export function normalizeLibraryView(raw = {}) {
  const statuses = videoStatuses.map(([id]) => id);
  return {
    query: typeof raw.query === "string" ? raw.query.slice(0, 4000) : "",
    visibleStatuses: Array.isArray(raw.visibleStatuses)
      ? statuses.filter((id) => raw.visibleStatuses.includes(id))
      : statuses,
    archives: raw.archives === true,
    sortMode: ["recent", "process", "playlist"].includes(raw.sortMode)
      ? raw.sortMode
      : "recent",
    pageSize: [10, 20, 30, 50].includes(raw.pageSize) ? raw.pageSize : 20,
    page: Number.isSafeInteger(raw.page) && raw.page > 0 ? raw.page : 1,
  };
}
export function readLibraryView(storage) {
  try {
    const raw = JSON.parse(storage.getItem(libraryPreferenceKey));
    return normalizeLibraryView(
      raw && typeof raw === "object"
        ? raw
        : { sortMode: storage.getItem("frame-video-sort") },
    );
  } catch {
    return normalizeLibraryView();
  }
}

export function paginationItems(page, total) {
  const selected = new Set(
    [1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total),
  );
  const result = [];
  let previous = 0;
  for (const n of [...selected].sort((a, b) => a - b)) {
    if (previous && n - previous === 2) result.push(previous + 1);
    else if (previous && n - previous > 2) result.push("gap-" + previous);
    result.push(n);
    previous = n;
  }
  return result;
}
export function keywordCompletion(query, caret = query.length) {
  if (activeSearchField(query, caret)) return null;
  const before = query.slice(0, caret),
    match = /(?:^|\s)([\p{L}]+)$/u.exec(before);
  if (!match) return null;
  const word = fold(match[1]),
    values = ["playlist", "vidéo", "type"].filter(
      (value) =>
        fold(value).startsWith(word) || (word === "video" && value === "vidéo"),
    );
  if (!values.length) return null;
  const start = caret - match[1].length,
    tail = /^[\p{L}]*:?\s*/u.exec(query.slice(caret))?.[0] || "";
  return { start, end: caret + tail.length, values };
}
