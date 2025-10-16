'use client';

import { useSiKness } from '@/contexts/SiKnessContext';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Eye, EyeOff } from 'lucide-react';
import { useTheme } from 'next-themes';
import { GlobalHouseholdSelector } from './GlobalHouseholdSelector';
import { GlobalPeriodSelector } from './GlobalPeriodSelector';
import { SiKnessBurgerMenu } from './SiKnessBurgerMenu';

export function SiKnessTopbar() {
  const { theme, setTheme } = useTheme();
  const { balance, privacyMode, togglePrivacyMode } = useSiKness();

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '---';
    if (privacyMode) return '***';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Menú burguer */}
        <div className="flex items-center gap-2">
          <SiKnessBurgerMenu />
        </div>

        {/* Balance central */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground">Balance</span>
          <span className="text-sm font-semibold">
            {formatCurrency(balance?.closing)}
          </span>
        </div>

        {/* Controles derecha */}
        <div className="flex items-center gap-1">
          {/* Modo privacidad */}
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePrivacyMode}
            title={privacyMode ? 'Mostrar cantidades' : 'Ocultar cantidades'}
          >
            {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>

          {/* Toggle tema */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Cambiar tema"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Selectores (segunda línea en móvil) */}
      <div className="border-t bg-muted/30">
        <div className="container mx-auto flex h-12 items-center justify-between px-4">
          <GlobalHouseholdSelector />
          <GlobalPeriodSelector />
        </div>
      </div>
    </header>
  );
}
