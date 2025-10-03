'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Home, Crown, Users } from 'lucide-react';
import { setActiveHousehold } from '@/lib/actions/user-settings';
import { toast } from 'sonner';

interface Household {
  id: string;
  name: string;
  role: 'owner' | 'member';
}

interface HouseholdSelectorProps {
  households: Household[];
  activeHouseholdId: string;
}

export function HouseholdSelector({ households, activeHouseholdId }: HouseholdSelectorProps) {
  const router = useRouter();
  const [isChanging, setIsChanging] = useState(false);

  // No mostrar selector si solo tiene 1 household
  if (households.length <= 1) {
    return null;
  }

  const handleChange = async (householdId: string) => {
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
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
