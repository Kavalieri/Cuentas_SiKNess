'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Mail, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    addProfileEmail,
    checkEmailExists,
    getProfileEmails,
    removeProfileEmail,
    setPrimaryEmail,
    type ProfileEmail,
} from '../../../configuracion/perfil/email-actions';

export function EmailManagementCard() {
  const [emails, setEmails] = useState<ProfileEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);
  const [removingEmail, setRemovingEmail] = useState(false);
  const [changingPrimary, setChangingPrimary] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Cargar emails
  useEffect(() => {
    loadEmails();
  }, []);

  async function loadEmails() {
    setLoading(true);
    const result = await getProfileEmails();

    if (result.ok && result.data) {
      setEmails(result.data);
    } else {
      toast.error(result.ok ? 'Error al cargar emails' : result.message);
    }

    setLoading(false);
  }

  // Validar email en tiempo real
  async function validateNewEmail(email: string) {
    setEmailError(null);

    if (!email) return;

    // Validación básica de formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Formato de email inválido');
      return;
    }

    // Verificar si ya existe
    const result = await checkEmailExists(email);
    if (result.ok && result.data?.exists === true) {
      setEmailError('Este email ya está registrado en el sistema');
    }
  }

  // Añadir nuevo email
  async function handleAddEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (emailError) {
      toast.error(emailError);
      return;
    }

    setAddingEmail(true);

    const formData = new FormData(e.currentTarget);
    const result = await addProfileEmail(formData);

    if (result.ok) {
      toast.success('Email añadido correctamente');
      setNewEmail('');
      setAddDialogOpen(false);
      await loadEmails();
    } else {
      toast.error(result.message);
    }

    setAddingEmail(false);
  }

  // Establecer como primario
  async function handleSetPrimary(emailId: string) {
    setChangingPrimary(true);

    const formData = new FormData();
    formData.append('emailId', emailId);

    const result = await setPrimaryEmail(formData);

    if (result.ok) {
      toast.success('Email primario actualizado');
      await loadEmails();
    } else {
      toast.error(result.message);
    }

    setChangingPrimary(false);
  }

  // Eliminar email
  async function handleRemoveEmail() {
    if (!selectedEmailId) return;

    setRemovingEmail(true);

    const formData = new FormData();
    formData.append('emailId', selectedEmailId);

    const result = await removeProfileEmail(formData);

    if (result.ok) {
      toast.success('Email eliminado correctamente');
      setRemoveDialogOpen(false);
      setSelectedEmailId(null);
      await loadEmails();
    } else {
      toast.error(result.message);
    }

    setRemovingEmail(false);
  }

  const primaryEmail = emails.find(e => e.is_primary);
  const secondaryEmails = emails.filter(e => !e.is_primary);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Emails de la cuenta
            </CardTitle>
            <CardDescription>
              Gestiona los emails asociados a tu perfil
            </CardDescription>
          </div>

          {/* Botón añadir email */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Añadir email
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir nuevo email</DialogTitle>
                <DialogDescription>
                  Añade un email secundario a tu cuenta. Podrás establecerlo como primario más tarde.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      validateNewEmail(e.target.value);
                    }}
                    placeholder="nuevo@email.com"
                    required
                  />
                  {emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAddDialogOpen(false);
                      setNewEmail('');
                      setEmailError(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={addingEmail || !!emailError}>
                    {addingEmail ? 'Añadiendo...' : 'Añadir email'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando emails...</p>
        ) : emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay emails registrados</p>
        ) : (
          <div className="space-y-4">
            {/* Email primario */}
            {primaryEmail && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{primaryEmail.email}</p>
                    <Badge variant="default" className="text-xs">
                      Primario
                    </Badge>
                    {primaryEmail.verified && (
                      <Badge variant="outline" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Verificado
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Añadido el {new Date(primaryEmail.added_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Email principal
                </div>
              </div>
            )}

            {/* Emails secundarios */}
            {secondaryEmails.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Emails secundarios ({secondaryEmails.length})
                </h4>
                {secondaryEmails.map((email) => (
                  <div
                    key={email.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{email.email}</p>
                        {email.verified && (
                          <Badge variant="outline" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Verificado
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Añadido el {new Date(email.added_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(email.id)}
                        disabled={changingPrimary}
                      >
                        Establecer como primario
                      </Button>

                      <Dialog
                        open={removeDialogOpen && selectedEmailId === email.id}
                        onOpenChange={(open) => {
                          setRemoveDialogOpen(open);
                          if (!open) setSelectedEmailId(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEmailId(email.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>¿Eliminar email?</DialogTitle>
                            <DialogDescription>
                              ¿Estás seguro de que quieres eliminar{' '}
                              <span className="font-semibold">{email.email}</span>?
                              Esta acción no se puede deshacer.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setRemoveDialogOpen(false);
                                setSelectedEmailId(null);
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleRemoveEmail}
                              disabled={removingEmail}
                            >
                              {removingEmail ? 'Eliminando...' : 'Eliminar'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Nota:</strong> El email primario es el que se usa para iniciar sesión y recibir notificaciones.
            Puedes cambiar cuál es el primario en cualquier momento.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
