/**
 * Sistema de colores consistente para categorías con gradientes
 * Cada grupo tiene múltiples tonalidades para categorías y subcategorías
 */

export interface ColorPalette {
  base: string; // Color principal del grupo
  light: string; // Para categorías (tonalidad clara)
  lighter: string; // Para subcategorías (tonalidad más clara)
  dark: string; // Para hover/énfasis
  darker: string; // Para bordes
}

/**
 * Paletas de colores por grupo de categorías
 * Con 5 tonalidades por grupo para jerarquía visual
 */
const GROUP_COLOR_PALETTES: Record<string, ColorPalette> = {
  // Hogar - Azul
  'hogar': {
    base: '#3b82f6', // blue-500 - Grupo
    light: '#60a5fa', // blue-400 - Categorías
    lighter: '#93c5fd', // blue-300 - Subcategorías
    dark: '#2563eb', // blue-600 - Hover
    darker: '#1e40af', // blue-700 - Bordes
  },
  // Transporte - Verde
  'transporte': {
    base: '#10b981', // emerald-500
    light: '#34d399', // emerald-400
    lighter: '#6ee7b7', // emerald-300
    dark: '#059669', // emerald-600
    darker: '#047857', // emerald-700
  },
  // Ocio - Púrpura
  'ocio': {
    base: '#8b5cf6', // violet-500
    light: '#a78bfa', // violet-400
    lighter: '#c4b5fd', // violet-300
    dark: '#7c3aed', // violet-600
    darker: '#6d28d9', // violet-700
  },
  // Salud - Rosa
  'salud': {
    base: '#ec4899', // pink-500
    light: '#f472b6', // pink-400
    lighter: '#f9a8d4', // pink-300
    dark: '#db2777', // pink-600
    darker: '#be185d', // pink-700
  },
  // Educación - Cyan
  'educación': {
    base: '#06b6d4', // cyan-500
    light: '#22d3ee', // cyan-400
    lighter: '#67e8f9', // cyan-300
    dark: '#0891b2', // cyan-600
    darker: '#0e7490', // cyan-700
  },
  // Finanzas - Naranja
  'finanzas': {
    base: '#f97316', // orange-500
    light: '#fb923c', // orange-400
    lighter: '#fdba74', // orange-300
    dark: '#ea580c', // orange-600
    darker: '#c2410c', // orange-700
  },
  // Alimentación - Amarillo
  'alimentación': {
    base: '#eab308', // yellow-500
    light: '#facc15', // yellow-400
    lighter: '#fde047', // yellow-300
    dark: '#ca8a04', // yellow-600
    darker: '#a16207', // yellow-700
  },
  // Otros - Gris
  'otros': {
    base: '#6b7280', // gray-500
    light: '#9ca3af', // gray-400
    lighter: '#d1d5db', // gray-300
    dark: '#4b5563', // gray-600
    darker: '#374151', // gray-700
  },
};

/**
 * Paleta por defecto para grupos no definidos
 */
const DEFAULT_PALETTE: ColorPalette = {
  base: '#6366f1', // indigo-500
  light: '#818cf8', // indigo-400
  lighter: '#a5b4fc', // indigo-300
  dark: '#4f46e5', // indigo-600
  darker: '#4338ca', // indigo-700
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
 * Genera colores para categorías dentro de un grupo usando gradiente completo
 * @param groupName - Nombre del grupo padre
 * @param index - Índice de la categoría (0, 1, 2...)
 * @param total - Total de categorías en el grupo
 * @param level - Nivel jerárquico: 'group' (grupo) | 'category' (categoría) | 'subcategory' (subcategoría)
 * @returns Color correspondiente al nivel jerárquico
 */
export function getCategoryColorByLevel(
  groupName: string,
  index: number = 0,
  total: number = 1,
  level: 'group' | 'category' | 'subcategory' = 'category'
): string {
  const palette = getGroupColorPalette(groupName);

  // Nivel grupo: color base
  if (level === 'group') {
    return palette.base;
  }

  // Nivel categoría: interpolación entre base y light
  if (level === 'category') {
    if (total === 1) return palette.light;
    const ratio = total > 1 ? index / (total - 1) : 0;
    return interpolateColor(palette.base, palette.light, ratio);
  }

  // Nivel subcategoría: interpolación entre light y lighter
  if (level === 'subcategory') {
    if (total === 1) return palette.lighter;
    const ratio = total > 1 ? index / (total - 1) : 0;
    return interpolateColor(palette.light, palette.lighter, ratio);
  }

  return palette.base;
}

/**
 * Genera un array de colores para un grupo completo con sus categorías
 * @param groupName - Nombre del grupo
 * @param categoryCount - Número de categorías en el grupo
 * @returns Array de colores graduales
 */
export function getGroupColorScale(groupName: string, categoryCount: number): string[] {
  const palette = getGroupColorPalette(groupName);
  
  if (categoryCount === 0) return [palette.base];
  if (categoryCount === 1) return [palette.base];
  if (categoryCount === 2) return [palette.base, palette.light];
  if (categoryCount === 3) return [palette.base, palette.light, palette.lighter];
  
  // Para más categorías, interpolar entre darker → base → light → lighter
  const colors: string[] = [];
  const steps = categoryCount;
  
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    
    if (ratio < 0.33) {
      // darker → base
      const localRatio = ratio / 0.33;
      colors.push(interpolateColor(palette.darker, palette.base, localRatio));
    } else if (ratio < 0.67) {
      // base → light
      const localRatio = (ratio - 0.33) / 0.34;
      colors.push(interpolateColor(palette.base, palette.light, localRatio));
    } else {
      // light → lighter
      const localRatio = (ratio - 0.67) / 0.33;
      colors.push(interpolateColor(palette.light, palette.lighter, localRatio));
    }
  }
  
  return colors;
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
  return LEGACY_COLORS[index % LEGACY_COLORS.length]!;
}
