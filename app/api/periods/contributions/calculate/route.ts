import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { calculateContributionsWithDirectExpenses } from '@/lib/contributions/periods';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, message: 'No autenticado' }, { status: 401 });

    const householdId = await getUserHouseholdId();
    if (!householdId)
      return NextResponse.json({ ok: false, message: 'No tienes un hogar activo' }, { status: 400 });

    // Obtener periodo actual (año y mes)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Calcular y upsert contribuciones
    const result = await calculateContributionsWithDirectExpenses(householdId, year, month);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, calculations: result.data });
  } catch (error) {
    console.error('[POST /api/periods/contributions/calculate] error:', error);
    return NextResponse.json({ ok: false, message: 'Error interno' }, { status: 500 });
  }
}
