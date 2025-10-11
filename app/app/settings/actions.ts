'use server';

import { supabaseServer } from '@/lib/supabaseServer';

interface Member {
  profile_id: string;
  email: string;
  role: 'owner' | 'member';
  joined_at: string;
  current_income: number;
}

interface Result<T = void> {
  ok: boolean;
  message: string;
  data?: T;
}

/**
 * Obtiene todos los miembros de un hogar con su información detallada
 */
export async function getHouseholdMembers(householdId: string): Promise<Result<Member[]>> {
  try {
    const supabase = await supabaseServer();

    const { data, error } = await supabase.rpc('get_household_members_optimized', {
      p_household_id: householdId
    });

    if (error) {
      console.error('Error getting household members:', error);
      return {
        ok: false,
        message: 'Error al obtener los miembros del hogar',
        data: []
      };
    }

    return {
      ok: true,
      message: 'Miembros obtenidos correctamente',
      data: data || []
    };
  } catch (error) {
    console.error('Error in getHouseholdMembers:', error);
    return {
      ok: false,
      message: 'Error inesperado al obtener los miembros',
      data: []
    };
  }
}
