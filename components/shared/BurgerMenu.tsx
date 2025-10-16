'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronRight,
  CreditCard,
  Home,
  Mail,
  PiggyBank,
  Settings,
  User,
  Users,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface BurgerMenuProps {
  onNavigate?: () => void;
  className?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    id: 'home',
    label: 'Inicio',
    icon: Home,
    href: '/dual-flow/inicio',
  },
  {
    id: 'transactions',
    label: 'Transacciones',
    icon: CreditCard,
    href: '/app/expenses',
  },
  {
    id: 'contributions',
    label: 'Contribuciones',
    icon: PiggyBank,
    href: '/app/contributions',
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: BarChart3,
    href: '/app/reports',
  },
  {
    id: 'household',
    label: 'Mi Hogar',
    icon: Users,
    children: [
      {
        id: 'household-overview',
        label: 'Resumen',
        icon: Home,
        href: '/app/household',
      },
      {
        id: 'household-contributions',
        label: 'Contribuciones',
        icon: PiggyBank,
        href: '/app/household/contributions',
      },
      {
        id: 'household-categories',
        label: 'Categorías',
        icon: Building2,
        href: '/app/household/categories',
      },
      {
        id: 'household-members',
        label: 'Miembros',
        icon: Users,
        href: '/app/household/members',
      },
      {
        id: 'household-settings',
        label: 'Configuración',
        icon: Settings,
        href: '/app/household/settings',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: Settings,
    children: [
      {
        id: 'settings-general',
        label: 'General',
        icon: User,
        href: '/app/settings',
      },
      {
        id: 'settings-households',
        label: 'Gestión de Hogares',
        icon: Home,
        href: '/app/settings/households',
      },
      {
        id: 'settings-periods',
        label: 'Períodos',
        icon: Calendar,
        href: '/app/settings/periods',
      },
      {
        id: 'settings-invitations',
        label: 'Invitaciones',
        icon: Mail,
        href: '/app/settings/invitations',
      },
    ],
  },
];

export function BurgerMenu({ onNavigate, className }: BurgerMenuProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const active = isActive(item.href);

    return (
      <div key={item.id}>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 h-12 px-3',
            level > 0 && 'ml-6 w-[calc(100%-1.5rem)]',
            active && 'bg-primary/10 text-primary hover:bg-primary/20',
            !hasChildren && 'hover:bg-accent',
          )}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else if (item.href) {
              handleNavigation(item.href);
            }
          }}
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {hasChildren && (
            <ChevronRight
              className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')}
            />
          )}
        </Button>

        {hasChildren && isExpanded && (
          <div className="ml-2">
            {item.children!.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold">CuentasSiK</h2>
        <p className="text-sm text-muted-foreground">Gestión de gastos compartidos</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-3">
        <nav className="space-y-1">{menuItems.map((item) => renderMenuItem(item))}</nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">Versión móvil-first</p>
      </div>
    </div>
  );
}
