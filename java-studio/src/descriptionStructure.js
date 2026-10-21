// A visual section is either a template token or literal text. Parsing never writes
// back: existing templates are only reformatted after an explicit structure edit.
export function descriptionSections(body = "") {
  const rows = [],
    pattern = /{{\s*([^{}\n]+?)\s*}}/g;
  let cursor = 0,
    match;
  const add = (kind, value) => {
    if (value.trim()) rows.push({ kind, value: value.trim() });
  };
  while ((match = pattern.exec(body))) {
    add("text", body.slice(cursor, match.index));
    add("token", match[1]);
    cursor = pattern.lastIndex;
  }
  add("text", body.slice(cursor));
  return rows;
}
export function sectionsBody(rows) {
  return rows
    .map((row) => (row.kind === "token" ? "{{" + row.value + "}}" : row.value))
    .join("\n\n");
}
export function moveDescriptionSection(body, from, destination) {
  const rows = descriptionSections(body);
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(destination) ||
    from < 0 ||
    from >= rows.length ||
    destination < 0 ||
    destination > rows.length
  )
    return body;
  if (destination === from || destination === from + 1) return body;
  const [row] = rows.splice(from, 1);
  rows.splice(destination > from ? destination - 1 : destination, 0, row);
  return sectionsBody(rows);
}
export function legacyDescriptionBody(template) {
  return sectionsBody([
    ...(template.intro ? [{ kind: "text", value: template.intro }] : []),
    ...(template.slots || []).map((slot) => ({
      kind: "token",
      value: "partie:" + slot.id,
    })),
    ...(template.outro ? [{ kind: "text", value: template.outro }] : []),
  ]);
}
