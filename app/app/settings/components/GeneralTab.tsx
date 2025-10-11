'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { User, Mail, Shield } from 'lucide-react';

interface GeneralTabProps {
  user: {
    email: string;
    profile_id: string;
  };
}

export function GeneralTab({ user }: GeneralTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información de la Cuenta
          </CardTitle>
          <CardDescription>
            Datos básicos de tu cuenta en CuentasSiK
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Email:</span>
            </div>
            <p className="font-medium">{user.email}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>ID de Usuario:</span>
            </div>
            <p className="font-mono text-xs text-muted-foreground break-all">
              {user.profile_id}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>
            Gestiona tu información personal y preferencias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/app/profile">
            <Button variant="outline" className="w-full justify-start">
              Editar Perfil →
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
