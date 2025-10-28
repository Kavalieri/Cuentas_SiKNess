// Feature Flags para Sistema Dual-Flow
// Con dual-flow como experiencia por defecto ya no hay gating por flags

export interface DualFlowAccess {
  hasAccess: boolean;
  accessMethod: 'disabled' | 'admin' | 'user';
}

/**
 * Verifica si un usuario tiene acceso al sistema dual-flow
 * Dual-flow es ahora la experiencia por defecto, por lo que siempre concedemos acceso.
 */
export async function checkDualFlowAccess(_userEmail?: string): Promise<DualFlowAccess> {
  return {
    hasAccess: true,
    accessMethod: 'user',
  };
}

/**
 * Helper para debugging - mostrar estado de acceso
 */
export function debugDualFlowAccess(_userEmail: string, _access: DualFlowAccess): void {
  // Debug logging removed for production
}
