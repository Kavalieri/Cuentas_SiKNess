'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Home, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { acceptInvitation } from '@/app/app/household/invitations/actions';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingInvitation {
  id: string;
  token: string;
  household_name: string | null;
  invited_by_email: string;
  expires_at: string;
  created_at: string;
}

interface ProfileInvitationsCardProps {
  invitations: PendingInvitation[];
}

export function ProfileInvitationsCard({ invitations }: ProfileInvitationsCardProps) {
  const router = useRouter();
  const [accepting, setAccepting] = useState<string | null>(null);

  if (invitations.length === 0) {
    return null;
  }

  const handleAccept = async (token: string) => {
    setAccepting(token);
    const result = await acceptInvitation(token);

    if (!result.ok) {
      toast.error(result.message);
      setAccepting(null);
      return;
    }

    toast.success('¡Invitación aceptada!');
    router.push('/app/household');
    router.refresh();
  };

  const handleViewDetails = (token: string) => {
    router.push(`/app/invite?token=${token}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Invitaciones Pendientes
          <Badge variant="default" className="ml-auto">
            {invitations.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Tienes invitaciones para unirte a hogares compartidos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((invitation) => {
          const expiresIn = formatDistanceToNow(new Date(invitation.expires_at), {
            addSuffix: true,
            locale: es,
          });

          const isAccepting = accepting === invitation.token;

          return (
            <div
              key={invitation.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {invitation.household_name || 'Hogar compartido'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">De: {invitation.invited_by_email}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Expira {expiresIn}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewDetails(invitation.token)}
                  disabled={isAccepting}
                >
                  Ver
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAccept(invitation.token)}
                  disabled={isAccepting}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isAccepting ? (
                    'Aceptando...'
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Aceptar
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
