'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Home, Crown, Users, Settings, Plus } from 'lucide-react';
import { setActiveHousehold } from '@/lib/actions/user-settings';
import { toast } from 'sonner';

interface Household {
  id: string;
  name: string;
  role: 'owner' | 'member';
  is_active?: boolean;
  member_count?: number;
}

interface HouseholdSelectorProps {
  households: Household[];
  activeHouseholdId: string;
}

export function HouseholdSelector({ households, activeHouseholdId }: HouseholdSelectorProps) {
  const router = useRouter();
  const [isChanging, setIsChanging] = useState(false);

  const handleChange = async (householdId: string) => {
    // Si es "create_new", redirigir a settings
    if (householdId === 'create_new') {
      router.push('/app/settings?tab=household&action=create');
      return;
    }

    if (householdId === activeHouseholdId) return;

    setIsChanging(true);
    const result = await setActiveHousehold(householdId);

    if (!result.ok) {
      toast.error(result.message);
      setIsChanging(false);
      return;
    }

    toast.success('Hogar cambiado correctamente');

    // Recargar página para actualizar todos los datos
    router.refresh();
    setIsChanging(false);
  };

  const activeHousehold = households.find(h => h.id === activeHouseholdId);

  // SIEMPRE mostrar selector (incluso con 1 hogar, para acceder a "Crear nuevo")
  return (
    <div className="flex items-center gap-2">
      <Home className="h-4 w-4 text-muted-foreground" />
      <Select
        value={activeHouseholdId}
        onValueChange={handleChange}
        disabled={isChanging}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              {activeHousehold?.role === 'owner' && (
                <Crown className="h-3 w-3 text-yellow-500" />
              )}
              {activeHousehold?.role === 'member' && (
                <Users className="h-3 w-3 text-blue-500" />
              )}
              <span className="truncate">{activeHousehold?.name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {households.map((household) => (
            <SelectItem key={household.id} value={household.id}>
              <div className="flex items-center gap-2">
                {household.role === 'owner' && (
                  <Crown className="h-3 w-3 text-yellow-500" />
                )}
                {household.role === 'member' && (
                  <Users className="h-3 w-3 text-blue-500" />
                )}
                <span>{household.name}</span>
                {household.member_count && household.member_count > 1 && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    ({household.member_count})
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value="create_new">
            <div className="flex items-center gap-2 text-primary">
              <Plus className="h-4 w-4" />
              <span className="font-medium">Crear nuevo hogar</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      <Link href="/app/settings">
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
