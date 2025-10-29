'use client';

import { createHouseholdFromSelector } from '@/app/sickness/onboarding/actions';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSiKness } from '@/contexts/SiKnessContext';
import { ChevronDown, Home, PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function GlobalHouseholdSelector() {
  const { householdId, households, selectHousehold } = useSiKness();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const currentHousehold = households.find((h) => h.id === householdId);

  const handleCreateHousehold = async () => {
    if (!householdName.trim()) {
      toast.error('Debes introducir un nombre para el hogar');
      return;
    }

    setIsCreating(true);
    try {
      const result = await createHouseholdFromSelector(householdName.trim());

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(`Hogar "${householdName}" creado exitosamente`);

      // Cerrar diálogo y limpiar
      setShowCreateDialog(false);
      setHouseholdName('');
      setDropdownOpen(false);

      // Recargar página para actualizar contexto
      // TODO: Idealmente deberíamos tener refreshHouseholds() en el contexto
      window.location.reload();
    } catch (error) {
      console.error('[GlobalHouseholdSelector] Error creating household:', error);
      toast.error('Error inesperado al crear hogar');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateDialog(false);
    setHouseholdName('');
  };

  if (!currentHousehold) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Home className="h-4 w-4" />
        <span>Sin hogar</span>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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
              {household.isOwner && <span className="text-xs text-primary">Owner</span>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
            <PlusCircle className="mr-2 h-4 w-4 text-green-600" />
            <span className="text-green-600 font-medium">Crear nuevo hogar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Diálogo de creación de hogar */}
      <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Crear nuevo hogar</AlertDialogTitle>
            <AlertDialogDescription>
              Introduce un nombre para tu nuevo hogar. Serás el propietario y podrás invitar a otros miembros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="household-name" className="text-sm font-medium">
              Nombre del hogar
            </Label>
            <Input
              id="household-name"
              type="text"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="Mi Hogar"
              disabled={isCreating}
              className="mt-2"
              maxLength={80}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) {
                  handleCreateHousehold();
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelCreate} disabled={isCreating}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateHousehold} disabled={isCreating || !householdName.trim()}>
              {isCreating ? 'Creando...' : 'Crear hogar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
