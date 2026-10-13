import * as prettier from 'prettier/standalone';
import javaPlugin from 'prettier-plugin-java';
export async function formatJava(code) {
  const options = { parser: 'java', plugins: [javaPlugin], tabWidth: 4, printWidth: 90, useTabs: false };
  // Different parser entry points support complete files and teaching snippets.
  for (const entrypoint of ['compilationUnit', 'classBodyDeclaration', 'blockStatements', 'expression']) {
    try { return { ok: true, code: (await prettier.format(code, { ...options, entrypoint })).trimEnd() }; } catch { /* Try a smaller Java fragment. */ }
  }
  return { ok: false, code };
}
