import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';


interface BalanceFiltersProps {
  filters: {
    member: string;
    category: string;
    type: string;
    search: string;
    startDate?: string;
    endDate?: string;
  };
  categories: Array<{ id: string; name: string }>;
  members: Array<{ profile_id: string; email: string; display_name?: string; role?: string }>;
  periods?: Array<{ year: number; month: number }>;
  onChange: (filters: Partial<BalanceFiltersProps['filters']>) => void;
  onNewMovement?: () => void;
  canCreateMovement?: boolean;
}


export function BalanceFilters({ filters, categories, members, periods = [], onChange, onNewMovement, canCreateMovement }: BalanceFiltersProps) {
  const [open, setOpen] = useState(false);

  // Helper para obtener nombre del mes
  const getMonthName = (month?: number) => {
    if (!month || month < 1 || month > 12) return 'Mes inválido';
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month - 1];
  };

  // Helper para convertir periodo a rango de fechas
  const getPeriodDateRange = (year?: number, month?: number) => {
    if (!year || !month || month < 1 || month > 12) {
      return { startDate: '', endDate: '' };
    }
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    return { startDate, endDate };
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Ocultar filtros' : 'Mostrar filtros'}
        </Button>
        {canCreateMovement && onNewMovement && (
          <Button variant="default" size="sm" onClick={onNewMovement}>
            Nuevo movimiento
          </Button>
        )}
      </div>
      {open && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-4 p-4 rounded border bg-muted">
          <div>
            <label className="block text-xs font-medium mb-1">Período</label>
            <select
              className="border rounded px-2 py-1 w-full"
              onChange={(e) => {
                if (e.target.value) {
                  const parts = e.target.value.split('-');
                  if (parts.length === 2) {
                    const year = parseInt(parts[0]!, 10);
                    const month = parseInt(parts[1]!, 10);
                    const { startDate, endDate } = getPeriodDateRange(year, month);
                    onChange({ startDate, endDate });
                  }
                } else {
                  onChange({ startDate: '', endDate: '' });
                }
              }}
            >
              <option value="">Todos los períodos</option>
              {periods
                .filter((p) => p.year && p.month && p.month >= 1 && p.month <= 12)
                .map((p) => (
                  <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                    {getMonthName(p.month)} {p.year}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Miembro</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={filters.member}
              onChange={(e) => onChange({ member: e.target.value })}
            >
              <option value="">Todos</option>
              {members.map((m) => (
                <option key={m.profile_id} value={m.profile_id}>
                  {m.display_name || m.email}
                </option>
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
          <div>
            <label className="block text-xs font-medium mb-1">Rango personalizado</label>
            <div className="space-y-1">
              <input
                type="date"
                className="border rounded px-2 py-1 w-full text-xs"
                value={filters.startDate || ''}
                onChange={(e) => onChange({ startDate: e.target.value })}
                placeholder="Desde"
              />
              <input
                type="date"
                className="border rounded px-2 py-1 w-full text-xs"
                value={filters.endDate || ''}
                onChange={(e) => onChange({ endDate: e.target.value })}
                placeholder="Hasta"
              />
            </div>
          </div>
        </div>
      )}
      {/* Filtros activos como badges */}
      <div className="mt-2 flex flex-wrap gap-2">
        {filters.member && <Badge variant="secondary">Miembro</Badge>}
        {filters.category && <Badge variant="secondary">Categoría</Badge>}
        {filters.type && <Badge variant="secondary">Tipo</Badge>}
        {filters.search && <Badge variant="secondary">Búsqueda: {filters.search}</Badge>}
        {filters.startDate && <Badge variant="secondary">Desde: {filters.startDate}</Badge>}
        {filters.endDate && <Badge variant="secondary">Hasta: {filters.endDate}</Badge>}
      </div>
    </div>
  );
}
