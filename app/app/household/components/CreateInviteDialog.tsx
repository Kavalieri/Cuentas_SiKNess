'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UserPlus, Mail, Copy, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createFlexibleInvitation } from '@/app/app/household/invitations/actions';

interface CreateInviteDialogProps {
  householdId: string;
}

export function CreateInviteDialog({ householdId }: CreateInviteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'household' | 'app'>('household');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const result = await createFlexibleInvitation({
      type,
      householdId: type === 'household' ? householdId : undefined,
      email: email || undefined,
      maxUses: 1, // Por defecto 1 uso
      expiresInDays: 7, // Por defecto 7 días
      personalMessage: message || undefined,
    });

    if (!result.ok) {
      toast.error(result.message);
      setLoading(false);
      return;
    }

    setInviteLink(result.data!.invitationUrl);
    toast.success('Invitación creada correctamente');
    setLoading(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Link copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Error al copiar el link');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setInviteLink('');
    setEmail('');
    setMessage('');
    setType('household');
    setCopied(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invitar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Crear Invitación</DialogTitle>
          <DialogDescription>
            Invita a alguien a unirse a tu hogar o a probar la aplicación
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de invitación */}
            <div className="space-y-3">
              <Label>Tipo de invitación</Label>
              <RadioGroup value={type} onValueChange={(v: string) => setType(v as 'household' | 'app')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="household" id="household" />
                  <Label htmlFor="household" className="font-normal cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Invitar a mi hogar</p>
                        <p className="text-sm text-muted-foreground">
                          La persona se unirá automáticamente a este hogar
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="app" id="app" />
                  <Label htmlFor="app" className="font-normal cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Invitar a probar la app</p>
                        <p className="text-sm text-muted-foreground">
                          Invitación general para promocionar CuentasSiK
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Email (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email {type === 'household' ? '(recomendado)' : '(opcional)'}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {type === 'household'
                  ? 'Si especificas un email, solo esa persona podrá usar la invitación'
                  : 'Déjalo vacío para crear un link compartible con cualquiera'}
              </p>
            </div>

            {/* Mensaje personalizado */}
            <div className="space-y-2">
              <Label htmlFor="message">Mensaje personalizado (opcional)</Label>
              <Textarea
                id="message"
                placeholder="Escribe un mensaje para acompañar la invitación..."
                value={message}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Invitación'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">Link de invitación generado:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background p-2 rounded border break-all">
                  {inviteLink}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopyLink}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1 text-green-500" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Próximos pasos:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Copia el link de arriba</li>
                <li>Compártelo por WhatsApp, email, o cualquier medio</li>
                <li>La persona hace click y sigue las instrucciones</li>
                <li>
                  {type === 'household'
                    ? 'Se unirá automáticamente a tu hogar'
                    : 'Podrá probar la aplicación'}
                </li>
              </ol>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Listo
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
