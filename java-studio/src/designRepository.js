import { copyDesign, normalizeDesign, designId } from "./designModel.js";
export function designRepository(repository, kind) {
  const indexKey = `design:${kind}:index`,
    key = (id) => `design:${kind}:${id}`;
  return {
    async list() {
      return ((await repository.getSetting(indexKey)) || []).filter(
        (row) => row && typeof row.id === "string",
      );
    },
    async load(id) {
      const row = await repository.getSetting(key(id));
      if (!row) throw Error("Ce document n’est plus disponible.");
      return {
        document: normalizeDesign(row.document, kind),
        revision: row.revision,
      };
    },
    async save(document, revision = null) {
      const d = normalizeDesign(document, kind),
        existing = await repository.getSetting(key(d.id));
      if (existing && existing.revision !== revision)
        throw Error(
          "Ce document a été modifié dans un autre onglet. Exporte ta copie avant de le rouvrir pour éviter de remplacer ces changements.",
        );
      const next = designId();
      const meta = {
        id: d.id,
        name: d.name,
        width: d.width,
        height: d.height,
        pages: d.pages.length,
        modified: Date.now(),
        preview: d.pages[0].elements
          .filter((e) => e.type !== "image")
          .slice(0, 8)
          .map((e) => ({
            ...copyDesign(e),
            imageSrc: "",
            text: e.text.slice(0, 240),
          })),
      };
      if (repository.saveDesignDocument) {
        await repository.saveDesignDocument(kind, d, revision, next, meta);
        return next;
      }
      await repository.setSetting(key(d.id), { revision: next, document: d });
      const rows = await this.list();
      await repository.setSetting(indexKey, [
        meta,
        ...rows.filter((r) => r.id !== d.id),
      ]);
      return next;
    },
    async remove(id) {
      if (repository.removeDesignDocument)
        return repository.removeDesignDocument(kind, id);
      const rows = await this.list();
      await repository.setSetting(
        indexKey,
        rows.filter((r) => r.id !== id),
      );
      await repository.setSetting(key(id), null);
    },
  };
}
