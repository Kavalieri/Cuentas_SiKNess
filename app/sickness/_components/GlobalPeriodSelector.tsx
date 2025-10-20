'use client';


import { createPeriodWithCategories } from '@/app/dual-flow/periodos/actions';
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
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSiKness } from '@/contexts/SiKnessContext';
import { Calendar, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function GlobalPeriodSelector() {
  console.log('🟢 [GlobalPeriodSelector] COMPONENT RENDERED');
  const { selectedPeriod, selectPeriod, householdId, refreshPeriods } = useSiKness();

  const currentYear = new Date().getFullYear();
  const initialYear = selectedPeriod?.year ?? currentYear;
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [pendingPeriod, setPendingPeriod] = useState<{ year: number; month: number } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handlePeriodSelect = (month: number) => {
    console.log('🟠 [GlobalPeriodSelector] handlePeriodSelect called:', selectedYear, month);
    selectPeriod(selectedYear, month, (y, m) => {
      // Si el período no existe, mostramos el diálogo de creación
      setTimeout(() => {
        setPendingPeriod({ year: y, month: m });
        setShowCreateDialog(true);
        console.log('✅ [GlobalPeriodSelector] Dialog should be open now');
      }, 0);
    });
  };

  const handleConfirmCreate = async () => {
    if (!pendingPeriod || !householdId) return;
    setIsCreating(true);
    try {
      const result = await createPeriodWithCategories(householdId, pendingPeriod.year, pendingPeriod.month);
      if (!result.ok) {
        toast.error(result.message ?? 'Error al crear período');
        return;
      }
      toast.success(`Período creado: ${MONTHS[pendingPeriod.month - 1]} ${pendingPeriod.year}`);
      await refreshPeriods();
      // Seleccionar el período recién creado
      void selectPeriod(pendingPeriod.year, pendingPeriod.month);
    } catch (error) {
      console.error('Error creating period:', error);
      toast.error('Error inesperado al crear período');
    } finally {
      setIsCreating(false);
      setShowCreateDialog(false);
      setPendingPeriod(null);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateDialog(false);
    setPendingPeriod(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">
              {selectedPeriod
                ? `${MONTHS[selectedPeriod.month - 1]} ${selectedPeriod.year}`
                : 'Seleccionar período'}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Seleccionar Período</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Selector de año */}
          <div className="flex items-center justify-center gap-2 py-3">
            {years.map((year) => (
              <Button
                key={year}
                variant={selectedYear === year ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedYear(year)}
                className="h-8 px-3"
              >
                {year}
              </Button>
            ))}
          </div>

          <DropdownMenuSeparator />

          {/* Grid de meses */}
          <div className="grid grid-cols-3 gap-2 p-3">
            {MONTHS.map((month, index) => {
              const monthNumber = index + 1;
              const isActive = selectedPeriod?.year === selectedYear && selectedPeriod?.month === monthNumber;
              const isCurrent =
                currentYear === selectedYear && new Date().getMonth() + 1 === monthNumber;

              return (
                <Button
                  key={month}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePeriodSelect(monthNumber)}
                  className={`h-12 ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-medium">{month.slice(0, 3)}</span>
                    {isCurrent && <span className="text-[10px] text-muted-foreground">Actual</span>}
                  </div>
                </Button>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Diálogo de confirmación para crear período */}
      <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Crear nuevo período</AlertDialogTitle>
            <AlertDialogDescription>
              El período <strong>{pendingPeriod ? MONTHS[pendingPeriod.month - 1] : ''} {pendingPeriod?.year}</strong> no existe.
              <br />
              ¿Deseas crear este período ahora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelCreate} disabled={isCreating}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCreate} disabled={isCreating}>
              {isCreating ? 'Creando...' : 'Crear período'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
