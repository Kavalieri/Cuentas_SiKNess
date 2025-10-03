'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MonthSelector } from '@/components/shared/MonthSelector';
import { formatCurrency } from '@/lib/format';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { Database } from '@/types/database';

type Contribution = Database['public']['Tables']['contributions']['Row'];

interface HistoryTabProps {
  householdId: string;
}

export function HistoryTab({ householdId }: HistoryTabProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch contribuciones del mes seleccionado
  useEffect(() => {
    const fetchContributions = async () => {
      setIsLoading(true);
      const supabase = supabaseBrowser();

      const { data } = await supabase
        .from('contributions')
        .select(`
          *,
          household_members!inner(user_id)
        `)
        .eq('household_id', householdId)
        .eq('year', selectedMonth.getFullYear())
        .eq('month', selectedMonth.getMonth() + 1)
        .order('created_at', { ascending: false });

      // Enriquecer con emails de usuarios
      if (data) {
        const enrichedData = await Promise.all(
          data.map(async (contribution) => {
            const { data: userData } = await supabase.auth.admin.getUserById(contribution.user_id);
            return {
              ...contribution,
              userEmail: userData?.user?.email || 'Sin email',
            };
          })
        );
        setContributions(enrichedData as Contribution[]);
      }

      setIsLoading(false);
    };

    fetchContributions();
  }, [selectedMonth, householdId]);

  const totalExpected = contributions.reduce((sum, c) => sum + c.expected_amount, 0);
  const totalPaid = contributions.reduce((sum, c) => sum + c.paid_amount, 0);

  const statusConfig = {
    pending: { label: 'Pendiente', variant: 'destructive' as const },
    partial: { label: 'Parcial', variant: 'default' as const },
    paid: { label: 'Pagado', variant: 'default' as const },
    overpaid: { label: 'Excedido', variant: 'secondary' as const },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>📅 Historial de Contribuciones</CardTitle>
            <CardDescription>
              Consulta las contribuciones de meses anteriores
            </CardDescription>
          </div>
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Cargando...</p>
        ) : contributions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No hay contribuciones registradas para este mes
          </p>
        ) : (
          <div className="space-y-6">
            {/* Resumen del mes */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Esperado</p>
                <p className="text-2xl font-bold">{formatCurrency(totalExpected)}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Pagado</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
            </div>

            {/* Lista de contribuciones */}
            <div className="space-y-3">
              <h3 className="font-semibold">Contribuciones por Miembro</h3>
              {contributions.map((contribution) => {
                const status = contribution.status as 'pending' | 'partial' | 'paid' | 'overpaid';
                const pending = contribution.expected_amount - contribution.paid_amount;

                return (
                  <div key={contribution.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {(contribution as Contribution & { userEmail?: string }).userEmail}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Esperado: {formatCurrency(contribution.expected_amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={statusConfig[status].variant}>
                        {statusConfig[status].label}
                      </Badge>
                      <p className="text-sm mt-1">
                        Pagado: <span className="font-medium">{formatCurrency(contribution.paid_amount)}</span>
                      </p>
                      {pending > 0 && (
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          Pendiente: {formatCurrency(pending)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
