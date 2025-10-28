'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteAccount } from '@/app/configuracion/perfil/email-actions';
import { acceptInvitationByCode, createHousehold } from './actions';

export default function OnboardingPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    if (!deleteConfirmed) {
      toast.error('Debes confirmar que entiendes que esta acción es irreversible');
      return;
    }

    setDeleting(true);
    const result = await deleteAccount();
    setDeleting(false);

    if (result.ok) {
      toast.success('Cuenta eliminada exitosamente. Redirigiendo...');
      setTimeout(() => {
        window.location.href = '/api/auth/signout';
      }, 2000);
    } else {
      toast.error(result.message || 'Error al eliminar la cuenta');
      setDeleteDialogOpen(false);
      setDeleteConfirmed(false);
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Únete a un hogar existente</CardTitle>
          <CardDescription>Introduce el código de invitación que te han compartido</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={acceptInvitationByCode} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="code">Código de invitación</Label>
              <Input id="code" name="code" placeholder="p. ej. 0f9f7c8e-..." required />
            </div>
            <Button type="submit" className="w-full">
              Unirme al hogar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crear un nuevo hogar</CardTitle>
          <CardDescription>Si no tienes código, puedes crear tu propio hogar ahora</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createHousehold} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="name">Nombre del hogar</Label>
              <Input id="name" name="name" placeholder="Mi Hogar" required />
            </div>
            <Button type="submit" className="w-full">
              Crear hogar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Zona de Peligro */}
      <Card className="w-full max-w-md border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
          <CardDescription>
            Acciones irreversibles. Piensa bien antes de continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleting}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Eliminar mi cuenta permanentemente
          </Button>
        </CardContent>
      </Card>

      {/* AlertDialog para confirmar eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              ¿Estás seguro de que quieres eliminar tu cuenta?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>Esta acción es permanente e irreversible. Se eliminarán:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Tu perfil y toda tu información personal</li>
                <li>Tus contribuciones e ingresos registrados</li>
                <li>Tus créditos y ajustes</li>
                <li>Tu membresía en todos los hogares</li>
              </ul>
              <p className="text-sm font-medium">
                Los registros de auditoría (journals y logs) se conservarán para fines de depuración
                y cumplimiento normativo.
              </p>
              <div className="flex items-center space-x-2 pt-4">
                <Checkbox
                  id="confirm-delete"
                  checked={deleteConfirmed}
                  onCheckedChange={(checked) => setDeleteConfirmed(checked === true)}
                />
                <label
                  htmlFor="confirm-delete"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Entiendo que esta acción es irreversible y quiero eliminar mi cuenta
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={!deleteConfirmed || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar mi cuenta permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
