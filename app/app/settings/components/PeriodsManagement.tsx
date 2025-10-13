'use client';

import type { ContributionPeriod } from '@/app/app/settings/periods-actions';
import {
  closeContributionPeriod,
  lockContributionPeriod,
} from '@/app/app/settings/periods-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, Lock, X } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

interface PeriodsManagementProps {
  periods: ContributionPeriod[];
  currentPeriod: ContributionPeriod | null;
  isOwner: boolean;
}

export function PeriodsManagement({ periods, currentPeriod, isOwner }: PeriodsManagementProps) {
  const [isPending, startTransition] = useTransition();

  const handleLockPeriod = (period: ContributionPeriod) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('year', period.year.toString());
      formData.append('month', period.month.toString());

      const result = await lockContributionPeriod(formData);

      if (result.ok) {
        toast.success(
          `Período bloqueado - ${getMonthName(period.month)} ${
            period.year
          } ha sido bloqueado. Ahora se pueden registrar gastos comunes.`,
        );
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleClosePeriod = (period: ContributionPeriod) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('year', period.year.toString());
      formData.append('month', period.month.toString());

      const result = await closeContributionPeriod(formData);

      if (result.ok) {
        toast.success(
          `Período cerrado - ${getMonthName(period.month)} ${
            period.year
          } ha sido cerrado definitivamente.`,
        );
      } else {
        toast.error(result.message);
      }
    });
  };

  const getMonthName = (month: number) => {
    const date = new Date(2025, month - 1, 1);
    return format(date, 'MMMM', { locale: es });
  };

  const getStatusBadge = (status: ContributionPeriod['status']) => {
    switch (status) {
      case 'SETUP':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            🔓 Configuración
          </Badge>
        );
      case 'LOCKED':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            🔒 Bloqueado
          </Badge>
        );
      case 'CLOSED':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            ❌ Cerrado
          </Badge>
        );
    }
  };

  const getStatusDescription = (status: ContributionPeriod['status']) => {
    switch (status) {
      case 'SETUP':
        return 'Solo se permiten gastos directos. Ideal para configurar contribuciones antes del bloqueo.';
      case 'LOCKED':
        return 'Se permiten gastos comunes y directos. Las contribuciones están calculadas y bloqueadas.';
      case 'CLOSED':
        return 'Período cerrado definitivamente. No se permiten nuevos gastos.';
    }
  };

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gestión de Períodos
          </CardTitle>
          <CardDescription>
            Solo el propietario del hogar puede gestionar los períodos de contribución.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Período actual */}
      {currentPeriod && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Período Actual - {getMonthName(currentPeriod.month)} {currentPeriod.year}
            </CardTitle>
            <CardDescription>Estado actual del período de contribuciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {getStatusBadge(currentPeriod.status)}
              <span className="text-sm text-muted-foreground">
                {getStatusDescription(currentPeriod.status)}
              </span>
            </div>

            {/* Información de fechas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium">Creado</p>
                <p className="text-muted-foreground">
                  {format(new Date(currentPeriod.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                </p>
              </div>
              {currentPeriod.locked_at && (
                <div>
                  <p className="font-medium">Bloqueado</p>
                  <p className="text-muted-foreground">
                    {format(new Date(currentPeriod.locked_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    {currentPeriod.locked_by_email && (
                      <span className="block text-xs">por {currentPeriod.locked_by_email}</span>
                    )}
                  </p>
                </div>
              )}
              {currentPeriod.closed_at && (
                <div>
                  <p className="font-medium">Cerrado</p>
                  <p className="text-muted-foreground">
                    {format(new Date(currentPeriod.closed_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    {currentPeriod.closed_by_email && (
                      <span className="block text-xs">por {currentPeriod.closed_by_email}</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-4">
              {currentPeriod.status === 'SETUP' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={isPending} className="gap-2">
                      <Lock className="h-4 w-4" />
                      Bloquear Período
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        ¿Bloquear período {getMonthName(currentPeriod.month)} {currentPeriod.year}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Al bloquear el período:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Se calcularán las contribuciones finales</li>
                          <li>Se permitirán gastos comunes y directos</li>
                          <li>Las contribuciones quedarán fijas</li>
                        </ul>
                        Esta acción no se puede deshacer fácilmente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleLockPeriod(currentPeriod)}>
                        Bloquear Período
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {currentPeriod.status === 'LOCKED' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isPending} className="gap-2">
                      <X className="h-4 w-4" />
                      Cerrar Período
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        ¿Cerrar período {getMonthName(currentPeriod.month)} {currentPeriod.year}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Al cerrar el período:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>No se podrán registrar más gastos</li>
                          <li>El período quedará archivado</li>
                          <li>Los cálculos serán definitivos</li>
                        </ul>
                        <strong>Esta acción NO se puede deshacer.</strong>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleClosePeriod(currentPeriod)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Cerrar Definitivamente
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de períodos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historial de Períodos
          </CardTitle>
          <CardDescription>Todos los períodos de contribución del hogar</CardDescription>
        </CardHeader>
        <CardContent>
          {periods.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay períodos registrados aún.
            </p>
          ) : (
            <div className="space-y-3">
              {periods.map((period) => (
                <div
                  key={period.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">
                        {getMonthName(period.month)} {period.year}
                      </p>
                      <p className="text-sm text-muted-foreground">{period.flow_description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(period.status)}
                    <div className="text-right text-xs text-muted-foreground">
                      <p>
                        Creado: {format(new Date(period.created_at), 'dd/MM/yy', { locale: es })}
                      </p>
                      {period.locked_at && (
                        <p>
                          Bloqueado:{' '}
                          {format(new Date(period.locked_at), 'dd/MM/yy', { locale: es })}
                        </p>
                      )}
                      {period.closed_at && (
                        <p>
                          Cerrado: {format(new Date(period.closed_at), 'dd/MM/yy', { locale: es })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
