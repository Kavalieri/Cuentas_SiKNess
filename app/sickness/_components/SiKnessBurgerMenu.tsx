'use client';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useSiKness } from '@/contexts/SiKnessContext';
import { BarChart3, Calendar, Home, LogOut, Menu, Shield, Tag, User, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function SiKnessBurgerMenu() {
  const [open, setOpen] = useState(false);
  const { user, isOwner } = useSiKness();

  const navSections: NavSection[] = [
    {
      title: 'Configuración',
      items: [
        {
          icon: User,
          label: 'Mi Perfil',
          href: '/sickness/configuracion/perfil',
        },
        {
          icon: Users,
          label: 'Gestión del Hogar',
          href: '/sickness/configuracion/hogar',
          badge: isOwner ? 'Owner' : undefined,
        },
        {
          icon: Tag,
          label: 'Categorías',
          href: '/sickness/configuracion/categorias',
        },
      ],
    },
    {
      title: 'Operación',
      items: [
        {
          icon: Calendar,
          label: 'Gestión del Período',
          href: '/sickness/periodo',
        },
        {
          icon: BarChart3,
          label: 'Balance y Transacciones',
          href: '/sickness/balance',
        },
      ],
    },
  ];

  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menú de navegación</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>CuentasSiK</SheetTitle>
          <SheetDescription>
            {user?.email || 'Usuario'}
            {user?.isSystemAdmin && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-primary">
                <Shield className="h-3 w-3" />
                Admin
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 flex flex-col gap-6">
          {/* Dashboard principal */}
          <div>
            <Link
              href="/sickness"
              onClick={handleLinkClick}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Home className="h-4 w-4" />
              <span>Inicio</span>
            </Link>
          </div>

          <hr className="border-t" />

          {/* Secciones navegables */}
          {navSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h3>
              <nav className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
          ))}

          <hr className="border-t" />

          {/* Cerrar sesión */}
          <Link
            href="/api/auth/signout"
            onClick={handleLinkClick}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesión</span>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
