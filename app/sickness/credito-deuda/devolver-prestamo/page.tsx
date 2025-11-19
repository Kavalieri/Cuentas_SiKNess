import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import RepayLoanForm from './_components/RepayLoanForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface MemberDebt {
  profile_id: string;
  display_name: string;
  debt_amount: number;
}

async function getMembersIOweTo(): Promise<MemberDebt[]> {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return [];
  }

  // Obtener profile_id del usuario actual
  const userRes = await query<{ profile_id: string }>(
    `SELECT profile_id FROM household_members WHERE household_id = $1 AND is_current_user = true`,
    [householdId],
  );

  if (!userRes.rows[0]) {
    return [];
  }

  const currentUserId = userRes.rows[0].profile_id;

  // Obtener balance actual usando los cálculos de contribuciones
  // Un balance negativo significa que debo dinero
  const res = await query<{
    other_profile_id: string;
    other_display_name: string;
    balance_difference: number;
  }>(
    `
    WITH period_balances AS (
      SELECT 
        mp.id as period_id,
        mp.year,
        mp.month,
        hm.profile_id,
        p.display_name
      FROM monthly_periods mp
      CROSS JOIN household_members hm
      INNER JOIN profiles p ON p.id = hm.profile_id
      WHERE mp.household_id = $1
        AND hm.household_id = $1
        AND mp.phase != 'preparing'
    ),
    my_balance AS (
      -- Mi balance total (suma de todos los períodos)
      SELECT 
        SUM(
          COALESCE(contrib.overpaid_amount, 0) - COALESCE(contrib.pending_amount, 0)
        ) as total_balance
      FROM period_balances pb
      LEFT JOIN LATERAL (
        SELECT * FROM get_contributions_for_period(
          $1,
          pb.year,
          pb.month,
          pb.profile_id
        )
      ) contrib ON true
      WHERE pb.profile_id = $2
    ),
    other_balances AS (
      -- Balance de otros miembros
      SELECT 
        pb.profile_id,
        pb.display_name,
        SUM(
          COALESCE(contrib.overpaid_amount, 0) - COALESCE(contrib.pending_amount, 0)
        ) as total_balance
      FROM period_balances pb
      LEFT JOIN LATERAL (
        SELECT * FROM get_contributions_for_period(
          $1,
          pb.year,
          pb.month,
          pb.profile_id
        )
      ) contrib ON true
      WHERE pb.profile_id != $2
      GROUP BY pb.profile_id, pb.display_name
    )
    SELECT 
      ob.profile_id as other_profile_id,
      ob.display_name as other_display_name,
      (SELECT total_balance FROM my_balance) - ob.total_balance as balance_difference
    FROM other_balances ob
    WHERE (SELECT total_balance FROM my_balance) < ob.total_balance
    ORDER BY balance_difference
  `,
    [householdId, currentUserId],
  );

  // Convertir a formato MemberDebt
  return res.rows.map((row) => ({
    profile_id: row.other_profile_id,
    display_name: row.other_display_name,
    debt_amount: Math.abs(row.balance_difference),
  }));
}

export default async function DevolverPrestamoPage() {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/sickness/onboarding');
  }

  const debts = await getMembersIOweTo();

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header con navegación */}
      <div className="flex items-center gap-4">
        <Link href="/sickness/credito-deuda">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Devolver Préstamo</h1>
      </div>

      {/* Información contextual */}
      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-900 dark:text-green-100">
            ℹ️ ¿Cómo funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-800 dark:text-green-200 space-y-2">
          <p>
            Cuando devuelves un préstamo, estás registrando un pago que reduces
            tu deuda con otro miembro.
          </p>
          <p>
            <strong>Efecto:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Tú aumentas tu balance (reduces tu deuda)</li>
            <li>El acreedor reduce su crédito (recibe su dinero de vuelta)</li>
            <li>Este pago se refleja en el historial de ambos</li>
          </ul>
        </CardContent>
      </Card>

      {/* Estado de deudas */}
      {debts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p className="text-lg">✅ No tienes deudas pendientes</p>
            <p className="text-sm mt-2">
              Tu balance está equilibrado o en positivo con todos los miembros
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen de deudas */}
          <Card>
            <CardHeader>
              <CardTitle>Tus Deudas Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {debts.map((debt) => (
                  <div
                    key={debt.profile_id}
                    className="flex justify-between items-center p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{debt.display_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Debes aproximadamente
                      </p>
                    </div>
                    <p className="text-xl font-bold text-red-600">
                      €{debt.debt_amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Formulario de pago */}
          <Card>
            <CardHeader>
              <CardTitle>Registrar Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Cargando...</div>}>
                <RepayLoanForm debts={debts} />
              </Suspense>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
