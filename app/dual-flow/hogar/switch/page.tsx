import { redirect } from 'next/navigation';
import { query } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/supabaseServer';

interface PageProps {
  searchParams: {
    id?: string;
  };
}

export default async function SwitchHouseholdPage({ searchParams }: PageProps) {
  const { id: householdId } = searchParams;

  if (!householdId) {
    redirect('/dual-flow');
  }

  // Verificar autenticación
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  try {
    // Verificar que el usuario pertenece al hogar
    const membershipResult = await query(
      'SELECT 1 FROM household_members WHERE profile_id = $1 AND household_id = $2',
      [user.profile_id, householdId]
    );

    if (membershipResult.rows.length === 0) {
      // Usuario no pertenece al hogar, redirigir con error
      redirect('/dual-flow?error=household_not_found');
    }

    // Cambiar hogar activo del usuario
    await query(
      `INSERT INTO user_settings (profile_id, active_household_id, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (profile_id)
       DO UPDATE SET active_household_id = $2, updated_at = NOW()`,
      [user.profile_id, householdId]
    );

    // Redirigir al dashboard con el nuevo hogar
    redirect('/dual-flow');
  } catch (error) {
    console.error('Error switching household:', error);
    redirect('/dual-flow?error=switch_failed');
  }
}