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
    Mail,
    Send,
    Trash2,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    cancelEmailInvitation,
    generateEmailInvitation,
    getPendingEmailInvitations,
    getProfileEmails,
    removeProfileEmail,
    setPrimaryEmail,
    type EmailInvitation,
    type ProfileEmail
} from '@/app/configuracion/perfil/email-actions';
import type { UserAuthInfo } from './actions';

interface EmailManagementCardProps {
  authInfo: UserAuthInfo | null;
}

export function EmailManagementCard({ authInfo }: EmailManagementCardProps) {
  const [emails, setEmails] = useState<ProfileEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Invitaciones de email compartido
  const [invitations, setInvitations] = useState<EmailInvitation[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Form states para eliminar email
  const [removingEmail, setRemovingEmail] = useState(false);
  const [changingPrimary, setChangingPrimary] = useState(false);

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

    // Añadir el origin actual al formData para que el servidor genere la URL correcta
    formData.append('origin', window.location.origin);

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

          {/* Botón directo para compartir perfil - solo visible para email primario */}
          {!isSecondaryLogin && (
            <Button variant="outline" size="sm" onClick={() => setInviteDialogOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Compartir perfil
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Cargando emails...</p>
        ) : (
          <div className="space-y-4">
            {/* Lista de emails */}
            <div className="space-y-2">
              {primaryEmail && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{primaryEmail.email}</span>
                    <Badge variant="default">Primario</Badge>
                  </div>
                </div>
              )}

              {secondaryEmails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{email.email}</span>
                    <Badge variant="secondary">Secundario</Badge>
                  </div>

                  {/* Botones de acción para emails secundarios - solo visible para email primario */}
                  {!isSecondaryLogin && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
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
                            size="icon"
                            onClick={() => setSelectedEmailId(email.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Eliminar email</DialogTitle>
                            <DialogDescription>
                              ¿Estás seguro de que quieres eliminar este email de tu cuenta?
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <p className="text-sm text-muted-foreground">
                              Email: <strong>{email.email}</strong>
                            </p>
                          </div>
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

            {/* Invitaciones pendientes - solo visible para email primario */}
            {!isSecondaryLogin && invitations.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="font-semibold text-sm">Invitaciones pendientes</h4>
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-amber-500/5 border-amber-500/20"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium">{invitation.invited_email}</span>
                        <Badge variant="outline" className="text-amber-500 border-amber-500">
                          Pendiente
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Expira:{' '}
                        {new Date(invitation.expires_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const baseUrl =
                            process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                          const inviteUrl = `${baseUrl}/api/auth/accept-email-invitation/${invitation.token}`;
                          copyInvitationUrl(inviteUrl);
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar enlace
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Dialog para invitar email compartido */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compartir perfil con otra persona</DialogTitle>
            <DialogDescription>
              Genera un enlace de invitación para que otra persona pueda acceder a tu perfil
              usando su propio email. Útil para compartir cuenta con pareja, familia, etc.
            </DialogDescription>
          </DialogHeader>

          {!generatedInviteUrl ? (
            <form onSubmit={handleGenerateInvitation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email de la persona a invitar</Label>
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
                  Esta persona recibirá acceso completo a tu perfil y hogares
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
    </Card>
  );
}
