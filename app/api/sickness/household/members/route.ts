import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');
    if (!householdId) return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });

    // Verificar que el usuario pertenece al hogar
    const allowed = await query(
      `SELECT 1 FROM household_members WHERE household_id = $1 AND profile_id = $2 LIMIT 1`,
      [householdId, user.profile_id],
    );
    if (allowed.rowCount === 0)
      return NextResponse.json({ error: 'Sin permiso para este hogar' }, { status: 403 });

    const res = await query(
      `SELECT profile_id, email, role, joined_at, current_income
       FROM get_household_members_optimized($1)`,
      [householdId],
    );

    return NextResponse.json({ members: res.rows });
  } catch (error) {
    console.error('[GET /api/sickness/household/members] error:', error);
    return NextResponse.json({ error: 'Error al listar miembros' }, { status: 500 });
  }
}
