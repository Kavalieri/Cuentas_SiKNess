import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getUserHouseholdId } from '@/lib/auth';
import { query } from '@/lib/db';
import RequestLoanForm from './_components/RequestLoanForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function getHouseholdMembers() {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    return [];
  }

  // Obtener miembros del hogar excepto el usuario actual
  const res = await query<{
    profile_id: string;
    display_name: string;
    balance: number;
  }>(
    `
    SELECT 
      p.id as profile_id,
      p.display_name,
      0 as balance
    FROM profiles p
    INNER JOIN household_members hm ON hm.profile_id = p.id
    WHERE hm.household_id = $1
      AND hm.is_current_user = false
    ORDER BY p.display_name
  `,
    [householdId],
  );

  return res.rows;
}

export default async function SolicitarPrestamoPage() {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/sickness/onboarding');
  }

  const members = await getHouseholdMembers();

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
        <h1 className="text-3xl font-bold">Solicitar Préstamo</h1>
      </div>

      {/* Información contextual */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            ℹ️ ¿Cómo funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200 space-y-2">
          <p>
            Cuando solicitas un préstamo, estás registrando que otro miembro te
            ha prestado dinero de su bolsillo.
          </p>
          <p>
            <strong>Efecto:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              El prestamista aumenta su crédito (le debes dinero, su balance
              sube)
            </li>
            <li>
              Tú reduces tu deuda (recibes dinero, tu balance baja)
            </li>
            <li>Este préstamo se refleja en el historial de ambos</li>
          </ul>
        </CardContent>
      </Card>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Datos del Préstamo</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Cargando...</div>}>
            <RequestLoanForm members={members} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
