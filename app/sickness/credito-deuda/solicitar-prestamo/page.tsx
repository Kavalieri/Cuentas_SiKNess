import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserHouseholdId } from '@/lib/auth';
import { getHouseholdAvailableBalance } from '@/lib/loans/actions';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import RequestLoanForm from './_components/RequestLoanForm';

async function getAvailableBalance() {
  const result = await getHouseholdAvailableBalance();
  if (!result.ok) {
    return 0;
  }
  return result.data?.max_loanable ?? 0;
}

export default async function SolicitarPrestamoPage() {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/sickness/onboarding');
  }

  const availableBalance = await getAvailableBalance();

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
        <h1 className="text-3xl font-bold">Solicitar Préstamo del Hogar</h1>
      </div>

      {/* Información contextual */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">ℹ️ ¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200 space-y-2">
          <p>
            Puedes solicitar un préstamo de la cuenta común del hogar. Este préstamo debe ser
            aprobado por el administrador antes de ser efectivo.
          </p>
          <p>
            <strong>Proceso:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Solicitas el monto que necesitas (dentro del saldo disponible)</li>
            <li>El administrador del hogar revisa y aprueba/rechaza tu solicitud</li>
            <li>
              Si se aprueba: el dinero sale de la cuenta común y aumenta tu deuda con el hogar
            </li>
            <li>Puedes devolver el préstamo cuando quieras mediante un pago común</li>
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
            <RequestLoanForm availableBalance={availableBalance} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
