import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';


interface BalanceFiltersProps {
  filters: {
    member: string;
    group: string;
    category: string;
    subcategory: string;
    type: string;
    flowType: string;
    search: string;
    startDate?: string;
    endDate?: string;
  };
  categoryGroups: Array<{ id: string; name: string; icon?: string; type?: string }>;
  categories: Array<{ id: string; name: string; icon?: string; parent_id?: string }>;
  subcategories: Array<{ id: string; name: string; icon?: string; category_id?: string }>;
  members: Array<{ profile_id: string; email: string; display_name?: string; role?: string }>;
  periods?: Array<{ year: number; month: number }>;
  onChange: (filters: Partial<BalanceFiltersProps['filters']>) => void;
  onNewMovement?: () => void;
  canCreateMovement?: boolean;
}


export function BalanceFilters({ 
  filters, 
  categoryGroups, 
  categories, 
  subcategories, 
  members, 
  periods = [], 
  onChange, 
  onNewMovement, 
  canCreateMovement 
}: BalanceFiltersProps) {
  const [open, setOpen] = useState(false);

  // Filtrar categorías según grupo seleccionado
  const filteredCategories = filters.group
    ? categories.filter(c => c.parent_id === filters.group)
    : categories;

  // Filtrar subcategorías según categoría seleccionada
  const filteredSubcategories = filters.category
    ? subcategories.filter(s => s.category_id === filters.category)
    : subcategories;

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
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4 rounded border bg-muted">
          {/* Período */}
          <div>
            <label className="block text-xs font-medium mb-1">Período</label>
            <select
              className="border rounded px-2 py-1 w-full text-sm"
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

          {/* Miembro */}
          <div>
            <label className="block text-xs font-medium mb-1">Miembro</label>
            <select
              className="border rounded px-2 py-1 w-full text-sm"
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

          {/* Tipo Income/Expense */}
          <div>
            <label className="block text-xs font-medium mb-1">Tipo</label>
            <select
              className="border rounded px-2 py-1 w-full text-sm"
              value={filters.type}
              onChange={(e) => onChange({ type: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>
          </div>

          {/* Flujo Common/Direct */}
          <div>
            <label className="block text-xs font-medium mb-1">Flujo</label>
            <select
              className="border rounded px-2 py-1 w-full text-sm"
              value={filters.flowType}
              onChange={(e) => onChange({ flowType: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="common">Común</option>
              <option value="direct">Directo</option>
            </select>
          </div>

          {/* Grupo (Nivel 1) */}
          <div>
            <label className="block text-xs font-medium mb-1">Grupo</label>
            <select
              className="border rounded px-2 py-1 w-full text-sm"
              value={filters.group}
              onChange={(e) => {
                // Al cambiar grupo, resetear categoría y subcategoría
                onChange({ 
                  group: e.target.value,
                  category: '',
                  subcategory: ''
                });
              }}
            >
              <option value="">Todos los grupos</option>
              {categoryGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Categoría (Nivel 2) */}
          <div>
            <label className="block text-xs font-medium mb-1">Categoría</label>
            <select
              className="border rounded px-2 py-1 w-full text-sm"
              value={filters.category}
              onChange={(e) => {
                // Al cambiar categoría, resetear subcategoría
                onChange({ 
                  category: e.target.value,
                  subcategory: ''
                });
              }}
              disabled={!filters.group && filteredCategories.length === 0}
            >
              <option value="">Todas las categorías</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategoría (Nivel 3) */}
          <div>
            <label className="block text-xs font-medium mb-1">Subcategoría</label>
            <select
              className="border rounded px-2 py-1 w-full text-sm"
              value={filters.subcategory}
              onChange={(e) => onChange({ subcategory: e.target.value })}
              disabled={!filters.category && filteredSubcategories.length === 0}
            >
              <option value="">Todas las subcategorías</option>
              {filteredSubcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Buscar */}
          <div>
            <label className="block text-xs font-medium mb-1">Buscar</label>
            <input
              type="text"
              className="border rounded px-2 py-1 w-full text-sm"
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              placeholder="Descripción o importe..."
            />
          </div>

          {/* Rango personalizado */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">Rango personalizado</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="border rounded px-2 py-1 w-full text-sm"
                value={filters.startDate || ''}
                onChange={(e) => onChange({ startDate: e.target.value })}
                placeholder="Desde"
              />
              <input
                type="date"
                className="border rounded px-2 py-1 w-full text-sm"
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
        {filters.group && <Badge variant="secondary">Grupo</Badge>}
        {filters.category && <Badge variant="secondary">Categoría</Badge>}
        {filters.subcategory && <Badge variant="secondary">Subcategoría</Badge>}
        {filters.type && <Badge variant="secondary">Tipo: {filters.type === 'income' ? 'Ingresos' : 'Gastos'}</Badge>}
        {filters.flowType && <Badge variant="secondary">Flujo: {filters.flowType === 'common' ? 'Común' : 'Directo'}</Badge>}
        {filters.search && <Badge variant="secondary">Búsqueda: {filters.search}</Badge>}
        {filters.startDate && <Badge variant="secondary">Desde: {filters.startDate}</Badge>}
        {filters.endDate && <Badge variant="secondary">Hasta: {filters.endDate}</Badge>}
      </div>
    </div>
  );
}
