import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getCurrentUser, getUserHouseholds } from '@/lib/supabaseServer';
import { ChevronDown, Home, Plus, Users } from 'lucide-react';
import Link from 'next/link';

interface Household {
  id: string;
  name: string;
  role: 'owner' | 'member';
  is_owner: boolean;
  member_count?: number;
}

interface HouseholdSelectorDualFlowProps {
  currentHouseholdId?: string;
  currentHouseholdName?: string;
}

export async function HouseholdSelectorDualFlow({
  currentHouseholdId,
  currentHouseholdName,
}: HouseholdSelectorDualFlowProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  // Obtener todos los hogares del usuario
  const userHouseholdsRaw = await getUserHouseholds();
  const userHouseholds = userHouseholdsRaw as unknown as Household[];

  // Si no hay hogar actual, mostrar estado sin hogar
  if (!currentHouseholdId || !currentHouseholdName) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dual-flow/hogar" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Crear Hogar
          </Link>
        </Button>
      </div>
    );
  }

  // Encontrar el hogar actual para mostrar detalles
  const currentHousehold = userHouseholds.find((h) => h.id === currentHouseholdId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 max-w-[200px]">
          <Home className="h-4 w-4 text-primary" />
          <span className="truncate font-medium">{currentHouseholdName}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DialogTrigger>

      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Gestionar Hogares
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hogar Actual */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Hogar Actual</h4>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" />
                  <span className="font-medium">{currentHouseholdName}</span>
                </div>
                {currentHousehold?.is_owner && (
                  <Badge variant="secondary" className="text-xs">
                    Owner
                  </Badge>
                )}
              </div>
              {currentHousehold?.member_count && (
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{currentHousehold.member_count} miembros</span>
                </div>
              )}
            </div>
          </div>

          {/* Otros Hogares */}
          {userHouseholds.length > 1 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Cambiar Hogar</h4>
              <div className="space-y-2">
                {userHouseholds
                  .filter((h) => h.id !== currentHouseholdId)
                  .map((household) => (
                    <Link
                      key={household.id}
                      href={`/dual-flow/hogar/switch?id=${household.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Home className="h-4 w-4" />
                      <span className="flex-1">{household.name}</span>
                      {household.is_owner && (
                        <Badge variant="outline" className="text-xs">
                          Owner
                        </Badge>
                      )}
                    </Link>
                  ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="border-t pt-4 space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dual-flow/hogar" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Crear Nuevo Hogar
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dual-flow/hogar/manage" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Gestionar Hogares
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
