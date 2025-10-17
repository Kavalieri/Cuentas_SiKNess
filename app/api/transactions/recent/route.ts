import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

type FlowType = 'all' | 'common' | 'direct';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');
    const flowType = (searchParams.get('flowType') as FlowType) || 'all';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '5', 10), 1), 50);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    const month = monthParam ? parseInt(monthParam, 10) : undefined;
    const memberId = searchParams.get('memberId');
    const categoryId = searchParams.get('categoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });
    }

    let paramIndex = 1;
    let text = `SELECT * FROM transactions WHERE household_id = $${paramIndex++}`;
    const params: Array<string | number> = [householdId];

    // Filtro de fechas: prioridad a startDate/endDate si ambos presentes; si no, usar year/month
    if (startDate && endDate) {
      text += ` AND occurred_at >= $${paramIndex++} AND occurred_at < ($${paramIndex++}::date + INTERVAL '1 day')`;
      params.push(startDate, endDate);
    } else if (typeof year === 'number' && typeof month === 'number') {
      // Rango mensual: [primer día del mes, primer día del mes siguiente)
      text += ` AND occurred_at >= make_date($${paramIndex++}, $${paramIndex++}, 1)`;
      text += ` AND occurred_at < (make_date($${paramIndex - 2}, $${paramIndex - 1}, 1) + INTERVAL '1 month')`;
      params.push(year, month);
    }

    if (flowType !== 'all') {
      text += ` AND flow_type = $${paramIndex++}`;
      params.push(flowType);
    }

    if (memberId) {
      // Filtra por profile_id (miembro creador o asignado a la transacción)
      text += ` AND (profile_id = $${paramIndex} OR real_payer_id = $${paramIndex})`;
      params.push(memberId);
      paramIndex++;
    }

    if (categoryId) {
      text += ` AND category_id = $${paramIndex++}`;
      params.push(categoryId);
    }

    text += ` ORDER BY occurred_at DESC, created_at DESC LIMIT $${paramIndex++}`;
    params.push(limit);

    const result = await query(text, params);
    return NextResponse.json({ transactions: result.rows });
  } catch (error) {
    console.error('[GET /api/transactions/recent] error:', error);
    return NextResponse.json({ error: 'Error al obtener transacciones' }, { status: 500 });
  }
}
