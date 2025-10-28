/**
 * CATÁLOGO DE CONSULTAS DINÁMICAS
 *
 * Este archivo contiene únicamente las definiciones de consultas
 * sin la directiva 'use server' para poder importarse en componentes cliente
 */

export interface QueryOption {
  id: string;
  label: string;
  description: string;
  category: 'gastos' | 'ingresos' | 'balance' | 'comparativa' | 'tendencias' | 'miembros';
  requiresPeriod?: boolean;
  requiresCategory?: boolean;
  requiresMember?: boolean;
}

/**
 * Catálogo completo de consultas disponibles
 */
export const QUERY_CATALOG: QueryOption[] = [
  // === GASTOS ===
  {
    id: 'gastos_por_categoria',
    label: 'Gastos por Categoría',
    description: 'Total de gastos agrupados por categoría con porcentajes',
    category: 'gastos',
    requiresPeriod: true,
  },
  {
    id: 'gastos_por_categoria_global',
    label: 'Gastos por Categoría (Global)',
    description: 'Total histórico de gastos por categoría',
    category: 'gastos',
  },
  {
    id: 'top_gastos',
    label: 'Top 10 Gastos Más Altos',
    description: 'Los 10 gastos individuales más elevados',
    category: 'gastos',
    requiresPeriod: true,
  },
  {
    id: 'gastos_diarios',
    label: 'Evolución de Gastos Diarios',
    description: 'Gastos totales por día del período',
    category: 'gastos',
    requiresPeriod: true,
  },
  {
    id: 'gastos_por_categoria_detallado',
    label: 'Detalle de Gastos por Categoría',
    description: 'Lista detallada de gastos de una categoría específica',
    category: 'gastos',
    requiresPeriod: true,
    requiresCategory: true,
  },

  // === INGRESOS ===
  {
    id: 'ingresos_por_mes',
    label: 'Ingresos por Mes',
    description: 'Total de ingresos agrupados mensualmente',
    category: 'ingresos',
  },
  {
    id: 'ingresos_vs_objetivo',
    label: 'Ingresos vs Objetivo',
    description: 'Comparación de ingresos reales con objetivo mensual',
    category: 'ingresos',
  },
  {
    id: 'detalle_ingresos_periodo',
    label: 'Detalle de Ingresos del Período',
    description: 'Lista completa de ingresos del período seleccionado',
    category: 'ingresos',
    requiresPeriod: true,
  },

  // === BALANCE ===
  {
    id: 'evolucion_balance',
    label: 'Evolución de Balance',
    description: 'Balance de apertura y cierre por período',
    category: 'balance',
  },
  {
    id: 'proyeccion_balance',
    label: 'Proyección de Balance',
    description: 'Proyección de balance basada en tendencias',
    category: 'balance',
  },
  {
    id: 'tasa_ahorro',
    label: 'Tasa de Ahorro',
    description: 'Porcentaje de ingresos ahorrados por período',
    category: 'balance',
  },

  // === COMPARATIVA ===
  {
    id: 'comparativa_mensual',
    label: 'Comparativa Mensual',
    description: 'Comparación de gastos/ingresos entre meses',
    category: 'comparativa',
  },
  {
    id: 'comparativa_categorias',
    label: 'Comparativa de Categorías',
    description: 'Evolución de gasto por categoría entre períodos',
    category: 'comparativa',
  },
  {
    id: 'variacion_mensual',
    label: 'Variación Mensual',
    description: 'Porcentaje de cambio mes a mes',
    category: 'comparativa',
  },

  // === TENDENCIAS ===
  {
    id: 'tendencia_gastos',
    label: 'Tendencia de Gastos',
    description: 'Tendencia de gastos en los últimos 6 meses',
    category: 'tendencias',
  },
  {
    id: 'estacionalidad',
    label: 'Estacionalidad',
    description: 'Patrones estacionales de gasto por categoría',
    category: 'tendencias',
  },
  {
    id: 'media_movil',
    label: 'Media Móvil (3 meses)',
    description: 'Media móvil de gastos e ingresos',
    category: 'tendencias',
  },

  // === MIEMBROS ===
  {
    id: 'gastos_por_miembro',
    label: 'Gastos por Miembro',
    description: 'Total de gastos directos por miembro',
    category: 'miembros',
    requiresPeriod: true,
  },
  {
    id: 'contribuciones_por_miembro',
    label: 'Contribuciones por Miembro',
    description: 'Aportaciones realizadas por cada miembro',
    category: 'miembros',
    requiresPeriod: true,
  },
  {
    id: 'detalle_miembro',
    label: 'Detalle de Transacciones por Miembro',
    description: 'Todas las transacciones de un miembro específico',
    category: 'miembros',
    requiresPeriod: true,
    requiresMember: true,
  },
];
