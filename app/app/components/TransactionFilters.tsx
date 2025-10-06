'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TransactionStatus } from '@/components/shared/TransactionStatusBadge';

interface Member {
  id: string;
  display_name: string;
}

interface TransactionFiltersProps {
  members: Member[];
  filterPaidBy: string | 'all';
  filterStatus: TransactionStatus | 'all';
  onFilterPaidByChange: (value: string | 'all') => void;
  onFilterStatusChange: (value: TransactionStatus | 'all') => void;
}

export function TransactionFilters({
  members,
  filterPaidBy,
  filterStatus,
  onFilterPaidByChange,
  onFilterStatusChange,
}: TransactionFiltersProps) {
  return (
    <div className="flex flex-col gap-3 mb-4 sm:flex-row">
      <div className="flex-1">
        <Select value={filterPaidBy} onValueChange={onFilterPaidByChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por miembro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los miembros</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <Select value={filterStatus} onValueChange={onFilterStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="locked">Cerrado</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
