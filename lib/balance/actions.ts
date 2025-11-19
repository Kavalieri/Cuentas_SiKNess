'use server';

import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import type { Result } from '@/lib/result';
import { fail, ok } from '@/lib/result';
import { revalidatePath } from 'next/cache';

/**
 * Obtener balance de TODOS los miembros del hogar
 * 
 * NOTA: Reutiliza la API existente /api/periods/contributions
 * que ya calcula correctamente el balance según la lógica validada.
 * 
 * Issue #60 - Phase 4: Backend integrado
 */
export async function getHouseholdMembersBalance(
  year?: number,
  month?: number
): Promise<
  Result<{
    members: Array<{
      profile_id: string;
      display_name: string;
      avatar_url: string | null;
      role: 'owner' | 'member';
      balance: {
        expected: number;
        paid: number;
        pending: number;
        status: 'settled' | 'pending' | 'credit';
      };
    }>;
    household_total: {
      expected_total: number;
      paid_total: number;
      pending_total: number;
    };
    period_info: {
      year: number;
      month: number;
      month_name: string;
      phase: string;
    };
  }>
> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  try {
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || currentDate.getMonth() + 1;

    // Llamar a la API existente que ya calcula todo correctamente
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/periods/contributions?year=${targetYear}&month=${targetMonth}`,
      {
        headers: {
          'Content-Type': 'application/json',
          // Pasar info de autenticación (cookies se pasan automáticamente en SSR)
        },
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener contribuciones de la API');
    }

    const apiData = await response.json();

    // Transformar respuesta de API al formato esperado
    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    return ok({
      members: apiData.contributions.map((contrib: any) => ({
        profile_id: contrib.profile_id,
        display_name: contrib.display_name,
        avatar_url: contrib.avatar_url,
        role: contrib.role,
        balance: {
          expected: contrib.expected,
          paid: contrib.paid,
          pending: contrib.pending,
          status:
            contrib.pending === 0 ? 'settled' : contrib.pending < 0 ? 'credit' : 'pending',
        },
      })),
      household_total: {
        expected_total: apiData.totals.expectedTotal,
        paid_total: apiData.totals.paidTotal,
        pending_total: apiData.totals.pendingTotal,
      },
      period_info: {
        year: apiData.period.year,
        month: apiData.period.month,
        month_name: monthNames[apiData.period.month - 1] || 'Desconocido',
        phase: apiData.period.phase,
      },
    });
  } catch (error) {
    console.error('Error obteniendo balance del hogar:', error);
    return fail('Error al obtener balance del hogar');
  }
}

/**
 * Obtener balance de UN miembro específico
 * 
 * Reutiliza getHouseholdMembersBalance() y filtra por perfil
 */
export async function getMemberBalance(
  targetProfileId?: string,
  year?: number,
  month?: number
): Promise<
  Result<{
    profile_id: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
    balance: {
      expected: number;
      paid: number;
      pending: number;
      status: 'settled' | 'pending' | 'credit';
    };
  }>
> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const profileId = targetProfileId || user.profile_id;

  // Obtener balance de todos y filtrar
  const householdBalance = await getHouseholdMembersBalance(year, month);

  if (!householdBalance.ok) {
    return fail('ok' in householdBalance && householdBalance.ok === false ? householdBalance.message : 'Error al obtener balance');
  }

  if (!householdBalance.data) {
    return fail('No se pudo obtener información de balance');
  }

  const memberBalance = householdBalance.data.members.find((m) => m.profile_id === profileId);

  if (!memberBalance) {
    return fail('Miembro no encontrado');
  }

  return ok(memberBalance);
}

/**
 * Solicitar préstamo del hogar
 * 
 * Crea transacción tipo 'expense' con categoría "Préstamo Personal"
 */
export async function requestLoan(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  const amount = Number(formData.get('amount'));
  const description = formData.get('description')?.toString() || 'Préstamo personal';
  const occurred_at = formData.get('occurred_at')?.toString() || new Date().toISOString();

  if (!amount || amount <= 0) {
    return fail('Monto inválido');
  }

  try {
    // Obtener ID de categoría "Préstamo Personal"
    const categoryRes = await query<{ id: string }>(
      `SELECT id FROM categories 
       WHERE name = 'Préstamo Personal' 
         AND is_system = true 
       LIMIT 1`
    );

    if (categoryRes.rows.length === 0 || !categoryRes.rows[0]) {
      return fail('Categoría de préstamo no encontrada');
    }

    const loanCategoryId = categoryRes.rows[0].id;

    // Crear transacción de préstamo
    await query(
      `INSERT INTO transactions (
        household_id,
        category_id,
        type,
        amount,
        currency,
        description,
        occurred_at,
        flow_type,
        performed_by_profile_id,
        profile_id,
        requires_approval
      ) VALUES ($1, $2, 'expense', $3, 'EUR', $4, $5, 'common', $6, $6, true)`,
      [householdId, loanCategoryId, amount, description, occurred_at, user.profile_id]
    );

    revalidatePath('/app/sickness/credito-deuda');
    return ok();
  } catch (error) {
    console.error('Error creando préstamo:', error);
    return fail('Error al solicitar préstamo');
  }
}

/**
 * Aprobar préstamo (solo owner)
 */
export async function approveLoan(transactionId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  // Verificar que el usuario es owner
  const roleRes = await query<{ role: string }>(
    `SELECT role FROM household_members 
     WHERE household_id = $1 AND profile_id = $2`,
    [householdId, user.profile_id]
  );

  if (roleRes.rows[0]?.role !== 'owner') {
    return fail('Solo el owner puede aprobar préstamos');
  }

  try {
    await query(
      `UPDATE transactions 
       SET requires_approval = false, 
           approved_at = NOW(), 
           approved_by = $1
       WHERE id = $2 AND household_id = $3`,
      [user.profile_id, transactionId, householdId]
    );

    revalidatePath('/app/sickness/credito-deuda');
    return ok();
  } catch (error) {
    console.error('Error aprobando préstamo:', error);
    return fail('Error al aprobar préstamo');
  }
}

/**
 * Devolver préstamo
 * 
 * Crea transacción tipo 'income' con categoría "Pago Préstamo"
 */
export async function repayLoan(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  const amount = Number(formData.get('amount'));
  const description = formData.get('description')?.toString() || 'Devolución de préstamo';
  const occurred_at = formData.get('occurred_at')?.toString() || new Date().toISOString();

  if (!amount || amount <= 0) {
    return fail('Monto inválido');
  }

  try {
    // Obtener ID de categoría "Pago Préstamo"
    const categoryRes = await query<{ id: string }>(
      `SELECT id FROM categories 
       WHERE name = 'Pago Préstamo' 
         AND is_system = true 
       LIMIT 1`
    );

    if (categoryRes.rows.length === 0 || !categoryRes.rows[0]) {
      return fail('Categoría de pago de préstamo no encontrada');
    }

    const repaymentCategoryId = categoryRes.rows[0].id;

    // Crear transacción de devolución
    await query(
      `INSERT INTO transactions (
        household_id,
        category_id,
        type,
        amount,
        currency,
        description,
        occurred_at,
        flow_type,
        performed_by_profile_id,
        profile_id
      ) VALUES ($1, $2, 'income', $3, 'EUR', $4, $5, 'common', $6, $6)`,
      [householdId, repaymentCategoryId, amount, description, occurred_at, user.profile_id]
    );

    revalidatePath('/app/sickness/credito-deuda');
    return ok();
  } catch (error) {
    console.error('Error devolviendo préstamo:', error);
    return fail('Error al devolver préstamo');
  }
}

/**
 * Obtener historial de préstamos (activos y saldados)
 */
export async function getLoansHistory(): Promise<
  Result<
    Array<{
      id: string;
      amount: number;
      description: string;
      occurred_at: string;
      performed_by_profile_id: string;
      display_name: string;
      type: 'loan' | 'repayment';
      status: 'pending_approval' | 'active' | 'repaid';
    }>
  >
> {
  const user = await getCurrentUser();
  if (!user) return fail('No autenticado');

  const householdId = await getUserHouseholdId();
  if (!householdId) return fail('No perteneces a ningún hogar');

  try {
    const result = await query<{
      id: string;
      amount: number;
      description: string;
      occurred_at: string;
      performed_by_profile_id: string;
      display_name: string;
      category_name: string;
      requires_approval: boolean;
    }>(
      `SELECT 
        t.id,
        t.amount,
        t.description,
        t.occurred_at,
        t.performed_by_profile_id,
        p.display_name,
        c.name as category_name,
        COALESCE(t.requires_approval, false) as requires_approval
      FROM transactions t
      JOIN profiles p ON p.id = t.performed_by_profile_id
      JOIN categories c ON c.id = t.category_id
      WHERE t.household_id = $1
        AND c.is_system = true
        AND c.name IN ('Préstamo Personal', 'Pago Préstamo')
      ORDER BY t.occurred_at DESC, t.created_at DESC
      LIMIT 50`,
      [householdId]
    );

    const loans = result.rows.map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      description: row.description,
      occurred_at: row.occurred_at,
      performed_by_profile_id: row.performed_by_profile_id,
      display_name: row.display_name,
      type: row.category_name === 'Préstamo Personal' ? ('loan' as const) : ('repayment' as const),
      status: row.requires_approval
        ? ('pending_approval' as const)
        : row.category_name === 'Préstamo Personal'
          ? ('active' as const)
          : ('repaid' as const),
    }));

    return ok(loans);
  } catch (error) {
    console.error('Error obteniendo historial de préstamos:', error);
    return fail('Error al obtener historial');
  }
}
