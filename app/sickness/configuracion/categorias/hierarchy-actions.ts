'use server';

import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { fail, ok, type Result } from '@/lib/result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const CreateParentCategorySchema = z.object({
  householdId: z.string().uuid('ID de hogar inválido'),
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  icon: z.string().min(1, 'El icono es obligatorio'),
  type: z.enum(['income', 'expense'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  displayOrder: z.number().int().min(0).default(0),
});

const UpdateParentCategorySchema = z.object({
  parentId: z.string().uuid('ID de categoría padre inválido'),
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  icon: z.string().min(1, 'El icono es obligatorio'),
  displayOrder: z.number().int().min(0),
});

const DeleteParentCategorySchema = z.object({
  parentId: z.string().uuid('ID de categoría padre inválido'),
});

const CreateSubcategorySchema = z.object({
  categoryId: z.string().uuid('ID de categoría inválido'),
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  icon: z.string().optional(),
  displayOrder: z.number().int().min(0).default(0),
});

const UpdateSubcategorySchema = z.object({
  subcategoryId: z.string().uuid('ID de subcategoría inválido'),
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  icon: z.string().optional(),
  displayOrder: z.number().int().min(0),
});

const DeleteSubcategorySchema = z.object({
  subcategoryId: z.string().uuid('ID de subcategoría inválido'),
});

// ============================================================================
// TYPES
// ============================================================================

export interface ParentCategory {
  id: string;
  householdId: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithSubcategories {
  id: string;
  name: string;
  icon: string | null;
  display_order: number;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  icon: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryHierarchy {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  displayOrder: number;
  categories: CategoryWithSubcategories[];
}

// ============================================================================
// HELPER: Verificar ownership del household
// ============================================================================

async function verifyHouseholdOwnership(householdId: string): Promise<Result<void>> {
  const user = await getCurrentUser();
  if (!user?.id) {
    return fail('No autenticado');
  }

  const result = await query<{ role: string }>(
    `
    SELECT role
    FROM household_members
    WHERE household_id = $1 AND profile_id = $2
    `,
    [householdId, user.profile_id]
  );

  if (result.rows.length === 0) {
    return fail('No perteneces a este hogar');
  }

  const member = result.rows[0];
  if (!member || member.role !== 'owner') {
    return fail('Solo el owner puede gestionar la estructura de categorías');
  }

  return ok();
}

// ============================================================================
// GET HIERARCHY
// ============================================================================

/**
 * Obtiene la jerarquía completa de categorías de un hogar
 * @param householdId - ID del hogar
 * @returns Jerarquía: parents → categories → subcategories
 *
 * OPTIMIZACIÓN (Issue #22): Single query con JOINs en lugar de N+1 queries
 * - Antes: 60+ queries secuenciales (1 + N parents + N² categories)
 * - Ahora: 1 query con LEFT JOINs
 * - Mejora: 10-20x más rápido (600ms → 20-50ms)
 */
export async function getCategoryHierarchy(householdId: string): Promise<Result<CategoryHierarchy[]>> {
  const user = await getCurrentUser();
  if (!user?.id) {
    return fail('No autenticado');
  }

  try {
    const startTime = performance.now();

    // Verificar pertenencia al hogar
    const memberCheck = await query<{ household_id: string; profile_id: string }>(
      `SELECT household_id, profile_id FROM household_members WHERE household_id = $1 AND profile_id = $2`,
      [householdId, user.profile_id]
    );

    if (memberCheck.rows.length === 0) {
      return fail('No perteneces a este hogar');
    }

    // ✅ OPTIMIZACIÓN: Single query con JOINs (reemplaza 60+ queries)
    const result = await query<{
      parent_id: string;
      parent_name: string;
      parent_icon: string;
      parent_type: 'income' | 'expense';
      parent_display_order: number;
      parent_created_at: string;
      parent_updated_at: string;
      category_id: string | null;
      category_name: string | null;
      category_icon: string | null;
      category_display_order: number | null;
      subcategory_id: string | null;
      subcategory_name: string | null;
      subcategory_icon: string | null;
      subcategory_display_order: number | null;
      subcategory_created_at: string | null;
      subcategory_updated_at: string | null;
    }>(`
      SELECT
        cp.id as parent_id,
        cp.name as parent_name,
        cp.icon as parent_icon,
        cp.type as parent_type,
        cp.display_order as parent_display_order,
        cp.created_at as parent_created_at,
        cp.updated_at as parent_updated_at,
        c.id as category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.display_order as category_display_order,
        s.id as subcategory_id,
        s.name as subcategory_name,
        s.icon as subcategory_icon,
        s.display_order as subcategory_display_order,
        s.created_at as subcategory_created_at,
        s.updated_at as subcategory_updated_at
      FROM category_parents cp
      LEFT JOIN categories c
        ON c.parent_id = cp.id AND c.household_id = cp.household_id
      LEFT JOIN subcategories s
        ON s.category_id = c.id
      WHERE cp.household_id = $1
      ORDER BY
        cp.type DESC,
        cp.display_order,
        cp.name,
        c.display_order,
        c.name,
        s.display_order,
        s.name
    `, [householdId]);

    // Construir jerarquía en memoria desde filas planas
    const hierarchyMap = new Map<string, CategoryHierarchy>();
    const categoryMap = new Map<string, CategoryWithSubcategories>();

    for (const row of result.rows) {
      // 1. Obtener o crear parent
      let parent = hierarchyMap.get(row.parent_id);
      if (!parent) {
        parent = {
          id: row.parent_id,
          name: row.parent_name,
          icon: row.parent_icon,
          type: row.parent_type,
          displayOrder: row.parent_display_order,
          categories: [],
        };
        hierarchyMap.set(row.parent_id, parent);
      }

      // 2. Si hay categoría, obtenerla o crearla
      if (row.category_id) {
        const categoryKey = `${row.parent_id}_${row.category_id}`;
        let category = categoryMap.get(categoryKey);

        if (!category) {
          category = {
            id: row.category_id,
            name: row.category_name!,
            icon: row.category_icon,
            display_order: row.category_display_order!,
            subcategories: [],
          };
          categoryMap.set(categoryKey, category);
          parent.categories.push(category);
        }

        // 3. Si hay subcategoría, agregarla (evitar duplicados)
        if (row.subcategory_id) {
          const subcategoryExists = category.subcategories.some(s => s.id === row.subcategory_id);
          if (!subcategoryExists) {
            category.subcategories.push({
              id: row.subcategory_id,
              categoryId: row.category_id,
              name: row.subcategory_name!,
              icon: row.subcategory_icon,
              displayOrder: row.subcategory_display_order!,
              createdAt: row.subcategory_created_at!,
              updatedAt: row.subcategory_updated_at!,
            });
          }
        }
      }
    }

    const hierarchy = Array.from(hierarchyMap.values());
    const endTime = performance.now();
    const executionTime = (endTime - startTime).toFixed(2);

    console.log(`[getCategoryHierarchy] ⚡ Completado en ${executionTime}ms (1 query, ${hierarchy.length} parents)`);

    return ok(hierarchy);
  } catch (error) {
    console.error('[getCategoryHierarchy] ❌ Error fetching category hierarchy:', error);
    return fail('Error al obtener la jerarquía de categorías');
  }
}

// ============================================================================
// PARENT CATEGORIES CRUD
// ============================================================================

/**
 * Crea una nueva categoría padre (owner only)
 */
export async function createParentCategory(formData: FormData): Promise<Result<ParentCategory>> {
  const parsed = CreateParentCategorySchema.safeParse({
    householdId: formData.get('householdId'),
    name: formData.get('name'),
    icon: formData.get('icon'),
    type: formData.get('type'),
    displayOrder: formData.get('displayOrder') ? Number(formData.get('displayOrder')) : 0,
  });

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { householdId, name, icon, type, displayOrder } = parsed.data;

  // Verificar ownership
  const ownershipCheck = await verifyHouseholdOwnership(householdId);
  if (!ownershipCheck.ok) {
    return fail(ownershipCheck.message);
  }

  try {
    const result = await query<ParentCategory>(
      `
      INSERT INTO category_parents (household_id, name, icon, type, display_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, household_id, name, icon, type, display_order, created_at, updated_at
      `,
      [householdId, name, icon, type, displayOrder]
    );

    revalidatePath('/app/sickness/configuracion/categorias');
    return ok(result.rows[0]);
  } catch (error) {
    console.error('Error creating parent category:', error);
    return fail('Error al crear categoría padre');
  }
}

/**
 * Actualiza una categoría padre (owner only)
 */
export async function updateParentCategory(formData: FormData): Promise<Result<void>> {
  const parsed = UpdateParentCategorySchema.safeParse({
    parentId: formData.get('parentId'),
    name: formData.get('name'),
    icon: formData.get('icon'),
    displayOrder: Number(formData.get('displayOrder')),
  });

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { parentId, name, icon, displayOrder } = parsed.data;

  try {
    // Obtener householdId del parent
    const parentResult = await query<{ household_id: string }>(
      `SELECT household_id FROM category_parents WHERE id = $1`,
      [parentId]
    );

    if (parentResult.rows.length === 0) {
      return fail('Categoría padre no encontrada');
    }

    const parent = parentResult.rows[0];
    if (!parent) {
      return fail('Categoría padre no encontrada');
    }

    const householdId = parent.household_id;

    // Verificar ownership
    const ownershipCheck = await verifyHouseholdOwnership(householdId);
    if (!ownershipCheck.ok) {
      return fail(ownershipCheck.message);
    }

    await query(
      `
      UPDATE category_parents
      SET name = $1, icon = $2, display_order = $3, updated_at = NOW()
      WHERE id = $4
      `,
      [name, icon, displayOrder, parentId]
    );

    revalidatePath('/app/sickness/configuracion/categorias');
    return ok();
  } catch (error) {
    console.error('Error updating parent category:', error);
    return fail('Error al actualizar categoría padre');
  }
}

/**
 * Elimina una categoría padre (owner only)
 * ATENCIÓN: Esto eliminará todas las categorías hijas por CASCADE
 */
export async function deleteParentCategory(formData: FormData): Promise<Result<void>> {
  const parsed = DeleteParentCategorySchema.safeParse({
    parentId: formData.get('parentId'),
  });

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { parentId } = parsed.data;

  try {
    // Obtener householdId
    const parentResult = await query<{ household_id: string }>(
      `SELECT household_id FROM category_parents WHERE id = $1`,
      [parentId]
    );

    if (parentResult.rows.length === 0) {
      return fail('Categoría padre no encontrada');
    }

    const parent = parentResult.rows[0];
    if (!parent) {
      return fail('Categoría padre no encontrada');
    }

    const householdId = parent.household_id;

    // Verificar ownership
    const ownershipCheck = await verifyHouseholdOwnership(householdId);
    if (!ownershipCheck.ok) {
      return fail(ownershipCheck.message);
    }

    // Verificar si hay transacciones usando categorías de este parent
    const transactionsCheck = await query<{ count: number }>(
      `
      SELECT COUNT(*) as count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE c.parent_id = $1
      `,
      [parentId]
    );

    const firstRow = transactionsCheck.rows[0];
    if (firstRow && firstRow.count > 0) {
      return fail(
        `No se puede eliminar: hay ${firstRow.count} transacciones usando categorías de este grupo`
      );
    }

    // Eliminar (CASCADE eliminará categories y subcategories)
    await query(`DELETE FROM category_parents WHERE id = $1`, [parentId]);

    revalidatePath('/app/sickness/configuracion/categorias');
    return ok();
  } catch (error) {
    console.error('Error deleting parent category:', error);
    return fail('Error al eliminar categoría padre');
  }
}

// ============================================================================
// SUBCATEGORIES CRUD
// ============================================================================

/**
 * Crea una nueva subcategoría (owner only)
 */
export async function createSubcategory(formData: FormData): Promise<Result<Subcategory>> {
  const parsed = CreateSubcategorySchema.safeParse({
    categoryId: formData.get('categoryId'),
    name: formData.get('name'),
    icon: formData.get('icon') || undefined,
    displayOrder: formData.get('displayOrder') ? Number(formData.get('displayOrder')) : 0,
  });

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { categoryId, name, icon, displayOrder } = parsed.data;

  try {
    // Obtener householdId de la categoría
    const categoryResult = await query<{ household_id: string }>(
      `SELECT household_id FROM categories WHERE id = $1`,
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      return fail('Categoría no encontrada');
    }

    const category = categoryResult.rows[0];
    if (!category) {
      return fail('Categoría no encontrada');
    }

    const householdId = category.household_id;

    // Verificar ownership
    const ownershipCheck = await verifyHouseholdOwnership(householdId);
    if (!ownershipCheck.ok) {
      return fail(ownershipCheck.message);
    }

    const result = await query<Subcategory>(
      `
      INSERT INTO subcategories (category_id, name, icon, display_order)
      VALUES ($1, $2, $3, $4)
      RETURNING id, category_id, name, icon, display_order, created_at, updated_at
      `,
      [categoryId, name, icon || null, displayOrder]
    );

    revalidatePath('/app/sickness/configuracion/categorias');
    return ok(result.rows[0]);
  } catch (error) {
    console.error('Error creating subcategory:', error);
    return fail('Error al crear subcategoría');
  }
}

/**
 * Actualiza una subcategoría (owner only)
 */
export async function updateSubcategory(formData: FormData): Promise<Result<void>> {
  const parsed = UpdateSubcategorySchema.safeParse({
    subcategoryId: formData.get('subcategoryId'),
    name: formData.get('name'),
    icon: formData.get('icon') || undefined,
    displayOrder: Number(formData.get('displayOrder')),
  });

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { subcategoryId, name, icon, displayOrder } = parsed.data;

  try {
    // Obtener category_id y de ahí el householdId
    const subcatResult = await query<{ category_id: string }>(
      `SELECT category_id FROM subcategories WHERE id = $1`,
      [subcategoryId]
    );

    if (subcatResult.rows.length === 0) {
      return fail('Subcategoría no encontrada');
    }

    const subcat = subcatResult.rows[0];
    if (!subcat) {
      return fail('Subcategoría no encontrada');
    }

    const categoryId = subcat.category_id;

    const categoryResult = await query<{ household_id: string }>(
      `SELECT household_id FROM categories WHERE id = $1`,
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      return fail('Categoría no encontrada');
    }

    const category = categoryResult.rows[0];
    if (!category) {
      return fail('Categoría no encontrada');
    }

    const householdId = category.household_id;

    // Verificar ownership
    const ownershipCheck = await verifyHouseholdOwnership(householdId);
    if (!ownershipCheck.ok) {
      return fail(ownershipCheck.message);
    }

    await query(
      `
      UPDATE subcategories
      SET name = $1, icon = $2, display_order = $3, updated_at = NOW()
      WHERE id = $4
      `,
      [name, icon || null, displayOrder, subcategoryId]
    );

    revalidatePath('/app/sickness/configuracion/categorias');
    return ok();
  } catch (error) {
    console.error('Error updating subcategory:', error);
    return fail('Error al actualizar subcategoría');
  }
}

/**
 * Elimina una subcategoría (owner only)
 * Las transacciones que la usen quedarán con subcategory_id = NULL
 */
export async function deleteSubcategory(formData: FormData): Promise<Result<void>> {
  const parsed = DeleteSubcategorySchema.safeParse({
    subcategoryId: formData.get('subcategoryId'),
  });

  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { subcategoryId } = parsed.data;

  try {
    // Obtener householdId
    const subcatResult = await query<{ category_id: string }>(
      `SELECT category_id FROM subcategories WHERE id = $1`,
      [subcategoryId]
    );

    if (subcatResult.rows.length === 0) {
      return fail('Subcategoría no encontrada');
    }

    const subcat = subcatResult.rows[0];
    if (!subcat) {
      return fail('Subcategoría no encontrada');
    }

    const categoryId = subcat.category_id;

    const categoryResult = await query<{ household_id: string }>(
      `SELECT household_id FROM categories WHERE id = $1`,
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      return fail('Categoría no encontrada');
    }

    const category = categoryResult.rows[0];
    if (!category) {
      return fail('Categoría no encontrada');
    }

    const householdId = category.household_id;

    // Verificar ownership
    const ownershipCheck = await verifyHouseholdOwnership(householdId);
    if (!ownershipCheck.ok) {
      return fail(ownershipCheck.message);
    }

    // Verificar cuántas transacciones la usan
    const transactionsCheck = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM transactions WHERE subcategory_id = $1`,
      [subcategoryId]
    );

    const firstRow = transactionsCheck.rows[0];
    const transactionCount = firstRow?.count || 0;

    // Limpiar subcategory_id de las transacciones
    if (transactionCount > 0) {
      await query(`UPDATE transactions SET subcategory_id = NULL WHERE subcategory_id = $1`, [
        subcategoryId,
      ]);
    }

    // Eliminar subcategoría
    await query(`DELETE FROM subcategories WHERE id = $1`, [subcategoryId]);

    revalidatePath('/app/sickness/configuracion/categorias');
    revalidatePath('/app/sickness/balance');

    return ok();
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return fail('Error al eliminar subcategoría');
  }
}
