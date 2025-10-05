import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserHouseholdId, getUserHouseholds } from '@/lib/supabaseServer';
import { signOut } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { LogOut, Home, User, Users, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { PrivacyToggle } from '@/components/shared/PrivacyToggle';
import { HouseholdSelector } from '@/components/shared/HouseholdSelector';
import { BalanceDisplay } from '@/components/shared/BalanceDisplay';
import { isSystemAdmin } from '@/lib/adminCheck';
import { getTotalBalance } from '@/app/app/expenses/actions';

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

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const userIsSystemAdmin = await isSystemAdmin();
  const householdId = await getUserHouseholdId();
  const userHouseholds = await getUserHouseholds();

  // Obtener balance total si tiene household
  const balanceResult = householdId ? await getTotalBalance() : null;
  const balance = balanceResult?.ok ? balanceResult.data : null;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left: Logo + Nav */}
            <div className="flex items-center gap-6 flex-1">
              <Link href="/app" className="flex items-center gap-2 font-bold text-lg shrink-0">
                <Home className="h-5 w-5" />
                <span className="hidden sm:inline">CuentasSiK</span>
              </Link>
              <nav className="hidden md:flex gap-2">
                <Link href="/app">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
                {householdId && (
                  <Link href="/app/household">
                    <Button variant="ghost" size="sm">
                      <Users className="mr-1 h-4 w-4" />
                      Hogar
                    </Button>
                  </Link>
                )}
                {userIsSystemAdmin && (
                  <Link href="/app/admin">
                    <Button variant="ghost" size="sm">
                      <Shield className="mr-1 h-4 w-4" />
                      Admin
                    </Button>
                  </Link>
                )}
              </nav>
            </div>

            {/* Center: Balance (si existe household) */}
            {balance && (
              <div className="hidden lg:flex items-center justify-center flex-1 max-w-xs">
                <BalanceDisplay
                  balance={balance.balance}
                  income={balance.income}
                  expenses={balance.expenses}
                />
              </div>
            )}

            {/* Right: Household Selector + User Menu + Theme + Logout */}
            <div className="flex items-center gap-2 justify-end flex-1">
              {/* Selector de household (solo si tiene múltiples) */}
              {userHouseholds.length > 1 && householdId && (
                <HouseholdSelector
                  households={userHouseholds}
                  activeHouseholdId={householdId}
                />
              )}
              
              {/* Botón de Perfil */}
              <Link href="/app/profile">
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {user.email?.split('@')[0]}
                  </span>
                </Button>
              </Link>

              <PrivacyToggle />
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>© 2025 SiK</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">
                Licencia <a href="https://github.com/Kavalieri/CuentasSiK/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">MIT</a>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono">v{process.env.npm_package_version || '0.1.0-alpha'}</span>
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
  );
}
