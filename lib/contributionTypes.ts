// Tipos y utilidades para el sistema de contribuciones

export const CALCULATION_TYPES = {
  PROPORTIONAL: 'proportional',
  EQUAL: 'equal',
  CUSTOM: 'custom',
} as const;

export type CalculationType = typeof CALCULATION_TYPES[keyof typeof CALCULATION_TYPES];

export const CALCULATION_TYPE_LABELS: Record<CalculationType, string> = {
  proportional: 'Proporcional al Ingreso',
  equal: 'A Partes Iguales',
  custom: 'Personalizado (Futuro)',
};

export const CALCULATION_TYPE_DESCRIPTIONS: Record<CalculationType, string> = {
  proportional: 'Cada miembro aporta según su ingreso mensual. Mayor ingreso = mayor contribución.',
  equal: 'Todos los miembros aportan la misma cantidad, independientemente de sus ingresos.',
  custom: 'Definir manualmente el porcentaje de contribución de cada miembro (próximamente).',
};

/**
 * Calculate contribution amount based on calculation type
 */
export function calculateContributionAmount(
  type: CalculationType,
  monthlyGoal: number,
  memberIncome: number,
  totalIncome: number,
  memberCount: number
): number {
  switch (type) {
    case CALCULATION_TYPES.PROPORTIONAL:
      if (totalIncome === 0) return 0;
      return (memberIncome / totalIncome) * monthlyGoal;
    
    case CALCULATION_TYPES.EQUAL:
      if (memberCount === 0) return 0;
      return monthlyGoal / memberCount;
    
    case CALCULATION_TYPES.CUSTOM:
      // Future: use custom percentages
      return monthlyGoal / memberCount; // Fallback to equal
    
    default:
      return 0;
  }
}

/**
 * Get percentage for a member based on calculation type
 */
export function getContributionPercentage(
  type: CalculationType,
  memberIncome: number,
  totalIncome: number,
  memberCount: number
): number {
  switch (type) {
    case CALCULATION_TYPES.PROPORTIONAL:
      if (totalIncome === 0) return 0;
      return (memberIncome / totalIncome) * 100;
    
    case CALCULATION_TYPES.EQUAL:
      if (memberCount === 0) return 0;
      return 100 / memberCount;
    
    case CALCULATION_TYPES.CUSTOM:
      // Future: use custom percentages
      return 100 / memberCount; // Fallback to equal
    
    default:
      return 0;
  }
}
