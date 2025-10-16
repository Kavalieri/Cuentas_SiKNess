'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Home,
  Menu,
  Receipt,
  Settings,
  Shield,
  Target,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { forwardRef, useMemo } from 'react';

const ICONS = {
  home: Home,
  receipt: Receipt,
  wallet: Wallet,
  reports: BarChart3,
  settings: Settings,
  users: Users,
  shield: Shield,
  zap: Zap,
  activity: Activity,
  target: Target,
  contributions: Wallet,
  dualReports: BarChart3,
  dualSettings: Settings,
} satisfies Record<string, LucideIcon>;

export type BurgerMenuIcon = keyof typeof ICONS;

interface BurgerMenuItem {
  href: string;
  label: string;
  description?: string;
  icon: BurgerMenuIcon;
  badge?: string;
}

export interface BurgerMenuSection {
  title?: string;
  items: BurgerMenuItem[];
}

interface BurgerMenuProps {
  user: {
    name: string;
    email?: string | null;
    householdName?: string | null;
    badge?: string | null;
  };
  sections: BurgerMenuSection[];
  footerAction?: BurgerMenuItem;
}

export const BurgerMenu = forwardRef<HTMLButtonElement, Omit<BurgerMenuProps, 'onSignOut'>>(
  ({ user, sections, footerAction }, ref) => {
    const initials = useMemo(() => {
      if (!user.name) return '?';
      return user.name
        .split(' ')
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
    }, [user.name]);

    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            ref={ref}
            variant="ghost"
            size="icon"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-background text-foreground shadow-sm"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú de navegación</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex h-full max-h-screen flex-col gap-6 bg-background p-6 sm:max-w-sm"
        >
          <SheetHeader className="items-start text-left">
            <SheetTitle>Navegación principal</SheetTitle>
            <SheetDescription>
              Gestiona todos los módulos del panel y el flujo dual desde aquí.
            </SheetDescription>
            <div className="flex w-full items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </div>
              <div className="flex flex-1 flex-col text-sm">
                <span className="font-medium text-foreground">{user.name}</span>
                {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
                {user.householdName && (
                  <span className="text-xs text-muted-foreground">
                    Hogar activo: {user.householdName}
                  </span>
                )}
              </div>
              {user.badge && (
                <Badge variant="secondary" className="shrink-0 text-[11px]">
                  {user.badge}
                </Badge>
              )}
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {sections.map((section) => (
              <nav key={section.title ?? section.items[0]?.href} className="space-y-2">
                {section.title && (
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    {section.title}
                  </p>
                )}
                <div className="grid gap-2">
                  {section.items.map((item) => {
                    const Icon = ICONS[item.icon];
                    return (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border border-transparent bg-muted/40 px-3 py-2 text-left transition-colors hover:border-muted-foreground/30 hover:bg-muted',
                          )}
                        >
                          <Icon className="h-4 w-4 text-primary" />
                          <div className="flex flex-1 flex-col text-sm">
                            <span className="font-medium text-foreground">{item.label}</span>
                            {item.description && (
                              <span className="text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            )}
                          </div>
                          {item.badge && (
                            <Badge variant="outline" className="text-[10px]">
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>
              </nav>
            ))}
          </div>

          {footerAction && (
            <div className="mt-auto">
              <SheetClose asChild>
                <Link
                  href={footerAction.href}
                  className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  {(() => {
                    const Icon = ICONS[footerAction.icon];
                    return <Icon className="h-4 w-4" />;
                  })()}
                  {footerAction.label}
                </Link>
              </SheetClose>
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  },
);

BurgerMenu.displayName = 'BurgerMenu';
