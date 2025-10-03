'use client';

import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export function InviteMemberDialog() {
  const handleClick = () => {
    toast.info('Función de invitación en desarrollo. Por ahora, los usuarios deben unirse desde Settings.');
  };

  return (
    <Button onClick={handleClick} variant="outline">
      <UserPlus className="mr-2 h-4 w-4" />
      Invitar Miembro
    </Button>
  );
}
