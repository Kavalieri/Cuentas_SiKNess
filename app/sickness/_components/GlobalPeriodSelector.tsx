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
    try {
      await selectPeriod(selectedYear, month, (y, m) => {
        // Si el período no existe, mostramos el diálogo de creación
        setTimeout(() => {
          setPendingPeriod({ year: y, month: m });
          setShowCreateDialog(true);
        }, 0);
      });
      // Si la selección fue exitosa, cerrar dropdown
      setDropdownOpen(false);
    } catch (error) {
      console.error('Error selecting period:', error);
      toast.error('Error al seleccionar período');
    }
  };

  const handleConfirmCreate = async () => {
    if (!pendingPeriod || !householdId) return;
    setIsCreating(true);
    try {
      const result = await createPeriodWithCategories(householdId, pendingPeriod.year, pendingPeriod.month);
      if (!result.ok) {
        console.error('Period creation failed:', result.message);
        toast.error(result.message ?? 'Error al crear período');
        return;
      }
      toast.success(`Período creado: ${MONTHS[pendingPeriod.month - 1]} ${pendingPeriod.year}`);

      // Guardar el periodo recién creado antes de refrescar
      const createdYear = pendingPeriod.year;
      const createdMonth = pendingPeriod.month;

      // Refrescar la lista de períodos
      await refreshPeriods();

      // IMPORTANTE: Seleccionar explícitamente el período recién creado
      // Esto evita que el contexto auto-seleccione otro periodo (último disponible)
      await selectPeriod(createdYear, createdMonth);

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
              await selectPeriod(latestPeriod.year, latestPeriod.month);
            }
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

              // Buscar si existe periodo para este mes/año
              const periodForMonth = periods.find(p => p.year === selectedYear && p.month === monthNumber);
              const hasPeriod = !!periodForMonth;
              const periodPhase = periodForMonth?.phase;

              // Determinar estilos según fase (borde + fondo + texto)
              let borderClass = '';
              let bgClass = '';
              let textClass = '';
              let phaseLabel = '';

              if (hasPeriod && periodPhase) {
                switch (periodPhase) {
                  case 'preparing':
                    borderClass = 'border-yellow-500 dark:border-yellow-600';
                    bgClass = 'bg-yellow-50 dark:bg-yellow-950/20';
                    textClass = 'text-yellow-700 dark:text-yellow-400';
                    phaseLabel = 'Preparando';
                    break;
                  case 'validation':
                    borderClass = 'border-orange-500 dark:border-orange-600';
                    bgClass = 'bg-orange-50 dark:bg-orange-950/20';
                    textClass = 'text-orange-700 dark:text-orange-400';
                    phaseLabel = 'Validación';
                    break;
                  case 'active':
                    borderClass = 'border-green-600 dark:border-green-500';
                    bgClass = 'bg-green-50 dark:bg-green-950/20';
                    textClass = 'text-green-700 dark:text-green-400';
                    phaseLabel = 'Activo';
                    break;
                  case 'closed':
                    borderClass = 'border-gray-400 dark:border-gray-600';
                    bgClass = 'bg-gray-50 dark:bg-gray-900/20';
                    textClass = 'text-gray-600 dark:text-gray-400';
                    phaseLabel = 'Cerrado';
                    break;
                  default:
                    borderClass = 'border-blue-500';
                    bgClass = 'bg-blue-50 dark:bg-blue-950/20';
                    textClass = 'text-blue-700 dark:text-blue-400';
                    phaseLabel = 'Otro';
                }
              }

              // Clases base del botón
              const baseClasses = 'h-20 relative border-2 transition-all';

              // Cuando está activo, usar colores más intensos pero legibles
              let activeClasses = '';
              if (isActive && hasPeriod && periodPhase) {
                switch (periodPhase) {
                  case 'preparing':
                    activeClasses = 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-600 dark:border-yellow-500';
                    break;
                  case 'validation':
                    activeClasses = 'bg-orange-100 dark:bg-orange-900/40 border-orange-600 dark:border-orange-500';
                    break;
                  case 'active':
                    activeClasses = 'bg-green-100 dark:bg-green-900/40 border-green-700 dark:border-green-500';
                    break;
                  case 'closed':
                    activeClasses = 'bg-gray-200 dark:bg-gray-800/40 border-gray-500 dark:border-gray-600';
                    break;
                }
              } else if (isActive && !hasPeriod) {
                activeClasses = 'bg-primary/10 dark:bg-primary/20 border-primary';
              }

              const periodClasses = hasPeriod && !isActive ? `${borderClass} ${bgClass}` : '';
              const finalClasses = isActive ? activeClasses : (hasPeriod ? periodClasses : 'border-dashed border-muted-foreground/30');
              const currentClasses = isCurrent ? 'ring-2 ring-primary ring-offset-2' : '';

              return (
                <Button
                  key={month}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePeriodSelect(monthNumber)}
                  className={`${baseClasses} ${finalClasses} ${currentClasses}`}
                  title={hasPeriod ? `Fase: ${phaseLabel}` : 'Crear nuevo período'}
                >
                  <div className="flex flex-col items-center gap-0.5 w-full">
                    {/* Nombre del mes - color oscuro legible */}
                    <span className={`text-xs font-semibold ${isActive ? 'text-gray-900 dark:text-gray-100' : ''}`}>
                      {month.slice(0, 3)}
                    </span>
                    {isCurrent && (
                      <span className={`text-[9px] font-medium ${isActive ? 'text-gray-700 dark:text-gray-300' : 'opacity-70'}`}>
                        Actual
                      </span>
                    )}
                    {hasPeriod && (
                      <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-gray-800 dark:text-gray-200' : textClass}`}>
                        {phaseLabel}
                      </span>
                    )}
                    {!hasPeriod && (
                      <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-gray-700 dark:text-gray-300' : 'text-muted-foreground/60'}`}>
                        + Crear
                      </span>
                    )}
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
