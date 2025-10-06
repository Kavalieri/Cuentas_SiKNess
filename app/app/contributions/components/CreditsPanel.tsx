'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { getActiveCredits, getCreditsSummary } from '@/lib/actions/credits';
import type { MemberCredit, CreditsSummary } from '@/lib/actions/credits';
import { AlertCircle, CheckCircle2, Clock, Coins } from 'lucide-react';
import { ManageCreditDialog } from './ManageCreditDialog';

export function CreditsPanel() {
  const [credits, setCredits] = useState<MemberCredit[]>([]);
  const [summary, setSummary] = useState<CreditsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCredit, setSelectedCredit] = useState<MemberCredit | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    async function loadCredits() {
      setIsLoading(true);

      // Cargar créditos activos
      const creditsResult = await getActiveCredits();
      if (creditsResult.ok && creditsResult.data) {
        setCredits(creditsResult.data);
      } else if (!creditsResult.ok) {
        console.error('Error cargando créditos:', creditsResult.message);
      }

      // Cargar resumen
      const summaryResult = await getCreditsSummary();
      if (summaryResult.ok && summaryResult.data) {
        setSummary(summaryResult.data);
      } else if (!summaryResult.ok) {
        console.error('Error cargando resumen:', summaryResult.message);
      }

      setIsLoading(false);
    }

    loadCredits();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Mis Créditos
          </CardTitle>
          <CardDescription>Créditos disponibles por sobrepagas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasActiveCredits = credits.length > 0;
  const totalActive = summary?.active.total_amount || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Mis Créditos
            </CardTitle>
            <CardDescription>Créditos disponibles por sobrepagas</CardDescription>
          </div>
          {hasActiveCredits && (
            <Badge variant="default" className="text-lg px-3 py-1">
              {formatCurrency(totalActive)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen */}
        {summary && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Activos</span>
              </div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatCurrency(summary.active.total_amount)}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                {summary.active.count} {summary.active.count === 1 ? 'crédito' : 'créditos'}
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Aplicados</span>
              </div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(summary.applied.total_amount)}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {summary.applied.count} {summary.applied.count === 1 ? 'aplicado' : 'aplicados'}
              </div>
            </div>
          </div>
        )}

        {/* Créditos activos */}
        {hasActiveCredits ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Créditos disponibles:</h4>
            {credits.map((credit) => (
              <div
                key={credit.id}
                className="p-3 bg-muted rounded-lg flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{formatCurrency(credit.amount)}</div>
                  <div className="text-xs text-muted-foreground">
                    De {new Date(credit.source_year, credit.source_month - 1).toLocaleDateString(
                      'es-ES',
                      { month: 'long', year: 'numeric' }
                    )}
                  </div>
                  {credit.auto_apply && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Auto-aplicar
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedCredit(credit);
                    setDialogOpen(true);
                  }}
                >
                  Gestionar
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tienes créditos activos</p>
            <p className="text-xs mt-1">
              Los créditos se generan cuando pagas más de lo esperado en tus contribuciones
            </p>
          </div>
        )}

        {/* Info adicional */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">💡 ¿Cómo funcionan los créditos?</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Se generan automáticamente cuando pagas más de lo esperado</li>
            <li>Puedes aplicarlos manualmente a contribuciones futuras</li>
            <li>También puedes activar la auto-aplicación automática</li>
            <li>O transferirlos al fondo de ahorros del hogar</li>
          </ul>
        </div>
      </CardContent>

      {/* Dialog de gestión */}
      {selectedCredit && (
        <ManageCreditDialog
          credit={selectedCredit}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </Card>
  );
}
