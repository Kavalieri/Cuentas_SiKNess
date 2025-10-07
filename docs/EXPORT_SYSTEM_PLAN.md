# 📥 Sistema de Exportación Completo - Plan de Implementación

**Fecha**: 7 octubre 2025  
**Estado**: 🔄 Planificación completada - Listo para implementar  
**Prioridad**: P0 (CRÍTICO - Funcionalidad MVP esencial)

---

## 🎯 Objetivo

Implementar un **sistema robusto de exportación** que permita a los usuarios descargar sus datos financieros en múltiples formatos (PDF, CSV, Excel) con opciones configurables.

---

## 📊 Datos Exportables

### 1. **Transacciones** (Tabla principal)
- Fecha, Tipo (ingreso/gasto), Categoría, Monto, Moneda, Descripción
- Filtros: Rango fechas, Categoría, Tipo
- Ordenamiento: Fecha descendente

### 2. **Balance Breakdown**
- Balance Libre (disponible para gastos)
- Créditos Activos (por miembro)
- Créditos Reservados (marcados para mes siguiente)
- Balance Total Hogar

### 3. **Contribuciones Mensuales**
- Por miembro: Nombre, Ingreso, % contribución, Esperado, Pagado, Estado
- Totales: Suma esperada, suma pagada, diferencia

### 4. **Ahorro del Hogar**
- Balance actual
- Meta (si definida) con % progreso
- Movimientos del período: depósitos, retiros, transferencias de crédito

### 5. **Resumen Mensual**
- Total Ingresos
- Total Gastos
- Diferencia (ahorro/déficit)
- Top 5 categorías por gasto
- Estadísticas: Promedio gasto diario, días con actividad

### 6. **Categorías con Totales**
- Categoría → Total gastado en el período
- Ordenado de mayor a menor

---

## 🏗️ Arquitectura Propuesta

### **Flujo de Exportación**

```
Usuario Dashboard → Click "📥 Exportar"
           ↓
    ExportDialog abre
    ┌─────────────────────────┐
    │ Formato:                │
    │  ○ PDF (Resumen)        │
    │  ○ CSV (Transacciones)  │
    │  ○ Excel (Completo)     │
    ├─────────────────────────┤
    │ Período:                │
    │  [Mes] [Año]            │
    │  Checkbox: Incluir todo │
    ├─────────────────────────┤
    │ Opciones:               │
    │  ☑ Balance              │
    │  ☑ Transacciones        │
    │  ☑ Contribuciones       │
    │  ☑ Ahorro               │
    └─────────────────────────┘
           ↓
    Click "Generar"
           ↓
    Server Action: getExportData(options)
      → Retorna datos estructurados
           ↓
    Client-side generation:
      - PDF: jspdf + autotable
      - CSV: String template
      - Excel: ExcelJS
           ↓
    Auto-descarga archivo
```

### **Estructura de Archivos**

```
app/exports/
  ├─ actions.ts                      # Server Actions (obtener datos)
  └─ route.ts                        # API route para Excel server-side (opcional)

components/exports/
  ├─ ExportButton.tsx                # Botón "📥 Exportar" en Dashboard
  ├─ ExportDialog.tsx                # Dialog con opciones
  └─ ExportProgress.tsx              # Progress bar durante generación

lib/export/
  ├─ types.ts                        # Tipos compartidos (ExportOptions, ExportData)
  ├─ pdf-generator.ts                # Generar PDF con jspdf
  ├─ csv-generator.ts                # Generar CSV con string template
  └─ excel-generator.ts              # Generar Excel con ExcelJS (client-side)
```

---

## 📦 Librerías Requeridas

### **Instalación**

```bash
# PDF generation
npm install jspdf jspdf-autotable
npm install -D @types/jspdf

# Excel generation (mejor que xlsx)
npm install exceljs

# CSV: No requiere librería (manual)
```

### **Comparación de librerías**

| Librería | Tamaño | Pros | Contras |
|----------|--------|------|---------|
| **jspdf** | ~150KB | Cliente-side, control total diseño | Bundle grande |
| **jspdf-autotable** | ~20KB | Tablas automáticas, responsive | Requiere jspdf |
| **exceljs** | ~500KB | Multi-hoja, estilos, fórmulas | Bundle muy grande |
| **CSV manual** | 0KB | Sin dependencias, simple | Solo texto plano |

**Decisión**: Usar las 3 opciones con lazy loading para no afectar bundle inicial.

---

## 🎨 Implementación por Formato

### **1. PDF - Resumen Mensual Ejecutivo** (P0 - MVP)

**Características**:
- 1-2 páginas A4
- Header: Logo/nombre hogar + período
- 4 secciones: Resumen, Balance, Contribuciones, Top Transacciones
- Footer: Fecha generación + página

**Diseño visual**:

```
┌─────────────────────────────────────────────────┐
│  🏠 CuentasSiK - Casa Test                      │
│  📅 Octubre 2025                                │
│  ───────────────────────────────────────────    │
│                                                 │
│  📊 RESUMEN FINANCIERO                          │
│  ├─ Ingresos:          2,000.00 €               │
│  ├─ Gastos:            1,500.00 €               │
│  └─ Balance:             500.00 € ✅            │
│                                                 │
│  💰 BALANCE DESGLOSADO                          │
│  ├─ Balance Libre:     1,200.00 €               │
│  ├─ Créditos Activos:    200.00 €               │
│  └─ Créditos Reservados: 100.00 €               │
│                                                 │
│  👥 CONTRIBUCIONES                              │
│  ┌─────────────┬──────────┬─────────┬────────┐  │
│  │ Miembro     │ Esperado │ Pagado  │ Estado │  │
│  ├─────────────┼──────────┼─────────┼────────┤  │
│  │ caballero.. │  750.00€ │ 750.00€ │   ✅   │  │
│  │ fumetas.sik │  250.00€ │ 250.00€ │   ✅   │  │
│  └─────────────┴──────────┴─────────┴────────┘  │
│                                                 │
│  📋 TOP 10 TRANSACCIONES                        │
│  [Tabla con fecha, tipo, categoría, monto]     │
│                                                 │
│  💾 AHORRO DEL HOGAR                            │
│  ├─ Balance actual: 1,000.00 €                  │
│  ├─ Meta: 5,000.00 € (20% ━━━━━━━━░░░░░░)       │
│  └─ Movimientos: 3 depósitos, 1 retiro          │
│                                                 │
│  ───────────────────────────────────────────    │
│  Generado: 7 octubre 2025, 15:30               │
└─────────────────────────────────────────────────┘
```

**Código de ejemplo** (`lib/export/pdf-generator.ts`):

```typescript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportData } from './types';

export async function generateMonthlyPDF(data: ExportData): Promise<Blob> {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text(`🏠 ${data.householdName}`, 20, 20);
  doc.setFontSize(14);
  doc.text(`📅 ${data.period}`, 20, 28);
  doc.line(20, 32, 190, 32);
  
  // Sección 1: Resumen
  let yPos = 40;
  doc.setFontSize(16);
  doc.text('📊 RESUMEN FINANCIERO', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(12);
  doc.text(`Ingresos:    ${formatCurrency(data.summary.totalIncome)}`, 25, yPos);
  yPos += 6;
  doc.text(`Gastos:      ${formatCurrency(data.summary.totalExpenses)}`, 25, yPos);
  yPos += 6;
  doc.text(`Balance:     ${formatCurrency(data.summary.balance)}`, 25, yPos);
  yPos += 12;
  
  // Sección 2: Balance Desglosado
  doc.setFontSize(16);
  doc.text('💰 BALANCE DESGLOSADO', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(12);
  doc.text(`Balance Libre:      ${formatCurrency(data.balance.free)}`, 25, yPos);
  yPos += 6;
  doc.text(`Créditos Activos:   ${formatCurrency(data.balance.activeCredits)}`, 25, yPos);
  yPos += 6;
  doc.text(`Créditos Reservados:${formatCurrency(data.balance.reservedCredits)}`, 25, yPos);
  yPos += 12;
  
  // Sección 3: Contribuciones (tabla)
  doc.setFontSize(16);
  doc.text('👥 CONTRIBUCIONES', 20, yPos);
  yPos += 4;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Miembro', 'Esperado', 'Pagado', 'Estado']],
    body: data.contributions.map(c => [
      c.memberName,
      formatCurrency(c.expected),
      formatCurrency(c.paid),
      c.status === 'paid' ? '✅' : c.status === 'pending' ? '⏳' : '⚠️'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
  });
  
  // Sección 4: Top Transacciones
  yPos = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(16);
  doc.text('📋 TOP 10 TRANSACCIONES', 20, yPos);
  yPos += 4;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Fecha', 'Tipo', 'Categoría', 'Monto']],
    body: data.transactions.slice(0, 10).map(t => [
      formatDate(t.date),
      t.type === 'income' ? '📥' : '📤',
      t.category,
      formatCurrency(t.amount)
    ]),
    theme: 'striped',
  });
  
  // Sección 5: Ahorro (si hay)
  if (data.savings) {
    yPos = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(16);
    doc.text('💾 AHORRO DEL HOGAR', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(12);
    doc.text(`Balance actual: ${formatCurrency(data.savings.balance)}`, 25, yPos);
    yPos += 6;
    if (data.savings.goal) {
      const progress = (data.savings.balance / data.savings.goal) * 100;
      doc.text(`Meta: ${formatCurrency(data.savings.goal)} (${progress.toFixed(0)}%)`, 25, yPos);
      yPos += 6;
    }
    doc.text(`Movimientos: ${data.savings.movements} en el período`, 25, yPos);
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Generado: ${new Date().toLocaleString('es-ES')}`,
      20,
      doc.internal.pageSize.height - 10
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width - 40,
      doc.internal.pageSize.height - 10
    );
  }
  
  return doc.output('blob');
}
```

---

### **2. CSV - Export Simple de Transacciones** (P1 - Alta prioridad)

**Características**:
- Formato RFC 4180 (estándar CSV)
- Encoding: UTF-8 con BOM (para Excel en Windows)
- Separador: coma (`,`)
- Escape: comillas dobles para campos con comas

**Columnas**:
```
Fecha,Tipo,Categoría,Monto,Moneda,Descripción,Pagado Por
```

**Código** (`lib/export/csv-generator.ts`):

```typescript
export type CSVTransaction = {
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency: string;
  description?: string;
  paidBy: string;
};

export function generateTransactionsCSV(transactions: CSVTransaction[]): Blob {
  // UTF-8 BOM para Excel Windows
  const BOM = '\uFEFF';
  
  // Header
  const header = 'Fecha,Tipo,Categoría,Monto,Moneda,Descripción,Pagado Por\n';
  
  // Rows
  const rows = transactions.map(t => {
    const escapedDescription = escapeCSV(t.description || '');
    const escapedCategory = escapeCSV(t.category);
    const escapedPaidBy = escapeCSV(t.paidBy);
    
    return [
      t.date,
      t.type === 'income' ? 'Ingreso' : 'Gasto',
      escapedCategory,
      t.amount.toFixed(2),
      t.currency,
      escapedDescription,
      escapedPaidBy
    ].join(',');
  }).join('\n');
  
  const csvContent = BOM + header + rows;
  
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

function escapeCSV(value: string): string {
  // Si contiene coma, comillas, o salto de línea, envolver en comillas
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

---

### **3. Excel - Multi-hoja Completo** (P2 - Fase avanzada)

**Características**:
- 5 hojas (pestañas): Resumen, Transacciones, Contribuciones, Ahorro, Categorías
- Estilos: Headers en negrita con fondo azul
- Auto-width de columnas
- Fórmulas en hoja Resumen (SUM, AVERAGE)
- Formato de moneda en celdas numéricas

**Estructura**:

**Hoja 1: Resumen**
```
A1: CuentasSiK - Casa Test
A2: Octubre 2025
A4: Resumen Financiero
A5: Ingresos      | B5: =SUM(Transacciones!D:D WHERE tipo='Ingreso')
A6: Gastos        | B6: =SUM(Transacciones!D:D WHERE tipo='Gasto')
A7: Balance       | B7: =B5-B6
```

**Hoja 2: Transacciones** (Todas las del período)
```
A1: Fecha | B1: Tipo | C1: Categoría | D1: Monto | E1: Moneda | F1: Descripción | G1: Pagado Por
[Data rows con formato de tabla]
```

**Hoja 3: Contribuciones**
```
A1: Miembro | B1: Ingreso | C1: % Contribución | D1: Esperado | E1: Pagado | F1: Diferencia | G1: Estado
[Data rows con formato condicional: verde si paid, rojo si pending]
```

**Hoja 4: Ahorro**
```
A1: Balance Actual | B1: 1000.00
A2: Meta           | B2: 5000.00
A3: Progreso       | B3: =B1/B2 (formato porcentaje)
A5: Movimientos del período
A6: Fecha | B6: Tipo | C6: Monto | D6: Balance Después
[Data rows de savings_transactions]
```

**Hoja 5: Categorías**
```
A1: Categoría | B1: Total Gastado | C1: % del Total
[Data rows ordenadas de mayor a menor]
[Última fila: TOTAL con SUM]
```

**Código base** (`lib/export/excel-generator.ts`):

```typescript
import ExcelJS from 'exceljs';
import type { ExportData } from './types';

export async function generateMonthlyExcel(data: ExportData): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'CuentasSiK';
  workbook.created = new Date();
  
  // Hoja 1: Resumen
  const summarySheet = workbook.addWorksheet('Resumen');
  summarySheet.getCell('A1').value = `CuentasSiK - ${data.householdName}`;
  summarySheet.getCell('A1').font = { size: 16, bold: true };
  summarySheet.getCell('A2').value = data.period;
  summarySheet.getCell('A2').font = { size: 12 };
  
  summarySheet.getCell('A4').value = 'Resumen Financiero';
  summarySheet.getCell('A4').font = { bold: true };
  
  summarySheet.getCell('A5').value = 'Ingresos';
  summarySheet.getCell('B5').value = data.summary.totalIncome;
  summarySheet.getCell('B5').numFmt = '#,##0.00 €';
  
  summarySheet.getCell('A6').value = 'Gastos';
  summarySheet.getCell('B6').value = data.summary.totalExpenses;
  summarySheet.getCell('B6').numFmt = '#,##0.00 €';
  
  summarySheet.getCell('A7').value = 'Balance';
  summarySheet.getCell('B7').value = { formula: 'B5-B6' };
  summarySheet.getCell('B7').numFmt = '#,##0.00 €';
  summarySheet.getCell('B7').font = { bold: true };
  
  // Hoja 2: Transacciones
  const transactionsSheet = workbook.addWorksheet('Transacciones');
  transactionsSheet.columns = [
    { header: 'Fecha', key: 'date', width: 12 },
    { header: 'Tipo', key: 'type', width: 10 },
    { header: 'Categoría', key: 'category', width: 20 },
    { header: 'Monto', key: 'amount', width: 12 },
    { header: 'Moneda', key: 'currency', width: 8 },
    { header: 'Descripción', key: 'description', width: 30 },
    { header: 'Pagado Por', key: 'paidBy', width: 15 },
  ];
  
  // Estilo header
  transactionsSheet.getRow(1).font = { bold: true };
  transactionsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF428BCA' }
  };
  transactionsSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };
  
  // Data rows
  data.transactions.forEach(t => {
    transactionsSheet.addRow({
      date: t.date,
      type: t.type === 'income' ? 'Ingreso' : 'Gasto',
      category: t.category,
      amount: t.amount,
      currency: t.currency,
      description: t.description || '',
      paidBy: t.paidBy
    });
  });
  
  // Formato moneda en columna D
  transactionsSheet.getColumn('D').numFmt = '#,##0.00 €';
  
  // Hoja 3: Contribuciones
  const contributionsSheet = workbook.addWorksheet('Contribuciones');
  contributionsSheet.columns = [
    { header: 'Miembro', key: 'member', width: 20 },
    { header: 'Ingreso', key: 'income', width: 12 },
    { header: '% Contribución', key: 'percentage', width: 15 },
    { header: 'Esperado', key: 'expected', width: 12 },
    { header: 'Pagado', key: 'paid', width: 12 },
    { header: 'Diferencia', key: 'difference', width: 12 },
    { header: 'Estado', key: 'status', width: 10 },
  ];
  
  contributionsSheet.getRow(1).font = { bold: true };
  contributionsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF428BCA' }
  };
  
  data.contributions.forEach(c => {
    const row = contributionsSheet.addRow({
      member: c.memberName,
      income: c.income,
      percentage: c.percentage / 100,
      expected: c.expected,
      paid: c.paid,
      difference: c.paid - c.expected,
      status: c.status === 'paid' ? '✅' : c.status === 'pending' ? '⏳' : '⚠️'
    });
    
    // Formato condicional en estado
    if (c.status === 'paid') {
      row.getCell('G').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF28A745' }
      };
    }
  });
  
  contributionsSheet.getColumn('B').numFmt = '#,##0.00 €';
  contributionsSheet.getColumn('C').numFmt = '0.00%';
  contributionsSheet.getColumn('D').numFmt = '#,##0.00 €';
  contributionsSheet.getColumn('E').numFmt = '#,##0.00 €';
  contributionsSheet.getColumn('F').numFmt = '#,##0.00 €';
  
  // Hoja 4: Ahorro
  if (data.savings) {
    const savingsSheet = workbook.addWorksheet('Ahorro');
    savingsSheet.getCell('A1').value = 'Balance Actual';
    savingsSheet.getCell('B1').value = data.savings.balance;
    savingsSheet.getCell('B1').numFmt = '#,##0.00 €';
    
    if (data.savings.goal) {
      savingsSheet.getCell('A2').value = 'Meta';
      savingsSheet.getCell('B2').value = data.savings.goal;
      savingsSheet.getCell('B2').numFmt = '#,##0.00 €';
      
      savingsSheet.getCell('A3').value = 'Progreso';
      savingsSheet.getCell('B3').value = { formula: 'B1/B2' };
      savingsSheet.getCell('B3').numFmt = '0.00%';
    }
    
    // Movimientos (si hay)
    if (data.savings.transactions && data.savings.transactions.length > 0) {
      savingsSheet.getCell('A5').value = 'Movimientos del período';
      savingsSheet.getCell('A5').font = { bold: true };
      
      savingsSheet.getRow(6).values = ['Fecha', 'Tipo', 'Monto', 'Balance Después'];
      savingsSheet.getRow(6).font = { bold: true };
      
      data.savings.transactions.forEach((t, i) => {
        savingsSheet.getRow(7 + i).values = [
          t.date,
          t.type,
          t.amount,
          t.balanceAfter
        ];
      });
      
      savingsSheet.getColumn('C').numFmt = '#,##0.00 €';
      savingsSheet.getColumn('D').numFmt = '#,##0.00 €';
    }
  }
  
  // Hoja 5: Categorías
  const categoriesSheet = workbook.addWorksheet('Categorías');
  categoriesSheet.columns = [
    { header: 'Categoría', key: 'category', width: 25 },
    { header: 'Total Gastado', key: 'total', width: 15 },
    { header: '% del Total', key: 'percentage', width: 12 },
  ];
  
  categoriesSheet.getRow(1).font = { bold: true };
  categoriesSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF428BCA' }
  };
  
  const totalExpenses = data.summary.totalExpenses;
  data.categories.forEach(cat => {
    categoriesSheet.addRow({
      category: cat.name,
      total: cat.total,
      percentage: cat.total / totalExpenses
    });
  });
  
  // Fila TOTAL
  const lastRow = categoriesSheet.lastRow!.number + 1;
  categoriesSheet.getCell(`A${lastRow}`).value = 'TOTAL';
  categoriesSheet.getCell(`A${lastRow}`).font = { bold: true };
  categoriesSheet.getCell(`B${lastRow}`).value = { formula: `SUM(B2:B${lastRow - 1})` };
  categoriesSheet.getCell(`B${lastRow}`).numFmt = '#,##0.00 €';
  categoriesSheet.getCell(`B${lastRow}`).font = { bold: true };
  
  categoriesSheet.getColumn('B').numFmt = '#,##0.00 €';
  categoriesSheet.getColumn('C').numFmt = '0.00%';
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}
```

---

## 🔧 Server Actions

**Archivo**: `app/exports/actions.ts`

```typescript
'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';
import type { ExportData, ExportOptions } from '@/lib/export/types';

/**
 * Obtiene todos los datos necesarios para exportación
 */
export async function getExportData(
  options: ExportOptions
): Promise<Result<ExportData>> {
  const supabase = await supabaseServer();
  
  // 1. Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('No autenticado');
  
  // 2. Obtener profile_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  
  if (!profile) return fail('Perfil no encontrado');
  
  // 3. Obtener household_id activo
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('active_household_id')
    .eq('profile_id', profile.id)
    .single();
  
  if (!userSettings?.active_household_id) {
    return fail('No tienes un hogar activo');
  }
  
  const householdId = userSettings.active_household_id;
  
  // 4. Obtener nombre del hogar
  const { data: household } = await supabase
    .from('households')
    .select('name')
    .eq('id', householdId)
    .single();
  
  if (!household) return fail('Hogar no encontrado');
  
  // 5. Calcular rango de fechas
  const { year, month } = options;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Último día del mes
  
  const startISO = startDate.toISOString().split('T')[0];
  const endISO = endDate.toISOString().split('T')[0];
  
  // 6. Obtener transacciones del período
  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      type,
      amount,
      currency,
      description,
      category_id,
      paid_by,
      categories(name),
      profiles!transactions_paid_by_fkey(email)
    `)
    .eq('household_id', householdId)
    .gte('occurred_at', startISO)
    .lte('occurred_at', endISO)
    .order('occurred_at', { ascending: false });
  
  if (!transactions) return fail('Error al obtener transacciones');
  
  // 7. Calcular resumen
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = totalIncome - totalExpenses;
  
  // 8. Obtener balance breakdown
  const { data: balanceData } = await supabase.rpc('get_balance_breakdown', {
    p_household_id: householdId
  });
  
  // 9. Obtener contribuciones del mes
  const { data: contributions } = await supabase
    .from('contributions')
    .select(`
      id,
      profile_id,
      expected_amount,
      paid_amount,
      status,
      profiles(email),
      member_incomes!inner(monthly_income)
    `)
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month);
  
  // 10. Obtener ahorro
  const { data: savings } = await supabase
    .from('household_savings')
    .select(`
      current_balance,
      goal_amount,
      goal_description
    `)
    .eq('household_id', householdId)
    .single();
  
  // 11. Obtener movimientos de ahorro del período
  const { data: savingsTransactions } = await supabase
    .from('savings_transactions')
    .select('*')
    .eq('household_id', householdId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: false });
  
  // 12. Calcular totales por categoría
  const categoryTotals = new Map<string, number>();
  transactions
    .filter(t => t.type === 'expense' && t.categories)
    .forEach(t => {
      const catName = t.categories!.name;
      categoryTotals.set(catName, (categoryTotals.get(catName) || 0) + t.amount);
    });
  
  const categories = Array.from(categoryTotals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
  
  // 13. Construir objeto ExportData
  const exportData: ExportData = {
    householdName: household.name,
    period: `${getMonthName(month)} ${year}`,
    year,
    month,
    
    summary: {
      totalIncome,
      totalExpenses,
      balance,
      avgDailyExpense: totalExpenses / endDate.getDate(),
      transactionCount: transactions.length
    },
    
    balance: {
      total: balanceData?.total_balance || 0,
      free: balanceData?.free_balance || 0,
      activeCredits: balanceData?.active_credits || 0,
      reservedCredits: balanceData?.reserved_credits || 0,
    },
    
    transactions: transactions.map(t => ({
      id: t.id,
      date: t.occurred_at,
      type: t.type,
      category: t.categories?.name || 'Sin categoría',
      amount: t.amount,
      currency: t.currency,
      description: t.description || '',
      paidBy: t.profiles?.email || 'Desconocido'
    })),
    
    contributions: contributions?.map(c => {
      const income = c.member_incomes?.[0]?.monthly_income || 0;
      const totalExpected = contributions.reduce((sum, contrib) => 
        sum + contrib.expected_amount, 0
      );
      const percentage = totalExpected > 0 
        ? (c.expected_amount / totalExpected) * 100 
        : 0;
      
      return {
        memberName: c.profiles?.email || 'Desconocido',
        income,
        percentage,
        expected: c.expected_amount,
        paid: c.paid_amount,
        status: c.status
      };
    }) || [],
    
    savings: savings ? {
      balance: savings.current_balance,
      goal: savings.goal_amount,
      goalDescription: savings.goal_description,
      movements: savingsTransactions?.length || 0,
      transactions: savingsTransactions?.map(t => ({
        date: t.created_at.split('T')[0],
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balance_after
      })) || []
    } : undefined,
    
    categories
  };
  
  return ok(exportData);
}

function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1];
}
```

---

## 🎨 Componentes UI

### **1. ExportButton** (Botón en Dashboard)

**Archivo**: `components/exports/ExportButton.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ExportDialog } from './ExportDialog';

interface ExportButtonProps {
  householdId: string;
  defaultYear: number;
  defaultMonth: number;
}

export function ExportButton({ householdId, defaultYear, defaultMonth }: ExportButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setDialogOpen(true)}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Exportar
      </Button>
      
      <ExportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        householdId={householdId}
        defaultYear={defaultYear}
        defaultMonth={defaultMonth}
      />
    </>
  );
}
```

### **2. ExportDialog** (Dialog con opciones)

**Archivo**: `components/exports/ExportDialog.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { FileText, Table, FileSpreadsheet, Loader2 } from 'lucide-react';
import { getExportData } from '@/app/exports/actions';
import { generateMonthlyPDF } from '@/lib/export/pdf-generator';
import { generateTransactionsCSV } from '@/lib/export/csv-generator';
import { generateMonthlyExcel } from '@/lib/export/excel-generator';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  defaultYear: number;
  defaultMonth: number;
}

export function ExportDialog({
  open,
  onOpenChange,
  householdId,
  defaultYear,
  defaultMonth
}: ExportDialogProps) {
  const [format, setFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf');
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [includeBalance, setIncludeBalance] = useState(true);
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [includeContributions, setIncludeContributions] = useState(true);
  const [includeSavings, setIncludeSavings] = useState(true);
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      // 1. Obtener datos del servidor
      const result = await getExportData({
        householdId,
        year,
        month,
        includeBalance,
        includeTransactions,
        includeContributions,
        includeSavings
      });
      
      if (!result.ok || !result.data) {
        toast.error(result.message || 'Error al obtener datos');
        return;
      }
      
      const data = result.data;
      
      // 2. Generar archivo según formato
      let blob: Blob;
      let filename: string;
      
      if (format === 'pdf') {
        blob = await generateMonthlyPDF(data);
        filename = `CuentasSiK_${data.householdName}_${year}-${month.toString().padStart(2, '0')}.pdf`;
      } else if (format === 'csv') {
        blob = generateTransactionsCSV(data.transactions);
        filename = `Transacciones_${year}-${month.toString().padStart(2, '0')}.csv`;
      } else {
        blob = await generateMonthlyExcel(data);
        filename = `CuentasSiK_Completo_${year}-${month.toString().padStart(2, '0')}.xlsx`;
      }
      
      // 3. Descargar archivo
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Archivo ${format.toUpperCase()} generado exitosamente`);
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error generando exportación:', error);
      toast.error('Error al generar archivo. Intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>📥 Exportar Datos</DialogTitle>
          <DialogDescription>
            Selecciona el formato y período para exportar
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Formato */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Formato</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as any)}>
              <div className="flex items-start space-x-3 p-3 border-2 rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="pdf" id="pdf" className="mt-1" />
                <Label htmlFor="pdf" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="font-bold">PDF - Resumen Mensual</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Reporte ejecutivo de 1-2 páginas con gráficos y tablas
                  </p>
                </Label>
              </div>
              
              <div className="flex items-start space-x-3 p-3 border-2 rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="csv" id="csv" className="mt-1" />
                <Label htmlFor="csv" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Table className="h-4 w-4" />
                    <span className="font-bold">CSV - Transacciones</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Archivo simple para importar en Excel o Sheets
                  </p>
                </Label>
              </div>
              
              <div className="flex items-start space-x-3 p-3 border-2 rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="excel" id="excel" className="mt-1" />
                <Label htmlFor="excel" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="font-bold">Excel - Completo</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    5 hojas con todos los datos: Resumen, Transacciones, Contribuciones, Ahorro, Categorías
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Período */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Período</Label>
            <div className="flex gap-3">
              <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(12)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2000, i).toLocaleString('es-ES', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Opciones (solo para PDF y Excel) */}
          {format !== 'csv' && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Incluir en el export</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="balance" 
                    checked={includeBalance}
                    onCheckedChange={(c) => setIncludeBalance(c as boolean)}
                  />
                  <Label htmlFor="balance" className="cursor-pointer">
                    Balance desglosado
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="transactions" 
                    checked={includeTransactions}
                    onCheckedChange={(c) => setIncludeTransactions(c as boolean)}
                  />
                  <Label htmlFor="transactions" className="cursor-pointer">
                    Transacciones
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="contributions" 
                    checked={includeContributions}
                    onCheckedChange={(c) => setIncludeContributions(c as boolean)}
                  />
                  <Label htmlFor="contributions" className="cursor-pointer">
                    Contribuciones
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="savings" 
                    checked={includeSavings}
                    onCheckedChange={(c) => setIncludeSavings(c as boolean)}
                  />
                  <Label htmlFor="savings" className="cursor-pointer">
                    Ahorro
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generar {format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 📝 Tipos Compartidos

**Archivo**: `lib/export/types.ts`

```typescript
export type ExportFormat = 'pdf' | 'csv' | 'excel';

export type ExportOptions = {
  householdId: string;
  year: number;
  month: number;
  includeBalance?: boolean;
  includeTransactions?: boolean;
  includeContributions?: boolean;
  includeSavings?: boolean;
};

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
  
  transactions: {
    id: string;
    date: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    currency: string;
    description: string;
    paidBy: string;
  }[];
  
  contributions: {
    memberName: string;
    income: number;
    percentage: number;
    expected: number;
    paid: number;
    status: 'pending' | 'partial' | 'paid' | 'overpaid';
  }[];
  
  savings?: {
    balance: number;
    goal: number | null;
    goalDescription: string | null;
    movements: number;
    transactions: {
      date: string;
      type: string;
      amount: number;
      balanceAfter: number;
    }[];
  };
  
  categories: {
    name: string;
    total: number;
  }[];
};
```

---

## ✅ Checklist de Implementación

### **Fase 0: Preparación** (10 min)
- [ ] Instalar dependencias: `jspdf`, `jspdf-autotable`, `exceljs`
- [ ] Crear estructura de carpetas: `app/exports/`, `components/exports/`, `lib/export/`
- [ ] Crear `lib/export/types.ts` con tipos compartidos

### **Fase 1: PDF Export** (P0 - 90 min)
- [ ] Crear `lib/export/pdf-generator.ts` con `generateMonthlyPDF()`
- [ ] Implementar 5 secciones: Header, Resumen, Balance, Contribuciones, Transacciones Top
- [ ] Implementar footer con fecha generación y paginación
- [ ] Testing: Generar PDF de prueba con datos mock

### **Fase 2: Server Actions** (60 min)
- [ ] Crear `app/exports/actions.ts` con `getExportData()`
- [ ] Implementar queries para: transacciones, balance, contribuciones, ahorro, categorías
- [ ] Testing: Verificar datos retornados son correctos

### **Fase 3: UI Components** (60 min)
- [ ] Crear `components/exports/ExportButton.tsx`
- [ ] Crear `components/exports/ExportDialog.tsx` con RadioGroup para formatos
- [ ] Integrar en `DashboardContent.tsx` junto a MonthSelector
- [ ] Testing: Abrir dialog, verificar opciones

### **Fase 4: CSV Export** (P1 - 30 min)
- [ ] Crear `lib/export/csv-generator.ts` con `generateTransactionsCSV()`
- [ ] Implementar escape de comillas y UTF-8 BOM
- [ ] Testing: Exportar CSV, abrir en Excel, verificar encoding

### **Fase 5: Excel Export** (P2 - 120 min)
- [ ] Crear `lib/export/excel-generator.ts` con `generateMonthlyExcel()`
- [ ] Implementar 5 hojas: Resumen, Transacciones, Contribuciones, Ahorro, Categorías
- [ ] Aplicar estilos: Headers en negrita con fondo azul, formato moneda
- [ ] Implementar auto-width de columnas
- [ ] Testing: Exportar Excel, verificar 5 hojas, verificar estilos

### **Fase 6: Refinamiento** (60 min)
- [ ] Optimizar bundle: Lazy loading de librerías pesadas (exceljs)
- [ ] Loading state durante generación (Loader2 icon)
- [ ] Error handling: Toast error si falla generación
- [ ] Success feedback: Toast success + auto-descarga
- [ ] Testing: Verificar performance con datasets grandes (100+ transacciones)

### **Fase 7: Documentación** (30 min)
- [ ] Actualizar `docs/IMPLEMENTATION_ROADMAP.md` con estado completado
- [ ] Agregar ejemplos de uso a `docs/EXPORT_SYSTEM_PLAN.md`
- [ ] Screenshots de PDF/Excel generados

---

## 🎯 Testing Checklist

### **PDF**
- [ ] Genera archivo válido (no corrupto)
- [ ] Header con nombre hogar y período correcto
- [ ] Resumen con totales correctos (ingresos, gastos, balance)
- [ ] Balance desglosado visible
- [ ] Tabla de contribuciones con todos los miembros
- [ ] Top 10 transacciones ordenadas por fecha
- [ ] Sección ahorro (si existe)
- [ ] Footer con fecha generación y paginación
- [ ] Texto legible (fuentes correctas)
- [ ] No overflow de contenido

### **CSV**
- [ ] Genera archivo válido
- [ ] Encoding UTF-8 con BOM (abre bien en Excel Windows)
- [ ] Header row correcto: Fecha,Tipo,Categoría,Monto,Moneda,Descripción,Pagado Por
- [ ] Todas las transacciones del período incluidas
- [ ] Campos con comas escapados correctamente
- [ ] Campos vacíos manejados correctamente

### **Excel**
- [ ] Genera archivo válido (extensión .xlsx)
- [ ] 5 hojas visibles: Resumen, Transacciones, Contribuciones, Ahorro, Categorías
- [ ] Headers con estilo (negrita, fondo azul)
- [ ] Formato moneda en columnas numéricas (€)
- [ ] Formato porcentaje en columnas correspondientes
- [ ] Fórmulas funcionan (SUM, AVERAGE)
- [ ] Auto-width de columnas legible
- [ ] No filas vacías inesperadas

### **UI**
- [ ] Botón "Exportar" visible en Dashboard
- [ ] Click abre dialog correctamente
- [ ] 3 opciones de formato visibles (PDF, CSV, Excel)
- [ ] Selección de mes/año funcional
- [ ] Checkboxes de opciones solo visibles para PDF/Excel
- [ ] Botón "Generar" muestra loading state
- [ ] Toast success/error después de generación
- [ ] Auto-descarga archivo con nombre correcto
- [ ] Dialog cierra automáticamente después de success

---

## 🚀 Prioridades de Implementación

### **P0 (ESTA SESIÓN - 2-3 horas)**
1. ✅ **Instalación de dependencias**
2. ✅ **Estructura de archivos**
3. ✅ **PDF Generator básico** (sin estilos avanzados)
4. ✅ **Server Action `getExportData()`**
5. ✅ **UI Components** (ExportButton + ExportDialog)
6. ✅ **Testing end-to-end**: Click botón → PDF descarga

### **P1 (PRÓXIMA SESIÓN - 1-2 horas)**
1. ✅ **CSV Generator**
2. ✅ **Refinamiento PDF**: Estilos, paginación, footer
3. ✅ **Testing**: Datasets grandes, casos edge

### **P2 (FUTURO - 2-3 horas)**
1. ✅ **Excel Generator completo** (5 hojas)
2. ✅ **Lazy loading** de exceljs (bundle optimization)
3. ✅ **Infografías** (opcional - Chart.js en PDF)

---

## 📚 Referencias

- **jsPDF**: https://github.com/parallax/jsPDF
- **jspdf-autotable**: https://github.com/simonbengtsson/jsPDF-AutoTable
- **ExcelJS**: https://github.com/exceljs/exceljs
- **CSV RFC 4180**: https://www.rfc-editor.org/rfc/rfc4180

---

## 🎓 Aprendizajes y Decisiones

1. **Client-side vs Server-side generation**:
   - PDF/CSV: Client-side (mejor control visual, no bloquea servidor)
   - Excel: Client-side también (ExcelJS funciona en browser)

2. **Bundle size**:
   - jspdf + autotable: ~170KB (aceptable)
   - exceljs: ~500KB (lazy load obligatorio)

3. **Encoding CSV**:
   - UTF-8 BOM es crítico para Excel en Windows
   - Escape de comillas dobles con `""`

4. **Formato moneda**:
   - Excel: `numFmt = '#,##0.00 €'`
   - PDF: `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`

5. **Performance**:
   - Datasets < 100 transacciones: Client-side OK
   - Datasets > 500 transacciones: Considerar server-side generation

---

**Estado**: ✅ Documento completado - Listo para implementar  
**Próximo paso**: Crear rama `feat/export-system` y comenzar con Fase 0
