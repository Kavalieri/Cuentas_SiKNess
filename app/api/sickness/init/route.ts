/**
 * /app/api/sickness/init/route.ts
 * 
 * API para carga inicial de datos del usuario en SiKness
 * Devuelve:
 * - Lista de hogares del usuario con metadata
 * - Hogar activo actual
 * - Periodos disponibles del hogar activo
 * - Periodo activo actual
 * - Balance del periodo activo
 * - Datos del usuario
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/supabaseServer';

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const profileId = user.profile_id;

    // 1. Obtener hogar activo actual
    const activeHouseholdResult = await query(
      `SELECT household_id 
       FROM user_active_household 
       WHERE profile_id = $1`,
      [profileId]
    );

    let activeHouseholdId = activeHouseholdResult?.rows?.[0]?.household_id;

    // Si no hay hogar activo, tomar el primero al que pertenece
    if (!activeHouseholdId) {
      const firstHouseholdResult = await query(
        `SELECT household_id 
         FROM household_members 
         WHERE profile_id = $1 
         ORDER BY joined_at ASC 
         LIMIT 1`,
        [profileId]
      );
      
      activeHouseholdId = firstHouseholdResult?.rows?.[0]?.household_id;
      
      // Si tampoco existe, el usuario no pertenece a ningún hogar
      if (!activeHouseholdId) {
        return NextResponse.json(
          { 
            error: 'Usuario sin hogares asignados',
            user: {
              id: profileId,
              email: user.email,
              displayName: user.display_name,
            },
            households: [],
            activeHousehold: null,
            periods: [],
            activePeriod: null,
            balance: null,
          },
          { status: 200 }
        );
      }
    }

    // 2. Obtener todos los hogares del usuario con metadata
    const householdsResult = await query(
      `SELECT 
        h.id,
        h.name,
        hm.role,
        (SELECT COUNT(*) FROM household_members WHERE household_id = h.id) as member_count,
        (SELECT COUNT(*) FROM household_members WHERE household_id = h.id AND role = 'owner') as owner_count
       FROM households h
       INNER JOIN household_members hm ON h.id = hm.household_id
       WHERE hm.profile_id = $1 AND h.deleted_at IS NULL
       ORDER BY (h.id = $2) DESC, h.created_at DESC`,
      [profileId, activeHouseholdId]
    );

    const households = householdsResult?.rows?.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      role: row.role as string,
      memberCount: Number(row.member_count || 0),
      ownerCount: Number(row.owner_count || 0),
      isOwner: row.role === 'owner',
    })) || [];

    // 3. Obtener hogar activo con settings
    const activeHouseholdDetailsResult = await query(
      `SELECT 
        h.id,
        h.name,
        hm.role,
        hs.monthly_contribution_goal,
        hs.currency,
        hs.calculation_type
       FROM households h
       INNER JOIN household_members hm ON h.id = hm.household_id
       LEFT JOIN household_settings hs ON h.id = hs.household_id
       WHERE h.id = $1 AND hm.profile_id = $2`,
      [activeHouseholdId, profileId]
    );

    const activeHouseholdDetails = activeHouseholdDetailsResult?.rows?.[0];

    if (!activeHouseholdDetails) {
      return NextResponse.json(
        { error: 'Hogar activo no encontrado o sin acceso' },
        { status: 403 }
      );
    }

    const activeHousehold = {
      id: activeHouseholdDetails.id,
      name: activeHouseholdDetails.name,
      role: activeHouseholdDetails.role,
      isOwner: activeHouseholdDetails.role === 'owner',
      contributionGoal: activeHouseholdDetails.monthly_contribution_goal,
      currency: activeHouseholdDetails.currency || 'EUR',
      calculationType: activeHouseholdDetails.calculation_type,
    };

    // 4. Obtener periodos del hogar activo (últimos 12 meses + futuros 3 meses)
    const periodsResult = await query(
      `SELECT 
        id,
        year,
        month,
        status,
        opening_balance,
        closing_balance,
        created_at
       FROM monthly_periods
       WHERE household_id = $1
       ORDER BY year DESC, month DESC
       LIMIT 15`,
      [activeHouseholdId]
    );

    const periods = periodsResult?.rows?.map((row) => ({
      id: row.id as string,
      year: row.year as number,
      month: row.month as number,
      status: row.status as string,
      openingBalance: parseFloat(row.opening_balance || 0),
      closingBalance: parseFloat(row.closing_balance || 0),
      isCurrent: row.status === 'active',
    })) || [];

    // 5. Periodo activo actual (el más reciente con status = 'active')
    const currentPeriod = periods.find((p) => p.isCurrent) || periods[0] || null;

    // 6. Balance del periodo activo
    let balance = null;
    
    if (currentPeriod) {
      const balanceResult = await query(
        `SELECT 
          opening_balance,
          closing_balance,
          total_income,
          total_expenses
         FROM monthly_periods
         WHERE id = $1`,
        [currentPeriod.id]
      );

      const periodData = balanceResult?.rows?.[0];

      // Gastos directos pendientes (flow_type = 'direct')
      const directExpensesResult = await query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM transactions
         WHERE household_id = $1
         AND flow_type = 'direct'
         AND type = 'expense'
         AND EXTRACT(YEAR FROM occurred_at) = $2
         AND EXTRACT(MONTH FROM occurred_at) = $3`,
        [activeHouseholdId, currentPeriod.year, currentPeriod.month]
      );

      const directExpenses = parseFloat(directExpensesResult?.rows?.[0]?.total || 0);

      // Contribuciones pendientes
      const contributionsResult = await query(
        `SELECT 
          COALESCE(SUM(expected_amount), 0) as expected,
          COALESCE(SUM(paid_amount), 0) as paid
         FROM contributions
         WHERE household_id = $1
         AND year = $2
         AND month = $3`,
        [activeHouseholdId, currentPeriod.year, currentPeriod.month]
      );

      const contributionData = contributionsResult?.rows?.[0];
      const expectedContributions = parseFloat(contributionData?.expected || 0);
      const paidContributions = parseFloat(contributionData?.paid || 0);
      const pendingContributions = expectedContributions - paidContributions;

      balance = {
        current: parseFloat(periodData?.closing_balance || 0),
        opening: parseFloat(periodData?.opening_balance || 0),
        income: parseFloat(periodData?.total_income || 0),
        expenses: parseFloat(periodData?.total_expenses || 0),
        directExpenses,
        pendingContributions,
      };
    }

    // 7. Datos del usuario
    const userData = {
      id: profileId,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
    };

    return NextResponse.json({
      user: userData,
      households,
      activeHousehold,
      periods,
      activePeriod: currentPeriod,
      balance,
    });

  } catch (error) {
    console.error('[API /api/sickness/init] Error:', error);
    return NextResponse.json(
      { error: 'Error al cargar datos iniciales' },
      { status: 500 }
    );
  }
}
