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
 * Mapeo explícito grupo → color conceptual
 * Define la asociación visual de cada grupo
 */
export const GROUP_COLOR_MAP = {
  hogar: 'rojo',
  alimentación: 'verde',
  transporte: 'amarillo',
  ocio: 'púrpura',
  salud: 'rosa',
  educación: 'cyan',
  finanzas: 'naranja',
  suministros: 'azul',
  otros: 'gris',
} as const;

/**
 * Paletas de colores por grupo de categorías
 * Con 5 tonalidades por grupo para jerarquía visual
 *
 * ACTUALIZADO (Issue #48): Paleta consistente y distintiva
 * - Hogar: ROJO (categoría de mayor importancia)
 * - Alimentación: VERDE (naturaleza, salud)
 * - Transporte: AMARILLO (señales de tráfico, visibilidad)
 * - Ocio: PÚRPURA (creatividad, entretenimiento)
 * - Salud: ROSA (cuidado, bienestar)
 * - Educación: CYAN (conocimiento, claridad)
 * - Finanzas: NARANJA (energía, inversión)
 * - Suministros: AZUL (frecuente, confiable)
 * - Otros: GRIS (neutral, miscelánea)
 */
const GROUP_COLOR_PALETTES: Record<string, ColorPalette> = {
  // Hogar - ROJO (Categoría principal)
  hogar: {
    base: '#dc2626', // red-600 - Grupo
    light: '#ef4444', // red-500 - Categorías
    lighter: '#f87171', // red-400 - Subcategorías
    dark: '#b91c1c', // red-700 - Hover
    darker: '#991b1b', // red-800 - Bordes
  },
  // Alimentación - VERDE (Naturaleza, salud)
  alimentación: {
    base: '#16a34a', // green-600
    light: '#22c55e', // green-500
    lighter: '#4ade80', // green-400
    dark: '#15803d', // green-700
    darker: '#166534', // green-800
  },
  // Transporte - AMARILLO (Señales de tráfico)
  transporte: {
    base: '#ca8a04', // yellow-600
    light: '#eab308', // yellow-500
    lighter: '#facc15', // yellow-400
    dark: '#a16207', // yellow-700
    darker: '#854d0e', // yellow-800
  },
  // Ocio - PÚRPURA (Creatividad)
  ocio: {
    base: '#7c3aed', // violet-600
    light: '#8b5cf6', // violet-500
    lighter: '#a78bfa', // violet-400
    dark: '#6d28d9', // violet-700
    darker: '#5b21b6', // violet-800
  },
  // Salud - ROSA (Cuidado)
  salud: {
    base: '#db2777', // pink-600
    light: '#ec4899', // pink-500
    lighter: '#f472b6', // pink-400
    dark: '#be185d', // pink-700
    darker: '#9f1239', // pink-800
  },
  // Educación - CYAN (Conocimiento)
  educación: {
    base: '#0891b2', // cyan-600
    light: '#06b6d4', // cyan-500
    lighter: '#22d3ee', // cyan-400
    dark: '#0e7490', // cyan-700
    darker: '#155e75', // cyan-800
  },
  // Finanzas - NARANJA (Energía)
  finanzas: {
    base: '#ea580c', // orange-600
    light: '#f97316', // orange-500
    lighter: '#fb923c', // orange-400
    dark: '#c2410c', // orange-700
    darker: '#9a3412', // orange-800
  },
  // Suministros - AZUL (Frecuente, confiable)
  suministros: {
    base: '#2563eb', // blue-600
    light: '#3b82f6', // blue-500
    lighter: '#60a5fa', // blue-400
    dark: '#1d4ed8', // blue-700
    darker: '#1e40af', // blue-800
  },
  // Otros - GRIS (Neutral)
  otros: {
    base: '#4b5563', // gray-600
    light: '#6b7280', // gray-500
    lighter: '#9ca3af', // gray-400
    dark: '#374151', // gray-700
    darker: '#1f2937', // gray-800
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

  // Debug en desarrollo
  if (process.env.NODE_ENV === 'development' && !GROUP_COLOR_PALETTES[normalized]) {
    console.warn(`[categoryColors] Grupo no encontrado: "${groupName}" (normalizado: "${normalized}")`);
    console.warn(`[categoryColors] Grupos disponibles:`, Object.keys(GROUP_COLOR_PALETTES));
  }

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

/**
 * Obtiene el color para un nodo jerárquico con validación robusta
 * Esta es la función PRINCIPAL para obtener colores en gráficos
 *
 * @param groupName - Nombre del grupo (requerido, se normaliza automáticamente)
 * @param depth - Profundidad del nodo en el árbol:
 *   - 0: Root (invisible/oscuro)
 *   - 1: Grupo (color base saturado)
 *   - 2: Categoría (color light)
 *   - 3+: Subcategoría (color lighter)
 * @param fallback - Color de respaldo si falla (default: gris)
 * @returns Color hexadecimal (#xxxxxx)
 *
 * @example
 * // Grupo "Hogar" en nivel 1 (grupo)
 * getHierarchicalColor('Hogar', 1) // => '#dc2626' (rojo base)
 *
 * // Categoría dentro de "Hogar" en nivel 2
 * getHierarchicalColor('Hogar', 2) // => '#ef4444' (rojo light)
 *
 * // Subcategoría dentro de "Hogar" en nivel 3
 * getHierarchicalColor('Hogar', 3) // => '#f87171' (rojo lighter)
 */
export function getHierarchicalColor(
  groupName: string | undefined | null,
  depth: number,
  fallback: string = '#6b7280' // gray-500
): string {
  // Validación estricta de entrada
  if (!groupName || typeof groupName !== 'string' || groupName.trim() === '') {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[categoryColors] Invalid groupName: "${groupName}", depth: ${depth}, using fallback`);
    }
    return fallback;
  }

  // Normalizar nombre del grupo (lowercase, sin acentos)
  const normalized = groupName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const palette = GROUP_COLOR_PALETTES[normalized];

  if (!palette) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[categoryColors] No palette found for group: "${groupName}" (normalized: "${normalized}"), using fallback`
      );
    }
    return fallback;
  }

  // Mapeo estricto por profundidad
  // Garantiza consistencia visual en toda la aplicación
  switch (depth) {
    case 0:
      return '#1a1a1a'; // Root (oscuro, casi invisible)
    case 1:
      return palette.base; // Grupo (color saturado)
    case 2:
      return palette.light; // Categoría (color medio)
    case 3:
    case 4:
    case 5:
      return palette.lighter; // Subcategoría (color claro, todos los niveles)
    default:
      return palette.lighter; // Profundidad mayor: usar lighter
  }
}
