/**
 * TIPOS COMPARTIDOS - Sistema de Exportación
 * 
 * Define las interfaces y tipos usados por todos los generadores
 * (PDF, CSV, Excel) y el server action getExportData()
 */

export type ExportFormat = 'pdf' | 'csv' | 'excel';

/**
 * Opciones de exportación seleccionadas por el usuario
 */
export type ExportOptions = {
  householdId: string;
  year: number;
  month: number;
  includeBalance?: boolean;
  includeTransactions?: boolean;
  includeContributions?: boolean;
  includeSavings?: boolean;
};

/**
 * Datos estructurados obtenidos del servidor para exportación
 */
export type ExportData = {
  householdName: string;
  period: string; // "Octubre 2025"
  year: number;
  month: number;
  
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    avgDailyExpense: number;
    transactionCount: number;
  };
  
  balance: {
    total: number;
    free: number;
    activeCredits: number;
    reservedCredits: number;
  };
  
  transactions: ExportTransaction[];
  
  contributions: ExportContribution[];
  
  savings?: ExportSavings;
  
  categories: ExportCategory[];
};

/**
 * Transacción individual para exportación
 */
export type ExportTransaction = {
  id: string;
  date: string; // ISO date string
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency: string;
  description: string;
  paidBy: string; // Email del miembro que pagó
};

/**
 * Contribución de miembro para exportación
 */
export type ExportContribution = {
  memberName: string;
  income: number;
  percentage: number;
  expected: number;
  paid: number;
  status: 'pending' | 'partial' | 'paid' | 'overpaid';
};

/**
 * Datos de ahorro para exportación
 */
export type ExportSavings = {
  balance: number;
  goal: number | null;
  goalDescription: string | null;
  movements: number; // Cantidad de movimientos en el período
  transactions: ExportSavingsTransaction[];
};

/**
 * Transacción de ahorro individual
 */
export type ExportSavingsTransaction = {
  date: string;
  type: string; // 'deposit', 'withdrawal', 'transfer_from_credit'
  amount: number;
  balanceAfter: number;
};

/**
 * Categoría con totales
 */
export type ExportCategory = {
  name: string;
  total: number;
};
