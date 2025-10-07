'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PrivateAmount } from '@/components/shared/PrivateAmount';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { CreditCard, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Credit {
  id: string;
  amount: number;
  reserved_at: string | null;
  created_at: string;
  source_month: number;
  source_year: number;
  status: string;
}

interface MyCreditsCardProps {
  householdId: string;
  onManageCredit?: () => void;
}

export function MyCreditsCard({ householdId, onManageCredit }: MyCreditsCardProps) {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalActive, setTotalActive] = useState(0);
  const [totalReserved, setTotalReserved] = useState(0);

  useEffect(() => {
    async function fetchCredits() {
      setLoading(true);
      const supabase = supabaseBrowser();
      
      // 1. Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 2. Obtener profile_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      // 3. Obtener créditos propios
      const { data: myCredits, error } = await supabase
        .from('member_credits')
        .select('*')
        .eq('household_id', householdId)
        .eq('profile_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Error al cargar créditos');
        setLoading(false);
        return;
      }

      setCredits(myCredits || []);

      // Calcular totales
      const active = (myCredits || []).filter(c => !c.reserved_at).reduce((sum, c) => sum + Number(c.amount), 0);
      const reserved = (myCredits || []).filter(c => c.reserved_at).reduce((sum, c) => sum + Number(c.amount), 0);
      
      setTotalActive(active);
      setTotalReserved(reserved);
      setLoading(false);
    }

    fetchCredits();
  }, [householdId]);

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
                  <div key={credit.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                        {credit.source_month}/{credit.source_year}
                      </Badge>
                    </div>
                    <span className="font-semibold text-blue-600">
                      <PrivateAmount amount={credit.amount} />
                    </span>
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
                    </div>
                    <span className="font-semibold text-orange-600">
                      <PrivateAmount amount={credit.amount} />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Botón para gestionar (FASE 2) */}
            {onManageCredit && (
              <Button 
                onClick={onManageCredit}
                variant="outline"
                className="w-full"
                disabled
              >
                Gestionar Créditos
                <span className="text-xs text-muted-foreground ml-2">(Próximamente)</span>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
