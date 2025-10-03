'use client';

interface ProfileFormProps {
  email: string;
  userId: string;
}

export function ProfileForm({ email }: ProfileFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-muted-foreground">Email</label>
        <p className="text-lg font-medium">{email}</p>
      </div>

      <div className="pt-4 text-sm text-muted-foreground">
        <p>Para cambiar tu email, contacta con el soporte de la aplicación.</p>
      </div>
    </div>
  );
}
