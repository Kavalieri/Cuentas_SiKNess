/**
 * Sistema de colores consistente para categorías
 * Cada grupo tiene una paleta específica (base, claro, oscuro)
 */

export interface ColorPalette {
  base: string; // Color principal del grupo
  light: string; // Para subcategorías
  dark: string; // Para hover/enfasis
}

/**
 * Paletas de colores por grupo de categorías
 * Se asignan dinámicamente basándose en el nombre del grupo
 */
const GROUP_COLOR_PALETTES: Record<string, ColorPalette> = {
  // Hogar - Azul
  'hogar': {
    base: '#3b82f6', // blue-500
    light: '#60a5fa', // blue-400
    dark: '#2563eb', // blue-600
  },
  // Transporte - Verde
  'transporte': {
    base: '#10b981', // emerald-500
    light: '#34d399', // emerald-400
    dark: '#059669', // emerald-600
  },
  // Ocio - Púrpura
  'ocio': {
    base: '#8b5cf6', // violet-500
    light: '#a78bfa', // violet-400
    dark: '#7c3aed', // violet-600
  },
  // Salud - Rosa
  'salud': {
    base: '#ec4899', // pink-500
    light: '#f472b6', // pink-400
    dark: '#db2777', // pink-600
  },
  // Educación - Cyan
  'educación': {
    base: '#06b6d4', // cyan-500
    light: '#22d3ee', // cyan-400
    dark: '#0891b2', // cyan-600
  },
  // Finanzas - Naranja
  'finanzas': {
    base: '#f97316', // orange-500
    light: '#fb923c', // orange-400
    dark: '#ea580c', // orange-600
  },
  // Otros - Gris
  'otros': {
    base: '#6b7280', // gray-500
    light: '#9ca3af', // gray-400
    dark: '#4b5563', // gray-600
  },
};

/**
 * Paleta por defecto para grupos no definidos
 */
const DEFAULT_PALETTE: ColorPalette = {
  base: '#6366f1', // indigo-500
  light: '#818cf8', // indigo-400
  dark: '#4f46e5', // indigo-600
};

/**
 * Lista de colores para cuando no hay información de grupo
 * (Fallback para sistema legacy)
 */
export const LEGACY_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#f97316', // orange
  '#84cc16', // lime
  '#0ea5e9', // sky
];

/**
 * Obtiene la paleta de colores para un grupo específico
 * Normaliza el nombre del grupo (lowercase, sin acentos) para mejor matching
 */
export function getGroupColorPalette(groupName: string): ColorPalette {
  const normalized = groupName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Eliminar acentos

  return GROUP_COLOR_PALETTES[normalized] || DEFAULT_PALETTE;
}

/**
 * Obtiene un color específico de la paleta
 */
export function getGroupColor(groupName: string, shade: 'base' | 'light' | 'dark' = 'base'): string {
  const palette = getGroupColorPalette(groupName);
  return palette[shade];
}

/**
 * Genera colores para categorías dentro de un grupo
 * @param groupName - Nombre del grupo padre
 * @param index - Índice de la categoría (0, 1, 2...)
 * @param total - Total de categorías en el grupo
 * @returns Color interpolado entre base y light
 */
export function getCategoryColor(groupName: string, index: number, total: number): string {
  const palette = getGroupColorPalette(groupName);

  if (total === 1) return palette.base;

  // Interpolar entre dark y light basándose en el índice
  const ratio = index / (total - 1);
  return interpolateColor(palette.dark, palette.light, ratio);
}

/**
 * Interpolación simple de colores hexadecimales
 */
function interpolateColor(color1: string, color2: string, ratio: number): string {
  const hex = (color: string) => {
    const c = color.replace('#', '');
    return {
      r: parseInt(c.substring(0, 2), 16),
      g: parseInt(c.substring(2, 4), 16),
      b: parseInt(c.substring(4, 6), 16),
    };
  };

  const c1 = hex(color1);
  const c2 = hex(color2);

  const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
  const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
  const b = Math.round(c1.b + (c2.b - c1.b) * ratio);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Obtiene un color legacy por índice (para compatibilidad con sistema antiguo)
 */
export function getLegacyColor(index: number): string {
  return LEGACY_COLORS[index % LEGACY_COLORS.length];
}
