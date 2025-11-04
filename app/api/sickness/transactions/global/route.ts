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
    const type = searchParams.get('type'); // 'income' | 'expense' | '' (todos)
    const flowType = searchParams.get('flowType'); // 'common' | 'direct' | '' (todos)
    const memberId = searchParams.get('memberId');
    const groupId = searchParams.get('groupId'); // Filtro por grupo (category_parents)
    const categoryId = searchParams.get('categoryId');
    const subcategoryId = searchParams.get('subcategoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search'); // Para filtros de búsqueda por descripción

    // Solo aplicar limit reducido si NO hay filtros de búsqueda activos
    const hasSearchFilters = search || categoryId || subcategoryId || groupId || type || flowType;
    const limit = hasSearchFilters ? 1000 : (limitParam ? Math.min(parseInt(limitParam, 10), 500) : 100);

    if (!householdId) {
      return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });
    }

    // Construir query dinámicamente según filtros
    const conditions: string[] = ['t.household_id = $1'];
    const params: unknown[] = [householdId];
    let paramIndex = 2;

    // Filtro de tipo: income o expense (incluye sus variantes direct_income y direct_expense)
    if (type && type !== 'all') {
      if (type === 'income') {
        conditions.push(`(t.type = 'income' OR t.type = 'direct_income')`);
      } else if (type === 'expense') {
        conditions.push(`(t.type = 'expense' OR t.type = 'direct_expense')`);
      }
    }

    // Filtro de flujo: common o direct
    if (flowType && flowType !== 'all') {
      conditions.push(`t.flow_type = $${paramIndex}`);
      params.push(flowType);
      paramIndex++;
    }

    if (memberId) {
      conditions.push(`(t.profile_id = $${paramIndex} OR t.performed_by_profile_id = $${paramIndex})`);
      params.push(memberId);
      paramIndex++;
    }

    // Filtro por grupo (category_parents) - busca en ambas rutas
    if (groupId) {
      conditions.push(`(cp.id = $${paramIndex} OR cp_from_sub.id = $${paramIndex})`);
      params.push(groupId);
      paramIndex++;
    }

    // Filtro por categoría (nivel 2) - busca en ambas rutas
    if (categoryId) {
      conditions.push(`(t.category_id = $${paramIndex} OR cat_from_sub.id = $${paramIndex})`);
      params.push(categoryId);
      paramIndex++;
    }

    // Filtro por subcategoría (nivel 3)
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
        t.profile_id,
        t.paid_by,
        t.category_id,
        t.subcategory_id,
        t.transaction_number,
        t.transaction_pair_id,
        t.is_compensatory_income,
        -- SISTEMA DUAL-FIELD (Issue #20)
        t.performed_by_profile_id,
        COALESCE(p_performer.display_name, p_performer.email) as performed_by_display_name,
        -- Subcategoría (nivel 3)
        sc.name as subcategory_name,
        sc.icon as subcategory_icon,
        -- Categoría (nivel 2) - puede venir directamente o desde el parent de subcategory
        COALESCE(cat.name, cat_from_sub.name) as category_name,
        COALESCE(cat.icon, cat_from_sub.icon) as category_icon,
        -- Grupo/Parent (nivel 1) - desde category_parents
        COALESCE(cp.name, cp_from_sub.name) as parent_category_name,
        -- Información de perfiles
        p.email as profile_email,
        p.display_name as profile_display_name,
        -- paid_by: puede ser miembro O Cuenta Común
        CASE
          WHEN ja.id IS NOT NULL THEN ja.display_name
          WHEN pb.display_name IS NOT NULL THEN pb.display_name
          ELSE NULL
        END as paid_by_display_name,
        pb.email as paid_by_email,
        ja.id IS NOT NULL as paid_by_is_joint_account
      FROM transactions t
      -- Subcategoría (tabla subcategories)
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      -- Categoría desde subcategoría (subcategories.category_id → categories.id)
      LEFT JOIN categories cat_from_sub ON sc.category_id = cat_from_sub.id
      -- Grupo desde categoría de subcategoría (categories.parent_id → category_parents.id)
      LEFT JOIN category_parents cp_from_sub ON cat_from_sub.parent_id = cp_from_sub.id
      -- Categoría directa (legacy: transactions.category_id → categories.id)
      LEFT JOIN categories cat ON t.category_id = cat.id
      -- Grupo desde categoría directa (categories.parent_id → category_parents.id)
      LEFT JOIN category_parents cp ON cat.parent_id = cp.id
      -- Perfiles
      LEFT JOIN profiles p ON t.profile_id = p.id
      LEFT JOIN profiles pb ON t.paid_by = pb.id
      -- Ejecutor físico (NUEVO - Issue #20)
      LEFT JOIN profiles p_performer ON t.performed_by_profile_id = p_performer.id
      -- Cuenta Común (join_accounts)
      LEFT JOIN joint_accounts ja ON t.paid_by = ja.id
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
