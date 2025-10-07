'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useState, useTransition } from 'react';

type Category = {
  id: string;
  name: string;
  icon: string;
  type: 'expense' | 'income';
};

type FilterBarProps = {
  categories: Category[];
};

export function FilterBar({ categories }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Estado local para inputs (uncontrolled → controlled)
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [type, setType] = useState(searchParams.get('type') || 'all');
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') || 'all');
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');

  const handleFilter = () => {
    const params = new URLSearchParams();

    if (search.trim()) params.set('search', search.trim());
    if (type !== 'all') params.set('type', type);
    if (categoryId !== 'all') params.set('category_id', categoryId);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    startTransition(() => {
      router.push(`/app/expenses?${params.toString()}`);
    });
  };

  const handleClear = () => {
    setSearch('');
    setType('all');
    setCategoryId('all');
    setDateFrom('');
    setDateTo('');

    startTransition(() => {
      router.push('/app/expenses');
    });
  };

  const hasActiveFilters =
    search.trim() || type !== 'all' || categoryId !== 'all' || dateFrom || dateTo;

  // Filtrar categorías según type seleccionado
  const filteredCategories = categories.filter((cat) => {
    if (type === 'all') return true;
    return cat.type === type;
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Búsqueda por descripción */}
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
            className="pl-9"
          />
        </div>

        {/* Tipo */}
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="expense">💸 Gastos</SelectItem>
            <SelectItem value="income">💰 Ingresos</SelectItem>
          </SelectContent>
        </Select>

        {/* Categoría */}
        <Select
          value={categoryId}
          onValueChange={setCategoryId}
          disabled={filteredCategories.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {filteredCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Botón Aplicar/Limpiar */}
        <div className="flex gap-2">
          <Button onClick={handleFilter} disabled={isPending} className="flex-1">
            Aplicar
          </Button>
          {hasActiveFilters && (
            <Button onClick={handleClear} variant="ghost" size="icon" disabled={isPending}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Rango de fechas */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="dateFrom" className="mb-2 block text-sm font-medium">
            Desde
          </label>
          <Input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="dateTo" className="mb-2 block text-sm font-medium">
            Hasta
          </label>
          <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>
    </div>
  );
}
