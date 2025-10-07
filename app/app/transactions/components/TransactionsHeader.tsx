'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BreadcrumbNav } from '@/components/shared/navigation/BreadcrumbNav';
import { Search, Filter, Plus } from 'lucide-react';

interface TransactionsHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterClick: () => void;
  onAddClick: () => void;
  totalCount: number;
}

export function TransactionsHeader({
  searchQuery,
  onSearchChange,
  onFilterClick,
  onAddClick,
  totalCount,
}: TransactionsHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <BreadcrumbNav
        items={[
          { label: 'Transacciones', href: '/app/transactions' },
        ]}
      />

      {/* Header con título y acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transacciones</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'transacción encontrada' : 'transacciones encontradas'}
          </p>
        </div>

        <Button onClick={onAddClick} className="sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Transacción
        </Button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por descripción..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button
          variant="outline"
          onClick={onFilterClick}
          className="sm:w-auto"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>
    </div>
  );
}
