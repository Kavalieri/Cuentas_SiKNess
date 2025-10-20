'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkPeriodExists, createPeriodWithCategories } from '../periodos/actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';

interface PeriodSelectorProps {
  householdId: string;
  currentYear: number;
  currentMonth: number;
  onChange: (year: number, month: number) => void;
}

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

export function PeriodSelector({
  householdId,
  currentYear,
  currentMonth,
  onChange,
}: PeriodSelectorProps) {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{
    year: number;
    month: number;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Generar años (actual y 2 anteriores)
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const handleYearChange = async (yearStr: string) => {
    const year = parseInt(yearStr);
    await checkAndLoadPeriod(year, selectedMonth);
  };

  const handleMonthChange = async (monthStr: string) => {
    const month = parseInt(monthStr);
    await checkAndLoadPeriod(selectedYear, month);
  };

  const checkAndLoadPeriod = async (year: number, month: number) => {
    // Verificar si existe el período
    const result = await checkPeriodExists(householdId, year, month);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    if (result.data?.exists) {
      // Período existe, cargar inmediatamente
      setSelectedYear(year);
      setSelectedMonth(month);
      onChange(year, month);
    } else {
      // Período NO existe, mostrar diálogo de confirmación
      setPendingSelection({ year, month });
      setShowDialog(true);
    }
  };

  const handleConfirmCreate = async () => {
    if (!pendingSelection) return;

    setIsCreating(true);
    const { year, month } = pendingSelection;

    const result = await createPeriodWithCategories(householdId, year, month);

    if (result.ok) {
      toast.success(
        `Período ${MONTHS[month - 1]} ${year} creado exitosamente`,
      );

      setSelectedYear(year);
      setSelectedMonth(month);
      setShowDialog(false);
      setPendingSelection(null);

      // Recargar la página para actualizar todos los datos
      router.refresh();
      onChange(year, month);
    } else {
      toast.error(result.message);
    }

    setIsCreating(false);
  };

  const handleCancelCreate = () => {
    setShowDialog(false);
    setPendingSelection(null);
  };

  return (
    <>
      <div className="flex gap-2">
        <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((month, index) => (
              <SelectItem key={index + 1} value={(index + 1).toString()}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Crear nuevo período</AlertDialogTitle>
            <AlertDialogDescription>
              El período{' '}
              <strong>
                {pendingSelection && MONTHS[pendingSelection.month - 1]}{' '}
                {pendingSelection?.year}
              </strong>{' '}
              no existe todavía. ¿Deseas crearlo?
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
