'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSiKness } from '@/contexts/SiKnessContext';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { MemberIncome, UserProfile } from './actions';
import { getMemberIncome, getUserProfile, updateDisplayName, updateMemberIncome } from './actions';

export default function PerfilPage() {
  const { householdId } = useSiKness();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [income, setIncome] = useState<MemberIncome | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingIncome, setSavingIncome] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');

  // Cargar datos del perfil e ingreso
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);

      // Cargar perfil
      const profileResult = await getUserProfile();
      if (profileResult.ok && profileResult.data) {
        setProfile(profileResult.data);
        setDisplayName(profileResult.data.displayName || '');
      } else {
        toast.error(!profileResult.ok ? profileResult.message : 'Error al cargar el perfil');
      }

      // Cargar ingreso si hay hogar activo
      if (householdId) {
        const incomeResult = await getMemberIncome(householdId);
        if (incomeResult.ok && incomeResult.data) {
          setIncome(incomeResult.data);
          setMonthlyIncome(incomeResult.data.monthlyIncome.toString());
        }
      }

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

    if (!householdId) {
      toast.error('Debes tener un hogar activo para configurar tus ingresos');
      return;
    }

    setSavingIncome(true);

    const formData = new FormData(e.currentTarget);
    formData.append('householdId', householdId);

    const result = await updateMemberIncome(formData);

    if (result.ok) {
      toast.success('Ingreso mensual actualizado correctamente');
      // Recargar ingreso
      const incomeResult = await getMemberIncome(householdId);
      if (incomeResult.ok && incomeResult.data) {
        setIncome(incomeResult.data);
      }
    } else {
      toast.error(result.message);
    }

    setSavingIncome(false);
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
          <p className="text-destructive">Error al cargar el perfil</p>
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
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">Tu email no puede ser modificado</p>
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

      {/* Ingresos Mensuales */}
      {householdId && (
        <Card>
          <CardHeader>
            <CardTitle>Ingresos Mensuales</CardTitle>
            <CardDescription>Tu ingreso mensual para el cálculo de contribuciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleUpdateIncome} className="space-y-4">
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
    </div>
  );
}
