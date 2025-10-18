'use client';
// Cliente para visualizar y gestionar miembros del hogar - SiKNess
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';
import type { HouseholdContextUser } from '@/types/household';
import { Check, Clock, Copy, Crown, Mail, Trash2, UserCog, XCircle } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { PendingInvitationRow } from './actions';
import { cancelInvitation, changeMemberRole, inviteMember, removeMember, updateHouseholdSettings } from './actions';

interface HogarMembersClientProps {
  members: HouseholdContextUser[];
  householdId: string;
  householdName: string;
  isOwner: boolean;
  monthlyGoal: number;
  calculationType: string;
  pendingInvitations: PendingInvitationRow[];
}

export default function HogarMembersClient({
  members,
  householdId,
  householdName,
  isOwner,
  monthlyGoal,
  calculationType,
  pendingInvitations,
}: HogarMembersClientProps) {
  const [isPending, startTransition] = useTransition();

  // Estado para diálogo de invitación

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [inviteMode, setInviteMode] = useState<'email' | 'code'>('email');

  // Estado para diálogo de cambio de rol
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<HouseholdContextUser | null>(null);
  const [newRole, setNewRole] = useState<'owner' | 'member'>('member');

  // Estado para diálogo de eliminación
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<HouseholdContextUser | null>(null);

  // Estado para edición de nombre/objetivo/tipo de cálculo
  const [nameInput, setNameInput] = useState(householdName);
  const [goalInput, setGoalInput] = useState(String(monthlyGoal ?? 0));
  const [calculationTypeInput, setCalculationTypeInput] = useState(calculationType);

  const handleUpdateSettings = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append('householdId', householdId);
      fd.append('name', nameInput);
      fd.append('monthlyGoal', goalInput);
      fd.append('calculationType', calculationTypeInput);
      const res = await updateHouseholdSettings(fd);
      if (res.ok) {
        toast.success('Hogar actualizado');
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inviteMode === 'email' && !inviteEmail) {
      toast.error('Debes introducir un email');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('householdId', householdId);
      formData.append('mode', inviteMode);
      if (inviteMode === 'email') {
        formData.append('email', inviteEmail);
      }

      const result = await inviteMember(formData);

      if (result.ok) {
        toast.success('Invitación creada correctamente');
        setInviteCode(result.data?.inviteCode || null);
      } else {
        toast.error(result.message);
        setIsInviteDialogOpen(false);
        setInviteEmail('');
        setInviteMode('email');
      }
    });
  };

  const handleCopyCode = async () => {
    if (inviteCode) {
      await navigator.clipboard.writeText(inviteCode);
      setCodeCopied(true);
      toast.success('Código copiado al portapapeles');
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleCloseInviteDialog = () => {
    setIsInviteDialogOpen(false);
    setInviteEmail('');
    setInviteCode(null);
    setCodeCopied(false);
    setInviteMode('email');
  };

  const handleCancelInvitation = (invitationId: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append('householdId', householdId);
      fd.append('invitationId', invitationId);
      const res = await cancelInvitation(fd);
      if (res.ok) {
        toast.success('Invitación cancelada');
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleOpenRoleDialog = (member: HouseholdContextUser) => {
    setSelectedMember(member);
    setNewRole(member.role === 'owner' ? 'member' : 'owner');
    setIsRoleDialogOpen(true);
  };

  const handleChangeRole = async () => {
    if (!selectedMember) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('householdId', householdId);
      formData.append('targetProfileId', selectedMember.id);
      formData.append('newRole', newRole);

      const result = await changeMemberRole(formData);

      if (result.ok) {
        toast.success(`Rol cambiado a ${newRole === 'owner' ? 'Propietario' : 'Miembro'}`);
        setIsRoleDialogOpen(false);
        setSelectedMember(null);
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleOpenDeleteDialog = (member: HouseholdContextUser) => {
    setMemberToDelete(member);
    setIsDeleteDialogOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!memberToDelete) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('householdId', householdId);
      formData.append('targetProfileId', memberToDelete.id);

      const result = await removeMember(formData);

      if (result.ok) {
        toast.success('Miembro eliminado correctamente');
        setIsDeleteDialogOpen(false);
        setMemberToDelete(null);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="space-y-6">

      {/* Header con título */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">{householdName}</h2>
          <p className="text-muted-foreground">Gestión de miembros del hogar</p>
        </div>
        {isOwner && (
          <Button onClick={() => setIsInviteDialogOpen(true)} className="gap-2">
            <Mail className="h-4 w-4" />
            <span>Invitar</span>
          </Button>
        )}
      </div>

      {/* Formulario para unirse a otro hogar por código - visible para todos */}
      <div className="p-4 border rounded-lg grid gap-3 md:grid-cols-2">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!inviteCode) {
              toast.error('Debes introducir un código de invitación');
              return;
            }
            startTransition(async () => {
              const fd = new FormData();
              fd.append('inviteCode', inviteCode);
              fd.append('householdId', householdId);
              const res = await import('./actions').then(m => m.acceptInvitationByCode(fd));
              if (res.ok) {
                toast.success('Te has unido al hogar correctamente');
                window.location.href = '/sickness/balance?onboarded=1';
              } else {
                toast.error(res.message || 'No se pudo unir al hogar');
              }
            });
          }}
        >
          <Label htmlFor="inviteCode">Código de invitación</Label>
          <Input
            id="inviteCode"
            value={inviteCode || ''}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Introduce el código para unirte a otro hogar"
          />
          <Button type="submit" disabled={isPending} className="mt-2">Unirse a hogar</Button>
        </form>
      </div>

      {/* Edición de nombre, objetivo y tipo de cálculo */}
      {isOwner && (
        <div className="p-4 border rounded-lg grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="nameInput">Nombre del hogar</Label>
            <Input id="nameInput" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="goalInput">Objetivo mensual</Label>
            <Input id="goalInput" type="number" min={0} step="0.01" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} />
            <p className="text-xs text-muted-foreground">Objetivo actual: {formatCurrency(monthlyGoal || 0)}</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="calculationType">Tipo de contribución</Label>
            <Select value={calculationTypeInput} onValueChange={setCalculationTypeInput}>
              <SelectTrigger id="calculationType">
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Iguales (mismo monto)</SelectItem>
                <SelectItem value="proportional">Proporcional (según ingresos)</SelectItem>
                <SelectItem value="custom">Personalizada</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {calculationTypeInput === 'equal' && 'Todos aportan lo mismo'}
              {calculationTypeInput === 'proportional' && 'Según ingresos de cada miembro'}
              {calculationTypeInput === 'custom' && 'Define montos individuales'}
            </p>
          </div>
          <div className="flex items-end">
            <Button onClick={handleUpdateSettings} disabled={isPending}>Guardar cambios</Button>
          </div>
        </div>
      )}

      {/* Lista de miembros */}
      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="p-4 bg-card border rounded-lg flex items-center justify-between"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">
                  {member.displayName || member.email.split('@')[0]}
                </p>
                {member.role === 'owner' && (
                  <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{member.email}</p>
              {member.income !== undefined && member.income !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ingreso: {formatCurrency(member.income)}
                </p>
              )}
            </div>

            {/* Acciones (solo para owners) */}
            {isOwner && (
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenRoleDialog(member)}
                  title="Cambiar rol"
                  disabled={isPending}
                >
                  <UserCog className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenDeleteDialog(member)}
                  title="Eliminar miembro"
                  disabled={isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Invitaciones pendientes */}
      {isOwner && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Invitaciones pendientes</h3>
          {pendingInvitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay invitaciones pendientes.</p>
          ) : (
            <div className="space-y-2">
              {pendingInvitations.map((inv) => {
                const expires = inv.expires_at ? new Date(inv.expires_at) : null;
                const remaining = expires ? Math.max(0, expires.getTime() - Date.now()) : null;
                const remainingHours = remaining ? Math.ceil(remaining / (1000 * 60 * 60)) : null;
                const usesLeft = inv.max_uses != null ? Math.max(0, inv.max_uses - inv.current_uses) : '∞';
                return (
                  <div key={inv.id} className="p-3 border rounded flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono break-all">{inv.token}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {expires ? (
                          <span>Caduca en {remainingHours}h</span>
                        ) : (
                          <span>Sin caducidad</span>
                        )}
                        <span>· Usos restantes: {usesLeft}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Cancelar invitación"
                        onClick={() => handleCancelInvitation(inv.id)}
                        disabled={isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Dialog de invitación */}
      <Dialog open={isInviteDialogOpen} onOpenChange={handleCloseInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar nuevo miembro</DialogTitle>
            <DialogDescription>
              Elige cómo quieres invitar: por email o generando un código manual.
            </DialogDescription>
          </DialogHeader>

          {!inviteCode ? (
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant={inviteMode === 'email' ? 'default' : 'outline'}
                  onClick={() => setInviteMode('email')}
                  disabled={isPending}
                >
                  Invitar por email
                </Button>
                <Button
                  type="button"
                  variant={inviteMode === 'code' ? 'default' : 'outline'}
                  onClick={() => setInviteMode('code')}
                  disabled={isPending}
                >
                  Generar solo código
                </Button>
              </div>
              {inviteMode === 'email' && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isPending}
                    required={inviteMode === 'email'}
                  />
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseInviteDialog}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Creando...' : 'Crear invitación'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Código de invitación:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-background rounded text-sm font-mono break-all">
                    {inviteCode}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyCode}
                    title="Copiar código"
                  >
                    {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Envía este código al usuario invitado. Será válido durante 7 días.
              </p>
              <DialogFooter>
                <Button onClick={handleCloseInviteDialog}>Cerrar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de cambio de rol */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar rol</DialogTitle>
            <DialogDescription>
              Cambiar rol de {selectedMember?.displayName || selectedMember?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Nuevo rol</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as 'owner' | 'member')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Propietario</SelectItem>
                  <SelectItem value="member">Miembro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRoleDialogOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleChangeRole} disabled={isPending}>
                {isPending ? 'Cambiando...' : 'Cambiar rol'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar a{' '}
              <strong>{memberToDelete?.displayName || memberToDelete?.email}</strong> del hogar?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
