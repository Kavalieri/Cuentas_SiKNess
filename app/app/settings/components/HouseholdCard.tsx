'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, ChevronDown, ChevronUp, Tag, Settings2 } from 'lucide-react';
import { HouseholdConfigSection } from './HouseholdConfigSection';
import { MembersSection } from './MembersSection';
import { HouseholdActions } from './HouseholdActions';
import { CategoriesDialog } from './CategoriesDialog';

interface Member {
  profile_id: string;
  email: string;
  role: 'owner' | 'member';
  joined_at: string;
  current_income: number;
}

interface HouseholdCardProps {
  household: {
    id: string;
    name: string;
    role: 'owner' | 'member';
    is_active?: boolean;
    member_count?: number;
    owner_count?: number;
    created_at: string;
  };
  members: Member[];
  currentUserId: string;
  isOwner: boolean;
  isOnlyOwner: boolean;
  onExpand?: () => void;
  isLoadingMembers?: boolean;
}

export function HouseholdCard({
  household,
  members,
  currentUserId,
  isOwner,
  isOnlyOwner,
  onExpand,
  isLoadingMembers = false,
}: HouseholdCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);

  // Persistir estado expandido en sessionStorage
  const storageKey = `household-expanded-${household.id}`;

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored !== null) {
      setIsExpanded(stored === 'true');
    }
  }, [storageKey]);

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    sessionStorage.setItem(storageKey, String(newState));

    // Si se expande y hay callback, ejecutarlo para cargar members
    if (newState && onExpand) {
      onExpand();
    }
  };

  return (
    <>
      <Card className={household.is_active ? 'border-primary' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{household.name}</CardTitle>
                {household.is_active && (
                  <Badge variant="default">Activo</Badge>
                )}
              </div>
              <CardDescription className="flex items-center gap-2">
                {household.role === 'owner' ? (
                  <Crown className="h-4 w-4 text-yellow-600" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                <span>
                  {household.role === 'owner' ? 'Propietario' : 'Miembro'}
                  {household.member_count &&
                    ` • ${household.member_count} miembro${household.member_count > 1 ? 's' : ''}`
                  }
                </span>
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCategoriesDialogOpen(true)}
                title="Gestionar Categorías"
              >
                <Tag className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleExpanded}
                title={isExpanded ? 'Contraer' : 'Expandir'}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-6 pt-0">
            {/* Sección de configuración del hogar */}
            <HouseholdConfigSection
              household={household}
              isOwner={isOwner}
            />

            {/* Sección de miembros */}
            <MembersSection
              householdId={household.id}
              members={members}
              isOwner={isOwner}
            />

            {/* Sección de acciones (abandonar/eliminar) */}
            <HouseholdActions
              householdId={household.id}
              householdName={household.name}
              isOwner={isOwner}
              isOnlyOwner={isOnlyOwner}
            />
          </CardContent>
        )}
      </Card>

      {/* Dialog de categorías */}
      <CategoriesDialog
        open={categoriesDialogOpen}
        onOpenChange={setCategoriesDialogOpen}
        householdId={household.id}
        householdName={household.name}
      />
    </>
  );
}
