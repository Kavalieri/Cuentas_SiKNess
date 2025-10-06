'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdvancedFilters } from '@/app/app/components/AdvancedFilters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePrivateFormat } from '@/lib/hooks/usePrivateFormat';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteTransaction } from '@/app/app/expenses/actions';
import { EditTransactionDialog } from '@/app/app/expenses/components/EditTransactionDialog';
import { useRouter } from 'next/navigation';
import { TransactionStatusBadge, type TransactionStatus } from '@/components/shared/TransactionStatusBadge';
import Image from 'next/image';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: 'expense' | 'income';
  description: string | null;
  occurred_at: string;
  created_at: string | null;
  updated_at?: string | null;
  category_id: string | null;
  paid_by?: string | null;
  status?: TransactionStatus;
  categories: {
    name: string;
    icon: string | null;
  } | null;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

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

interface TransactionsListProps {
  transactions: Transaction[];
  categories?: Category[];
  members?: Member[];
  showActions?: boolean;
  onUpdate?: () => void | Promise<void>;
  showFilters?: boolean;
  showSearch?: boolean;
}

export function TransactionsList({
  transactions,
  categories = [],
  members = [],
  showActions = true,
  showFilters = false,
  showSearch = false,
}: TransactionsListProps) {
  const router = useRouter();
  const { formatPrivateCurrency } = usePrivateFormat();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Estados de filtros
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategory, setFilterCategory] = useState<string | 'all'>('all');
  const [filterPaidBy, setFilterPaidBy] = useState<string | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | 'all'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  // Estados de ordenamiento
  const [sortField, setSortField] = useState<'date' | 'amount' | 'category' | 'description' | 'paid_by' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) return;

    setDeletingId(id);
    const result = await deleteTransaction(id);

    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast.success('Transacción eliminada');
      router.refresh();
    }
    setDeletingId(null);
  };

  // Función para limpiar todos los filtros
  const handleClearFilters = () => {
    setSearchText('');
    setFilterType('all');
    setFilterCategory('all');
    setFilterPaidBy('all');
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Función para cambiar ordenamiento
  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filtrar transacciones con todos los criterios
  const filteredTransactions = transactions.filter((transaction) => {
    // Búsqueda por descripción
    if (searchText && !transaction.description?.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    
    // Filtro por tipo
    if (filterType !== 'all' && transaction.type !== filterType) {
      return false;
    }
    
    // Filtro por categoría
    if (filterCategory !== 'all' && transaction.category_id !== filterCategory) {
      return false;
    }
    
    // Filtro por pagador
    if (filterPaidBy !== 'all' && transaction.paid_by !== filterPaidBy) {
      return false;
    }
    
    // Filtro por estado
    if (filterStatus !== 'all' && (transaction.status || 'confirmed') !== filterStatus) {
      return false;
    }
    
    // Filtro por rango de fechas
    const txDate = new Date(transaction.occurred_at);
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      if (txDate < fromDate) return false;
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999); // Incluir todo el día
      if (txDate > toDate) return false;
    }
    
    return true;
  });

  // Ordenar transacciones
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let aVal: string | number | Date;
    let bVal: string | number | Date;

    switch (sortField) {
      case 'date':
        aVal = new Date(a.occurred_at).getTime();
        bVal = new Date(b.occurred_at).getTime();
        break;
      case 'amount':
        aVal = a.amount;
        bVal = b.amount;
        break;
      case 'category':
        aVal = a.categories?.name || '';
        bVal = b.categories?.name || '';
        break;
      case 'description':
        aVal = a.description || '';
        bVal = b.description || '';
        break;
      case 'paid_by':
        aVal = a.profile?.display_name || '';
        bVal = b.profile?.display_name || '';
        break;
      case 'status':
        aVal = a.status || 'confirmed';
        bVal = b.status || 'confirmed';
        break;
      default:
        return 0;
    }

    const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">
              No hay transacciones registradas
            </p>
            <p className="text-sm">
              Haz click en &quot;+ Nueva Transacción&quot; para empezar
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Filtros avanzados */}
      {(showFilters || showSearch) && (
        <AdvancedFilters
          categories={categories}
          members={members}
          searchText={searchText}
          filterType={filterType}
          filterCategory={filterCategory}
          filterPaidBy={filterPaidBy}
          filterStatus={filterStatus}
          filterDateFrom={filterDateFrom}
          filterDateTo={filterDateTo}
          onSearchTextChange={setSearchText}
          onFilterTypeChange={setFilterType}
          onFilterCategoryChange={setFilterCategory}
          onFilterPaidByChange={setFilterPaidBy}
          onFilterStatusChange={setFilterStatus}
          onFilterDateFromChange={setFilterDateFrom}
          onFilterDateToChange={setFilterDateTo}
          onClearFilters={handleClearFilters}
        />
      )}

      {sortedTransactions.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">
                No se encontraron transacciones
              </p>
              <p className="text-sm">
                {searchText || filterType !== 'all' || filterCategory !== 'all' || filterPaidBy !== 'all' || filterStatus !== 'all' || filterDateFrom || filterDateTo
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Haz click en "+ Nueva Transacción" para empezar'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista Móvil - Cards */}
      {sortedTransactions.length > 0 && (
        <div className="space-y-3 md:hidden">
          {sortedTransactions.map((transaction) => (
          <Card key={transaction.id}>
            <CardContent className="py-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {transaction.categories?.icon || (transaction.type === 'expense' ? '💸' : '💰')}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.categories?.name || 'Sin categoría'}</p>
                      {transaction.description && (
                        <p className="text-sm text-muted-foreground">{transaction.description}</p>
                      )}
                    </div>
                  </div>
                  <p
                    className={`text-xl font-bold ${
                      transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {transaction.type === 'expense' ? '-' : '+'}
                    {formatPrivateCurrency(transaction.amount)}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const dateStr = transaction.occurred_at;
                        const localDate = new Date(dateStr + 'T00:00:00');
                        return localDate.toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                      })()}
                      {transaction.created_at && (
                        <span className="ml-2">
                          • {new Date(transaction.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground">
                      {transaction.type === 'expense' ? 'Pagado por:' : 'Ingresado por:'}
                      {' '}
                      <span className="font-medium">
                        {transaction.profile ? transaction.profile.display_name : '🏦 Cuenta común'}
                      </span>
                    </p>
                    {transaction.status && <TransactionStatusBadge status={transaction.status} />}
                  </div>
                  {showActions && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingId(transaction.id)}
                        disabled={deletingId === transaction.id}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(transaction.id)}
                        disabled={deletingId === transaction.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* Vista Desktop - Tabla */}
      {sortedTransactions.length > 0 && (
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => toggleSort('category')}
                    >
                      Categoría
                      {sortField === 'category' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => toggleSort('description')}
                    >
                      Descripción
                      {sortField === 'description' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => toggleSort('amount')}
                    >
                      Monto
                      {sortField === 'amount' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => toggleSort('paid_by')}
                    >
                      Pagado por
                      {sortField === 'paid_by' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => toggleSort('status')}
                    >
                      Estado
                      {sortField === 'status' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => toggleSort('date')}
                    >
                      Fecha
                      {sortField === 'date' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                    </Button>
                  </TableHead>
                  {showActions && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {transaction.categories?.icon || (transaction.type === 'expense' ? '💸' : '💰')}
                      </span>
                      <span className="font-medium">{transaction.categories?.name || 'Sin categoría'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm">{transaction.description || '-'}</p>
                      <Badge variant={transaction.type === 'expense' ? 'destructive' : 'default'} className="text-xs">
                        {transaction.type === 'expense' ? 'Gasto' : 'Ingreso'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`text-lg font-bold ${
                        transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {transaction.type === 'expense' ? '-' : '+'}
                      {formatPrivateCurrency(transaction.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {transaction.profile ? (
                      <div className="flex items-center gap-2">
                        {transaction.profile.avatar_url && (
                          <Image
                            src={transaction.profile.avatar_url}
                            alt={transaction.profile.display_name}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        )}
                        <span className="text-sm">{transaction.profile.display_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">🏦 Cuenta común</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {transaction.status ? (
                      <TransactionStatusBadge status={transaction.status} />
                    ) : (
                      <TransactionStatusBadge status="confirmed" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">
                        {(() => {
                          // occurred_at es DATE sin hora - agregar T00:00:00 para interpretación local
                          const dateStr = transaction.occurred_at;
                          const localDate = new Date(dateStr + 'T00:00:00');
                          return localDate.toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          });
                        })()}
                      </span>
                      {transaction.created_at && (
                        <span className="text-xs text-muted-foreground block">
                          • {new Date(transaction.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingId(transaction.id)}
                          disabled={deletingId === transaction.id || transaction.status === 'locked'}
                          title={transaction.status === 'locked' ? 'No se puede editar una transacción cerrada' : 'Editar'}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(transaction.id)}
                          disabled={deletingId === transaction.id || transaction.status === 'locked'}
                          title={transaction.status === 'locked' ? 'No se puede eliminar una transacción cerrada' : 'Eliminar'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        </Card>
      )}

      {/* Dialog de edición */}
      {editingId && (
        <EditTransactionDialog
          transaction={transactions.find((t) => t.id === editingId)!}
          categories={categories}
          open={editingId !== null}
          onOpenChange={(open) => {
            if (!open) setEditingId(null);
          }}
        />
      )}
    </>
  );
}
