'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateDisplayName } from '@/app/app/profile/actions';

interface ProfileFormProps {
  email: string;
  userId: string;
  displayName: string;
}

export function ProfileForm({ email, displayName }: ProfileFormProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateDisplayName(formData);

    setLoading(false);

    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast.success(result.data!.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="display_name">Nombre para mostrar</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={displayName}
          placeholder="Tu nombre"
          required
          minLength={2}
          maxLength={50}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Este nombre aparecerá en listas, notificaciones y en tu perfil
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          value={email}
          disabled
          className="bg-muted cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground">
          Para cambiar tu email, contacta con el soporte de la aplicación
        </p>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar Cambios'}
      </Button>
    </form>
  );
}
