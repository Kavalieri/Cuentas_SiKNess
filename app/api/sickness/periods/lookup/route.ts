import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { MonthlyPeriods } from '@/types/database.generated';

/**
 * GET /api/sickness/periods/lookup?date=YYYY-MM-DD
 * 
 * Busca el periodo mensual correspondiente a una fecha específica
 * Retorna información sobre la fase y tipos de transacción permitidos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Parámetro date requerido (formato YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Validar formato de fecha
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateParam)) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido. Usar YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Buscar periodo que contenga esta fecha
    // Note: monthly_periods no tiene start_date/end_date, usamos year/month para calcular
    const result = await query<MonthlyPeriods>(
      `
      SELECT 
        id,
        household_id,
        year,
        month,
        phase,
        status,
        created_at,
        updated_at
      FROM monthly_periods
      WHERE year = EXTRACT(YEAR FROM $1::date)
        AND month = EXTRACT(MONTH FROM $1::date)
      LIMIT 1
      `,
      [dateParam]
    );

    if (result.rows.length === 0) {
      // No existe periodo para esta fecha
      return NextResponse.json({
        found: false,
        date: dateParam,
        message: 'No existe un periodo mensual para esta fecha',
        allowedTypes: [],
        phase: null,
      });
    }

    const period = result.rows[0]!; // Assertion: ya verificamos que existe
    
    // Extraer el valor de phase (es un ColumnType en Kysely)
    // El type de phase puede ser complejo, usamos string como safe cast
    const phaseValue = String(
      typeof period.phase === 'object' && period.phase !== null 
        ? (period.phase as { value?: string }).value || period.phase
        : period.phase
    );

    // Determinar tipos permitidos según fase
    let allowedTypes: string[] = [];
    let message = '';
    let canCreate = true;

    switch (phaseValue) {
      case 'preparing':
        // Fase preparing: Solo lectura, no se pueden crear movimientos
        allowedTypes = [];
        message = 'Periodo en preparación. No se pueden crear movimientos.';
        canCreate = false;
        break;

      case 'validation':
        // Fase validation: Solo gastos directos previos
        allowedTypes = ['direct_expense'];
        message = 'Periodo en validación. Solo gastos directos previos.';
        canCreate = true;
        break;

      case 'active':
        // Fase active: Todos los tipos permitidos
        allowedTypes = ['income', 'expense', 'direct_income', 'direct_expense'];
        message = 'Periodo activo. Todos los tipos de movimiento permitidos.';
        canCreate = true;
        break;

      case 'closing':
        // Periodo en cierre: No se pueden crear movimientos nuevos
        allowedTypes = [];
        message = 'Periodo en proceso de cierre. No se pueden crear movimientos.';
        canCreate = false;
        break;

      case 'closed':
        // Periodo cerrado: No se pueden crear movimientos
        allowedTypes = [];
        message = 'Periodo cerrado. No se pueden crear movimientos.';
        canCreate = false;
        break;

      default:
        allowedTypes = [];
        message = 'Estado de periodo desconocido.';
        canCreate = false;
    }

    return NextResponse.json({
      found: true,
      date: dateParam,
      period: {
        id: period.id,
        year: period.year,
        month: period.month,
        phase: phaseValue,
        status: period.status,
      },
      allowedTypes,
      canCreate,
      message,
    });
  } catch (error) {
    console.error('Error en lookup de periodo:', error);
    return NextResponse.json(
      { error: 'Error al buscar periodo' },
      { status: 500 }
    );
  }
}
