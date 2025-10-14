import { getUserHouseholdId } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * GET /api/dual-flow/household/get
 * Obtiene el household_id del usuario autenticado
 */
export async function GET() {
  try {
    const householdId = await getUserHouseholdId();

    if (!householdId) {
      return NextResponse.json(
        {
          ok: false,
          message: 'No tienes un hogar activo',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: { householdId },
    });
  } catch (error) {
    console.error('Error getting household ID:', error);
    return NextResponse.json(
      {
        ok: false,
        message: 'Error interno del servidor',
      },
      { status: 500 },
    );
  }
}
