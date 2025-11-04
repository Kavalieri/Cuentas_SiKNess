import { query } from '@/lib/pgServer';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/sickness/transactions/global
 * Retorna transacciones globales del hogar (sin filtro de periodo)
 * Query params: householdId, limit, flowType, memberId, groupId, categoryId, subcategoryId, startDate, endDate
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const flowType = searchParams.get('flowType'); // 'all' | 'common' | 'direct'
    const memberId = searchParams.get('memberId');
    const groupId = searchParams.get('groupId'); // Filtro por grupo (category_parents)
    const categoryId = searchParams.get('categoryId');
    const subcategoryId = searchParams.get('subcategoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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

    if (groupId) {
      conditions.push(`cp.id = $${paramIndex}`);
      params.push(groupId);
      paramIndex++;
    }

    if (categoryId) {
      conditions.push(`t.category_id = $${paramIndex}`);
      params.push(categoryId);
      paramIndex++;
    }

    if (subcategoryId) {
      conditions.push(`t.subcategory_id = $${paramIndex}`);
      params.push(subcategoryId);
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
        t.transaction_number,
        t.transaction_pair_id,
        t.profile_id,
        t.real_payer_id,
        t.paid_by,
        t.category_id,
        t.subcategory_id,
        t.is_compensatory_income,
        -- Jerarquía completa de categorías (3 niveles)
        cp.name as parent_category_name,
        c.name as category_name,
        c.icon as category_icon,
        sc.name as subcategory_name,
        sc.icon as subcategory_icon,
        -- Información de perfiles
        p.email as profile_email,
        p.display_name as profile_display_name,
        rp.email as real_payer_email,
        rp.display_name as real_payer_display_name,
        pb.email as paid_by_email,
        pb.display_name as paid_by_display_name,
        -- Ejecutor físico (performed_by)
        perf.id as performed_by_profile_id,
        perf.display_name as performed_by_display_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN category_parents cp ON c.parent_id = cp.id
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      LEFT JOIN profiles p ON t.profile_id = p.id
      LEFT JOIN profiles rp ON t.real_payer_id = rp.id
      LEFT JOIN profiles pb ON t.paid_by = pb.id
      LEFT JOIN profiles perf ON t.performed_by_profile_id = perf.id
      ${whereClause}
      -- Ordenar SOLO por la fecha que introduce el usuario (occurred_at)
      -- Secundario: transaction_number DESC para mantener orden visual consistente
      ORDER BY t.occurred_at DESC, t.transaction_number DESC
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
