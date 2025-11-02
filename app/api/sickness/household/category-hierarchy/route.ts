import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * GET /api/sickness/household/category-hierarchy
 * Retorna la jerarquía completa de categorías: grupos, categorías y subcategorías
 * Query params: householdId, type (opcional: 'income' | 'expense')
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');
    const type = searchParams.get('type'); // 'income' | 'expense' | null

    if (!householdId) {
      return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });
    }

    // Verificar que el usuario pertenece al hogar
    const allowed = await query(
      `SELECT 1 FROM household_members WHERE household_id = $1 AND profile_id = $2 LIMIT 1`,
      [householdId, user.profile_id],
    );
    if (allowed.rowCount === 0) {
      return NextResponse.json({ error: 'Sin permiso para este hogar' }, { status: 403 });
    }

    // Construir condición de tipo si se especifica
    const typeCondition = type ? `AND type = '${type}'` : '';

    // Cargar grupos (category_parents)
    const groupsResult = await query(
      `SELECT id, name, icon, type, display_order
       FROM category_parents
       WHERE household_id = $1 ${typeCondition}
       ORDER BY display_order ASC, name ASC`,
      [householdId],
    );

    // Cargar categorías (categories - nivel 2)
    const categoriesResult = await query(
      `SELECT id, name, icon, type, parent_id, display_order
       FROM categories
       WHERE household_id = $1 ${typeCondition}
       ORDER BY display_order ASC, name ASC`,
      [householdId],
    );

    // Cargar subcategorías (subcategories - nivel 3)
    const subcategoriesResult = await query(
      `SELECT s.id, s.name, s.icon, s.category_id, s.display_order, c.type
       FROM subcategories s
       JOIN categories c ON s.category_id = c.id
       WHERE c.household_id = $1 ${typeCondition}
       ORDER BY s.display_order ASC, s.name ASC`,
      [householdId],
    );

    return NextResponse.json({
      groups: groupsResult.rows,
      categories: categoriesResult.rows,
      subcategories: subcategoriesResult.rows,
    });
  } catch (error) {
    console.error('[GET /api/sickness/household/category-hierarchy] error:', error);
    return NextResponse.json({ error: 'Error al obtener jerarquía de categorías' }, { status: 500 });
  }
}
