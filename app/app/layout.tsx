import { getTotalBalance } from '@/app/app/expenses/actions';
import { signOut } from '@/app/login/actions';
import { BalanceDisplay } from '@/components/shared/BalanceDisplay';
import { HouseholdSelector } from '@/components/shared/HouseholdSelector';
import { MobileBottomNav } from '@/components/shared/navigation/MobileBottomNav';
import { PrivacyToggle } from '@/components/shared/PrivacyToggle';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HouseholdProvider } from '@/contexts/HouseholdContext';
import { isSystemAdmin } from '@/lib/adminCheck';
import { checkDualFlowAccess } from '@/lib/featureFlags';
import { getCurrentUser, getUserHouseholdId, getUserHouseholds } from '@/lib/supabaseServer';
import { Calculator, LogOut, Zap } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

function SignOutButton() {
  return (
    <form action={signOut}>
      <Button variant="ghost" size="sm" type="submit">
        <LogOut className="mr-2 h-4 w-4" />
        Salir
      </Button>
    </form>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const userIsSystemAdmin = await isSystemAdmin();
  const householdId = await getUserHouseholdId();
  const userHouseholdsRaw = await getUserHouseholds();

  // Verificar acceso al sistema dual-flow
  const dualFlowAccess = await checkDualFlowAccess(user.email!);

  type Household = {
    id: string;
    name: string;
    role: 'owner' | 'member'; // ⚠️ LEGACY (se mantiene por compatibilidad temporal)
    is_owner: boolean; // ✅ NUEVO (campo optimizado)
  };

  const userHouseholds = userHouseholdsRaw as unknown as Household[];

  // Determinar el rol del usuario en el household activo
  const currentHousehold = userHouseholds.find((h) => h.id === householdId);

  // ✅ OPTIMIZADO: Usar is_owner directo de la base de datos
  const isOwner = currentHousehold?.is_owner || false;

  console.log('[AppLayout] User permissions in current household:', {
    householdId,
    isOwner,
    userId: user.profile_id,
    userEmail: user.email,
    dualFlowAccess: dualFlowAccess.hasAccess,
  });

  // Obtener balance total si tiene household
  const balanceResult = householdId ? await getTotalBalance() : null;
  const balance = balanceResult?.ok ? balanceResult.data : null;

  return (
    <HouseholdProvider
      value={{
        householdId,
        isOwner,
        userId: user.profile_id,
        userEmail: user.email || '',
      }}
    >
      <div className="flex min-h-screen flex-col">
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">CuentasSiK</h1>

                {/* Acceso al Sistema Dual-Flow */}
                {dualFlowAccess.hasAccess && (
                  <Link
                    href="/dual-flow/inicio"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-full transition-colors"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Dual-Flow Beta</span>
                    <Badge variant="secondary" className="text-xs">
                      {dualFlowAccess.accessMethod}
                    </Badge>
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                {balance !== null && balance !== undefined && (
                  <BalanceDisplay
                    balance={balance.balance}
                    income={balance.income}
                    expenses={balance.expenses}
                  />
                )}
                <HouseholdSelector
                  households={userHouseholds}
                  activeHouseholdId={householdId || ''}
                />
                <SignOutButton />
                <ThemeToggle />
                <PrivacyToggle />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 bg-muted/30 pb-20">
            <div className="container mx-auto px-4 py-8">{children}</div>
          </main>
        </div>

        {/* Main Content */}
        <main className="flex-1 bg-muted/30 pb-20">
          <div className="container mx-auto px-4 py-8">{children}</div>
        </main>

        {/* Bottom Navigation (visible en todos los dispositivos) */}
        <MobileBottomNav hasHousehold={!!householdId} isAdmin={userIsSystemAdmin} />

        {/* Footer */}
        <footer className="hidden md:block border-t bg-background">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>© 2025 SiK</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">
                  Licencia{' '}
                  <a
                    href="https://github.com/Kavalieri/CuentasSiK/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground transition-colors"
                  >
                    MIT
                  </a>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono">
                  v{process.env.npm_package_version || '0.1.0-alpha'}
                </span>
                <span>•</span>
                <a
                  href="https://github.com/Kavalieri/CuentasSiK"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </HouseholdProvider>
  );
}
