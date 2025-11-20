import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { getMyLoanRequests } from '@/lib/loans/actions';
import { ArrowLeft, FileCheck } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * Página de Historial de Préstamos
 *
 * Muestra todas las solicitudes de préstamo del usuario actual:
 * - Solicitudes pendientes
 * - Solicitudes aprobadas
 * - Solicitudes rechazadas
 * - Solicitudes canceladas
 */
export default async function LoanHistoryPage() {
  const requestsRes = await getMyLoanRequests();

  if (!requestsRes.ok) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="text-destructive">Error: {requestsRes.message}</div>
      </div>
    );
  }

  const requests = requestsRes.data || [];

  // Agrupar por estado
  const pending = requests.filter((r) => r.status === 'pending');
  const approved = requests.filter((r) => r.status === 'approved');
  const rejected = requests.filter((r) => r.status === 'rejected');
  const cancelled = requests.filter((r) => r.status === 'cancelled');

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/sickness/credito-deuda">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileCheck className="h-8 w-8" />
            Historial de Préstamos
          </h1>
          <p className="text-muted-foreground">Todas tus solicitudes de préstamo al hogar</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pending.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approved.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejected.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{cancelled.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Solicitudes */}
      <Card>
        <CardHeader>
          <CardTitle>Todas las Solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes solicitudes de préstamo aún</p>
              <Link href="/sickness/credito-deuda/solicitar-prestamo" className="mt-4 inline-block">
                <Button>Solicitar Préstamo</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Revisión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        {new Date(request.requested_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(request.amount)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{request.description}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.status === 'approved'
                              ? 'default'
                              : request.status === 'pending'
                              ? 'secondary'
                              : request.status === 'rejected'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {request.status === 'approved' && 'Aprobado'}
                          {request.status === 'pending' && 'Pendiente'}
                          {request.status === 'rejected' && 'Rechazado'}
                          {request.status === 'cancelled' && 'Cancelado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.reviewed_at ? (
                          new Date(request.reviewed_at).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rechazadas con motivos */}
      {rejected.length > 0 && (
        <Card className="border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-600">Solicitudes Rechazadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rejected.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{formatCurrency(request.amount)}</p>
                    <p className="text-sm text-muted-foreground">{request.description}</p>
                  </div>
                  <Badge variant="destructive">Rechazado</Badge>
                </div>
                {request.rejection_reason && (
                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium mb-1">Motivo del rechazo:</p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {request.rejection_reason}
                    </p>
                  </div>
                )}
                <div className="mt-2 text-xs text-muted-foreground">
                  {request.reviewed_at ? (
                    <>
                      Revisado el{' '}
                      {new Date(request.reviewed_at).toLocaleDateString('es-ES')}
                    </>
                  ) : (
                    'Pendiente de revisión'
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
