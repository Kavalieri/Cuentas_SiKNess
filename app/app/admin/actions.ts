'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';
import { getCurrentHouseholdId, isOwner, isSystemAdmin } from '@/lib/adminCheck';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';
import { z } from 'zod';

const WipeSchema = z.object({
  confirmation: z.string().refine((val) => val === 'ELIMINAR TODO', {
    message: 'Debes escribir exactamente "ELIMINAR TODO" para confirmar',
  }),
});

/**
 * Ejecuta la función de wipe en la base de datos
 * Elimina TODOS los datos del household excepto miembros
 * Solo puede ser ejecutado por el owner
 */
export async function wipeHouseholdData(formData: FormData): Promise<Result> {
  // Verificar permisos
  const userIsOwner = await isOwner();
  if (!userIsOwner) {
    return fail('No tienes permisos para ejecutar esta acción');
  }

  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    return fail('No se encontró el household');
  }

  // Validar confirmación
  const parsed = WipeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Confirmación incorrecta', parsed.error.flatten().fieldErrors);
  }

  // Ejecutar función de wipe
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('wipe_household_data', {
    p_household_id: householdId,
  });

  if (error) {
    console.error('Error en wipe:', error);
    return fail(`Error al limpiar datos: ${error.message}`);
  }

  // Revalidar todas las rutas afectadas
  revalidatePath('/app');
  revalidatePath('/app/expenses');
  revalidatePath('/app/categories');
  revalidatePath('/app/contributions');
  revalidatePath('/app/admin');

  return ok(data);
}

/**
 * Limpia TODOS los datos del sistema excepto system_admins y auth.users
 * SOLO puede ser ejecutado por system admins
 * Protege a los administradores permanentes del sistema
 */
export async function wipeSystemData(formData: FormData): Promise<Result> {
  // Verificar permisos de system admin
  const userIsSystemAdmin = await isSystemAdmin();
  if (!userIsSystemAdmin) {
    return fail('Solo los administradores del sistema pueden ejecutar esta acción');
  }

  // Validar confirmación
  const parsed = WipeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Confirmación incorrecta', parsed.error.flatten().fieldErrors);
  }

  // Ejecutar función de wipe global
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('wipe_system_data');

  if (error) {
    console.error('Error en wipe del sistema:', error);
    return fail(`Error al limpiar datos del sistema: ${error.message}`);
  }

  // Revalidar todas las rutas afectadas
  revalidatePath('/app');
  revalidatePath('/app/admin');

  return ok(data);
}

/**
 * Restaura el sistema a estado inicial (stock)
 * Limpia TODOS los datos + requiere seed manual posterior
 * SOLO puede ser ejecutado por system admins
 */
export async function restoreToStock(formData: FormData): Promise<Result> {
  // Verificar permisos de system admin
  const userIsSystemAdmin = await isSystemAdmin();
  if (!userIsSystemAdmin) {
    return fail('Solo los administradores del sistema pueden ejecutar esta acción');
  }

  // Validar confirmación
  const parsed = WipeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Confirmación incorrecta', parsed.error.flatten().fieldErrors);
  }

  // Ejecutar función de restore
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('restore_to_stock');

  if (error) {
    console.error('Error en restore to stock:', error);
    return fail(`Error al restaurar sistema: ${error.message}`);
  }

  // Revalidar todas las rutas afectadas
  revalidatePath('/app');
  revalidatePath('/app/admin');

  return ok(data);
}

// ============================================================================
// GESTIÓN DE SYSTEM ADMINS
// ============================================================================

const AddAdminSchema = z.object({
  email: z.string().email('Email inválido'),
  notes: z.string().optional(),
});

const RemoveAdminSchema = z.object({
  user_id: z.string().uuid('ID de usuario inválido'),
});

/**
 * Agrega un nuevo administrador del sistema por email
 * SOLO puede ser ejecutado por system admins
 */
export async function addSystemAdmin(formData: FormData): Promise<Result> {
  // Verificar permisos de system admin
  const userIsSystemAdmin = await isSystemAdmin();
  if (!userIsSystemAdmin) {
    return fail('Solo los administradores del sistema pueden ejecutar esta acción');
  }

  // Validar datos
  const parsed = AddAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { email, notes } = parsed.data;

  const supabase = await supabaseServer();

  // Obtener user_id del email
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    return fail(`Error al buscar usuario: ${usersError.message}`);
  }

  const user = users.users.find((u) => u.email === email);
  
  if (!user) {
    return fail('No existe un usuario con ese email');
  }

  // Obtener el usuario actual para granted_by
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  
  if (!currentUser) {
    return fail('No se pudo obtener el usuario actual');
  }

  // Insertar en system_admins
  const { error } = await supabase.from('system_admins').insert({
    user_id: user.id,
    granted_by: currentUser.id,
    notes: notes || `Administrador agregado por ${currentUser.email}`,
  });

  if (error) {
    if (error.code === '23505') {
      return fail('Este usuario ya es administrador del sistema');
    }
    return fail(`Error al agregar administrador: ${error.message}`);
  }

  revalidatePath('/app/admin');
  revalidatePath('/app/admin/system-admins');

  return ok();
}

/**
 * Elimina un administrador del sistema
 * SOLO puede ser ejecutado por system admins
 * NO permite eliminar administradores permanentes (caballeropomes@gmail.com)
 */
export async function removeSystemAdmin(formData: FormData): Promise<Result> {
  // Verificar permisos de system admin
  const userIsSystemAdmin = await isSystemAdmin();
  if (!userIsSystemAdmin) {
    return fail('Solo los administradores del sistema pueden ejecutar esta acción');
  }

  // Validar datos
  const parsed = RemoveAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { user_id } = parsed.data;

  const supabase = await supabaseServer();

  // Verificar que no sea un admin permanente (protección adicional)
  const { data: users } = await supabase.auth.admin.listUsers();
  const targetUser = users?.users.find((u) => u.id === user_id);
  
  if (targetUser?.email === 'caballeropomes@gmail.com') {
    return fail('No se puede eliminar al administrador permanente del sistema');
  }

  // Verificar que no sea el último admin
  const { count } = await supabase
    .from('system_admins')
    .select('user_id', { count: 'exact', head: true });

  if (count && count <= 1) {
    return fail('No se puede eliminar al último administrador del sistema');
  }

  // Eliminar de system_admins
  const { error } = await supabase
    .from('system_admins')
    .delete()
    .eq('user_id', user_id);

  if (error) {
    return fail(`Error al eliminar administrador: ${error.message}`);
  }

  revalidatePath('/app/admin');
  revalidatePath('/app/admin/system-admins');

  return ok();
}

// ============================================================================
// GESTIÓN DE MIEMBROS DE HOUSEHOLDS (ADMIN)
// ============================================================================

const AddMemberToHouseholdSchema = z.object({
  household_id: z.string().uuid('ID de household inválido'),
  user_id: z.string().uuid('ID de usuario inválido'),
  role: z.enum(['owner', 'member']).default('member'),
});

const RemoveMemberFromHouseholdSchema = z.object({
  household_id: z.string().uuid('ID de household inválido'),
  user_id: z.string().uuid('ID de usuario inválido'),
});

/**
 * Agrega un usuario a un household (Admin)
 * SOLO puede ser ejecutado por system admins
 */
export async function adminAddMemberToHousehold(formData: FormData): Promise<Result> {
  // Verificar permisos de system admin
  const userIsSystemAdmin = await isSystemAdmin();
  if (!userIsSystemAdmin) {
    return fail('Solo los administradores del sistema pueden ejecutar esta acción');
  }

  // Validar datos
  const parsed = AddMemberToHouseholdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { household_id, user_id, role } = parsed.data;

  const supabase = await supabaseServer();

  // Llamar a la función SQL
  const { data, error } = await supabase.rpc('admin_add_member_to_household', {
    p_household_id: household_id,
    p_user_id: user_id,
    p_role: role,
  });

  if (error) {
    return fail(`Error al agregar miembro: ${error.message}`);
  }

  revalidatePath('/app/admin');
  revalidatePath('/app/admin/households');
  revalidatePath('/app/admin/users');

  return ok(data);
}

/**
 * Elimina un usuario de un household (Admin)
 * SOLO puede ser ejecutado por system admins
 */
export async function adminRemoveMemberFromHousehold(formData: FormData): Promise<Result> {
  // Verificar permisos de system admin
  const userIsSystemAdmin = await isSystemAdmin();
  if (!userIsSystemAdmin) {
    return fail('Solo los administradores del sistema pueden ejecutar esta acción');
  }

  // Validar datos
  const parsed = RemoveMemberFromHouseholdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail('Datos inválidos', parsed.error.flatten().fieldErrors);
  }

  const { household_id, user_id } = parsed.data;

  const supabase = await supabaseServer();

  // Llamar a la función SQL
  const { data, error } = await supabase.rpc('admin_remove_member_from_household', {
    p_household_id: household_id,
    p_user_id: user_id,
  });

  if (error) {
    return fail(`Error al eliminar miembro: ${error.message}`);
  }

  revalidatePath('/app/admin');
  revalidatePath('/app/admin/households');
  revalidatePath('/app/admin/users');

  return ok(data);
}
