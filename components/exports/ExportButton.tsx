/**
 * EXPORT BUTTON - Botón para abrir dialog de exportación
 * 
 * Se coloca en el Dashboard junto al MonthSelector
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ExportDialog } from './ExportDialog';

interface ExportButtonProps {
  defaultYear: number;
  defaultMonth: number;
}

export function ExportButton({ defaultYear, defaultMonth }: ExportButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setDialogOpen(true)}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Exportar</span>
      </Button>
      
      <ExportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultYear={defaultYear}
        defaultMonth={defaultMonth}
      />
    </>
  );
}
