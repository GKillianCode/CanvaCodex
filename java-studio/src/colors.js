export const validColorRole = value => /^[\w-]{1,100}$/.test(value || '') ? value : null;
export function boundColor(element, field, theme) {
 const role=element[field+'Role'];return role ? theme?.[role] || theme?.swatches?.find(c=>c.id===role)?.color || element[field] : element[field];
}
