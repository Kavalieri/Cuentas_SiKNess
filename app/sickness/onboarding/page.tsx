import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCurrentUser, getUserHouseholdId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { acceptInvitationByCode, createHousehold } from './actions';

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const activeHousehold = await getUserHouseholdId();
  if (activeHousehold) {
    redirect('/sickness');
  }

  // Aquí se mostrará el formulario para aceptar invitación o crear hogar
  // TODO: UI y lógica para aceptar invitación por código o crear hogar
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Únete a un hogar existente</CardTitle>
          <CardDescription>Introduce el código de invitación que te han compartido</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={acceptInvitationByCode} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="code">Código de invitación</Label>
              <Input id="code" name="code" placeholder="p. ej. 0f9f7c8e-..." required />
            </div>
            <Button type="submit" className="w-full">Unirme al hogar</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crear un nuevo hogar</CardTitle>
          <CardDescription>Si no tienes código, puedes crear tu propio hogar ahora</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createHousehold} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="name">Nombre del hogar</Label>
              <Input id="name" name="name" placeholder="Mi Hogar" required />
            </div>
            <Button type="submit" className="w-full">Crear hogar</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
