/**
 * GENERADOR DE CSV - Exportación de Transacciones
 * 
 * Genera un archivo CSV compatible con Excel y Google Sheets
 * - UTF-8 BOM para compatibilidad con Excel Windows
 * - RFC 4180 compliant (escape de comillas, delimitadores)
 * - Headers descriptivos en español
 */

import type { ExportData } from './types';

/**
 * Genera un CSV con todas las transacciones del período
 * 
 * Formato:
 * - Separator: coma (,)
 * - Encoding: UTF-8 con BOM
 * - Headers: Fecha,Tipo,Categoría,Descripción,Monto,Moneda,Pagado por
 */
export function generateTransactionsCSV(data: ExportData): Blob {
  // UTF-8 BOM para que Excel Windows reconozca correctamente los caracteres especiales
  const BOM = '\uFEFF';
  
  // Headers del CSV
  const headers = [
    'Fecha',
    'Tipo',
    'Categoría',
    'Descripción',
    'Monto',
    'Moneda',
    'Pagado por'
  ];
  
  // Convertir headers a string CSV
  let csv = BOM + headers.join(',') + '\n';
  
  // Agregar cada transacción
  data.transactions.forEach(t => {
    const row = [
      formatDate(t.date),
      t.type === 'income' ? 'Ingreso' : 'Gasto',
      escapeCSV(t.category),
      escapeCSV(t.description),
      t.amount.toFixed(2),
      t.currency,
      escapeCSV(t.paidBy)
    ];
    
    csv += row.join(',') + '\n';
  });
  
  // Crear blob con el CSV
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Genera un CSV completo con resumen + transacciones + contribuciones
 * 
 * Secciones:
 * 1. Resumen del período
 * 2. Balance desglosado
 * 3. Lista completa de transacciones
 * 4. Contribuciones de miembros
 * 5. Ahorro del hogar (si existe)
 */
export function generateFullCSV(data: ExportData): Blob {
  const BOM = '\uFEFF';
  let csv = BOM;
  
  // ============================================
  // SECCIÓN 1: RESUMEN DEL PERÍODO
  // ============================================
  csv += `"${data.householdName} - ${data.period}"\n`;
  csv += '\n';
  csv += 'RESUMEN FINANCIERO\n';
  csv += `Total Ingresos,${data.summary.totalIncome.toFixed(2)},${data.transactions[0]?.currency || 'EUR'}\n`;
  csv += `Total Gastos,${data.summary.totalExpenses.toFixed(2)},${data.transactions[0]?.currency || 'EUR'}\n`;
  csv += `Balance,${data.summary.balance.toFixed(2)},${data.transactions[0]?.currency || 'EUR'}\n`;
  csv += `Promedio Diario,${data.summary.avgDailyExpense.toFixed(2)},${data.transactions[0]?.currency || 'EUR'}\n`;
  csv += `Total Transacciones,${data.summary.transactionCount}\n`;
  csv += '\n';
  
  // ============================================
  // SECCIÓN 2: BALANCE DESGLOSADO
  // ============================================
  csv += 'BALANCE DESGLOSADO\n';
  csv += `Balance Total,${data.balance.total.toFixed(2)},${data.transactions[0]?.currency || 'EUR'}\n`;
  csv += `Balance Libre,${data.balance.free.toFixed(2)},${data.transactions[0]?.currency || 'EUR'}\n`;
  csv += `Créditos Activos,${data.balance.activeCredits.toFixed(2)},${data.transactions[0]?.currency || 'EUR'}\n`;
  csv += `Créditos Reservados,${data.balance.reservedCredits.toFixed(2)},${data.transactions[0]?.currency || 'EUR'}\n`;
  csv += '\n';
  
  // ============================================
  // SECCIÓN 3: TRANSACCIONES
  // ============================================
  csv += 'TRANSACCIONES\n';
  csv += 'Fecha,Tipo,Categoría,Descripción,Monto,Moneda,Pagado por\n';
  
  data.transactions.forEach(t => {
    const row = [
      formatDate(t.date),
      t.type === 'income' ? 'Ingreso' : 'Gasto',
      escapeCSV(t.category),
      escapeCSV(t.description),
      t.amount.toFixed(2),
      t.currency,
      escapeCSV(t.paidBy)
    ];
    csv += row.join(',') + '\n';
  });
  
  csv += '\n';
  
  // ============================================
  // SECCIÓN 4: CONTRIBUCIONES
  // ============================================
  if (data.contributions.length > 0) {
    csv += 'CONTRIBUCIONES\n';
    csv += 'Miembro,Ingreso Mensual,Porcentaje,Esperado,Pagado,Estado\n';
    
    data.contributions.forEach(c => {
      const row = [
        escapeCSV(c.memberName),
        c.income.toFixed(2),
        c.percentage.toFixed(1) + '%',
        c.expected.toFixed(2),
        c.paid.toFixed(2),
        getStatusLabel(c.status)
      ];
      csv += row.join(',') + '\n';
    });
    
    csv += '\n';
  }
  
  // ============================================
  // SECCIÓN 5: AHORRO DEL HOGAR
  // ============================================
  if (data.savings) {
    csv += 'AHORRO DEL HOGAR\n';
    csv += `Balance Actual,${data.savings.balance.toFixed(2)},${data.transactions[0]?.currency || 'EUR'}\n`;
    
    if (data.savings.goal) {
      csv += `Meta,${data.savings.goal.toFixed(2)},${data.transactions[0]?.currency || 'EUR'}\n`;
      const progress = (data.savings.balance / data.savings.goal) * 100;
      csv += `Progreso,${progress.toFixed(1)}%\n`;
    }
    
    if (data.savings.goalDescription) {
      csv += `Descripción,"${escapeCSV(data.savings.goalDescription)}"\n`;
    }
    
    csv += `Movimientos en el período,${data.savings.movements}\n`;
    csv += '\n';
    
    if (data.savings.transactions.length > 0) {
      csv += 'MOVIMIENTOS DE AHORRO\n';
      csv += 'Fecha,Tipo,Monto,Balance Después\n';
      
      data.savings.transactions.forEach(t => {
        const row = [
          formatDate(t.date),
          getSavingsTypeLabel(t.type),
          t.amount.toFixed(2),
          t.balanceAfter.toFixed(2)
        ];
        csv += row.join(',') + '\n';
      });
    }
  }
  
  // ============================================
  // SECCIÓN 6: TOTALES POR CATEGORÍA
  // ============================================
  if (data.categories.length > 0) {
    csv += '\n';
    csv += 'TOTALES POR CATEGORÍA\n';
    csv += 'Categoría,Total,Moneda\n';
    
    data.categories
      .sort((a, b) => b.total - a.total)
      .forEach(c => {
        const row = [
          escapeCSV(c.name),
          c.total.toFixed(2),
          data.transactions[0]?.currency || 'EUR'
        ];
        csv += row.join(',') + '\n';
      });
  }
  
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

// ============================================
// HELPERS
// ============================================

/**
 * Escapa un valor para CSV según RFC 4180
 * - Comillas dobles se escapan duplicándolas
 * - Valores con comas, comillas o saltos de línea se encierran en comillas
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  
  // Si contiene comillas, comas o saltos de línea, envolver en comillas
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    // Escapar comillas duplicándolas
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

/**
 * Formatea fecha en formato español DD/MM/YYYY
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Obtiene label descriptivo del estado de contribución
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    partial: 'Parcial',
    paid: 'Pagado',
    overpaid: 'Sobrepagado'
  };
  return labels[status] || status;
}

/**
 * Obtiene label descriptivo del tipo de movimiento de ahorro
 */
function getSavingsTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    deposit: 'Depósito',
    withdrawal: 'Retiro',
    transfer_from_credit: 'Transferencia Crédito',
    interest: 'Interés',
    adjustment: 'Ajuste'
  };
  return labels[type] || type;
}
