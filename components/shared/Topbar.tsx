'use client';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { formatCurrency } from '@/lib/format';
import { useBalance } from '@/lib/hooks/useBalance';
import { Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { BurgerMenu } from './BurgerMenu';
import { GlobalHouseholdSelector } from './GlobalHouseholdSelector';

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { balance, loading } = useBalance();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      {/* Topbar principal */}
      <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          {/* Lado izquierdo - Menú móvil + Selectores */}
          <div className="flex items-center gap-3">
            {/* Botón menú móvil */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden h-8 w-8 p-0"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <BurgerMenu onNavigate={() => setIsMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>

            {/* Selectores para desktop */}
            <div className="hidden md:flex items-center gap-3">
              <GlobalHouseholdSelector />
              <div className="h-4 w-px bg-border" />
              {/* Selector de periodo duplicado eliminado: MonthBasedPeriodNavigator */}
            </div>
          </div>

          {/* Lado derecho - Balance + Tema */}
          <div className="flex items-center gap-3">
            {/* Balance */}
            <div className="hidden sm:block">
              {loading ? (
                <div className="text-sm text-muted-foreground">Cargando...</div>
              ) : balance ? (
                <div className="text-sm font-medium">{formatCurrency(balance.fondo_comun)}</div>
              ) : (
                <div className="text-sm text-muted-foreground">—</div>
              )}
            </div>

            {/* Toggle tema */}
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-8 w-8 p-0">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Cambiar tema</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
