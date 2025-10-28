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
      `SELECT 
         hm.profile_id, 
         p.email, 
         p.display_name,
         hm.role, 
         hm.joined_at,
         COALESCE(
           (SELECT get_member_income($1, hm.profile_id)),
           0
         ) as current_income
       FROM household_members hm
       INNER JOIN profiles p ON p.id = hm.profile_id
       WHERE hm.household_id = $1
       ORDER BY 
         CASE WHEN hm.role = 'owner' THEN 0 ELSE 1 END,
         hm.joined_at ASC`,
      [householdId],
    );

    return NextResponse.json({ members: res.rows });
  } catch (error) {
    console.error('[GET /api/sickness/household/members] error:', error);
    return NextResponse.json({ error: 'Error al listar miembros' }, { status: 500 });
  }
}
