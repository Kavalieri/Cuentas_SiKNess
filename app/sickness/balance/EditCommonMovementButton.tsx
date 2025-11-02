'use client';

import { editCommonMovement } from '@/app/sickness/balance/actions';
import { EditMovementForm } from '@/components/shared/EditMovementForm';

interface EditCommonMovementButtonProps {
  tx: {
    id: string;
    type: string;
    amount: number;
    description?: string;
    category_id?: string;
    subcategory_id?: string;
    occurred_at?: string;
    performed_at?: string | null;
    performed_by_profile_id?: string | null;
  };
  householdId?: string;
  onSuccess?: () => void;
  members: Array<{ profile_id: string; email: string; display_name?: string; role?: string }>;
}

export function EditCommonMovementButton({ tx, householdId, onSuccess, members }: EditCommonMovementButtonProps) {
  return (
    <EditMovementForm
      tx={tx}
      movementType="common"
      householdId={householdId}
      onSuccess={onSuccess}
      members={members}
      editAction={editCommonMovement}
    />
  );
}
