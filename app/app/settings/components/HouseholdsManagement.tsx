'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Crown, Users } from 'lucide-react';
import Link from 'next/link';
import { HouseholdCard } from './HouseholdCard';
import { getHouseholdMembers } from '../actions';

interface Member {
  profile_id: string;
  email: string;
  role: 'owner' | 'member';
  joined_at: string;
  current_income: number;
}

interface Household {
  id: string;
  name: string;
  role: 'owner' | 'member';
  is_active?: boolean;
  member_count?: number;
  owner_count?: number;
  created_at?: string;
}

interface HouseholdsManagementProps {
  households: Household[];
  activeHouseholdId: string;
  userId: string;
}

export function HouseholdsManagement({
  households,
  activeHouseholdId,
  userId
}: HouseholdsManagementProps) {
  const [householdMembers, setHouseholdMembers] = useState<Map<string, Member[]>>(new Map());
  const [loadingMembers, setLoadingMembers] = useState<Set<string>>(new Set());

  const loadMembers = async (householdId: string) => {
    // Si ya tenemos los miembros, no recargar
    if (householdMembers.has(householdId)) return;

    // Marcar como cargando
    setLoadingMembers(prev => new Set(prev).add(householdId));

    try {
      const result = await getHouseholdMembers(householdId);

      if (result.ok && result.data) {
        // Actualizar estado con los miembros
        setHouseholdMembers(prev => new Map(prev).set(householdId, result.data || []));
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      // Quitar del estado de carga
      setLoadingMembers(prev => {
        const newSet = new Set(prev);
        newSet.delete(householdId);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con botón de crear */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mis Hogares</h2>
          <p className="text-muted-foreground">
            Gestiona todos los hogares a los que perteneces
          </p>
        </div>
        <Link href="/app/onboarding?create=true">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Crear Hogar
          </Button>
        </Link>
      </div>

      {/* Grid de hogares con HouseholdCard */}
      {households.length > 0 ? (
        <div className="grid gap-4">
          {households.map((household) => (
            <HouseholdCard
              key={household.id}
              household={{
                id: household.id,
                name: household.name,
                created_at: household.created_at || '',
                is_active: household.is_active,
                member_count: household.member_count,
                owner_count: household.owner_count,
                role: household.role
              }}
              members={householdMembers.get(household.id) || []}
              currentUserId={userId}
              isOwner={household.role === 'owner'}
              isOnlyOwner={household.role === 'owner' && household.owner_count === 1}
              onExpand={() => loadMembers(household.id)}
              isLoadingMembers={loadingMembers.has(household.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">
              No perteneces a ningún hogar todavía
            </p>
            <Link href="/app/onboarding?create=true">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear tu primer hogar
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Sección de ayuda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">¿Qué significan los roles?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Crown className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div>
              <strong>Propietario:</strong> Puede gestionar miembros, categorías y configuración del hogar
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 mt-0.5" />
            <div>
              <strong>Miembro:</strong> Puede ver y registrar transacciones del hogar
            </div>
          </div>
          <p className="mt-4">
            El hogar <strong>activo</strong> es el que estás gestionando actualmente.
            Puedes cambiar entre hogares desde el selector en la barra superior.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
