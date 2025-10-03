'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, CheckCircle, XCircle } from 'lucide-react';
import { acceptInvitation, cancelInvitation } from '@/app/app/household/invitations/actions';
import { toast } from 'sonner';

interface InvitationDetails {
  id: string;
  type: 'household' | 'app';
  token: string;
  email: string | null;
  household_id: string | null;
  household_name: string | null;
  invited_by_email: string;
  status: string;
  created_at: string;
  expires_at: string;
  max_uses: number | null;
  current_uses: number;
  metadata: {
    personalMessage?: string;
    [key: string]: unknown;
  };
}

interface PendingInvitationsCardProps {
  invitations: InvitationDetails[];
}

export function PendingInvitationsCard({ invitations }: PendingInvitationsCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  if (invitations.length === 0) {
    return null;
  }

  const handleAccept = async (token: string) => {
    setLoading(token);
    const result = await acceptInvitation(token);
    
    if (result.ok) {
      toast.success('¡Invitación aceptada! Bienvenido al hogar');
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setLoading(null);
  };

  const handleDecline = async (invitationId: string) => {
    setLoading(invitationId);
    const result = await cancelInvitation(invitationId);
    
    if (result.ok) {
      toast.success('Invitación rechazada');
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setLoading(null);
  };

  return (
    <Card className="border-primary bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle>Invitaciones Pendientes</CardTitle>
        </div>
        <CardDescription>
          Tienes {invitations.length} invitación{invitations.length > 1 ? 'es' : ''} pendiente{invitations.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map((invitation) => (
          <Card key={invitation.id} className="bg-background">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-lg">
                      {invitation.household_name || 'CuentasSiK'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Invitado por {invitation.invited_by_email}
                    </p>
                  </div>
                  <Badge variant={invitation.type === 'household' ? 'default' : 'secondary'}>
                    {invitation.type === 'household' ? 'Hogar' : 'App'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Expira el{' '}
                    {new Date(invitation.expires_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {invitation.metadata.personalMessage && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground italic">
                      &quot;{invitation.metadata.personalMessage}&quot;
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleAccept(invitation.token)}
                    disabled={loading !== null}
                    className="flex-1"
                  >
                    {loading === invitation.token ? (
                      'Aceptando...'
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Aceptar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDecline(invitation.id)}
                    disabled={loading !== null}
                    className="flex-1"
                  >
                    {loading === invitation.id ? (
                      'Rechazando...'
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Rechazar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
