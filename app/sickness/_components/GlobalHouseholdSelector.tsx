'use client';

import { useSiKness } from '@/contexts/SiKnessContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Home, Users } from 'lucide-react';

export function GlobalHouseholdSelector() {
  const { householdId, households, selectHousehold } = useSiKness();

  const currentHousehold = households.find((h) => h.id === householdId);

  if (!currentHousehold) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Home className="h-4 w-4" />
        <span>Sin hogar</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">{currentHousehold.name}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Seleccionar Hogar</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {households.map((household) => (
          <DropdownMenuItem
            key={household.id}
            onClick={() => selectHousehold(household.id)}
            disabled={household.id === householdId}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="font-medium">{household.name}</span>
                <span className="text-xs text-muted-foreground">
                  {household.memberCount} {household.memberCount === 1 ? 'miembro' : 'miembros'}
                </span>
              </div>
            </div>
            {household.isOwner && (
              <span className="text-xs text-primary">Owner</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          <Users className="mr-2 h-3 w-3" />
          Crear nuevo hogar (próximamente)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
