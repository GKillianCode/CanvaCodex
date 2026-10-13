import Prism from 'prismjs';
import 'prismjs/components/prism-java.js';
const cache = new Map();
export function javaLines(code) {
  if (cache.has(code)) return cache.get(code);
  const lines = [[]];
  function visit(value, type = 'plain') {
    if (Array.isArray(value)) { value.forEach(t => visit(t, type)); return; }
    if (typeof value !== 'string') { visit(value.content, value.type || type); return; }
    value.split('\n').forEach((part, n) => { if (n) lines.push([]); if (part) lines.at(-1).push({ text: part.replaceAll('\t', '    '), type }); });
  }
  visit(Prism.tokenize(code, Prism.languages.java));
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  cache.set(code, lines);
  return lines;
}
export function codeColor(type, theme) {
  const light = theme.light === true;
  return { comment: light ? '#66778b' : '#82969e', keyword: light ? '#7c3aed' : '#c5a9ff', string: light ? '#117444' : '#a5f3b9', char: light ? '#117444' : '#a5f3b9', number: light ? '#c45611' : '#ffbf83', boolean: light ? '#c45611' : '#ffbf83', 'class-name': light ? '#007f99' : '#7de1ee', function: light ? '#1f63ae' : '#8dbdff', operator: light ? '#b13e65' : '#f2a4c7', annotation: light ? '#966b00' : '#e1d390', punctuation: light ? '#63718a' : '#b8c6d0' }[type] || theme.ink;
}
export function highlightedHtml(code) { return Prism.highlight(code, Prism.languages.java, 'java'); }
