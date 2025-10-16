'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ok, fail, type Result } from '@/lib/result';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// ============================================================================
// SCHEMAS
// ============================================================================

const CreateCategorySchema = z.object({
  householdId: z.string().uuid('ID de hogar inválido'),
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  icon: z.string().min(1, 'El icono es obligatorio'),
  type: z.enum(['income', 'expense'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
});

const UpdateCategorySchema = z.object({
  categoryId: z.string().uuid('ID de categoría inválido'),
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  icon: z.string().min(1, 'El icono es obligatorio'),
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
      [householdId, user.id]
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
        created_by_profile_id as "createdByProfileId",
        created_at as "createdAt",
        updated_by_profile_id as "updatedByProfileId",
        updated_at as "updatedAt"
      FROM categories
      WHERE household_id = $1
      ORDER BY type, name ASC`,
      [householdId]
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
    });

    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const { householdId, name, icon, type } = parsed.data;

    // Verificar que el usuario es owner del hogar
    const ownerCheck = await query(
      `SELECT 1 FROM household_members
       WHERE household_id = $1 AND profile_id = $2 AND role = 'owner'`,
      [householdId, user.id]
    );

    if (ownerCheck.rows.length === 0) {
      return fail('Solo el owner del hogar puede crear categorías');
    }

    // Verificar que no existe una categoría con el mismo nombre en el hogar
    const duplicateCheck = await query(
      `SELECT 1 FROM categories
       WHERE household_id = $1 AND LOWER(name) = LOWER($2)`,
      [householdId, name]
    );

    if (duplicateCheck.rows.length > 0) {
      return fail(`Ya existe una categoría con el nombre "${name}"`);
    }

    // Crear categoría
    const result = await query<{ id: string }>(
      `INSERT INTO categories (household_id, name, icon, type, created_by_profile_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [householdId, name, icon, type, user.id]
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
    });

    if (!parsed.success) {
      return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
    }

    const { categoryId, name, icon } = parsed.data;

    // Obtener household_id de la categoría
    const categoryResult = await query<{ householdId: string }>(
      `SELECT household_id as "householdId" FROM categories WHERE id = $1`,
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      return fail('Categoría no encontrada');
    }

    const householdId = categoryResult.rows[0]!.householdId;

    // Verificar que el usuario es owner del hogar
    const ownerCheck = await query(
      `SELECT 1 FROM household_members
       WHERE household_id = $1 AND profile_id = $2 AND role = 'owner'`,
      [householdId, user.id]
    );

    if (ownerCheck.rows.length === 0) {
      return fail('Solo el owner del hogar puede editar categorías');
    }

    // Verificar que no existe otra categoría con el mismo nombre
    const duplicateCheck = await query(
      `SELECT 1 FROM categories
       WHERE household_id = $1 AND LOWER(name) = LOWER($2) AND id != $3`,
      [householdId, name, categoryId]
    );

    if (duplicateCheck.rows.length > 0) {
      return fail(`Ya existe otra categoría con el nombre "${name}"`);
    }

    // Actualizar categoría
    await query(
      `UPDATE categories
       SET name = $1,
           icon = $2,
           updated_by_profile_id = $3,
           updated_at = now()
       WHERE id = $4`,
      [name, icon, user.id, categoryId]
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
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      return fail('Categoría no encontrada');
    }

    const householdId = categoryResult.rows[0]!.householdId;

    // Verificar que el usuario es owner del hogar
    const ownerCheck = await query(
      `SELECT 1 FROM household_members
       WHERE household_id = $1 AND profile_id = $2 AND role = 'owner'`,
      [householdId, user.id]
    );

    if (ownerCheck.rows.length === 0) {
      return fail('Solo el owner del hogar puede eliminar categorías');
    }

    // Verificar que la categoría no tiene transacciones asociadas
    const transactionsCheck = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM transactions
       WHERE category_id = $1`,
      [categoryId]
    );

    const count = transactionsCheck.rows[0] ? parseInt(transactionsCheck.rows[0].count) : 0;
    if (count > 0) {
      return fail(`No se puede eliminar la categoría porque tiene ${count} transacciones asociadas`);
    }

    // Eliminar categoría
    await query(
      `DELETE FROM categories WHERE id = $1`,
      [categoryId]
    );

    revalidatePath('/sickness/configuracion/categorias');
    return ok();
  } catch (error) {
    console.error('[deleteCategory] Error:', error);
    return fail('Error al eliminar la categoría');
  }
}
