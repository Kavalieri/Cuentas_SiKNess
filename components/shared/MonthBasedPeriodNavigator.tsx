'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useSiKness } from '@/contexts/SiKnessContext';
import { createPeriodWithCategories } from '@/app/dual-flow/periodos/actions';
import { addMonths, subMonths } from 'date-fns';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { toast } from 'sonner';

const MONTH_NAMES = [
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

const getPeriodStatusInfo = (status: string | null) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return {
        label: 'Activo',
        icon: CheckCircle,
        variant: 'default' as const,
        color: 'text-green-600',
      };
    case 'closed':
      return {
        label: 'Cerrado',
        icon: CheckCircle,
        variant: 'secondary' as const,
        color: 'text-blue-600',
      };
    case 'pending_close':
      return {
        label: 'Pendiente cierre',
        icon: Clock,
        variant: 'outline' as const,
        color: 'text-amber-600',
      };
    default:
      return {
        label: 'Sin período',
        icon: AlertCircle,
        variant: 'outline' as const,
        color: 'text-gray-500',
      };
  }
};

export function MonthBasedPeriodNavigator() {
  const { periods, selectedPeriod, selectPeriod, householdId, refreshPeriods } = useSiKness();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [pendingPeriod, setPendingPeriod] = useState<{ year: number; month: number } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Obtener fecha actual
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Período mostrado = el seleccionado global; si no hay, usar mes actual si existe en la lista
  const shownYear = selectedPeriod?.year ?? currentYear;
  const shownMonth = selectedPeriod?.month ?? currentMonth;
  const currentPeriod = periods.find((p) => p.year === shownYear && p.month === shownMonth);

  const statusInfo = getPeriodStatusInfo(currentPeriod?.status || null);

  const handleMonthChange = (year: number, month: number) => {
    // Usar callback para detectar si el período no existe
    void selectPeriod(year, month, (y, m) => {
      // Si el período no existe, ofrecemos crearlo
      setPendingPeriod({ year: y, month: m });
      setShowCreateDialog(true);
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

      toast.success(`Período creado: ${MONTH_NAMES[pendingPeriod.month - 1]} ${pendingPeriod.year}`);

      // Refrescar lista de períodos
      await refreshPeriods();

      // Ahora sí seleccionar el período recién creado
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

  const handlePreviousMonth = () => {
    const newDate = subMonths(new Date(shownYear, shownMonth - 1), 1);
    handleMonthChange(newDate.getFullYear(), newDate.getMonth() + 1);
  };

  const handleNextMonth = () => {
    const newDate = addMonths(new Date(shownYear, shownMonth - 1), 1);
    handleMonthChange(newDate.getFullYear(), newDate.getMonth() + 1);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Navegación compacta para móvil */}
        <div className="md:hidden flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handlePreviousMonth} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-sm font-medium px-2">
            {MONTH_NAMES[shownMonth - 1]} {shownYear}
          </div>

          <Button variant="ghost" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Navegación expandida para desktop */}
        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handlePreviousMonth} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 min-w-[200px]">
            <Select
              value={shownMonth.toString()}
              onValueChange={(value) => handleMonthChange(shownYear, parseInt(value))}
            >
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((month, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={shownYear.toString()}
              onValueChange={(value) => handleMonthChange(parseInt(value), shownMonth)}
            >
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Generar años desde 2020 hasta 2030 */}
                {Array.from({ length: 11 }, (_, i) => 2020 + i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="ghost" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Estado del período */}
          <Badge variant={statusInfo.variant} className={`text-xs ${statusInfo.color}`}>
            <statusInfo.icon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>

        {/* Información del período para móvil */}
        <div className="md:hidden">
          <Badge variant={statusInfo.variant} className={`text-xs ${statusInfo.color}`}>
            <statusInfo.icon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {/* Diálogo de confirmación para crear período */}
      <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Crear nuevo período</AlertDialogTitle>
            <AlertDialogDescription>
              El período <strong>{pendingPeriod ? MONTH_NAMES[pendingPeriod.month - 1] : ''} {pendingPeriod?.year}</strong> no existe.
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
