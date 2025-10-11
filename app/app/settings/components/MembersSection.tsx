'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { PrivateAmount } from '@/components/shared/PrivateAmount';
import { updateMemberRole, removeMember } from '@/app/app/household/actions';
import { useRouter } from 'next/navigation';

interface Member {
  profile_id: string;
  email: string;
  role: 'owner' | 'member';
  joined_at: string;
  current_income: number;
}

interface MembersSectionProps {
  householdId: string;
  members: Member[];
  isOwner: boolean;
}

export function MembersSection({ householdId, members, isOwner }: MembersSectionProps) {
  const router = useRouter();
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const handleRoleChange = async (profileId: string, newRole: string) => {
    setUpdatingRole(profileId);

    const result = await updateMemberRole(profileId, newRole as 'owner' | 'member');

    setUpdatingRole(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Rol actualizado correctamente');
    router.refresh();
  };

  const handleRemove = async (profileId: string) => {
    setRemovingMember(profileId);

    const result = await removeMember(profileId);

    setRemovingMember(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Miembro eliminado del hogar');
    router.refresh();
  };

  const handleInvite = () => {
    // Redirigir a página de invitaciones con el householdId
    router.push(`/app/invite?household=${householdId}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Miembros del Hogar</CardTitle>
            <CardDescription>
              {isOwner
                ? 'Gestiona los miembros y sus permisos'
                : 'Listado de miembros del hogar'}
            </CardDescription>
          </div>
          {isOwner && (
            <Button onClick={handleInvite} variant="outline" size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Invitar Miembro
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay miembros en el hogar
          </p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const isUpdating = updatingRole === member.profile_id;
              const isRemoving = removingMember === member.profile_id;
              const ownerCount = members.filter(m => m.role === 'owner').length;
              const cannotRemoveLastOwner = member.role === 'owner' && ownerCount === 1;

              return (
                <div
                  key={member.profile_id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{member.email}</p>
                      <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                        {member.role === 'owner' ? '👑 Propietario' : '👤 Miembro'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ingreso: {member.current_income > 0
                        ? <PrivateAmount amount={member.current_income} />
                        : 'No configurado'}
                    </p>
                  </div>

                  {isOwner && (
                    <div className="flex items-center gap-2 ml-4">
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleRoleChange(member.profile_id, value)}
                        disabled={isUpdating || isRemoving}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Propietario</SelectItem>
                          <SelectItem value="member">Miembro</SelectItem>
                        </SelectContent>
                      </Select>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isUpdating || isRemoving || cannotRemoveLastOwner}
                            title={cannotRemoveLastOwner ? 'No puedes eliminar al único propietario' : 'Eliminar miembro'}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar miembro del hogar?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará a <strong>{member.email}</strong> del hogar.
                              Esta acción no se puede deshacer.
                              {cannotRemoveLastOwner && (
                                <span className="block mt-2 text-destructive font-semibold">
                                  ⚠️ No puedes eliminar al único propietario. Asigna primero otro propietario.
                                </span>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemove(member.profile_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={cannotRemoveLastOwner}
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Información adicional */}
        {isOwner && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-sm">
            <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              💡 Sobre los roles:
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
              <li><strong>Propietario:</strong> Puede gestionar miembros, categorías y configuración</li>
              <li><strong>Miembro:</strong> Puede ver y registrar transacciones</li>
              <li>Un hogar debe tener al menos un propietario</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
