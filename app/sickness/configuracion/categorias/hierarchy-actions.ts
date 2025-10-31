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
 */
export async function getCategoryHierarchy(householdId: string): Promise<Result<CategoryHierarchy[]>> {
  const user = await getCurrentUser();
  if (!user?.id) {
    return fail('No autenticado');
  }

  try {
    console.log('[getCategoryHierarchy] 🔍 Iniciando con householdId:', householdId);
    console.log('[getCategoryHierarchy] 🔍 User profile_id:', user.profile_id);

    // Verificar pertenencia al hogar
    const memberCheck = await query<{ household_id: string; profile_id: string }>(
      `SELECT household_id, profile_id FROM household_members WHERE household_id = $1 AND profile_id = $2`,
      [householdId, user.profile_id]
    );

    console.log('[getCategoryHierarchy] 👥 Member check rows:', memberCheck.rows.length);
    console.log('[getCategoryHierarchy] 👥 Member check result:', JSON.stringify(memberCheck.rows));

    if (memberCheck.rows.length === 0) {
      console.log('[getCategoryHierarchy] ❌ Usuario no pertenece al hogar');
      return fail('No perteneces a este hogar');
    }

    // Obtener parent_categories
    console.log('[getCategoryHierarchy] 📊 Buscando category_parents...');
    const parentsResult = await query<ParentCategory>(
      `
      SELECT id, household_id, name, icon, type, display_order, created_at, updated_at
      FROM category_parents
      WHERE household_id = $1
      ORDER BY type DESC, display_order, name
      `,
      [householdId]
    );

    console.log('[getCategoryHierarchy] 📊 Parents encontrados:', parentsResult.rows.length);

    const hierarchy: CategoryHierarchy[] = [];

    for (const parent of parentsResult.rows) {
      // Obtener categorías de este parent
      const categoriesResult = await query<{
        id: string;
        name: string;
        icon: string | null;
        display_order: number;
      }>(
        `
        SELECT id, name, icon, display_order
        FROM categories
        WHERE household_id = $1 AND parent_id = $2
        ORDER BY display_order, name
        `,
        [householdId, parent.id]
      );

      const categoriesWithSubs: CategoryWithSubcategories[] = [];

      for (const category of categoriesResult.rows) {
        // Obtener subcategorías de esta categoría
        const subcategoriesResult = await query<Subcategory>(
          `
          SELECT id, category_id, name, icon, display_order, created_at, updated_at
          FROM subcategories
          WHERE category_id = $1
          ORDER BY display_order, name
          `,
          [category.id]
        );

        categoriesWithSubs.push({
          ...category,
          subcategories: subcategoriesResult.rows,
        });
      }

      hierarchy.push({
        id: parent.id,
        name: parent.name,
        icon: parent.icon,
        type: parent.type,
        displayOrder: parent.displayOrder,
        categories: categoriesWithSubs,
      });
    }

    console.log('[getCategoryHierarchy] ✅ Jerarquía construida, total parents:', hierarchy.length);
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
