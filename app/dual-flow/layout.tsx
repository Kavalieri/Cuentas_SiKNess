import { Button } from '@/components/ui/button';
import { checkDualFlowAccess } from '@/lib/featureFlags';
import { getCurrentUser } from '@/lib/supabaseServer';
import { ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BottomNavDualFlow } from './components/BottomNavDualFlow';

export default async function DualFlowLayout({ children }: { children: React.ReactNode }) {
  // Verificar autenticación
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Verificar acceso al sistema dual-flow
  const accessCheck = await checkDualFlowAccess(user.email!);
  if (!accessCheck.hasAccess) {
    redirect('/app');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header específico dual-flow */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          {/* Logo y título dual-flow */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-semibold">CuentasSiK</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                Dual-Flow
              </span>
            </div>
          </div>

          {/* Link de regreso al sistema anterior */}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app/app">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Sistema Anterior
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-muted/30 pb-20">
        <div className="container mx-auto px-4 py-6">{children}</div>
      </main>

      {/* Bottom Navigation Dual-Flow */}
      <BottomNavDualFlow />
    </div>
  );
}
