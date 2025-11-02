'use client';

import { editDirectExpenseWithCompensatory } from './actions';
import { EditMovementForm } from '@/components/shared/EditMovementForm';

interface EditDirectExpenseButtonProps {
  tx: {
    id: string;
    amount: number;
    description?: string;
    category_id?: string;
    subcategory_id?: string;
    occurred_at?: string;
    performed_at?: string | null;
    performed_by_profile_id?: string;
  };
  householdId?: string;
  onSuccess?: () => void;
  members?: Array<{ profile_id: string; email: string; display_name?: string; role?: string }>;
}

export function EditDirectExpenseButton({ tx, householdId, onSuccess, members = [] }: EditDirectExpenseButtonProps) {
  return (
    <EditMovementForm
      tx={{ ...tx, type: 'direct_expense' }}
      movementType="direct_expense"
      householdId={householdId}
      onSuccess={onSuccess}
      members={members}
      editAction={editDirectExpenseWithCompensatory}
    />
  );
}
