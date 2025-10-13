// Feature Flags para Sistema Dual-Flow
// Manejo simplificado usando estado de admin existente

import { isSystemAdmin } from '@/lib/adminCheck';

export interface DualFlowAccess {
  hasAccess: boolean;
  accessMethod: 'disabled' | 'admin' | 'user';
}

/**
 * Verifica si un usuario tiene acceso al sistema dual-flow
 * SIMPLIFICADO: Solo admins tienen acceso durante desarrollo
 */
export async function checkDualFlowAccess(userEmail: string): Promise<DualFlowAccess> {
  // Verificar si es admin del sistema
  const isAdmin = await isSystemAdmin();

  if (isAdmin) {
    return {
      hasAccess: true,
      accessMethod: 'admin',
    };
  }

  // Para usuarios normales, sin acceso por ahora
  return {
    hasAccess: false,
    accessMethod: 'disabled',
  };
}

/**
 * Helper para debugging - mostrar estado de acceso
 */
export function debugDualFlowAccess(userEmail: string, access: DualFlowAccess): void {
  console.log('[DualFlow] Access check:', {
    userEmail,
    hasAccess: access.hasAccess,
    accessMethod: access.accessMethod,
    timestamp: new Date().toISOString(),
  });
}
