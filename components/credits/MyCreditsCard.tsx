'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PrivateAmount } from '@/components/shared/PrivateAmount';
import { CreditDecisionDialog } from './CreditDecisionDialog';
import { getMyCredits } from '@/app/credits/actions';
import { isStartOfMonth } from '@/lib/date';
import { CreditCard, Lock, CheckCircle2, AlertCircle, AlertTriangle, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface Credit {
  id: string;
  amount: number;
  currency: string;
  reserved_at: string | null;
  source_month: number;
  source_year: number;
  status: string;
  monthly_decision: string | null;
}

interface MyCreditsCardProps {
  householdId: string;
}

export function MyCreditsCard({ householdId }: MyCreditsCardProps) {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalActive, setTotalActive] = useState(0);
  const [totalReserved, setTotalReserved] = useState(0);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showStartOfMonthAlert, setShowStartOfMonthAlert] = useState(false);

  const fetchCredits = async () => {
    setLoading(true);
    const result = await getMyCredits();
    
    if (result.ok && result.data) {
      const allCredits = [...result.data.active, ...result.data.reserved];
      setCredits(allCredits);
      setTotalActive(result.data.totalActive);
      setTotalReserved(result.data.totalReserved);
      
      // Mostrar alerta si es inicio de mes y hay créditos activos sin decisión
      if (isStartOfMonth() && result.data.active.length > 0) {
        const creditsWithoutDecision = result.data.active.filter(c => !c.monthly_decision);
        setShowStartOfMonthAlert(creditsWithoutDecision.length > 0);
      }
    } else {
      toast.error('Error al cargar créditos');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchCredits();
  }, [householdId]);

  const handleManageCredit = (credit: Credit) => {
    setSelectedCredit(credit);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    fetchCredits(); // Refrescar datos
    setSelectedCredit(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Mis Créditos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded"></div>
            <div className="h-6 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasCredits = credits.length > 0;
  const activeCredits = credits.filter(c => !c.reserved_at);
  const reservedCredits = credits.filter(c => c.reserved_at);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Mis Créditos
          </CardTitle>
          <CardDescription>
            Dinero adicional que has aportado de más
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alerta inicio de mes */}
          {showStartOfMonthAlert && (
            <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <strong>Inicio de mes:</strong> Tienes créditos sin decisión. 
                Gestiónalos ahora para aplicarlos a este mes o mantenerlos activos.
              </AlertDescription>
            </Alert>
          )}

          {!hasCredits ? (
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tienes créditos acumulados</p>
              <p className="text-xs mt-1">Los créditos se generan cuando pagas más de tu contribución esperada</p>
            </div>
          ) : (
            <>
              {/* Resumen rápido */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-800 dark:text-blue-200">Activos</span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    <PrivateAmount amount={totalActive} />
                  </div>
                  <p className="text-xs text-blue-600/70 mt-1">Pueden gastarse</p>
                </div>

                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="h-4 w-4 text-orange-600" />
                    <span className="text-xs font-medium text-orange-800 dark:text-orange-200">Reservados</span>
                  </div>
                  <div className="text-lg font-bold text-orange-600">
                    <PrivateAmount amount={totalReserved} />
                  </div>
                  <p className="text-xs text-orange-600/70 mt-1">Para próximo mes</p>
                </div>
              </div>

              {/* Lista de créditos activos */}
              {activeCredits.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Créditos Activos:</h4>
                  {activeCredits.map((credit) => (
                    <div key={credit.id} className="flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-blue-600 border-blue-300">
                          {credit.source_month}/{credit.source_year}
                        </Badge>
                        <span className="font-semibold text-blue-600">
                          <PrivateAmount amount={credit.amount} currency={credit.currency} />
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleManageCredit(credit)}
                        className="h-7 px-2"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Lista de créditos reservados */}
              {reservedCredits.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Créditos Reservados:</h4>
                  {reservedCredits.map((credit) => (
                    <div key={credit.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-orange-600" />
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          {credit.source_month}/{credit.source_year}
                        </Badge>
                        <span className="font-semibold text-orange-600">
                          <PrivateAmount amount={credit.amount} currency={credit.currency} />
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleManageCredit(credit)}
                        className="h-7 px-2"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de decisión de crédito */}
      {selectedCredit && (
        <CreditDecisionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          credit={selectedCredit}
          onSuccess={handleDialogSuccess}
        />
      )}
    </>
  );
}
