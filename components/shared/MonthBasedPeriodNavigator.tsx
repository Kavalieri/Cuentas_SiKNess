'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGlobalSelectors } from '@/contexts/HouseholdContext';
import { addMonths, subMonths } from 'date-fns';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

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
  const { periods, selectMonth } = useGlobalSelectors();

  // Obtener fecha actual
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Encontrar el período actual (mes actual)
  const currentPeriod = periods.find((p) => p.year === currentYear && p.month === currentMonth);

  const statusInfo = getPeriodStatusInfo(currentPeriod?.status || null);

  const handleMonthChange = (year: number, month: number) => {
    selectMonth(year, month);
  };

  const handlePreviousMonth = () => {
    const newDate = subMonths(new Date(currentYear, currentMonth - 1), 1);
    handleMonthChange(newDate.getFullYear(), newDate.getMonth() + 1);
  };

  const handleNextMonth = () => {
    const newDate = addMonths(new Date(currentYear, currentMonth - 1), 1);
    handleMonthChange(newDate.getFullYear(), newDate.getMonth() + 1);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Navegación compacta para móvil */}
      <div className="md:hidden flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={handlePreviousMonth} className="h-8 w-8 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-sm font-medium px-2">
          {MONTH_NAMES[currentMonth - 1]} {currentYear}
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
            value={currentMonth.toString()}
            onValueChange={(value) => handleMonthChange(currentYear, parseInt(value))}
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
            value={currentYear.toString()}
            onValueChange={(value) => handleMonthChange(parseInt(value), currentMonth)}
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
  );
}
