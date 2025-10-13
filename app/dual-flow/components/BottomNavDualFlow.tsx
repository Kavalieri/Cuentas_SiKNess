'use client';

import { cn } from '@/lib/utils';
import { HandHeart, Home, Scale, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

/**
 * Navegación inferior del sistema dual-flow
 * 5 tabs independientes del sistema actual
 * Diseño mobile-first con animaciones fluidas para sensación de paz
 */
export function BottomNavDualFlow() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: '/dual-flow/inicio',
      icon: <Home className="h-5 w-5" />,
      label: 'Inicio',
      description: 'Dashboard y workflow',
    },
    {
      href: '/dual-flow/contribucion',
      icon: <HandHeart className="h-5 w-5" />,
      label: 'Contribución',
      description: 'Gestión contribuciones',
    },
    {
      href: '/dual-flow/balance',
      icon: <Scale className="h-5 w-5" />,
      label: 'Balance',
      description: 'Transacciones duales',
    },
    {
      href: '/dual-flow/opciones',
      icon: <Settings className="h-5 w-5" />,
      label: 'Opciones',
      description: 'Configuración',
    },
    {
      href: '/app/profile', // Reutilizar existente
      icon: <User className="h-5 w-5" />,
      label: 'Perfil',
      description: 'Perfil personal',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/50 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item, index) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/app/profile' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                // Base styles - Mobile optimized
                'flex flex-col items-center justify-center',
                'min-w-0 flex-1 px-1 py-2 gap-1',
                'text-xs font-medium',
                'transition-all duration-300 ease-out',
                'rounded-lg',
                'active:scale-95', // Feedback táctil

                // States
                isActive
                  ? ['text-primary', 'bg-primary/10', 'scale-105', 'shadow-sm']
                  : [
                      'text-muted-foreground hover:text-foreground',
                      'hover:bg-accent/50',
                      'hover:scale-102',
                    ],
              )}
              style={{
                // Animación de entrada escalonada
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Icon Container con animación */}
              <div
                className={cn(
                  'transition-all duration-300 ease-out',
                  'p-1 rounded-md',
                  isActive && 'animate-pulse',
                )}
              >
                {item.icon}
              </div>

              {/* Label con truncate para mobile */}
              <span
                className={cn(
                  'truncate max-w-full leading-tight',
                  'transition-all duration-300',
                  isActive && 'font-semibold',
                )}
              >
                {item.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full animate-in slide-in-from-top-2 duration-300" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-x-0 -top-4 h-4 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
    </nav>
  );
}
