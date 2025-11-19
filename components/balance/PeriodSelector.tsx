'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';

export function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDate = new Date();
  const currentYear = parseInt(searchParams.get('year') || String(currentDate.getFullYear()));
  const currentMonth = parseInt(searchParams.get('month') || String(currentDate.getMonth() + 1));

  const months = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  const handleMonthChange = (month: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', month);
    router.push(`?${params.toString()}`);
  };

  const handleYearChange = (year: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', year);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex gap-3">
      <Select value={String(currentMonth)} onValueChange={handleMonthChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Mes" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month.value} value={month.value}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(currentYear)} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[110px]">
          <SelectValue placeholder="Año" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
