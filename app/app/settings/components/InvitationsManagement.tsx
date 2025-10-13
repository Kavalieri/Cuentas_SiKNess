'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
  Mail, 
  Copy, 
  Trash2, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  UserPlus,
  Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  createHouseholdInvitation, 
  sendEmailInvitation, 
  cancelHouseholdInvitation 
} from '@/app/app/settings/invitations-actions';
import type { SettingsInvitation } from '@/app/app/settings/invitations-actions';

interface InvitationsManagementProps {
  invitations: SettingsInvitation[];
  stats: {
    totalMembers: number;
    totalInvitations: number;
    pendingInvitations: number;
  };
  isOwner: boolean;
}

export function InvitationsManagement({ invitations, stats, isOwner }: InvitationsManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const getStatusBadge = (status: SettingsInvitation['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">⏳ Pendiente</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-100 text-green-800">✅ Aceptada</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">⏰ Expirada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">❌ Cancelada</Badge>;
    }
  };

  const copyInvitationLink = (token: string) => {
    const url = `${window.location.origin}/app/invite?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace de invitación copiado al portapapeles');
  };

  const handleCreateInvitation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData(e.currentTarget);
      const result = await createHouseholdInvitation(formData);
      
      if (result.ok) {
        toast.success('Invitación creada exitosamente');
        setShowCreateDialog(false);
        e.currentTarget.reset();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleSendEmailInvitation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData(e.currentTarget);
      const result = await sendEmailInvitation(formData);
      
      if (result.ok) {
        toast.success('Invitación enviada por email exitosamente');
        setShowEmailDialog(false);
        e.currentTarget.reset();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleCancelInvitation = (invitationId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('invitationId', invitationId);
      
      const result = await cancelHouseholdInvitation(formData);
      
      if (result.ok) {
        toast.success('Invitación cancelada');
      } else {
        toast.error(result.message);
      }
    });
  };

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Gestión de Invitaciones
          </CardTitle>
          <CardDescription>
            Solo el propietario del hogar puede gestionar las invitaciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Miembros actuales: {stats.totalMembers}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalMembers}</p>
                <p className="text-sm text-muted-foreground">Miembros activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingInvitations}</p>
                <p className="text-sm text-muted-foreground">Invitaciones pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalInvitations}</p>
                <p className="text-sm text-muted-foreground">Total invitaciones</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-2">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <LinkIcon className="h-4 w-4" />
              Crear Enlace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Invitación por Enlace</DialogTitle>
              <DialogDescription>
                Crea un enlace de invitación que puedes compartir manualmente.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <div>
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Si especificas un email, la invitación será exclusiva para esa persona.
                </p>
              </div>
              
              <div>
                <Label htmlFor="personalMessage">Mensaje personal (opcional)</Label>
                <Textarea
                  id="personalMessage"
                  name="personalMessage"
                  placeholder="Mensaje de bienvenida..."
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiresInDays">Expira en (días)</Label>
                  <Input
                    id="expiresInDays"
                    name="expiresInDays"
                    type="number"
                    min="1"
                    max="30"
                    defaultValue="7"
                  />
                </div>
                
                <div>
                  <Label htmlFor="maxUses">Usos máximos (opcional)</Label>
                  <Input
                    id="maxUses"
                    name="maxUses"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Ilimitado"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  Crear Invitación
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Enviar por Email
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Invitación por Email</DialogTitle>
              <DialogDescription>
                Crea un usuario (si no existe) y envía la invitación directamente por email.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendEmailInvitation} className="space-y-4">
              <div>
                <Label htmlFor="emailInvite">Email *</Label>
                <Input
                  id="emailInvite"
                  name="email"
                  type="email"
                  required
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              
              <div>
                <Label htmlFor="personalMessageEmail">Mensaje personal (opcional)</Label>
                <Textarea
                  id="personalMessageEmail"
                  name="personalMessage"
                  placeholder="Te invito a unirte a nuestro hogar..."
                  maxLength={500}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEmailDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  Enviar Invitación
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de invitaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Invitaciones del Hogar</CardTitle>
          <CardDescription>
            Gestiona todas las invitaciones enviadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No hay invitaciones enviadas aún.
              </p>
              <p className="text-sm text-muted-foreground">
                Crea tu primera invitación usando los botones de arriba.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div 
                  key={invitation.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {invitation.email || 'Enlace general'}
                      </p>
                      {getStatusBadge(invitation.status)}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <p>Creada: {format(new Date(invitation.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                      <p>Expira: {format(new Date(invitation.expires_at), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                      {invitation.personal_message && (
                        <p className="italic">&ldquo;{invitation.personal_message}&rdquo;</p>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Usos: {invitation.current_uses}/{invitation.max_uses || '∞'} • 
                      Por: {invitation.invited_by_email}
                      {invitation.accepted_by_email && (
                        <> • Aceptada por: {invitation.accepted_by_email}</>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {invitation.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyInvitationLink(invitation.token)}
                          className="gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          Copiar
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="gap-1">
                              <Trash2 className="h-3 w-3" />
                              Cancelar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Cancelar invitación?</AlertDialogTitle>
                              <AlertDialogDescription>
                                La invitación será marcada como cancelada y el enlace dejará de funcionar.
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>No, mantener</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleCancelInvitation(invitation.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Sí, cancelar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    
                    {invitation.status === 'accepted' && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs">Aceptada</span>
                      </div>
                    )}
                    
                    {(invitation.status === 'expired' || invitation.status === 'cancelled') && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <XCircle className="h-4 w-4" />
                        <span className="text-xs">Inactiva</span>
                      </div>
                    )}
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