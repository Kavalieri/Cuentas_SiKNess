'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, X, Copy, Check, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cancelInvitation } from '@/app/app/household/invitations/actions';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Invitation {
  id: string;
  email: string | null;
  token: string;
  status: string;
  created_at: string | null;
  expires_at: string;
  household_id: string | null;
  type?: string; // Nuevo campo opcional
}

interface PendingInvitationsListProps {
  invitations: Invitation[];
}

export function PendingInvitationsList({ invitations }: PendingInvitationsListProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);

  if (!invitations || invitations.length === 0) {
    return null;
  }

  const handleCopyLink = async (token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/app/invite/${token}`;
    
    try {
      await navigator.clipboard.writeText(link);
      setCopied(token);
      toast.success('Link copiado');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Error al copiar');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('¿Cancelar esta invitación?')) return;
    
    setCanceling(id);
    const result = await cancelInvitation(id);
    
    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast.success('Invitación cancelada');
    }
    setCanceling(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Invitaciones Pendientes
        </CardTitle>
        <CardDescription>
          Links de invitación enviados que aún no han sido aceptados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invitations.map((invitation) => {
            const expiresAt = new Date(invitation.expires_at);
            const isExpiringSoon = expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000; // < 24h
            
            return (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {invitation.email || 'Invitación compartible'}
                      {invitation.type === 'app' && (
                        <Badge variant="outline" className="ml-2">
                          Invitación general
                        </Badge>
                      )}
                    </p>
                    <Badge variant={isExpiringSoon ? 'destructive' : 'secondary'} className="shrink-0">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDistanceToNow(expiresAt, { 
                        locale: es, 
                        addSuffix: true 
                      })}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enviado {invitation.created_at 
                      ? formatDistanceToNow(new Date(invitation.created_at), { locale: es, addSuffix: true })
                      : 'recientemente'
                    }
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(invitation.token)}
                    disabled={copied === invitation.token}
                  >
                    {copied === invitation.token ? (
                      <>
                        <Check className="h-4 w-4 mr-1 text-green-500" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar Link
                      </>
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCancel(invitation.id)}
                    disabled={canceling === invitation.id}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
