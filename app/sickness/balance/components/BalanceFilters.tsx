import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BalanceFiltersProps {
  filters: {
    member: string;
    category: string;
    type: string;
    search: string;
  };
  categories: Array<{ id: string; name: string }>;
  members: Array<{ profile_id: string; email: string }>;
  onChange: (filters: Partial<BalanceFiltersProps['filters']>) => void;
}

export function BalanceFilters({ filters, categories, members, onChange }: BalanceFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        {open ? 'Ocultar filtros' : 'Mostrar filtros'}
      </Button>
      {open && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded border bg-muted">
          <div>
            <label className="block text-xs font-medium mb-1">Miembro</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={filters.member}
              onChange={(e) => onChange({ member: e.target.value })}
            >
              <option value="">Todos</option>
              {members.map((m) => (
                <option key={m.profile_id} value={m.profile_id}>{m.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Categoría</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={filters.category}
              onChange={(e) => onChange({ category: e.target.value })}
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Tipo</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={filters.type}
              onChange={(e) => onChange({ type: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Buscar</label>
            <input
              type="text"
              className="border rounded px-2 py-1 w-full"
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              placeholder="Descripción o importe..."
            />
          </div>
        </div>
      )}
      {/* Filtros activos como badges */}
      <div className="mt-2 flex flex-wrap gap-2">
        {filters.member && <Badge variant="secondary">Miembro</Badge>}
        {filters.category && <Badge variant="secondary">Categoría</Badge>}
        {filters.type && <Badge variant="secondary">Tipo</Badge>}
        {filters.search && <Badge variant="secondary">Búsqueda</Badge>}
      </div>
    </div>
  );
}
