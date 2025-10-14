'use client';

import { getHouseholdSettingsAction } from '@/app/dual-flow/actions';
import MonthlyGoalConfigModal from '@/app/dual-flow/components/MonthlyGoalConfigModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { Building, Crown, Settings, Target, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Household {
  id: string;
  name: string;
  created_at: string;
}

interface Member {
  profile_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  display_name: string;
  email: string;
}

interface HouseholdConfigPageProps {
  household: Household;
  members: Member[];
  currentUserId: string;
}

export function HouseholdConfigPage({
  household,
  members,
  currentUserId,
}: HouseholdConfigPageProps) {
  const router = useRouter();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState<number | null>(null);
  const [isLoadingGoal, setIsLoadingGoal] = useState(true);

  // Determinar rol del usuario actual
  const currentUserRole = members.find((m) => m.profile_id === currentUserId)?.role || 'member';
  const isOwner = currentUserRole === 'owner';

  // Cargar objetivo mensual al montar el componente
  useEffect(() => {
    async function loadSettings() {
      setIsLoadingGoal(true);
      const result = await getHouseholdSettingsAction();
      if (result.ok && result.data) {
        setMonthlyGoal(result.data.monthlyGoal);
      }
      setIsLoadingGoal(false);
    }

    loadSettings();
  }, []);

  const handleGoalUpdated = (updatedGoal: number) => {
    setMonthlyGoal(updatedGoal);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Información del Hogar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Información del Hogar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{household.name}</h3>
              {isOwner && (
                <Badge variant="secondary" className="gap-1">
                  <Crown className="h-3 w-3" />
                  Propietario
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Creado el {new Date(household.created_at).toLocaleDateString('es-ES')}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            <span>{members.length} miembros</span>
          </div>
        </CardContent>
      </Card>

      {/* Configuración Financiera */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Configuración Financiera
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <h4 className="font-medium">Objetivo Mensual</h4>
              <p className="text-sm text-muted-foreground">Meta de gastos compartidos del hogar</p>
              {!isLoadingGoal && (
                <p className="text-lg font-semibold text-primary">
                  {monthlyGoal ? formatCurrency(monthlyGoal) : 'Sin configurar'}
                </p>
              )}
              {isLoadingGoal && <p className="text-sm text-muted-foreground">Cargando...</p>}
            </div>

            {isOwner && (
              <Button
                variant="outline"
                onClick={() => setShowGoalModal(true)}
                disabled={isLoadingGoal}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            )}
          </div>

          {!isOwner && (
            <p className="text-sm text-muted-foreground italic">
              Solo el propietario del hogar puede modificar la configuración financiera
            </p>
          )}
        </CardContent>
      </Card>

      {/* Miembros del Hogar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Miembros del Hogar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => (
            <div
              key={member.profile_id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{member.display_name}</span>
                  {member.profile_id === currentUserId && (
                    <Badge variant="outline" className="text-xs">
                      Tú
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{member.email}</p>
                <p className="text-xs text-muted-foreground">
                  Se unió el {new Date(member.joined_at).toLocaleDateString('es-ES')}
                </p>
              </div>

              <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                {member.role === 'owner' ? (
                  <>
                    <Crown className="h-3 w-3 mr-1" />
                    Propietario
                  </>
                ) : (
                  'Miembro'
                )}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Modal de configuración del objetivo mensual */}
      {isOwner && (
        <MonthlyGoalConfigModal
          open={showGoalModal}
          onOpenChange={setShowGoalModal}
          currentGoal={monthlyGoal}
          onGoalUpdated={handleGoalUpdated}
        />
      )}
    </div>
  );
}
