'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Trash2, LogOut, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface HouseholdActionsProps {
  householdId: string;
  householdName: string;
  isOwner: boolean;
  isOnlyOwner: boolean;
}

export function HouseholdActions({
  householdId,
  householdName,
  isOwner,
  isOnlyOwner,
}: HouseholdActionsProps) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLeaveHousehold = async () => {
    if (isOnlyOwner) {
      toast.error('No puedes abandonar el hogar siendo el único propietario. Asigna otro propietario primero o elimina el hogar.');
      return;
    }

    setIsLeaving(true);

    // TODO: Implementar action leaveHousehold
    // const result = await leaveHousehold(householdId);

    // Simulación temporal
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsLeaving(false);
    toast.error('Función leaveHousehold pendiente de implementar');

    // if (!result.ok) {
    //   toast.error(result.message);
    //   return;
    // }

    // toast.success('Has abandonado el hogar');
    // router.push('/app/settings');
    // router.refresh();
  };

  const handleDeleteHousehold = async () => {
    if (!isOnlyOwner) {
      toast.error('Solo el único propietario puede eliminar el hogar');
      return;
    }

    setIsDeleting(true);

    // TODO: Implementar action deleteHousehold (soft delete)
    // const result = await deleteHousehold(householdId);

    // Simulación temporal
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsDeleting(false);
    toast.error('Función deleteHousehold pendiente de implementar');

    // if (!result.ok) {
    //   toast.error(result.message);
    //   return;
    // }

    // toast.success('Hogar eliminado correctamente');
    // router.push('/app/settings');
    // router.refresh();
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Zona Peligrosa
        </CardTitle>
        <CardDescription>
          Acciones irreversibles que afectan tu participación en el hogar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Abandonar hogar (Members y Owners no únicos) */}
        {(!isOwner || !isOnlyOwner) && (
          <div className="space-y-2">
            <div>
              <h4 className="font-semibold text-sm">Abandonar Hogar</h4>
              <p className="text-sm text-muted-foreground">
                Dejarás de tener acceso a este hogar y sus datos.
                {isOwner && !isOnlyOwner && ' La propiedad se mantendrá con otros propietarios.'}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={isLeaving}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLeaving ? 'Abandonando...' : 'Abandonar Hogar'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Abandonar {householdName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción es irreversible. Perderás acceso a:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Todas las transacciones del hogar</li>
                      <li>Contribuciones e historial</li>
                      <li>Categorías y configuraciones</li>
                    </ul>
                    <p className="mt-3 font-semibold text-foreground">
                      Solo podrás volver si un propietario te invita nuevamente.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLeaveHousehold}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sí, abandonar hogar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Eliminar hogar (Solo owner único) */}
        {isOwner && isOnlyOwner && (
          <div className="space-y-2">
            <div>
              <h4 className="font-semibold text-sm text-destructive">Eliminar Hogar Permanentemente</h4>
              <p className="text-sm text-muted-foreground">
                Como único propietario, puedes eliminar completamente este hogar.
                Esta acción es <strong className="text-destructive">irreversible</strong>.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? 'Eliminando...' : 'Eliminar Hogar Permanentemente'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">
                    ⚠️ ¿Eliminar {householdName} permanentemente?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong className="text-destructive">ESTA ACCIÓN NO SE PUEDE DESHACER.</strong>
                    <p className="mt-2">Se eliminarán permanentemente:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-foreground">
                      <li>Todas las transacciones (gastos e ingresos)</li>
                      <li>Todas las categorías personalizadas</li>
                      <li>Todo el historial de contribuciones</li>
                      <li>Todos los ajustes manuales</li>
                      <li>Configuración de ingresos y metas</li>
                      <li>El hogar completo y todos sus miembros</li>
                    </ul>
                    <p className="mt-4 font-bold text-destructive text-lg">
                      Esta acción borrará TODOS los datos financieros del hogar.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No, conservar hogar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteHousehold}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sí, eliminar permanentemente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Información adicional para owners únicos */}
        {isOwner && isOnlyOwner && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg text-sm border border-yellow-200 dark:border-yellow-900">
            <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
              💡 Alternativas antes de eliminar:
            </p>
            <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-200">
              <li>Invita a otro miembro como propietario</li>
              <li>Transfiere la propiedad antes de abandonar</li>
              <li>Considera que otros pueden necesitar acceso a los datos</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
