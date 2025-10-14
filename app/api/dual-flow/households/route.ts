import { getCurrentUser, query } from '@/lib/supabaseServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const CreateHouseholdSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo'),
});

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Validar datos
    const body = await request.json();
    const { name } = CreateHouseholdSchema.parse(body);

    // Generar UUID para el hogar
    const householdId = crypto.randomUUID();

    // Crear el hogar
    await query(
      `INSERT INTO households (id, name, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [householdId, name, user.profile_id],
    );

    // Agregar al usuario como owner del hogar
    await query(
      `INSERT INTO household_members (profile_id, household_id, role, joined_at)
       VALUES ($1, $2, 'owner', NOW())`,
      [user.profile_id, householdId],
    );

    // Crear configuración por defecto del hogar
    await query(
      `INSERT INTO household_settings (household_id, monthly_contribution_goal, calculation_type, currency, updated_at, updated_by)
       VALUES ($1, NULL, 'equal', 'EUR', NOW(), $2)`,
      [householdId, user.profile_id],
    );

    // Establecer como hogar activo del usuario
    await query(
      `INSERT INTO user_settings (profile_id, active_household_id, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (profile_id)
       DO UPDATE SET active_household_id = $2, updated_at = NOW()`,
      [user.profile_id, householdId],
    );

    return NextResponse.json({
      success: true,
      householdId,
      message: 'Hogar creado exitosamente',
    });
  } catch (error) {
    console.error('Error creating household:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
