import { Button } from '@/components/ui/button';
import { pgServer } from '@/lib/pgServer';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Verificar si hay sesión activa
  const supabase = await pgServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si hay usuario autenticado, redirigir SIEMPRE a la nueva interfaz /sickness
  if (user) {
    redirect('/sickness');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-24">
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-bold text-gray-900 dark:text-gray-100">CuentasSiK</h1>
        <p className="mb-8 text-xl text-gray-600 dark:text-gray-400">
          Gestiona tus gastos compartidos en pareja de forma sencilla
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
