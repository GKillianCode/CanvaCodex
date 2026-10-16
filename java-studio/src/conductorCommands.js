export const conductorCommands = [
  ['p', 'Texte', 'paragraphe'], ['h1', 'Titre 1', 'h1'],
  ['h2', 'Titre 2', 'h2'], ['h3', 'Titre 3', 'h3'],
  ['ul', 'Liste à puces', 'liste'], ['ol', 'Liste numérotée', 'numero'],
  ['blockquote', 'Citation', 'citation'], ['code', 'Code', 'java code'],
  ['hr', 'Séparateur', 'ligne'], ['image', 'Image', 'photo illustration'],
  ['table', 'Tableau', 'table'],
];
export function findConductorCommands(query = '') {
  const clean = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return conductorCommands.filter(row => clean(row.join(' ')).includes(clean(query)));
}
