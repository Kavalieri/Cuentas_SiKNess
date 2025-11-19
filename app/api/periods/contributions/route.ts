'use server';

import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { getContributionsData } from '@/lib/contributions/getContributionsData';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * API Route: GET /api/periods/contributions
 *
 * Obtiene datos de contribuciones para un período específico.
 *
 * Issue #61: Refactorizado para usar función compartida getContributionsData()
 * que contiene TODA la lógica de cálculo completa (sin simplificaciones).
 */
export async function GET(req: NextRequest) {
  try {
    // Autenticación
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const householdId = await getUserHouseholdId();
    if (!householdId)
      return NextResponse.json({ error: 'No tienes un hogar activo' }, { status: 400 });

    // Query parameters
    const { searchParams } = new URL(req.url);
    const qPeriodId = searchParams.get('periodId');
    const qYear = searchParams.get('year');
    const qMonth = searchParams.get('month');

    // Obtener datos usando función compartida (lógica completa)
    const data = await getContributionsData(householdId, {
      periodId: qPeriodId ?? undefined,
      year: qYear ? Number(qYear) : undefined,
      month: qMonth ? Number(qMonth) : undefined,
    });

    // Si no hay período, retornar vacío
    if (!data.period.id) {
      return NextResponse.json({ ok: true, contributions: [] });
    }

    // Formatear respuesta (mantener estructura completa del formato original)
    const enriched = data.contributions.map((c) => ({
      profile_id: c.profile_id,
      email: c.email,
      display_name: c.display_name,
      income: c.income,
      share_percent: c.share_percent,
      base_expected: c.base_expected,
      direct_expenses: c.direct_expenses,
      common_contributions: c.common_contributions,
      expected_amount: c.expected_amount,
      expected_after_direct: c.expected_after_direct,
      paid_amount: c.paid_amount,
      pending_amount: c.pending_amount,
      overpaid_amount: c.overpaid_amount,
      status: c.status,
      calculation_method: c.calculation_method,
    }));

    return NextResponse.json({
      ok: true,
      contributions: enriched,
      period: {
        year: data.period.year,
        month: data.period.month,
        calculationType: data.period.calculationType,
        monthlyBudget: data.period.monthlyBudget,
        phase: data.period.phase,
      },
    });
  } catch (error) {
    console.error('[GET /api/periods/contributions] error:', error);
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 });
  }
}
