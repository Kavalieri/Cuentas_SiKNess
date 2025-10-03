'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { updateMemberRole, removeMember } from '@/app/app/household/actions';

type Member = {
  id: string;
  profile_id: string;
  email: string;
  role: 'owner' | 'member';
  currentIncome: number;
};

type MembersListProps = {
  members: Member[];
};

export function MembersList({ members }: MembersListProps) {
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setUpdatingRole(memberId);

    const result = await updateMemberRole(memberId, newRole as 'owner' | 'member');

    setUpdatingRole(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Rol actualizado correctamente');
  };

  const handleRemove = async (memberId: string) => {
    setRemovingMember(memberId);

    const result = await removeMember(memberId);

    setRemovingMember(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Miembro eliminado del hogar');
  };

  if (members.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No hay miembros en el hogar
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const isUpdating = updatingRole === member.id;
        const isRemoving = removingMember === member.id;

        return (
          <div key={`${member.profile_id}-member`} className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{member.email}</p>
                <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                  {member.role === 'owner' ? '👑 Owner' : '👤 Member'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Ingreso: {member.currentIncome > 0 ? formatCurrency(member.currentIncome) : 'No configurado'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={member.role}
                onValueChange={(value) => handleRoleChange(member.id, value)}
                disabled={isUpdating || isRemoving}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={isUpdating || isRemoving}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminará a <strong>{member.email}</strong> del hogar. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemove(member.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
    </div>
  );
}
