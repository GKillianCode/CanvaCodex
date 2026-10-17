export const conductorCodeLanguages = [
  ["", "Langage…"],
  ["text", "Texte brut"],
  ["java", "Java"],
  ["c", "C"],
  ["cpp", "C++"],
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["python", "Python"],
  ["bash", "Bash"],
  ["json", "JSON"],
  ["sql", "SQL"],
  ["yaml", "YAML"],
  ["html", "HTML"],
  ["css", "CSS"],
];
export function codeLanguageOf(node) {
  return (
    node.querySelector("code")?.className.match(/language-([\w-]+)/)?.[1] || ""
  );
}
export function fencedCode(text, language = "") {
  const fence = "`".repeat(
    Math.max(3, ...Array.from(text.matchAll(/`+/g), (m) => m[0].length + 1)),
  );
  return fence + language + "\n" + text.replace(/\n$/, "") + "\n" + fence;
}
