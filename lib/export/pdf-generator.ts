/**
 * GENERADOR DE PDF - Resumen Mensual Ejecutivo
 * 
 * Genera un PDF profesional de 1-2 páginas con:
 * - Header: Logo/nombre hogar + período
 * - Sección 1: Resumen Financiero
 * - Sección 2: Balance Desglosado
 * - Sección 3: Contribuciones (tabla)
 * - Sección 4: Top 10 Transacciones (tabla)
 * - Sección 5: Ahorro del Hogar
 * - Footer: Fecha generación + paginación
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportData } from './types';

/**
 * Genera un PDF con el resumen mensual completo
 */
export async function generateMonthlyPDF(data: ExportData): Promise<Blob> {
  const doc = new jsPDF();
  
  // Colores del tema
  const PRIMARY_COLOR = [66, 139, 202] as [number, number, number]; // Blue
  const SUCCESS_COLOR = [40, 167, 69] as [number, number, number]; // Green
  const WARNING_COLOR = [255, 193, 7] as [number, number, number]; // Yellow
  const DANGER_COLOR = [220, 53, 69] as [number, number, number]; // Red
  
  let yPos = 20;
  
  // ============================================
  // HEADER
  // ============================================
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`🏠 ${data.householdName}`, 20, yPos);
  
  yPos += 8;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`📅 ${data.period}`, 20, yPos);
  
  yPos += 4;
  doc.setDrawColor(...PRIMARY_COLOR);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  
  yPos += 10;
  
  // ============================================
  // SECCIÓN 1: RESUMEN FINANCIERO
  // ============================================
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('📊 RESUMEN FINANCIERO', 20, yPos);
  doc.setTextColor(0, 0, 0);
  
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  const incomeText = `Ingresos:          ${formatCurrency(data.summary.totalIncome)}`;
  doc.text(incomeText, 25, yPos);
  yPos += 6;
  
  const expensesText = `Gastos:            ${formatCurrency(data.summary.totalExpenses)}`;
  doc.text(expensesText, 25, yPos);
  yPos += 6;
  
  const balanceText = `Balance:           ${formatCurrency(data.summary.balance)}`;
  doc.setFont('helvetica', 'bold');
  if (data.summary.balance >= 0) {
    doc.setTextColor(...SUCCESS_COLOR);
    doc.text(balanceText + ' ✅', 25, yPos);
  } else {
    doc.setTextColor(...DANGER_COLOR);
    doc.text(balanceText + ' ⚠️', 25, yPos);
  }
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  yPos += 12;
  
  // ============================================
  // SECCIÓN 2: BALANCE DESGLOSADO
  // ============================================
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('💰 BALANCE DESGLOSADO', 20, yPos);
  doc.setTextColor(0, 0, 0);
  
  yPos += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Balance Libre:        ${formatCurrency(data.balance.free)}`, 25, yPos);
  yPos += 6;
  doc.text(`Créditos Activos:     ${formatCurrency(data.balance.activeCredits)}`, 25, yPos);
  yPos += 6;
  doc.text(`Créditos Reservados:  ${formatCurrency(data.balance.reservedCredits)}`, 25, yPos);
  
  yPos += 12;
  
  // ============================================
  // SECCIÓN 3: CONTRIBUCIONES (Tabla)
  // ============================================
  if (data.contributions && data.contributions.length > 0) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('👥 CONTRIBUCIONES', 20, yPos);
    doc.setTextColor(0, 0, 0);
    
    yPos += 4;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Miembro', 'Esperado', 'Pagado', 'Estado']],
      body: data.contributions.map(c => [
        c.memberName,
        formatCurrency(c.expected),
        formatCurrency(c.paid),
        getStatusEmoji(c.status)
      ]),
      theme: 'grid',
      headStyles: { 
        fillColor: PRIMARY_COLOR,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11
      },
      bodyStyles: {
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 30, halign: 'center' }
      }
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable?.finalY || yPos;
    yPos += 10;
  }
  
  // Verificar si necesitamos nueva página
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  // ============================================
  // SECCIÓN 4: TOP 10 TRANSACCIONES (Tabla)
  // ============================================
  if (data.transactions && data.transactions.length > 0) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('📋 TOP 10 TRANSACCIONES', 20, yPos);
    doc.setTextColor(0, 0, 0);
    
    yPos += 4;
    
    const top10 = data.transactions.slice(0, 10);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Fecha', 'Tipo', 'Categoría', 'Monto']],
      body: top10.map(t => [
        formatDate(t.date),
        t.type === 'income' ? '📥 Ingreso' : '📤 Gasto',
        t.category,
        formatCurrency(t.amount)
      ]),
      theme: 'striped',
      headStyles: { 
        fillColor: PRIMARY_COLOR,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11
      },
      bodyStyles: {
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 70 },
        3: { cellWidth: 40, halign: 'right' }
      }
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable?.finalY || yPos;
    yPos += 10;
  }
  
  // Verificar si necesitamos nueva página para ahorro
  if (data.savings && yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  
  // ============================================
  // SECCIÓN 5: AHORRO DEL HOGAR
  // ============================================
  if (data.savings) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text('💾 AHORRO DEL HOGAR', 20, yPos);
    doc.setTextColor(0, 0, 0);
    
    yPos += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Balance actual: ${formatCurrency(data.savings.balance)}`, 25, yPos);
    yPos += 6;
    
    if (data.savings.goal) {
      const progress = (data.savings.balance / data.savings.goal) * 100;
      const progressText = `Meta: ${formatCurrency(data.savings.goal)} (${progress.toFixed(0)}% completado)`;
      doc.text(progressText, 25, yPos);
      yPos += 6;
      
      // Barra de progreso visual
      const barWidth = 150;
      const barHeight = 8;
      const barX = 25;
      const barY = yPos;
      
      // Fondo gris
      doc.setFillColor(220, 220, 220);
      doc.rect(barX, barY, barWidth, barHeight, 'F');
      
      // Progreso en azul
      const progressWidth = (barWidth * progress) / 100;
      if (progress >= 100) {
        doc.setFillColor(...SUCCESS_COLOR);
      } else if (progress >= 50) {
        doc.setFillColor(...PRIMARY_COLOR);
      } else {
        doc.setFillColor(...WARNING_COLOR);
      }
      doc.rect(barX, barY, progressWidth, barHeight, 'F');
      
      // Borde
      doc.setDrawColor(100, 100, 100);
      doc.rect(barX, barY, barWidth, barHeight, 'S');
      
      yPos += barHeight + 6;
    }
    
    if (data.savings.goalDescription) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Objetivo: ${data.savings.goalDescription}`, 25, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 6;
    }
    
    doc.setFontSize(12);
    doc.text(`Movimientos en el período: ${data.savings.movements}`, 25, yPos);
  }
  
  // ============================================
  // FOOTER EN TODAS LAS PÁGINAS
  // ============================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    
    // Fecha generación (izquierda)
    const generatedText = `Generado: ${new Date().toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    doc.text(generatedText, 20, doc.internal.pageSize.height - 10);
    
    // Paginación (derecha)
    const pageText = `Página ${i} de ${pageCount}`;
    const pageTextWidth = doc.getTextWidth(pageText);
    doc.text(
      pageText,
      doc.internal.pageSize.width - 20 - pageTextWidth,
      doc.internal.pageSize.height - 10
    );
  }
  
  // Generar blob
  return doc.output('blob');
}

/**
 * Formatea un número como moneda
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

/**
 * Formatea una fecha ISO a formato español
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Retorna emoji según estado de contribución
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'paid':
      return '✅ Pagado';
    case 'overpaid':
      return '💚 Sobrepago';
    case 'partial':
      return '⏳ Parcial';
    case 'pending':
      return '⚠️ Pendiente';
    default:
      return '❓ Desconocido';
  }
}
