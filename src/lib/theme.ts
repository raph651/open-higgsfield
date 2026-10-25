export const ACCENTS = [
  { id: 'violet', label: 'Violet', color: '#8b5cf6', strong: '#7c3aed', soft: '#c4b5fd' },
  { id: 'blue', label: 'Blue', color: '#4f7cf3', strong: '#3b64d8', soft: '#9db8ff' },
  { id: 'teal', label: 'Teal', color: '#12a594', strong: '#0d8677', soft: '#5eead4' },
  { id: 'emerald', label: 'Emerald', color: '#16a34a', strong: '#15803d', soft: '#6ee7b7' },
  { id: 'amber', label: 'Amber', color: '#d97706', strong: '#b45309', soft: '#fcd34d' },
  { id: 'coral', label: 'Coral', color: '#e85d3d', strong: '#c24126', soft: '#fdba74' },
  { id: 'rose', label: 'Rose', color: '#e11d48', strong: '#be123c', soft: '#fda4af' },
  { id: 'slate', label: 'Slate', color: '#64748b', strong: '#475569', soft: '#cbd5e1' },
] as const;

export type AccentId = (typeof ACCENTS)[number]['id'];

export function getAccent(id: AccentId) {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0];
}
