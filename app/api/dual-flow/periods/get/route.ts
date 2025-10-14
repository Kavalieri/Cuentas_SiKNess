import { getPeriod } from '@/app/app/periods/actions';
import { getUserHouseholdId } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * API para obtener datos de un período específico
 * POST /api/dual-flow/periods/get
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, month } = body;

    // Validar parámetros
    if (!year || !month || typeof year !== 'number' || typeof month !== 'number') {
      return NextResponse.json({ ok: false, message: 'Año y mes son requeridos' }, { status: 400 });
    }

    // Verificar que el usuario tenga un hogar activo
    const householdId = await getUserHouseholdId();
    if (!householdId) {
      return NextResponse.json(
        { ok: false, message: 'No tienes un hogar activo' },
        { status: 400 },
      );
    }

    // Obtener el período usando la action existente
    const result = await getPeriod(year, month);

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        data: result.data,
        householdId,
        period: { year, month },
      });
    } else {
      return NextResponse.json({ ok: false, message: result.message }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in periods/get API:', error);
    return NextResponse.json({ ok: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
