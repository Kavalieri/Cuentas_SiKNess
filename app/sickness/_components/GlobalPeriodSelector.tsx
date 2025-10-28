'use client';

import { deletePeriod } from '@/app/sickness/periodo/actions';
import { createPeriodWithCategories } from '@/app/sickness/periods/actions';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSiKness } from '@/contexts/SiKnessContext';
import { Calendar, ChevronDown, Trash2 } from 'lucide-react';
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
  const { selectedPeriod, selectPeriod, householdId, refreshPeriods, periods } = useSiKness();

  const currentYear = new Date().getFullYear();
  const initialYear = selectedPeriod?.year ?? currentYear;
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingPeriod, setPendingPeriod] = useState<{ year: number; month: number } | null>(null);
  const [periodToDelete, setPeriodToDelete] = useState<{ id: string; year: number; month: number } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handlePeriodSelect = async (month: number) => {
    console.log('🟠 [GlobalPeriodSelector] handlePeriodSelect called:', selectedYear, month);
    try {
      await selectPeriod(selectedYear, month, (y, m) => {
        // Si el período no existe, mostramos el diálogo de creación
        setTimeout(() => {
          setPendingPeriod({ year: y, month: m });
          setShowCreateDialog(true);
          console.log('✅ [GlobalPeriodSelector] Dialog should be open now');
        }, 0);
      });
      // Si la selección fue exitosa, cerrar dropdown
      setDropdownOpen(false);
    } catch (error) {
      console.error('🔴 [GlobalPeriodSelector] Error selecting period:', error);
      toast.error('Error al seleccionar período');
    }
  };

  const handleConfirmCreate = async () => {
    if (!pendingPeriod || !householdId) return;
    setIsCreating(true);
    console.log('🔵 [GlobalPeriodSelector] handleConfirmCreate called with:', { householdId, pendingPeriod });
    try {
      console.log('🔵 [GlobalPeriodSelector] Calling createPeriodWithCategories...');
      const result = await createPeriodWithCategories(householdId, pendingPeriod.year, pendingPeriod.month);
      console.log('🔵 [GlobalPeriodSelector] Result from createPeriodWithCategories:', result);
      if (!result.ok) {
        console.error('🔴 [GlobalPeriodSelector] Creation failed:', result.message);
        toast.error(result.message ?? 'Error al crear período');
        return;
      }
      console.log('✅ [GlobalPeriodSelector] Period created successfully');
      toast.success(`Período creado: ${MONTHS[pendingPeriod.month - 1]} ${pendingPeriod.year}`);
      await refreshPeriods();
      // Seleccionar el período recién creado
      await selectPeriod(pendingPeriod.year, pendingPeriod.month);
      // Cerrar dropdown después de crear
      setDropdownOpen(false);
    } catch (error) {
      console.error('🔴 [GlobalPeriodSelector] Exception:', error);
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

  const handleDeleteClick = () => {
    if (!selectedPeriod) {
      toast.error('Selecciona un período primero');
      return;
    }
    // Buscar el período completo para obtener su ID
    const period = periods.find((p) => p.year === selectedPeriod.year && p.month === selectedPeriod.month);
    if (!period) {
      toast.error('Período no encontrado');
      return;
    }
    setPeriodToDelete({ id: period.id, year: period.year, month: period.month });
    setDeleteConfirmation('');
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!periodToDelete) return;

    const expectedConfirmation = `${periodToDelete.year}-${String(periodToDelete.month).padStart(2, '0')}`;
    if (deleteConfirmation !== expectedConfirmation) {
      toast.error(`Debes escribir exactamente: ${expectedConfirmation}`);
      return;
    }

    setIsDeleting(true);
    const wasDeletingSelected = selectedPeriod?.year === periodToDelete.year && selectedPeriod?.month === periodToDelete.month;
    
    try {
      const result = await deletePeriod(periodToDelete.id, deleteConfirmation);
      if (!result.ok) {
        toast.error(result.message ?? 'Error al eliminar período');
        return;
      }
      
      // Feedback inmediato
      toast.success(`Período eliminado: ${result.data?.deletedPeriodInfo}`);
      
      // Refrescar la lista de períodos
      await refreshPeriods();
      
      // Si eliminamos el período seleccionado, seleccionar automáticamente el más reciente
      if (wasDeletingSelected) {
        // Pequeña espera para que refreshPeriods termine de actualizar el estado
        setTimeout(async () => {
          // Obtener periodos actualizados directamente del contexto
          const updatedPeriods = periods.filter(p => 
            !(p.year === periodToDelete.year && p.month === periodToDelete.month)
          );
          
          if (updatedPeriods.length > 0) {
            // Seleccionar el período más reciente disponible
            const latestPeriod = updatedPeriods.sort((a, b) => {
              if (a.year !== b.year) return b.year - a.year;
              return b.month - a.month;
            })[0];
            
            if (latestPeriod) {
              console.log('🔄 [GlobalPeriodSelector] Auto-selecting latest period:', latestPeriod.year, latestPeriod.month);
              await selectPeriod(latestPeriod.year, latestPeriod.month);
            }
          } else {
            console.log('🔄 [GlobalPeriodSelector] No periods available after deletion');
            // Nota: No podemos limpiar selectedPeriod desde aquí, el contexto lo manejará
          }
        }, 200);
      }
      
    } catch (error) {
      console.error('🔴 [GlobalPeriodSelector] Delete exception:', error);
      toast.error('Error inesperado al eliminar período');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setPeriodToDelete(null);
      setDeleteConfirmation('');
      // Cerrar dropdown después de eliminar
      setDropdownOpen(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setPeriodToDelete(null);
    setDeleteConfirmation('');
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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

          {/* Botón de eliminar período */}
          {selectedPeriod && (
            <>
              <DropdownMenuSeparator />
              <div className="p-3">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteClick}
                  className="w-full gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar período seleccionado
                </Button>
              </div>
            </>
          )}
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

      {/* Diálogo de confirmación para eliminar período */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Eliminar Período</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Estás a punto de eliminar el período{' '}
                  <strong className="text-foreground">
                    {periodToDelete ? MONTHS[periodToDelete.month - 1] : ''} {periodToDelete?.year}
                  </strong>
                </p>
                <div className="rounded-lg bg-destructive/10 p-4 text-sm">
                  <p className="font-semibold text-destructive mb-2">Esta acción eliminará:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>El registro del período</li>
                    <li>Todas las contribuciones asociadas</li>
                    <li>Todas las transacciones del período</li>
                    <li>Ajustes de contribución</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deleteConfirmation" className="text-sm font-medium">
                    Para confirmar, escribe:{' '}
                    <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                      {periodToDelete ? `${periodToDelete.year}-${String(periodToDelete.month).padStart(2, '0')}` : ''}
                    </code>
                  </Label>
                  <Input
                    id="deleteConfirmation"
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder={periodToDelete ? `${periodToDelete.year}-${String(periodToDelete.month).padStart(2, '0')}` : ''}
                    disabled={isDeleting}
                    className="font-mono"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting || !deleteConfirmation}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar período'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
