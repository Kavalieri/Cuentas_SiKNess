'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, Wallet, PiggyBank, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  {
    href: '/app',
    icon: <Home className="h-5 w-5" />,
    label: 'Inicio',
  },
  {
    href: '/app/transactions',
    icon: <Receipt className="h-5 w-5" />,
    label: 'Transacciones',
  },
  {
    href: '/app/contributions',
    icon: <Wallet className="h-5 w-5" />,
    label: 'Contribuciones',
  },
  {
    href: '/app/savings',
    icon: <PiggyBank className="h-5 w-5" />,
    label: 'Ahorro',
  },
  {
    href: '/app/settings',
    icon: <Settings className="h-5 w-5" />,
    label: 'Más',
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden z-50 safe-area-inset-bottom">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
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
