'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrivacy } from './PrivacyProvider';

export function PrivacyToggle() {
  const { hideAmounts, toggleHideAmounts } = usePrivacy();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleHideAmounts}
      title={hideAmounts ? 'Mostrar cantidades' : 'Ocultar cantidades'}
      aria-label={hideAmounts ? 'Mostrar cantidades' : 'Ocultar cantidades'}
    >
      {hideAmounts ? (
        <EyeOff className="h-5 w-5" />
      ) : (
        <Eye className="h-5 w-5" />
      )}
    </Button>
  );
}
