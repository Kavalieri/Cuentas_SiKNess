'use client';

import type { SettingsInvitation } from '@/app/app/settings/invitations-actions';
import {
  getHouseholdInvitations,
  getHouseholdStats,
  isOwnerOfHousehold,
} from '@/app/app/settings/invitations-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { InvitationsManagement } from './InvitationsManagement';

interface InvitationsTabProps {
  userId: string;
}

export function InvitationsTab({ userId: _userId }: InvitationsTabProps) {
  const [invitations, setInvitations] = useState<SettingsInvitation[]>([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalInvitations: 0,
    pendingInvitations: 0,
  });
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Verificar ownership
        const ownerCheck = await isOwnerOfHousehold();
        setIsOwner(ownerCheck);

        if (!ownerCheck) {
          setLoading(false);
          return;
        }

        // Cargar invitaciones
        const invitationsResult = await getHouseholdInvitations();
        if (!invitationsResult.ok) {
          setError(invitationsResult.message);
          setLoading(false);
          return;
        }

        setInvitations(invitationsResult.data || []);

        // Cargar estadísticas
        const statsResult = await getHouseholdStats();
        if (statsResult.ok) {
          setStats(
            statsResult.data || {
              totalMembers: 0,
              totalInvitations: 0,
              pendingInvitations: 0,
            },
          );
        }

        setLoading(false);
      } catch {
        setError('Error al cargar los datos de invitaciones');
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Invitaciones</CardTitle>
          <CardDescription>Cargando información de invitaciones...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error al cargar invitaciones
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <InvitationsManagement invitations={invitations} stats={stats} isOwner={isOwner} />;
}
