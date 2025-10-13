/**
 * Tipos TypeScript para el sistema dual-flow
 * Correspondientes a las tablas y ENUMs PostgreSQL
 */

// ============================================================================
// ENUMS DUAL-FLOW (correspondientes a PostgreSQL ENUMs)
// ============================================================================

export type TransactionTypeDualFlow =
  | 'gasto' // Gasto del fondo común (immediate)
  | 'gasto_directo' // Gasto out-of-pocket (requiere reembolso)
  | 'ingreso' // Ingreso al fondo común
  | 'ingreso_directo'; // Reembolso directo (auto-paired)

export type DualFlowStatus =
  | 'pending_review' // Pendiente de revisión manual
  | 'approved' // Aprobado para procesamiento
  | 'auto_paired' // Emparejado automáticamente
  | 'rejected' // Rechazado por el flujo
  | 'completed'; // Procesamiento finalizado

export type DualFlowType =
  | 'personal_to_common' // Out-of-pocket → común
  | 'common_to_personal' // Común → personal (reembolso)
  | 'common_fund'; // Directamente del fondo común

// ============================================================================
// INTERFAZ PRINCIPAL: DUAL_FLOW_TRANSACTIONS
// ============================================================================

export interface DualFlowTransaction {
  id: string;
  household_id: string;

  // Información básica de la transacción
  concepto: string;
  categoria: string;
  importe: number;
  fecha: string; // ISO date string

  // Sistema dual-flow
  tipo: TransactionTypeDualFlow;
  estado: DualFlowStatus;
  tipo_flujo: DualFlowType;

  // Miembros involucrados
  creado_por: string; // UUID del perfil
  pagado_por?: string; // UUID del perfil (nullable)

  // Sistema de emparejamiento automático
  transaccion_pareja?: string; // UUID de la transacción pareja (nullable)
  auto_paired: boolean;
  requiere_aprobacion: boolean;

  // Configuración de workflow
  umbral_emparejamiento: number; // decimal(5,2)
  dias_revision: number;

  // Auditoría
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  approved_at?: string; // ISO timestamp (nullable)
  approved_by?: string; // UUID del perfil (nullable)
}

// ============================================================================
// INTERFAZ DE CONFIGURACIÓN: DUAL_FLOW_CONFIG
// ============================================================================

export interface DualFlowConfig {
  household_id: string;

  // Configuración de emparejamiento
  emparejamiento_automatico: boolean;
  umbral_emparejamiento_default: number; // decimal(5,2)
  tiempo_revision_default: number;

  // Límites y umbrales
  limite_gasto_personal: number; // decimal(8,2)
  requiere_aprobacion_default: boolean;

  // Liquidación automática
  liquidacion_automatica: boolean;
  dias_liquidacion: number;

  // Notificaciones
  notificaciones_activas: boolean;
  notificar_nuevos_gastos: boolean;
  notificar_emparejamientos: boolean;
  notificar_limites: boolean;
  notificar_liquidaciones: boolean;

  // Auditoría
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// ============================================================================
// VISTA: V_DUAL_FLOW_BALANCE
// ============================================================================

export interface DualFlowBalance {
  household_id: string;

  // Balance general
  fondo_comun: number;

  // Gastos personales pendientes (personal → común)
  gastos_personales_pendientes: number;

  // Reembolsos pendientes (común → personal)
  reembolsos_pendientes: number;

  // Flujos de emparejamiento
  total_personal_to_common: number;
  total_common_to_personal: number;

  // Estadísticas
  total_transacciones: number;
  pendientes_revision: number;
  auto_emparejadas: number;
}

// ============================================================================
// VISTA: V_DUAL_FLOW_WORKFLOW
// ============================================================================

export interface DualFlowWorkflow extends DualFlowTransaction {
  // Información del par emparejado
  pareja_concepto?: string;
  pareja_importe?: number;
  pareja_tipo?: TransactionTypeDualFlow;

  // Información de miembros
  creado_por_nombre?: string;
  pagado_por_nombre?: string;

  // Cálculos de tiempo
  dias_desde_creacion: number;
  dias_restantes_revision: number;
}

// ============================================================================
// VISTA: V_DUAL_FLOW_METRICS
// ============================================================================

export interface DualFlowMetrics {
  scope: 'system_wide';

  // Estadísticas generales
  total_transacciones: number;
  hogares_activos: number;

  // Por tipo
  gastos_directos: number;
  gastos_comunes: number;
  ingresos_directos: number;
  ingresos_comunes: number;

  // Por estado
  pendientes_revision: number;
  auto_emparejadas: number;
  aprobadas: number;
  completadas: number;

  // Métricas de rendimiento
  porcentaje_auto_pairing: number;

  // Promedios
  importe_promedio: number;
  dias_promedio_procesamiento: number;
}

// ============================================================================
// STORED PROCEDURE RESULTS
// ============================================================================

export interface PairingCandidate {
  candidate_id: string;
  diferencia_importe: number;
  diferencia_dias: number;
  score: number;
}

// ============================================================================
// TIPOS PARA FORMULARIOS Y UI
// ============================================================================

export interface CreateTransactionForm {
  concepto: string;
  categoria: string;
  importe: number;
  fecha: string;
  tipo: TransactionTypeDualFlow;
  pagado_por?: string;
  requiere_aprobacion?: boolean;
  umbral_emparejamiento?: number;
}

export interface DualFlowStats {
  total_transacciones: number;
  auto_emparejadas: number;
  pendientes: number;
  candidatas_pairing: number;
  porcentaje_pairing: number;
}

// ============================================================================
// TIPOS DE RESPUESTA PARA SERVER ACTIONS
// ============================================================================

export interface DualFlowActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

// ============================================================================
// FILTROS Y QUERIES
// ============================================================================

export interface DualFlowFilters {
  estado?: DualFlowStatus;
  tipo?: TransactionTypeDualFlow;
  tipo_flujo?: DualFlowType;
  fecha_desde?: string;
  fecha_hasta?: string;
  solo_pendientes?: boolean;
  solo_emparejadas?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// TIPOS DE COMPONENTES
// ============================================================================

export interface TransactionCardProps {
  transaction: DualFlowWorkflow;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onPair?: (id: string, candidateId: string) => void;
  onUnpair?: (id: string) => void;
  showPairingCandidates?: boolean;
}

export interface WorkflowManagerProps {
  householdId: string;
  showActions?: boolean;
  mode?: 'full' | 'dashboard' | 'review';
  filters?: DualFlowFilters;
}

export interface PairingDialogProps {
  transaction: DualFlowTransaction;
  candidates: PairingCandidate[];
  onPair: (candidateId: string) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

// ============================================================================
// CONSTANTES Y HELPERS
// ============================================================================

export const TRANSACTION_TYPE_LABELS: Record<TransactionTypeDualFlow, string> = {
  gasto: 'Gasto Común',
  gasto_directo: 'Gasto Personal',
  ingreso: 'Ingreso Común',
  ingreso_directo: 'Reembolso',
};

export const DUAL_FLOW_STATUS_LABELS: Record<DualFlowStatus, string> = {
  pending_review: 'Pendiente',
  approved: 'Aprobado',
  auto_paired: 'Emparejado',
  rejected: 'Rechazado',
  completed: 'Completado',
};

export const DUAL_FLOW_TYPE_LABELS: Record<DualFlowType, string> = {
  personal_to_common: 'Personal → Común',
  common_to_personal: 'Común → Personal',
  common_fund: 'Fondo Común',
};

// ============================================================================
// TYPE GUARDS Y VALIDADORES
// ============================================================================

export function isTransactionTypeDualFlow(value: string): value is TransactionTypeDualFlow {
  return ['gasto', 'gasto_directo', 'ingreso', 'ingreso_directo'].includes(value);
}

export function isDualFlowStatus(value: string): value is DualFlowStatus {
  return ['pending_review', 'approved', 'auto_paired', 'rejected', 'completed'].includes(value);
}

export function isDualFlowType(value: string): value is DualFlowType {
  return ['personal_to_common', 'common_to_personal', 'common_fund'].includes(value);
}

export function canAutoPair(tipo: TransactionTypeDualFlow): boolean {
  return tipo === 'gasto_directo' || tipo === 'ingreso_directo';
}

export function getFlowTypeForTransactionType(tipo: TransactionTypeDualFlow): DualFlowType {
  switch (tipo) {
    case 'gasto_directo':
      return 'personal_to_common';
    case 'ingreso_directo':
      return 'common_to_personal';
    case 'gasto':
    case 'ingreso':
      return 'common_fund';
  }
}
