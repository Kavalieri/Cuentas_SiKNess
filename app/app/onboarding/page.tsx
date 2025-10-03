'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">¡Bienvenido a CuentasSiK! 🏠</h1>
        <p className="text-muted-foreground text-lg">
          Para comenzar, elige una de las siguientes opciones
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        {/* Opción 1: Crear hogar */}
        <Card className="border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => router.push('/app/household/create')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🏡</span>
              Crear un Hogar Nuevo
            </CardTitle>
            <CardDescription className="text-base">
              Crea tu propio hogar y serás el administrador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span>Serás el <strong>propietario (owner)</strong> del hogar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span>Podrás invitar a otros miembros</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span>Configurar contribuciones, categorías y más</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span>Gestión completa del hogar</span>
              </li>
            </ul>
            <Button className="w-full" size="lg">
              Crear Mi Hogar →
            </Button>
          </CardContent>
        </Card>

        {/* Opción 2: Esperar invitación */}
        <Card className="border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => router.push('/app/settings?waitingInvite=true')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">✉️</span>
              Esperar Invitación
            </CardTitle>
            <CardDescription className="text-base">
              Únete a un hogar existente cuando te inviten
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>Alguien con un hogar te enviará una invitación</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>Recibirás un email con el enlace de invitación</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>Te unirás como <strong>miembro</strong> del hogar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>Podrás registrar gastos y ver contribuciones</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full" size="lg">
              Esperar Invitación →
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="space-y-1">
              <p className="font-medium">¿No estás seguro?</p>
              <p className="text-sm text-muted-foreground">
                Si vives solo o eres el primero en registrarse en tu hogar, <strong>crea un hogar nuevo</strong>.
                Si alguien ya tiene un hogar configurado y te va a invitar, selecciona <strong>esperar invitación</strong>.
                Siempre podrás crear más hogares o unirte a otros más adelante.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
