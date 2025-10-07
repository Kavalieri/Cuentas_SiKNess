'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];

interface Filters {
  categoryId: string;
  type: '' | 'expense' | 'income';
  dateFrom: string;
  dateTo: string;
  paidBy: string;
  minAmount: string;
  maxAmount: string;
}

interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  categories: Category[];
}

export function FilterPanel({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  categories,
}: FilterPanelProps) {
  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      categoryId: '',
      type: '',
      dateFrom: '',
      dateTo: '',
      paidBy: '',
      minAmount: '',
      maxAmount: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some((value) => value !== '');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>
            Filtra las transacciones según tus criterios
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Filtro por Tipo */}
          <div className="space-y-2">
            <Label htmlFor="type-filter">Tipo de Transacción</Label>
            <Select
              value={filters.type}
              onValueChange={(value) => handleFilterChange('type', value as '' | 'expense' | 'income')}
            >
              <SelectTrigger id="type-filter">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los tipos</SelectItem>
                <SelectItem value="expense">💸 Gastos</SelectItem>
                <SelectItem value="income">💰 Ingresos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Categoría */}
          <div className="space-y-2">
            <Label htmlFor="category-filter">Categoría</Label>
            <Select
              value={filters.categoryId}
              onValueChange={(value) => handleFilterChange('categoryId', value)}
            >
              <SelectTrigger id="category-filter">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Rango de Fechas */}
          <div className="space-y-2">
            <Label>Rango de Fechas</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                  Desde
                </Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                  Hasta
                </Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Filtro por Monto */}
          <div className="space-y-2">
            <Label>Rango de Monto</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="min-amount" className="text-xs text-muted-foreground">
                  Mínimo (€)
                </Label>
                <Input
                  id="min-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="max-amount" className="text-xs text-muted-foreground">
                  Máximo (€)
                </Label>
                <Input
                  id="max-amount"
                  type="number"
                  step="0.01"
                  placeholder="999.99"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
            <Button
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
