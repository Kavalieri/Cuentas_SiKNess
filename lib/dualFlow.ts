// LEGACY STUB: Este módulo ha sido archivado. No debe importarse desde código activo.
// Si ves este error, actualiza el código para usar lib/transactions/unified.ts
// y los helpers modernos en lib/*. Cualquier funcionalidad de “dual-flow”
// anterior queda congelada y solo disponible bajo archive/legacy/.

// Mantener tipos de export para no romper importaciones de solo tipos.
export type { DualFlowBalance, DualFlowConfig, DualFlowMetrics, DualFlowStats, DualFlowTransaction, DualFlowWorkflow, PairingCandidate } from '@/types/dualFlow';

const error = new Error(
  'lib/dualFlow.ts es LEGACY y está deshabilitado. Usa lib/transactions/unified.ts u otros módulos actuales.',
);
// Lanzamos al primer acceso a cualquiera de las APIs.
function boom(): never {
  throw error;
}

export const createDualFlowTransaction = boom;
export const getDualFlowTransactions = boom;
export const getDualFlowTransactionWithWorkflow = boom;
export const approveDualFlowTransaction = boom;
export const rejectDualFlowTransaction = boom;
export const findPairingCandidates = boom;
export const executeManualPairing = boom;
export const unpairTransactions = boom;
export const getDualFlowBalance = boom;
export const getDualFlowWorkflow = boom;
export const getDualFlowMetrics = boom;
export const getDualFlowConfig = boom;
export const upsertDualFlowConfig = boom;
export const canBePaired = boom;
export const getPairingStats = boom;
export const getPendingReviewTransactions = boom;
export const refreshDualFlowMaterializedViews = boom;
export const checkDualFlowAccess = boom;
