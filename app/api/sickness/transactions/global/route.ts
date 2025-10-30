import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/sickness/transactions/global
 * Retorna transacciones globales del hogar (sin filtro de periodo)
 * Query params: householdId, limit, flowType, memberId, categoryId, startDate, endDate
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const limitParam = searchParams.get('limit');
    const flowType = searchParams.get('flowType'); // 'all' | 'common' | 'direct'
    const memberId = searchParams.get('memberId');
    const categoryId = searchParams.get('categoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search'); // Para filtros de búsqueda por descripción

    // Solo aplicar limit reducido si NO hay filtros de búsqueda activos
    const hasSearchFilters = search || categoryId || flowType !== 'all';
    const limit = hasSearchFilters ? 1000 : (limitParam ? Math.min(parseInt(limitParam, 10), 500) : 100);

    if (!householdId) {
      return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });
    }

    // Construir query dinámicamente según filtros
    const conditions: string[] = ['t.household_id = $1'];
    const params: unknown[] = [householdId];
    let paramIndex = 2;

    if (flowType && flowType !== 'all') {
      conditions.push(`t.flow_type = $${paramIndex}`);
      params.push(flowType);
      paramIndex++;
    }

    if (memberId) {
      conditions.push(`(t.profile_id = $${paramIndex} OR t.real_payer_id = $${paramIndex})`);
      params.push(memberId);
      paramIndex++;
    }

    if (categoryId) {
      conditions.push(`t.category_id = $${paramIndex}`);
      params.push(categoryId);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`t.occurred_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`t.occurred_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `
      SELECT
        t.id,
        t.type,
        t.amount,
        t.currency,
        t.description,
        t.occurred_at,
        t.performed_at,
        t.flow_type,
        t.profile_id,
        t.real_payer_id,
        t.paid_by,
        t.category_id,
        c.name as category_name,
        c.icon as category_icon,
        sc.name as subcategory_name,
        sc.icon as subcategory_icon,
        pc.name as parent_category_name,
        p.email as profile_email,
        p.display_name as profile_display_name,
        rp.email as real_payer_email,
        rp.display_name as real_payer_display_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories sc ON sc.id = t.category_id
      LEFT JOIN categories pc ON sc.parent_category_id = pc.id
      LEFT JOIN profiles p ON t.profile_id = p.id
      LEFT JOIN profiles rp ON t.real_payer_id = rp.id
      ${whereClause}
  -- Ordenar por la fecha/hora real del evento, luego fecha contable y finalmente captura
  ORDER BY t.performed_at DESC NULLS LAST, t.occurred_at DESC, t.created_at DESC
      LIMIT $${paramIndex}
    `,
      [...params, limit],
    );

    return NextResponse.json({
      transactions: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('[API] Error fetching global transactions:', error);
    return NextResponse.json({ error: 'Error al obtener transacciones globales' }, { status: 500 });
  }
}
