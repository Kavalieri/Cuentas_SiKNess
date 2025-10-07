'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useTransition } from 'react';

type Category = {
  id: string;
  name: string;
  icon: string;
};

type ActiveFiltersProps = {
  categories: Category[];
};

export function ActiveFilters({ categories }: ActiveFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const search = searchParams.get('search');
  const type = searchParams.get('type');
  const categoryId = searchParams.get('category_id');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  const hasFilters = search || type || categoryId || dateFrom || dateTo;

  if (!hasFilters) return null;

  const removeFilter = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);

    startTransition(() => {
      router.push(`/app/expenses?${params.toString()}`);
    });
  };

  const clearAll = () => {
    startTransition(() => {
      router.push('/app/expenses');
    });
  };

  const getCategoryName = (id: string) => {
    const category = categories.find((cat) => cat.id === id);
    return category ? `${category.icon} ${category.name}` : 'Categoría desconocida';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-4">
      <span className="text-sm font-medium text-muted-foreground">Filtros activos:</span>

      {search && (
        <Badge variant="secondary" className="gap-1">
          Búsqueda: &quot;{search}&quot;
          <button
            onClick={() => removeFilter('search')}
            disabled={isPending}
            className="ml-1 rounded-full hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {type && (
        <Badge variant="secondary" className="gap-1">
          {type === 'expense' ? '💸 Gastos' : '💰 Ingresos'}
          <button
            onClick={() => removeFilter('type')}
            disabled={isPending}
            className="ml-1 rounded-full hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {categoryId && (
        <Badge variant="secondary" className="gap-1">
          {getCategoryName(categoryId)}
          <button
            onClick={() => removeFilter('category_id')}
            disabled={isPending}
            className="ml-1 rounded-full hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {dateFrom && (
        <Badge variant="secondary" className="gap-1">
          Desde: {formatDate(dateFrom)}
          <button
            onClick={() => removeFilter('dateFrom')}
            disabled={isPending}
            className="ml-1 rounded-full hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {dateTo && (
        <Badge variant="secondary" className="gap-1">
          Hasta: {formatDate(dateTo)}
          <button
            onClick={() => removeFilter('dateTo')}
            disabled={isPending}
            className="ml-1 rounded-full hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      <Button onClick={clearAll} variant="ghost" size="sm" disabled={isPending} className="ml-auto">
        Limpiar todos
      </Button>
    </div>
  );
}
