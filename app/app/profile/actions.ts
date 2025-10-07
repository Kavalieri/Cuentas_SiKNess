'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { supabaseServer, getCurrentUser } from '@/lib/supabaseServer';
import { ok, fail, type Result } from '@/lib/result';

/**
 * Schema de validación para el nombre de display del usuario
 */
const DisplayNameSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede superar los 50 caracteres')
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/,
      'El nombre solo puede contener letras, espacios, guiones y apóstrofes'
    ),
});

/**
 * Actualiza el nombre de display del perfil del usuario actual
 * 
 * @param formData - FormData con el campo display_name
 * @returns Result<{ message: string }> - Resultado de la operación
 */
export async function updateDisplayName(formData: FormData): Promise<Result<{ message: string }>> {
  // 1. Parsear y validar input con Zod
  const parsed = DisplayNameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = fieldErrors.display_name?.[0];
    return fail(firstError ?? 'Datos inválidos', fieldErrors);
  }

  // 2. Obtener usuario autenticado
  const user = await getCurrentUser();
  if (!user) {
    return fail('No estás autenticado. Por favor, inicia sesión nuevamente.');
  }

  // 3. Actualizar profiles.display_name
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('profiles')
    .update({ 
      display_name: parsed.data.display_name,
      updated_at: new Date().toISOString()
    })
    .eq('auth_user_id', user.id);

  if (error) {
    console.error('Error updating display name:', error);
    return fail('No se pudo actualizar el nombre. Por favor, intenta nuevamente.');
  }

  // 4. Revalidar la página de perfil
  revalidatePath('/app/profile');
  revalidatePath('/app'); // También revalidar el dashboard por si muestra el nombre

  return ok({ message: 'Nombre actualizado correctamente' });
}
