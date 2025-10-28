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
import {
    Check,
    Copy,
    ExternalLink,
    Mail,
    Plus,
    Send,
    Trash2,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    addProfileEmail,
    cancelEmailInvitation,
    checkEmailExists,
    generateEmailInvitation,
    getPendingEmailInvitations,
    getProfileEmails,
    removeProfileEmail,
    setPrimaryEmail,
    type EmailInvitation,
    type ProfileEmail,
} from '../../../configuracion/perfil/email-actions';
import type { UserAuthInfo } from './actions';

interface EmailManagementCardProps {
  authInfo: UserAuthInfo | null;
}

export function EmailManagementCard({ authInfo }: EmailManagementCardProps) {
  const [emails, setEmails] = useState<ProfileEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Invitaciones de email compartido
  const [invitations, setInvitations] = useState<EmailInvitation[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);
  const [removingEmail, setRemovingEmail] = useState(false);
  const [changingPrimary, setChangingPrimary] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Cargar emails e invitaciones
  useEffect(() => {
    loadEmails();
    loadInvitations();
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

  async function loadInvitations() {
    const result = await getPendingEmailInvitations();
    if (result.ok && result.data) {
      setInvitations(result.data);
    }
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

  // ============================================
  // FUNCIONES DE INVITACIONES
  // ============================================

  // Generar invitación de email compartido
  async function handleGenerateInvitation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneratingInvite(true);

    const formData = new FormData(e.currentTarget);
    const result = await generateEmailInvitation(formData);

    if (result.ok && result.data) {
      toast.success('Invitación generada exitosamente');
      setGeneratedInviteUrl(result.data.invitationUrl);
      setInviteEmail('');
      await loadInvitations();
    } else {
      toast.error(!result.ok ? result.message : 'Error al generar invitación');
    }

    setGeneratingInvite(false);
  }

  // Copiar URL de invitación
  function copyInvitationUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    toast.success('Enlace copiado al portapapeles');
    setTimeout(() => setCopiedInvite(false), 2000);
  }

  // Cancelar invitación
  async function handleCancelInvitation(invitationId: string) {
    const result = await cancelEmailInvitation(invitationId);

    if (result.ok) {
      toast.success('Invitación cancelada');
      await loadInvitations();
    } else {
      toast.error(!result.ok ? result.message : 'Error al cancelar invitación');
    }
  }

  // Cerrar dialog de invitación y limpiar
  function closeInviteDialog() {
    setInviteDialogOpen(false);
    setGeneratedInviteUrl(null);
    setInviteEmail('');
  }

  // ============================================
  // FUNCIONES DE EMAILS
  // ============================================

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

  // Detectar si es un login secundario (no puede gestionar emails)
  const isSecondaryLogin = authInfo?.isSecondaryLogin ?? false;

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
              {isSecondaryLogin ? (
                <>
                  Accediendo como: <strong>{authInfo?.loginEmail}</strong>
                  <br />
                  <span className="text-muted-foreground text-xs">
                    La gestión de emails solo está disponible desde el email primario
                  </span>
                </>
              ) : (
                'Gestiona los emails asociados a tu perfil'
              )}
            </CardDescription>
          </div>

          {/* Botones de acciones - solo visible para email primario */}
          {!isSecondaryLogin && (
            <div className="flex gap-2">
            {/* Botón invitar email compartido */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Invitar email compartido
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Invitar email para compartir perfil</DialogTitle>
                  <DialogDescription>
                    Genera un enlace de invitación para que otra persona pueda acceder a tu perfil
                    usando su propio email. Útil para compartir cuenta con pareja, familia, etc.
                  </DialogDescription>
                </DialogHeader>

                {!generatedInviteUrl ? (
                  <form onSubmit={handleGenerateInvitation} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email a invitar</Label>
                      <Input
                        id="invite-email"
                        name="email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="email-compartido@example.com"
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        Este email recibirá un enlace para vincularse a tu perfil
                      </p>
                    </div>

                    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
                      <p className="text-sm text-amber-900 dark:text-amber-100">
                        <strong>⚠️ Importante:</strong> El email invitado tendrá acceso completo a
                        tu perfil y todos los hogares asociados. Solo invita a personas de confianza.
                      </p>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeInviteDialog}
                        disabled={generatingInvite}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={generatingInvite}>
                        {generatingInvite ? 'Generando...' : 'Generar invitación'}
                      </Button>
                    </DialogFooter>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Enlace de invitación generado</Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={generatedInviteUrl}
                          className="font-mono text-sm"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => copyInvitationUrl(generatedInviteUrl)}
                        >
                          {copiedInvite ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Comparte este enlace con la persona que quieres invitar. El enlace expira en
                        7 días.
                      </p>
                    </div>

                    <div className="rounded-lg border bg-muted p-4 space-y-2">
                      <h4 className="font-semibold text-sm">¿Cómo funciona?</h4>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>
                          La persona invitada debe hacer login con el email invitado (usando Google
                          OAuth o Magic Link)
                        </li>
                        <li>
                          Al hacer login, accederá automáticamente a tu perfil como si fuera tú
                        </li>
                        <li>
                          El email invitado se añadirá como alias secundario de tu perfil
                        </li>
                        <li>Ambos emails podrán acceder al mismo perfil y hogares</li>
                      </ol>
                    </div>

                    <DialogFooter>
                      <Button type="button" onClick={closeInviteDialog}>
                        Cerrar
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>

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
          )}
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

                    {/* Botones de acción - solo visibles para email primario */}
                    {!isSecondaryLogin && (
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
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invitaciones pendientes - solo visible para email primario */}
        {!isSecondaryLogin && invitations.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Invitaciones pendientes</h3>
              <Badge variant="secondary" className="text-xs">
                {invitations.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{invitation.invited_email}</p>
                      <Badge variant="outline" className="text-xs">
                        Pendiente
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Expira el {new Date(invitation.expires_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                        const inviteUrl = `${baseUrl}/api/auth/accept-email-invitation/${invitation.token}`;
                        copyInvitationUrl(inviteUrl);
                      }}
                      title="Copiar enlace"
                    >
                      {copiedInvite ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id)}
                      title="Cancelar invitación"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
