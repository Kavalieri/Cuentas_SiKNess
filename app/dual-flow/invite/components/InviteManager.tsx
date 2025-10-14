'use client';

import type { InvitationDetails } from '@/app/dual-flow/invite/actions';
import {
  cancelInvitation,
  createFlexibleInvitation,
  getHouseholdInvitations,
} from '@/app/dual-flow/invite/actions';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Copy, Mail, MessageSquare, Trash2, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface InviteManagerProps {
  householdId: string;
  householdName: string;
}

export function InviteManager({ householdId, householdName }: InviteManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invitations, setInvitations] = useState<InvitationDetails[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [maxUses, setMaxUses] = useState<number | undefined>();
  const [expiresInDays, setExpiresInDays] = useState(7);

  // Load invitations on mount
  useState(() => {
    loadInvitations();
  });

  const loadInvitations = async () => {
    setIsLoading(true);
    const result = await getHouseholdInvitations(householdId);
    if (result.ok) {
      setInvitations(result.data || []);
    } else {
      toast.error(result.message);
    }
    setIsLoading(false);
  };

  const handleCreateInvitation = async () => {
    if (!email.trim()) {
      toast.error('El email es obligatorio');
      return;
    }

    setIsCreating(true);
    const result = await createFlexibleInvitation({
      type: 'household',
      email: email.trim(),
      householdId,
      maxUses,
      expiresInDays,
      personalMessage: personalMessage.trim() || undefined,
    });

    if (result.ok) {
      toast.success('Invitación creada exitosamente');
      setShowCreateDialog(false);
      setEmail('');
      setPersonalMessage('');
      setMaxUses(undefined);
      setExpiresInDays(7);
      loadInvitations();
    } else {
      toast.error(result.message);
    }
    setIsCreating(false);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const result = await cancelInvitation(invitationId);
    if (result.ok) {
      toast.success('Invitación cancelada');
      loadInvitations();
    } else {
      toast.error(result.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Enlace copiado al portapapeles');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestionar Invitaciones</h2>
          <p className="text-muted-foreground">Invita nuevos miembros a {householdName}</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Crear Invitación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Invitación</DialogTitle>
              <DialogDescription>Invita a alguien a unirse a {householdName}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email del invitado *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="message">Mensaje personal (opcional)</Label>
                <Textarea
                  id="message"
                  placeholder="Hola, te invito a unirte a nuestro hogar en CuentasSiK..."
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxUses">Máximo de usos (opcional)</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    placeholder="Ilimitado"
                    value={maxUses || ''}
                    onChange={(e) =>
                      setMaxUses(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    min={1}
                  />
                </div>

                <div>
                  <Label htmlFor="expiresIn">Expira en (días)</Label>
                  <Input
                    id="expiresIn"
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                    min={1}
                    max={30}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCreateInvitation}
                disabled={isCreating || !email.trim()}
                className="flex-1"
              >
                {isCreating ? 'Creando...' : 'Crear Invitación'}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Invitaciones Activas
          </CardTitle>
          <CardDescription>
            {invitations.length} invitación{invitations.length !== 1 ? 'es' : ''} pendiente
            {invitations.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando invitaciones...</div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay invitaciones activas</p>
              <p className="text-sm">Crea tu primera invitación para agregar nuevos miembros</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{invitation.email}</span>
                      <Badge variant="outline">Pendiente</Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Expira{' '}
                          {formatDistanceToNow(new Date(invitation.expires_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </div>

                      {invitation.max_uses && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>
                            {invitation.current_uses}/{invitation.max_uses} usos
                          </span>
                        </div>
                      )}

                      {invitation.metadata &&
                        typeof invitation.metadata.personalMessage === 'string' && (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>Mensaje personal</span>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          `${window.location.origin}/dual-flow/invite?token=${invitation.token}`,
                        )
                      }
                    >
                      <Copy className="w-4 h-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Cancelar invitación?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. La invitación será cancelada y ya no
                            podrá ser utilizada.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Cancelar Invitación
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
