'use server';

import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { fail, ok, type Result } from '@/lib/result';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const CreateCategorySchema = z.object({
  householdId: z.string().uuid('ID de hogar inválido'),
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  icon: z.string().min(1, 'El icono es obligatorio'),
  type: z.enum(['income', 'expense'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  parentId: z.string().uuid('ID de parent inválido').optional(),
  displayOrder: z.number().int().min(0).optional(),
});

const UpdateCategorySchema = z.object({
  categoryId: z.string().uuid('ID de categoría inválido'),
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  icon: z.string().min(1, 'El icono es obligatorio'),
  parentId: z.string().uuid('ID de parent inválido').optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
});

const DeleteCategorySchema = z.object({
  categoryId: z.string().uuid('ID de categoría inválido'),
});

// ============================================================================
// TYPES
// ============================================================================

export interface Category {
  id: string;
  householdId: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  parentId: string | null;
  displayOrder: number | null;
  createdByProfileId: string;
  createdAt: string;
  updatedByProfileId: string | null;
  updatedAt: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Obtener todas las categorías de un hogar
 */
export async function getHouseholdCategories(householdId: string): Promise<Result<Category[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    // Verificar que el usuario pertenece al hogar
    const memberCheck = await query(
      `SELECT 1 FROM household_members
       WHERE household_id = $1 AND profile_id = $2`,
      [householdId, user.profile_id],
    );

    if (memberCheck.rows.length === 0) {
      return fail('No perteneces a este hogar');
    }

    // Obtener categorías
    const result = await query<Category>(
      `SELECT
        id,
        household_id as "householdId",
        name,
        icon,
        type,
        parent_id as "parentId",
        display_order as "displayOrder",
        created_by_profile_id as "createdByProfileId",
        created_at as "createdAt",
        updated_by_profile_id as "updatedByProfileId",
        updated_at as "updatedAt"
      FROM categories
      WHERE household_id = $1
      ORDER BY type, display_order ASC NULLS LAST, name ASC`,
      [householdId],
    );

    return ok(result.rows);
  } catch (error) {
    console.error('[getHouseholdCategories] Error:', error);
    return fail('Error al obtener las categorías');
  }
}

// ============================================================================
// MUTATIONS (Solo owner puede crear/editar/eliminar)
// ============================================================================

/**
 * Crear una nueva categoría (solo owner)
 */
export async function createCategory(formData: FormData): Promise<Result<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    // Validar datos
    const parsed = CreateCategorySchema.safeParse({
      householdId: formData.get('householdId'),
      name: formData.get('name'),
      icon: formData.get('icon'),
      type: formData.get('type'),
      parentId: formData.get('parentId') || undefined,
      displayOrder: formData.get('displayOrder')
        ? parseInt(formData.get('displayOrder') as string)
        : undefined,
    });

    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const { householdId, name, icon, type, parentId, displayOrder } = parsed.data;

    // Verificar que el usuario es owner del hogar
    const ownerCheck = await query(
      `SELECT 1 FROM household_members
       WHERE household_id = $1 AND profile_id = $2 AND role = 'owner'`,
      [householdId, user.profile_id],
    );

    if (ownerCheck.rows.length === 0) {
      return fail('Solo el owner del hogar puede crear categorías');
    }

    // Verificar que no existe una categoría con el mismo nombre en el hogar
    const duplicateCheck = await query(
      `SELECT 1 FROM categories
       WHERE household_id = $1 AND LOWER(name) = LOWER($2)`,
      [householdId, name],
    );

    if (duplicateCheck.rows.length > 0) {
      return fail(`Ya existe una categoría con el nombre "${name}"`);
    }

    // Si se proporciona parentId, verificar que existe y pertenece al mismo hogar
    if (parentId) {
      const parentCheck = await query(
        `SELECT 1 FROM category_parents
         WHERE id = $1 AND household_id = $2`,
        [parentId, householdId],
      );

      if (parentCheck.rows.length === 0) {
        return fail('Parent category no encontrado o no pertenece a este hogar');
      }
    }

    // Crear categoría
    const result = await query<{ id: string }>(
      `INSERT INTO categories (household_id, name, icon, type, parent_id, display_order, created_by_profile_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [householdId, name, icon, type, parentId || null, displayOrder || null, user.profile_id],
    );

    revalidatePath('/sickness/configuracion/categorias');
    return ok(result.rows[0]);
  } catch (error) {
    console.error('[createCategory] Error:', error);
    return fail('Error al crear la categoría');
  }
}

/**
 * Actualizar una categoría existente (solo owner)
 */
export async function updateCategory(formData: FormData): Promise<Result> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    // Validar datos
    const parsed = UpdateCategorySchema.safeParse({
      categoryId: formData.get('categoryId'),
      name: formData.get('name'),
      icon: formData.get('icon'),
      parentId: formData.get('parentId') || null,
      displayOrder: formData.get('displayOrder')
        ? parseInt(formData.get('displayOrder') as string)
        : undefined,
    });

    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const { categoryId, name, icon, parentId, displayOrder } = parsed.data;

    // Obtener household_id de la categoría
    const categoryResult = await query<{ householdId: string }>(
      `SELECT household_id as "householdId" FROM categories WHERE id = $1`,
      [categoryId],
    );

    if (categoryResult.rows.length === 0) {
      return fail('Categoría no encontrada');
    }

    const householdId = categoryResult.rows[0]!.householdId;

    // Verificar que el usuario es owner del hogar
    const ownerCheck = await query(
      `SELECT 1 FROM household_members
       WHERE household_id = $1 AND profile_id = $2 AND role = 'owner'`,
      [householdId, user.profile_id],
    );

    if (ownerCheck.rows.length === 0) {
      return fail('Solo el owner del hogar puede editar categorías');
    }

    // Verificar que no existe otra categoría con el mismo nombre
    const duplicateCheck = await query(
      `SELECT 1 FROM categories
       WHERE household_id = $1 AND LOWER(name) = LOWER($2) AND id != $3`,
      [householdId, name, categoryId],
    );

    if (duplicateCheck.rows.length > 0) {
      return fail(`Ya existe otra categoría con el nombre "${name}"`);
    }

    // Si se proporciona parentId, verificar que existe y pertenece al mismo hogar
    if (parentId !== undefined && parentId !== null) {
      const parentCheck = await query(
        `SELECT 1 FROM category_parents
         WHERE id = $1 AND household_id = $2`,
        [parentId, householdId],
      );

      if (parentCheck.rows.length === 0) {
        return fail('Parent category no encontrado o no pertenece a este hogar');
      }
    }

    // Actualizar categoría
    const updates: string[] = ['name = $1', 'icon = $2', 'updated_by_profile_id = $3', 'updated_at = now()'];
    const values: unknown[] = [name, icon, user.profile_id];
    let paramCount = 3;

    if (parentId !== undefined) {
      paramCount++;
      updates.push(`parent_id = $${paramCount}`);
      values.push(parentId);
    }

    if (displayOrder !== undefined) {
      paramCount++;
      updates.push(`display_order = $${paramCount}`);
      values.push(displayOrder);
    }

    paramCount++;
    values.push(categoryId);

    await query(
      `UPDATE categories
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}`,
      values,
    );

    revalidatePath('/sickness/configuracion/categorias');
    return ok();
  } catch (error) {
    console.error('[updateCategory] Error:', error);
    return fail('Error al actualizar la categoría');
  }
}

/**
 * Eliminar una categoría (solo owner)
 */
export async function deleteCategory(formData: FormData): Promise<Result> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('Usuario no autenticado');
    }

    // Validar datos
    const parsed = DeleteCategorySchema.safeParse({
      categoryId: formData.get('categoryId'),
    });

    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const { categoryId } = parsed.data;

    // Obtener household_id de la categoría
    const categoryResult = await query<{ householdId: string }>(
      `SELECT household_id as "householdId" FROM categories WHERE id = $1`,
      [categoryId],
    );

    if (categoryResult.rows.length === 0) {
      return fail('Categoría no encontrada');
    }

    const householdId = categoryResult.rows[0]!.householdId;

    // Verificar que el usuario es owner del hogar
    const ownerCheck = await query(
      `SELECT 1 FROM household_members
       WHERE household_id = $1 AND profile_id = $2 AND role = 'owner'`,
      [householdId, user.profile_id],
    );

    if (ownerCheck.rows.length === 0) {
      return fail('Solo el owner del hogar puede eliminar categorías');
    }

    // Verificar que la categoría no tiene subcategorías asociadas
    const subcategoriesCheck = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM subcategories
       WHERE category_id = $1`,
      [categoryId],
    );

    const subcatCount = subcategoriesCheck.rows[0]
      ? parseInt(subcategoriesCheck.rows[0].count)
      : 0;
    if (subcatCount > 0) {
      return fail(
        `No se puede eliminar la categoría porque tiene ${subcatCount} subcategorías asociadas. Elimina las subcategorías primero.`,
      );
    }

    // Verificar que la categoría no tiene transacciones asociadas
    const transactionsCheck = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM transactions
       WHERE category_id = $1`,
      [categoryId],
    );

    const count = transactionsCheck.rows[0] ? parseInt(transactionsCheck.rows[0].count) : 0;
    if (count > 0) {
      return fail(
        `No se puede eliminar la categoría porque tiene ${count} transacciones asociadas`,
      );
    }

    // Eliminar categoría
    await query(`DELETE FROM categories WHERE id = $1`, [categoryId]);

    revalidatePath('/sickness/configuracion/categorias');
    return ok();
  } catch (error) {
    console.error('[deleteCategory] Error:', error);
    return fail('Error al eliminar la categoría');
  }
}
