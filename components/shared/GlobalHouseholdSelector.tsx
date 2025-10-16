'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGlobalSelectors } from '@/contexts/HouseholdContext';
import { ChevronDown, Crown, Home, Plus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function GlobalHouseholdSelector() {
  const { households, selectHousehold } = useGlobalSelectors();
  const router = useRouter();
  const [isChanging, setIsChanging] = useState(false);

  const activeHousehold = households.find((h) => h.isActive);

  const handleHouseholdChange = async (householdId: string) => {
    if (householdId === 'create_new') {
      router.push('/app/settings?tab=household&action=create');
      return;
    }

    if (householdId === activeHousehold?.id) return;

    setIsChanging(true);
    try {
      selectHousehold(householdId);
      // Aquí podríamos mostrar un toast de éxito
    } catch (error) {
      console.error('Error cambiando household:', error);
      // Aquí podríamos mostrar un toast de error
    } finally {
      setIsChanging(false);
    }
  };

  if (!activeHousehold) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Home className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Sin hogar activo</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Selector compacto para móvil */}
      <div className="md:hidden">
        <Select
          value={activeHousehold.id}
          onValueChange={handleHouseholdChange}
          disabled={isChanging}
        >
          <SelectTrigger className="w-auto min-w-[120px] h-8">
            <SelectValue>
              <div className="flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5" />
                <span className="text-xs font-medium truncate max-w-[80px]">
                  {activeHousehold.name}
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {households.map((household) => (
              <SelectItem key={household.id} value={household.id}>
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <span className="truncate">{household.name}</span>
                  {household.isOwner && <Crown className="h-3 w-3 text-amber-500" />}
                </div>
              </SelectItem>
            ))}
            <SelectItem value="create_new">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Crear nuevo hogar</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dropdown expandido para desktop */}
      <div className="hidden md:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-3 gap-2" disabled={isChanging}>
              <Home className="h-4 w-4" />
              <span className="font-medium truncate max-w-[150px]">{activeHousehold.name}</span>
              {activeHousehold.isOwner && <Crown className="h-3 w-3 text-amber-500" />}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Tus hogares
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {households.map((household) => (
              <DropdownMenuItem
                key={household.id}
                onClick={() => handleHouseholdChange(household.id)}
                className={`cursor-pointer ${household.isActive ? 'bg-accent' : ''}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Home className="h-4 w-4 flex-shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium truncate">{household.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {household.isOwner ? (
                          <>
                            <Crown className="h-3 w-3 text-amber-500" />
                            <span>Propietario</span>
                          </>
                        ) : (
                          <span>Miembro</span>
                        )}
                        {household.memberCount > 0 && (
                          <>
                            <Users className="h-3 w-3" />
                            <span>{household.memberCount} miembros</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {household.isActive && (
                    <Badge variant="secondary" className="text-xs">
                      Activo
                    </Badge>
                  )}
                </div>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleHouseholdChange('create_new')}
              className="cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Crear nuevo hogar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
