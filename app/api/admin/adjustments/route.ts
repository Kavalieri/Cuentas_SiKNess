import { getCurrentUser, supabaseServer } from '@/lib/supabaseServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const supabase = await supabaseServer();

    // Verificar que el usuario es admin (owner de al menos un hogar)
    const { data: isAdmin } = await supabase
      .from('household_members')
      .select('profile_id')
      .eq('role', 'owner')
      .limit(1);

    if (!isAdmin || isAdmin.length === 0) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener todos los ajustes con información del perfil y contribución
    const { data: adjustments, error } = await supabase
      .from('contribution_adjustments')
      .select(
        `
        id,
        contribution_id,
        amount,
        type,
        reason,
        created_at,
        movement_id,
        contributions!inner(
          profile_id,
          year,
          month,
          profiles!inner(
            email
          )
        )
      `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching adjustments:', error);
      return NextResponse.json({ error: 'Error al obtener ajustes' }, { status: 500 });
    }

    // Transformar los datos para el frontend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedData =
      adjustments?.map((adj: any) => ({
        id: adj.id,
        contribution_id: adj.contribution_id,
        amount: adj.amount,
        type: adj.type,
        reason: adj.reason,
        created_at: adj.created_at,
        movement_id: adj.movement_id,
        profile_email: adj.contributions.profiles.email,
        year: adj.contributions.year,
        month: adj.contributions.month,
      })) || [];

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
