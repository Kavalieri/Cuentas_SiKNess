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
import { Check, Copy, Crown, Mail, Trash2, UserCog } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { changeMemberRole, inviteMember, removeMember } from './actions';

interface HogarMembersClientProps {
  members: HouseholdContextUser[];
  householdId: string;
  householdName: string;
  isOwner: boolean;
}

export default function HogarMembersClient({
  members,
  householdId,
  householdName,
  isOwner,
}: HogarMembersClientProps) {
  const [isPending, startTransition] = useTransition();

  // Estado para diálogo de invitación
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Estado para diálogo de cambio de rol
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<HouseholdContextUser | null>(null);
  const [newRole, setNewRole] = useState<'owner' | 'member'>('member');

  // Estado para diálogo de eliminación
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<HouseholdContextUser | null>(null);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail) {
      toast.error('Debes introducir un email');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', inviteEmail);
      formData.append('householdId', householdId);

      const result = await inviteMember(formData);

      if (result.ok) {
        toast.success('Invitación creada correctamente');
        setInviteCode(result.data?.inviteCode || null);
      } else {
        toast.error(result.message);
        setIsInviteDialogOpen(false);
        setInviteEmail('');
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
      {/* Header con título y botón invitar */}
      <div className="flex items-center justify-between">
        <div>
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

      {/* Dialog de invitación */}
      <Dialog open={isInviteDialogOpen} onOpenChange={handleCloseInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar nuevo miembro</DialogTitle>
            <DialogDescription>
              Introduce el email del usuario que quieres invitar al hogar
            </DialogDescription>
          </DialogHeader>

          {!inviteCode ? (
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>

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
