'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Mail, Calendar, UserPlus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { addSystemAdmin, removeSystemAdmin } from '@/app/app/admin/actions';
import { formatDate } from '@/lib/format';

type SystemAdmin = {
  user_id: string;
  email: string;
  created_at: string;
  granted_by: string | null;
  granted_by_email: string | null;
  notes: string | null;
  is_permanent: boolean;
};

export default function SystemAdminsClientPage({ admins }: { admins: SystemAdmin[] }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAddAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('El email es requerido');
      return;
    }

    setIsAdding(true);

    const formData = new FormData();
    formData.append('email', email);
    if (notes.trim()) {
      formData.append('notes', notes);
    }

    const result = await addSystemAdmin(formData);

    setIsAdding(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Administrador agregado correctamente');
    setEmail('');
    setNotes('');
    router.refresh();
  };

  const handleRemoveAdmin = async (userId: string) => {
    setRemovingId(userId);

    const formData = new FormData();
    formData.append('user_id', userId);

    const result = await removeSystemAdmin(formData);

    setRemovingId(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Administrador eliminado correctamente');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Administradores del Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de permisos de administración global
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {admins.length} admin(s)
        </Badge>
      </div>

      {/* Formulario para agregar admin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Agregar Nuevo Administrador
          </CardTitle>
          <CardDescription>
            Otorga permisos de administración del sistema a un usuario existente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email del Usuario</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isAdding}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                El usuario debe estar registrado en el sistema
              </p>
            </div>
            <div>
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input
                id="notes"
                type="text"
                placeholder="Razón para otorgar permisos"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isAdding}
              />
            </div>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? 'Agregando...' : '➕ Agregar Administrador'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Listado de admins actuales */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Administradores Actuales</h2>
        {admins.map((admin) => (
          <Card
            key={admin.user_id}
            className={admin.is_permanent ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {admin.email}
                    {admin.is_permanent && (
                      <Badge variant="default" className="bg-green-600">
                        <Shield className="h-3 w-3 mr-1" />
                        Permanente
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-2">
                    <Calendar className="h-3 w-3" />
                    Agregado: {formatDate(new Date(admin.created_at))}
                  </CardDescription>
                </div>
                {!admin.is_permanent && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={removingId === admin.user_id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          ¿Eliminar Administrador?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          ¿Estás seguro de eliminar los permisos de administración para{' '}
                          <strong>{admin.email}</strong>?
                          <br />
                          <br />
                          El usuario seguirá existiendo pero no tendrá acceso al panel de administración.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveAdmin(admin.user_id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar Permisos
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {admin.notes && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Notas:</div>
                  <div className="text-sm">{admin.notes}</div>
                </div>
              )}
              {admin.granted_by_email && (
                <div className="text-xs text-muted-foreground">
                  Otorgado por: {admin.granted_by_email}
                </div>
              )}
              {admin.is_permanent && (
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded text-xs">
                  🛡️ <strong>Admin Permanente</strong> - Protegido contra eliminación (wipe)
                </div>
              )}
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono truncate">
                {admin.user_id}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {admins.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No hay administradores registrados</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
