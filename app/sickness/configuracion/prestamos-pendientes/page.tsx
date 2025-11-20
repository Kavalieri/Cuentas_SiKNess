import { redirect } from 'next/navigation';
import { isHouseholdOwner } from '@/lib/auth';
import { getPendingLoanRequests } from '@/lib/loans/actions';
import { PendingLoansList } from './_components/PendingLoansList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export default async function PendingLoansPage() {
  // Verificar que el usuario es owner
  const isOwner = await isHouseholdOwner();
  if (!isOwner) {
    redirect('/sickness/dashboard');
  }

  // Obtener solicitudes pendientes
  const result = await getPendingLoanRequests();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Solicitudes de Préstamo Pendientes</h1>
        <p className="text-muted-foreground mt-2">
          Revisa y aprueba o rechaza las solicitudes de préstamo de los miembros del hogar
        </p>
      </div>

      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Al aprobar un préstamo, se creará un gasto común que reducirá el saldo disponible del hogar
          y aumentará la deuda del miembro solicitante. El miembro podrá devolver el préstamo en cualquier momento.
        </AlertDescription>
      </Alert>

      {!result.ok ? (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{result.message}</p>
          </CardContent>
        </Card>
      ) : !result.data || result.data.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No hay solicitudes pendientes</CardTitle>
            <CardDescription>
              Cuando los miembros soliciten préstamos, aparecerán aquí para tu aprobación.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <PendingLoansList requests={result.data} />
      )}
    </div>
  );
}
