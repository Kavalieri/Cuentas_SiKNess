import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabaseServer';
import { signOut } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { LogOut, Home, Receipt, User, Users, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { isSystemAdmin } from '@/lib/adminCheck';

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

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/app" className="text-xl font-bold">
              CuentasSiK
            </Link>
            <nav className="hidden gap-4 md:flex">
              <Link href="/app">
                <Button variant="ghost" size="sm">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/app/household">
                <Button variant="ghost" size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  Hogar
                </Button>
              </Link>
              <Link href="/app/expenses">
                <Button variant="ghost" size="sm">
                  <Receipt className="mr-2 h-4 w-4" />
                  Movimientos
                </Button>
              </Link>
              <Link href="/app/profile">
                <Button variant="ghost" size="sm">
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </Button>
              </Link>
              {userIsSystemAdmin && (
                <Link href="/app/admin">
                  <Button variant="ghost" size="sm">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">{children}</div>
      </main>
    </div>
  );
}
