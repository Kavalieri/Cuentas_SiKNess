'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, Wallet, BarChart3, Settings, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  condition?: boolean; // Si es true, se muestra el item
}

interface MobileBottomNavProps {
  hasHousehold?: boolean;
  isAdmin?: boolean;
}

export function MobileBottomNav({ hasHousehold = false, isAdmin = false }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: '/app',
      icon: <Home className="h-5 w-5" />,
      label: 'Inicio',
      condition: true,
    },
    {
      href: '/app/expenses',
      icon: <Receipt className="h-5 w-5" />,
      label: 'Gastos',
      condition: true,
    },
    {
      href: '/app/contributions',
      icon: <Wallet className="h-5 w-5" />,
      label: 'Contribuciones',
      condition: true,
    },
    {
      href: '/app/reports',
      icon: <BarChart3 className="h-5 w-5" />,
      label: 'Reportes',
      condition: true,
    },
    {
      href: '/app/household',
      icon: <Users className="h-5 w-5" />,
      label: 'Hogar',
      condition: hasHousehold,
    },
    {
      href: '/app/admin',
      icon: <Shield className="h-5 w-5" />,
      label: 'Admin',
      condition: isAdmin,
    },
    {
      href: '/app/settings',
      icon: <Settings className="h-5 w-5" />,
      label: 'Más',
      condition: true,
    },
  ].filter(item => item.condition !== false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50 safe-area-inset-bottom">
      <div className={cn(
        "grid gap-1 px-2 py-2 max-w-screen-xl mx-auto",
        navItems.length === 5 && "grid-cols-5",
        navItems.length === 6 && "grid-cols-6",
        navItems.length === 7 && "grid-cols-7"
      )}>
        {navItems.map((item) => {
          // Check if current route matches (exact for home, starts with for others)
          const isActive = item.href === '/app' 
            ? pathname === '/app'
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-colors',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
