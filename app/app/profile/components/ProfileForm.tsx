'use client';

import { Badge } from '@/components/ui/badge';

interface ProfileFormProps {
  email: string;
  role: string;
  userId: string;
}

export function ProfileForm({ email, role }: ProfileFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-muted-foreground">Email</label>
        <p className="text-lg font-medium">{email}</p>
      </div>

      <div>
        <label className="text-sm font-medium text-muted-foreground">Rol en el Hogar</label>
        <div className="mt-1">
          <Badge variant={role === 'owner' ? 'default' : 'secondary'}>
            {role === 'owner' ? '👑 Propietario' : '👤 Miembro'}
          </Badge>
        </div>
      </div>

      <div className="pt-4 text-sm text-muted-foreground">
        <p>Para cambiar tu email, contacta con el soporte de la aplicación.</p>
      </div>
    </div>
  );
}
