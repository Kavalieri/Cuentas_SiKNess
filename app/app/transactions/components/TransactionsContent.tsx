'use client';

import { useState } from 'react';
import { TransactionsHeader } from './TransactionsHeader';
import { TransactionsList } from './TransactionsList';
import { FilterPanel } from './FilterPanel';
import { LoadingState } from '@/components/shared/data-display/LoadingState';
import type { Database } from '@/types/database';

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null;
  profiles?: Database['public']['Tables']['profiles']['Row'] | null;
};

type Category = Database['public']['Tables']['categories']['Row'];

interface TransactionsContentProps {
  initialTransactions: Transaction[];
  categories: Category[];
}

export function TransactionsContent({
  initialTransactions,
  categories,
}: TransactionsContentProps) {
  const [transactions] = useState(initialTransactions);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState({
    categoryId: '',
    type: '' as '' | 'expense' | 'income',
    dateFrom: '',
    dateTo: '',
    paidBy: '',
    minAmount: '',
    maxAmount: '',
  });

  // Filtrar transacciones
  const filteredTransactions = transactions.filter((transaction) => {
    // Búsqueda por descripción
    if (searchQuery && !transaction.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filtro por categoría
    if (filters.categoryId && transaction.category_id !== filters.categoryId) {
      return false;
    }

    // Filtro por tipo
    if (filters.type && transaction.type !== filters.type) {
      return false;
    }

    // Filtro por fecha desde
    if (filters.dateFrom && transaction.occurred_at < filters.dateFrom) {
      return false;
    }

    // Filtro por fecha hasta
    if (filters.dateTo && transaction.occurred_at > filters.dateTo) {
      return false;
    }

    // Filtro por monto mínimo
    if (filters.minAmount && transaction.amount < parseFloat(filters.minAmount)) {
      return false;
    }

    // Filtro por monto máximo
    if (filters.maxAmount && transaction.amount > parseFloat(filters.maxAmount)) {
      return false;
    }

    return true;
  });

  const handleTransactionDeleted = () => {
    // Aquí se recargarían las transacciones
    // Por ahora no hace nada
  };

  if (isLoading) {
    return <LoadingState message="Cargando transacciones..." />;
  }

  return (
    <div className="space-y-6">
      <TransactionsHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterClick={() => setShowFilters(true)}
        onAddClick={() => {
          // TODO: Implementar diálogo de agregar transacción
        }}
        totalCount={filteredTransactions.length}
      />

      <TransactionsList
        transactions={filteredTransactions}
        onEdit={() => {
          // TODO: Implementar edición
        }}
        onDelete={handleTransactionDeleted}
      />

      <FilterPanel
        open={showFilters}
        onOpenChange={setShowFilters}
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
      />
    </div>
  );
}
