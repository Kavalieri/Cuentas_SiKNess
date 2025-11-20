import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserHouseholdId } from '@/lib/auth';
import { getMemberLoanBalance } from '@/lib/loans/actions';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import RepayLoanForm from './_components/RepayLoanForm';

async function getCurrentDebt() {
  const result = await getMemberLoanBalance();
  if (!result.ok) {
    return 0;
  }
  return result.data?.net_debt ?? 0;
}

export default async function DevolverPrestamoPage() {
  const householdId = await getUserHouseholdId();
  if (!householdId) {
    redirect('/sickness/onboarding');
  }

  const currentDebt = await getCurrentDebt();

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
        <h1 className="text-3xl font-bold">Devolver Préstamo al Hogar</h1>
      </div>

      {/* Información contextual */}
      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-900 dark:text-green-100">ℹ️ ¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent className="text-green-800 dark:text-green-200 space-y-2">
          <p>
            Cuando devuelves un préstamo, estás ingresando dinero a la cuenta común del hogar para
            saldar tu deuda.
          </p>
          <p>
            <strong>Efecto:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>El dinero ingresa a la cuenta común (aumenta el balance del hogar)</li>
            <li>Tu deuda con el hogar disminuye</li>
            <li>El pago se registra inmediatamente, sin necesidad de aprobación</li>
            <li>Si pagas más de tu deuda, el exceso queda a tu favor como crédito</li>
          </ul>
        </CardContent>
      </Card>

      {/* Formulario de pago */}
      <Card>
        <CardHeader>
          <CardTitle>Registrar Pago</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Cargando...</div>}>
            <RepayLoanForm currentDebt={currentDebt} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
