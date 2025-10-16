'use server';

import { revalidatePath } from 'next/cache';
import { pgServer } from '@/lib/pgServer';
import { ok, fail } from '@/lib/result';
import type { Result } from '@/lib/result';

/**
 * FASE 2: Server Action para decidir qué hacer con un crédito de miembro
 *
 * Opciones:
 * - apply_to_month: Reservar crédito para aplicar al mes siguiente (marca reserved_at)
 * - keep_active: Mantener crédito activo en balance principal (sin cambios)
 * - transfer_to_savings: Transferir crédito al fondo de ahorro del hogar
 */
export async function decideCreditAction(
  creditId: string,
  decision: 'apply_to_month' | 'keep_active' | 'transfer_to_savings'
): Promise<Result<{ success: boolean; message: string }>> {
  const supabase = await pgServer();

  // 1. Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('No autenticado');

  // 2. Obtener profile_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return fail('Perfil no encontrado');

  // 3. Verificar que el crédito existe y pertenece al usuario
  const { data: credit, error: creditError } = await supabase
    .from('member_credits')
    .select('*')
    .eq('id', creditId)
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .single();

  if (creditError || !credit) {
    return fail('Crédito no encontrado o no te pertenece');
  }

  // 4. Ejecutar decisión según la opción seleccionada
  switch (decision) {
    case 'apply_to_month':
      // Llamar función SQL para reservar crédito
      const { data: reserveData, error: reserveError } = await supabase.rpc('reserve_credit_for_next_month', {
        p_credit_id: creditId,
        p_reserved_by: profile.id
      });

      if (reserveError) {
        return fail(`Error al reservar crédito: ${reserveError.message}`);
      }

      // Verificar resultado de la función (JSONB con { success, message })
      const reserveResult = reserveData as { success: boolean; message?: string } | null;
      if (reserveResult && !reserveResult.success) {
        return fail(reserveResult.message || 'No se pudo reservar el crédito');
      }

      revalidatePath('/app');
      return ok({
        success: true,
        message: 'Crédito reservado para aplicar al próximo mes'
      });

    case 'keep_active':
      // Simplemente actualizar monthly_decision (sin reservar)
      // Si estaba reservado, desreservar
      if (credit.reserved_at) {
        const { data: unreserveData, error: unreserveError } = await supabase.rpc('unreserve_credit', {
          p_credit_id: creditId,
          p_unreserved_by: profile.id
        });

        if (unreserveError) {
          return fail(`Error al desreservar crédito: ${unreserveError.message}`);
        }

        const unreserveResult = unreserveData as { success: boolean; message?: string } | null;
        if (unreserveResult && !unreserveResult.success) {
          return fail(unreserveResult.message || 'No se pudo desreservar el crédito');
        }
      } else {
        // Solo actualizar monthly_decision
        const { error: updateError } = await supabase
          .from('member_credits')
          .update({
            monthly_decision: 'keep_active',
            auto_apply: false
          })
          .eq('id', creditId);

        if (updateError) {
          return fail(`Error al actualizar crédito: ${updateError.message}`);
        }
      }

      revalidatePath('/app');
      return ok({
        success: true,
        message: 'Crédito mantiene activo en balance principal'
      });

    case 'transfer_to_savings':
      // Llamar función SQL existente para transferir a ahorro
      const { data: transferData, error: transferError } = await supabase.rpc('transfer_credit_to_savings', {
        p_credit_id: creditId,
        p_transferred_by: profile.id,
        p_notes: 'Transferencia desde decisión de crédito mensual'
      });

      if (transferError) {
        return fail(`Error al transferir a ahorro: ${transferError.message}`);
      }

      // Verificar resultado de la función (JSONB con { success, message })
      const transferResult = transferData as { success: boolean; message?: string } | null;
      if (transferResult && !transferResult.success) {
        return fail(transferResult.message || 'No se pudo transferir al ahorro');
      }

      revalidatePath('/app');
      revalidatePath('/app/savings');
      return ok({
        success: true,
        message: 'Crédito transferido al fondo de ahorro'
      });

    default:
      return fail('Decisión inválida');
  }
}

/**
 * FASE 2: Obtener créditos del usuario actual (activos + reservados)
 * Retorna los créditos separados por estado para UI
 */
export async function getMyCredits(): Promise<Result<{
  active: Array<{
    id: string;
    amount: number;
    currency: string;
    source_month: number;
    source_year: number;
    status: string;
    reserved_at: string | null;
    monthly_decision: string | null;
  }>;
  reserved: Array<{
    id: string;
    amount: number;
    currency: string;
    source_month: number;
    source_year: number;
    status: string;
    reserved_at: string | null;
    monthly_decision: string | null;
  }>;
  totalActive: number;
  totalReserved: number;
}>> {
  const supabase = await pgServer();

  // 1. Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('No autenticado');

  // 2. Obtener profile_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return fail('Perfil no encontrado');

  // 3. Obtener todos los créditos activos del usuario
  const { data: credits, error } = await supabase
    .from('member_credits')
    .select('id, amount, currency, source_month, source_year, status, reserved_at, monthly_decision')
    .eq('profile_id', profile.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    return fail(`Error al obtener créditos: ${error.message}`);
  }

  // Tipar créditos
  type MemberCredit = {
    id: string;
    amount: number;
    currency: string;
    source_month: number;
    source_year: number;
    status: string;
    reserved_at: string | null;
    monthly_decision: string | null;
  };
  const typedCredits = (credits || []) as unknown as MemberCredit[];

  // 4. Separar en activos y reservados
  const active = typedCredits.filter(c => !c.reserved_at);
  const reserved = typedCredits.filter(c => c.reserved_at);

  const totalActive = active.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalReserved = reserved.reduce((sum, c) => sum + Number(c.amount), 0);

  return ok({
    active,
    reserved,
    totalActive,
    totalReserved
  });
}
