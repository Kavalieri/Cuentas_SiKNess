/**
 * ENDPOINT TEMPORAL SOLO PARA DESARROLLO
 * Recalcular contributions reseteando adjustments_total
 * 
 * NOTA: El trigger debe actualizarse manualmente en Supabase SQL Editor
 * Este endpoint solo recalcula datos existentes
 */

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST() {
  try {
    const supabase = await supabaseServer();

    // PASO 1: Resetear adjustments_total en todas las contribuciones
    // Primero obtener todas las que tienen ajustes
    const { data: contribs, error: fetchError } = await supabase
      .from('contributions')
      .select('id, expected_amount, adjustments_total')
      .not('adjustments_total', 'is', null);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let resetCount = 0;
    if (contribs) {
      for (const contrib of contribs) {
        // Skip if expected_amount is NULL (member not configured)
        if (contrib.expected_amount === null) continue;
        
        if (contrib.adjustments_total !== 0) {
          // Resetear: quitar el adjustments_total del expected_amount
          const newExpectedAmount = contrib.expected_amount - (contrib.adjustments_total || 0);
          
          await supabase
            .from('contributions')
            .update({
              adjustments_total: 0,
              expected_amount: newExpectedAmount,
            })
            .eq('id', contrib.id);
          
          resetCount++;
        }
      }
    }

    // PASO 2: Obtener todas las contribuciones con ajustes APPROVED
    const { data: approvedAdjustments } = await supabase
      .from('contribution_adjustments')
      .select('contribution_id, amount')
      .eq('status', 'approved');

    // Agrupar por contribution_id y sumar amounts
    const adjustmentsByContribution = new Map<string, number>();
    if (approvedAdjustments) {
      for (const adj of approvedAdjustments) {
        const current = adjustmentsByContribution.get(adj.contribution_id) || 0;
        adjustmentsByContribution.set(adj.contribution_id, current + adj.amount);
      }
    }

    // PASO 3: Aplicar adjustments_total SOLO de approved
    let recalcCount = 0;
    for (const [contributionId, totalAdjustments] of adjustmentsByContribution.entries()) {
      const { data: contrib } = await supabase
        .from('contributions')
        .select('expected_amount')
        .eq('id', contributionId)
        .single();

      if (contrib && contrib.expected_amount !== null) {
        await supabase
          .from('contributions')
          .update({
            adjustments_total: totalAdjustments,
            expected_amount: contrib.expected_amount + totalAdjustments,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contributionId);
        
        recalcCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Recalculo completado',
      resetCount,
      recalcCount,
      warning: 'IMPORTANTE: Debes ejecutar db/EXECUTE_IN_SUPABASE_fix_adjustments.sql en Supabase SQL Editor para actualizar el trigger'
    });

  } catch (error) {
    console.error('Error ejecutando script:', error);
    return NextResponse.json({ 
      error: 'Error ejecutando script',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
