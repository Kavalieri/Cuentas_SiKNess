'use client';

import { deleteAccount } from '@/app/configuracion/perfil/email-actions';
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
import { useSiKness } from '@/contexts/SiKnessContext';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { MemberIncome, UserAuthInfo, UserProfile } from './actions';
import { getMemberIncome, getUserAuthInfo, getUserProfile, updateDisplayName, updateMemberIncome } from './actions';
import { EmailManagementCard } from './EmailManagementCard';

export default function PerfilPage() {
  const { householdId } = useSiKness();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authInfo, setAuthInfo] = useState<UserAuthInfo | null>(null);
  const [income, setIncome] = useState<MemberIncome | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingIncome, setSavingIncome] = useState(false);

  // Estados para eliminación de cuenta
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');

  // Cargar datos del perfil e ingreso
  useEffect(() => {
    async function loadProfile() {
      console.log('[PerfilPage] 🔍 Cargando perfil del usuario...');
      setLoading(true);

      // Cargar info de autenticación
      console.log('[PerfilPage] Llamando getUserAuthInfo...');
      const authResult = await getUserAuthInfo();
      console.log('[PerfilPage] getUserAuthInfo resultado:', authResult.ok ? 'OK' : 'FAIL');
      if (authResult.ok && authResult.data) {
        setAuthInfo(authResult.data);
      } else {
        console.error('[PerfilPage] Error getUserAuthInfo:', !authResult.ok ? authResult.message : 'Sin data');
        toast.error('Error al cargar información de sesión');
      }

      // Cargar perfil
      console.log('[PerfilPage] Llamando getUserProfile...');
      const profileResult = await getUserProfile();
      console.log('[PerfilPage] getUserProfile resultado:', profileResult.ok ? 'OK' : 'FAIL');
      if (profileResult.ok && profileResult.data) {
        console.log('[PerfilPage] ✅ Perfil cargado:', profileResult.data.displayName);
        setProfile(profileResult.data);
        setDisplayName(profileResult.data.displayName || '');
      } else {
        console.error('[PerfilPage] Error getUserProfile:', !profileResult.ok ? profileResult.message : 'Sin data');
        toast.error(profileResult.ok ? 'Perfil no disponible' : profileResult.message);
        setProfile(null);
      }

      // Cargar ingreso si hay hogar activo
      if (householdId) {
        console.log('[PerfilPage] Llamando getMemberIncome con householdId:', householdId);
        const incomeResult = await getMemberIncome(householdId);
        console.log('[PerfilPage] getMemberIncome resultado:', incomeResult.ok ? 'OK' : 'FAIL');
        if (incomeResult.ok && incomeResult.data) {
          setIncome(incomeResult.data);
          setMonthlyIncome(incomeResult.data.monthlyIncome.toString());
        }
      }

      console.log('[PerfilPage] ✅ Carga completada');
      setLoading(false);
    }

    loadProfile();
  }, [householdId]);

  // Actualizar nombre visible
  async function handleUpdateName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingName(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateDisplayName(formData);

    if (result.ok) {
      toast.success('Nombre actualizado correctamente');
      // Recargar perfil
      const profileResult = await getUserProfile();
      if (profileResult.ok && profileResult.data) {
        setProfile(profileResult.data);
      }
    } else {
      toast.error(result.message);
    }

    setSavingName(false);
  }

    // Actualizar ingreso mensual
  async function handleUpdateIncome(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!householdId) return;

    setSavingIncome(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateMemberIncome(formData);
    setSavingIncome(false);

    if (result.ok) {
      toast.success('Ingreso mensual actualizado');
      // Recargar ingreso actualizado
      const incomeResult = await getMemberIncome(householdId);
      if (incomeResult.ok && incomeResult.data) {
        setIncome(incomeResult.data);
        setMonthlyIncome(incomeResult.data.monthlyIncome.toString());
      }
    } else {
      toast.error(result.message || 'Error al actualizar el ingreso');
    }
  }

  // Eliminar cuenta
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
      // Esperar un momento para que el usuario vea el mensaje
      setTimeout(() => {
        // Logout forzado (eliminar sesión y redirigir a login)
        window.location.href = '/api/auth/signout';
      }, 2000);
    } else {
      toast.error(result.message || 'Error al eliminar la cuenta');
      setDeleteDialogOpen(false);
      setDeleteConfirmed(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Mi Perfil</h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Mi Perfil</h1>
          <p className="text-destructive">
            No se pudo cargar el perfil. Por favor, intenta recargar la página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground">Gestiona tu información personal y configuración</p>
      </div>

      {/* Información Personal */}
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>Tu nombre visible y datos de contacto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email primario (read-only - info) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email primario</Label>
            <Input
              id="email"
              type="email"
              value={profile.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              Gestiona todos tus emails en la sección de abajo
            </p>
          </div>

          {/* Nombre visible (editable) */}
          <form onSubmit={handleUpdateName} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nombre visible</Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
                required
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
                Este nombre se mostrará a otros miembros del hogar
              </p>
            </div>

            <Button type="submit" disabled={savingName}>
              {savingName ? 'Guardando...' : 'Guardar nombre'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Gestión de Emails */}
      <EmailManagementCard authInfo={authInfo} />

      {/* Ingresos Mensuales */}
      {householdId && (
        <Card>
          <CardHeader>
            <CardTitle>Ingresos Mensuales</CardTitle>
            <CardDescription>Tu ingreso mensual para el cálculo de contribuciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleUpdateIncome} className="space-y-4">
              <input type="hidden" name="householdId" value={householdId} />
              <div className="space-y-2">
                <Label htmlFor="monthlyIncome">Ingreso mensual (€)</Label>
                <Input
                  id="monthlyIncome"
                  name="monthlyIncome"
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  placeholder="0.00"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Este valor se usa para calcular tu contribución proporcional al fondo común
                </p>
                {income && (
                  <p className="text-sm text-muted-foreground">
                    Ingreso actual:{' '}
                    <span className="font-semibold">{income.monthlyIncome.toFixed(2)}€</span> (desde{' '}
                    {new Date(income.effectiveFrom).toLocaleDateString()})
                  </p>
                )}
              </div>

              <Button type="submit" disabled={savingIncome}>
                {savingIncome ? 'Guardando...' : 'Actualizar ingreso'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {!householdId && (
        <Card className="border-amber-500">
          <CardHeader>
            <CardTitle>⚠️ Sin hogar activo</CardTitle>
            <CardDescription>
              Debes seleccionar un hogar en la barra superior para configurar tus ingresos
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Información adicional (solo lectura) */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la cuenta</CardTitle>
          <CardDescription>Datos del sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Cuenta creada:</span>
            <span className="text-sm font-medium">
              {new Date(profile.createdAt).toLocaleDateString()}
            </span>
          </div>
          {profile.isSystemAdmin && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Rol:</span>
              <span className="text-sm font-medium text-primary">Administrador del Sistema</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zona de Peligro - Eliminar Cuenta */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zona de Peligro
          </CardTitle>
          <CardDescription>
            Acciones irreversibles que afectarán permanentemente tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <h3 className="font-semibold text-destructive mb-2">Eliminar mi cuenta</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Esta acción eliminará permanentemente tu cuenta y todos tus datos personales. Esta
                operación no se puede deshacer.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Nota:</strong> No podrás eliminar tu cuenta si eres el único propietario
                (owner) de algún hogar. Primero debes transferir la propiedad o eliminar el hogar.
              </p>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar mi cuenta
              </Button>
            </div>
          </div>
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
    </div>
  );
}
