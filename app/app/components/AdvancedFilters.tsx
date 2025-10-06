'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { TransactionStatus } from '@/components/shared/TransactionStatusBadge';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: string;
}

interface Member {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface AdvancedFiltersProps {
  categories: Category[];
  members: Member[];
  
  // Filtros
  searchText: string;
  filterType: 'all' | 'expense' | 'income';
  filterCategory: string;
  filterPaidBy: string;
  filterStatus: TransactionStatus | 'all';
  filterDateFrom: string;
  filterDateTo: string;
  
  // Callbacks
  onSearchTextChange: (value: string) => void;
  onFilterTypeChange: (value: 'all' | 'expense' | 'income') => void;
  onFilterCategoryChange: (value: string) => void;
  onFilterPaidByChange: (value: string) => void;
  onFilterStatusChange: (value: TransactionStatus | 'all') => void;
  onFilterDateFromChange: (value: string) => void;
  onFilterDateToChange: (value: string) => void;
  onClearFilters: () => void;
}

export function AdvancedFilters({
  categories,
  members,
  searchText,
  filterType,
  filterCategory,
  filterPaidBy,
  filterStatus,
  filterDateFrom,
  filterDateTo,
  onSearchTextChange,
  onFilterTypeChange,
  onFilterCategoryChange,
  onFilterPaidByChange,
  onFilterStatusChange,
  onFilterDateFromChange,
  onFilterDateToChange,
  onClearFilters,
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Contar filtros activos
  const activeFiltersCount = [
    searchText !== '',
    filterType !== 'all',
    filterCategory !== 'all',
    filterPaidBy !== 'all',
    filterStatus !== 'all',
    filterDateFrom !== '',
    filterDateTo !== '',
  ].filter(Boolean).length;

  return (
    <Card className="p-4 mb-4">
      {/* Búsqueda siempre visible */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por descripción..."
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchText && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
            onClick={() => onSearchTextChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Toggle filtros avanzados */}
      <div className="flex items-center justify-between mt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Filtros avanzados
          {activeFiltersCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
              {activeFiltersCount}
            </span>
          )}
        </Button>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Filtros avanzados colapsables */}
      {isExpanded && (
        <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Tipo de movimiento */}
          <div className="space-y-2">
            <Label htmlFor="filter-type">Tipo de movimiento</Label>
            <Select value={filterType} onValueChange={onFilterTypeChange}>
              <SelectTrigger id="filter-type">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="expense">💸 Gastos</SelectItem>
                <SelectItem value="income">💰 Ingresos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="filter-category">Categoría</Label>
            <Select value={filterCategory} onValueChange={onFilterCategoryChange}>
              <SelectTrigger id="filter-category">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pagado por */}
          {members.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="filter-paid-by">Pagado por</Label>
              <Select value={filterPaidBy} onValueChange={onFilterPaidByChange}>
                <SelectTrigger id="filter-paid-by">
                  <SelectValue placeholder="Todos los miembros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los miembros</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      👤 {member.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Estado */}
          <div className="space-y-2">
            <Label htmlFor="filter-status">Estado</Label>
            <Select value={filterStatus} onValueChange={(val) => onFilterStatusChange(val as TransactionStatus | 'all')}>
              <SelectTrigger id="filter-status">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">📝 Borrador</SelectItem>
                <SelectItem value="pending">⏳ Pendiente</SelectItem>
                <SelectItem value="confirmed">✅ Confirmado</SelectItem>
                <SelectItem value="locked">🔒 Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fecha desde */}
          <div className="space-y-2">
            <Label htmlFor="filter-date-from">Desde</Label>
            <Input
              id="filter-date-from"
              type="date"
              value={filterDateFrom}
              onChange={(e) => onFilterDateFromChange(e.target.value)}
            />
          </div>

          {/* Fecha hasta */}
          <div className="space-y-2">
            <Label htmlFor="filter-date-to">Hasta</Label>
            <Input
              id="filter-date-to"
              type="date"
              value={filterDateTo}
              onChange={(e) => onFilterDateToChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
