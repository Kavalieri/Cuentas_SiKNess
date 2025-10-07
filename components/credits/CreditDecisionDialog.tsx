'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PrivateAmount } from '@/components/shared/PrivateAmount';
import { decideCreditAction } from '@/app/credits/actions';
import { toast } from 'sonner';
import { Info } from 'lucide-react';

interface Credit {
  id: string;
  amount: number;
  currency: string;
  source_month: number;
  source_year: number;
  status: string;
}

interface CreditDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credit: Credit;
  onSuccess: () => void;
}

export function CreditDecisionDialog({
  open,
  onOpenChange,
  credit,
  onSuccess
}: CreditDecisionDialogProps) {
  const [decision, setDecision] = useState<'apply_to_month' | 'keep_active' | 'transfer_to_savings'>('keep_active');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    
    const result = await decideCreditAction(credit.id, decision);
    
    setIsProcessing(false);
    
    if (result.ok) {
      toast.success('Decisión guardada exitosamente');
      onOpenChange(false);
      onSuccess();
    } else {
      toast.error(result.message || 'Error al guardar decisión');
    }
  };

  const originDate = new Date(credit.source_year, credit.source_month - 1);
  const originLabel = originDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💳 Gestionar Crédito
          </DialogTitle>
          <DialogDescription>
            Decide qué hacer con tu crédito del mes de {originLabel}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Credit Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Tu crédito:</strong>{' '}
              <PrivateAmount amount={credit.amount} currency={credit.currency} className="text-lg font-bold" />
              <br />
              <span className="text-sm text-muted-foreground">
                Origen: {originLabel}
              </span>
            </AlertDescription>
          </Alert>
          
          {/* Decision Options */}
          <RadioGroup value={decision} onValueChange={(value) => setDecision(value as typeof decision)}>
            {/* Option 1: Apply to next month */}
            <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
              <RadioGroupItem value="apply_to_month" id="apply" className="mt-1" />
              <Label htmlFor="apply" className="cursor-pointer flex-1">
                <div className="space-y-2">
                  <p className="font-bold text-blue-600 text-base">🔵 Aplicar al Mes Siguiente</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Tu contribución del próximo mes se reducirá en <PrivateAmount amount={credit.amount} currency={credit.currency} /></li>
                    <li>✓ Si te piden 500€ y tienes 50€ de crédito, solo pagarás 450€</li>
                    <li>✓ El crédito se marcará como &quot;reservado&quot; y desaparecerá del balance disponible</li>
                    <li>⚠️ Se aplicará automáticamente al inicio del próximo mes</li>
                  </ul>
                </div>
              </Label>
            </div>
            
            {/* Option 2: Keep active */}
            <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
              <RadioGroupItem value="keep_active" id="keep" className="mt-1" />
              <Label htmlFor="keep" className="cursor-pointer flex-1">
                <div className="space-y-2">
                  <p className="font-bold text-green-600 text-base">🟢 Mantener Activo</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ El crédito sigue disponible en el balance principal</li>
                    <li>✓ Puede usarse para gastos comunes del hogar</li>
                    <li>✓ Seguirá disponible para decisión en futuros meses</li>
                    <li>✓ Mantienes flexibilidad (puedes decidir después)</li>
                  </ul>
                </div>
              </Label>
            </div>
            
            {/* Option 3: Transfer to savings */}
            <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
              <RadioGroupItem value="transfer_to_savings" id="transfer" className="mt-1" />
              <Label htmlFor="transfer" className="cursor-pointer flex-1">
                <div className="space-y-2">
                  <p className="font-bold text-orange-600 text-base">🟡 Transferir a Ahorro</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Se mueve del balance principal al fondo de ahorro</li>
                    <li>✓ Ya NO puede gastarse en expenses (bloqueado en ahorro)</li>
                    <li>✓ Suma al balance de ahorro para metas específicas</li>
                    <li>⚠️ Permanece en ahorro hasta que se retire para gastos comunes</li>
                  </ul>
                </div>
              </Label>
            </div>
          </RadioGroup>
          
          {/* Explanation based on selected option */}
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-sm">
              {decision === 'apply_to_month' && (
                <span>
                  <strong>Efecto inmediato:</strong> El crédito se marcará como &quot;reservado&quot; y se retirará del balance disponible. 
                  Al inicio del próximo mes, se aplicará automáticamente para reducir tu contribución esperada.
                </span>
              )}
              {decision === 'keep_active' && (
                <span>
                  <strong>Efecto inmediato:</strong> El crédito permanece activo en el balance principal. 
                  Puede gastarse en expenses comunes o decidir qué hacer con él en el futuro.
                </span>
              )}
              {decision === 'transfer_to_savings' && (
                <span>
                  <strong>Efecto inmediato:</strong> El crédito se transferirá al fondo de ahorro del hogar. 
                  Ya no estará disponible para gastos directos, pero sumará al balance de ahorro común.
                </span>
              )}
            </AlertDescription>
          </Alert>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isProcessing}
              className="min-w-[120px]"
            >
              {isProcessing ? 'Procesando...' : 'Confirmar Decisión'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
