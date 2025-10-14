'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/format';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  ThumbsUp,
  Wallet,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface WorkflowTransaction {
  id: string;
  concepto: string;
  categoria: string;
  importe: number;
  fecha: string;
  tipo: 'gasto_directo' | 'gasto' | 'ingreso_directo' | 'ingreso';
  estado: 'pending_review' | 'approved' | 'auto_paired' | 'rejected' | 'completed';
  pagadoPor: string;
  requiereAprobacion: boolean;
  pareja?: string;
  tipoFlujo: 'personal_to_common' | 'common_to_personal' | 'common_fund';
}

interface WorkflowManagerProps {
  transactions?: WorkflowTransaction[];
  showActions?: boolean;
}

export function WorkflowManager({ transactions = [], showActions = true }: WorkflowManagerProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);

  // Usar datos reales y aplicar valores por defecto cuando falten campos opcionales
  const workflowTransactions: WorkflowTransaction[] = transactions.map((transaction) => ({
    ...transaction,
    pagadoPor: transaction.pagadoPor ?? 'Usuario',
    requiereAprobacion: transaction.requiereAprobacion ?? false,
    tipoFlujo: transaction.tipoFlujo ?? 'common_fund',
  }));

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pending_review':
        return (
          <Badge variant="destructive" className="text-xs">
            Pendiente Revisión
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="text-xs">
            Aprobado
          </Badge>
        );
      case 'auto_paired':
        return (
          <Badge variant="secondary" className="text-xs">
            Auto-Emparejado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="text-xs">
            Rechazado
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="text-xs">
            Completado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Desconocido
          </Badge>
        );
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'pending_review':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'approved':
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'auto_paired':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'gasto_directo':
        return <Wallet className="h-4 w-4 text-orange-500" />;
      case 'gasto':
        return <DollarSign className="h-4 w-4 text-red-500" />;
      case 'ingreso_directo':
      case 'ingreso':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />;
    }
  };

  const pendingCount = workflowTransactions.filter((t) => t.estado === 'pending_review').length;
  const autopairedCount = workflowTransactions.filter((t) => t.estado === 'auto_paired').length;
  const totalAmount = workflowTransactions.reduce((sum, t) => {
    return sum + (t.tipo.includes('gasto') ? t.importe : -t.importe);
  }, 0);

  const workflowProgress =
    workflowTransactions.length > 0
      ? ((workflowTransactions.length - pendingCount) / workflowTransactions.length) * 100
      : 0;

  return (
    <div className="space-y-4">
      {/* Workflow Status Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Estado del Workflow Transaccional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progreso del flujo</span>
              <span className="text-sm font-medium">{Math.round(workflowProgress)}%</span>
            </div>
            <Progress value={workflowProgress} className="w-full" />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-lg font-bold text-orange-600">{pendingCount}</div>
                <div className="text-xs text-muted-foreground">Pendientes</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-green-600">{autopairedCount}</div>
                <div className="text-xs text-muted-foreground">Auto-Paired</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold">{formatCurrency(Math.abs(totalAmount))}</div>
                <div className="text-xs text-muted-foreground">Total Flujo</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <div className="space-y-3">
        {workflowTransactions.map((transaction) => (
          <Card
            key={transaction.id}
            className={`transition-all duration-200 ${
              selectedTransaction === transaction.id ? 'border-primary shadow-md' : ''
            }`}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    {getTipoIcon(transaction.tipo)}
                    <div className="font-medium">{transaction.concepto}</div>
                    {getEstadoBadge(transaction.estado)}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {transaction.categoria} • {transaction.pagadoPor} • {transaction.fecha}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Flujo:{' '}
                    {transaction.tipoFlujo === 'personal_to_common'
                      ? 'Personal → Común'
                      : transaction.tipoFlujo === 'common_to_personal'
                      ? 'Común → Personal'
                      : 'Fondo Común'}
                    {transaction.pareja && ` • Emparejado con #${transaction.pareja}`}
                  </div>

                  {transaction.requiereAprobacion && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <AlertTriangle className="h-3 w-3" />
                      Requiere aprobación manual
                    </div>
                  )}
                </div>

                <div className="text-right space-y-2">
                  <div
                    className={`font-semibold ${
                      transaction.tipo.includes('gasto') ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {transaction.tipo.includes('gasto') ? '-' : '+'}
                    {formatCurrency(transaction.importe)}
                  </div>

                  <div className="flex items-center gap-2">
                    {getEstadoIcon(transaction.estado)}
                    {showActions && transaction.estado === 'pending_review' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 px-2">
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() =>
                        setSelectedTransaction(
                          selectedTransaction === transaction.id ? null : transaction.id,
                        )
                      }
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedTransaction === transaction.id && (
                <div className="mt-4 pt-4 border-t border-muted space-y-2">
                  <div className="text-sm">
                    <strong>Detalles del Workflow:</strong>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• ID Transacción: {transaction.id}</div>
                    <div>• Tipo de Flujo: {transaction.tipoFlujo}</div>
                    <div>• Requiere Aprobación: {transaction.requiereAprobacion ? 'Sí' : 'No'}</div>
                    {transaction.pareja && <div>• Transacción Pareja: #{transaction.pareja}</div>}
                    <div>• Estado: {transaction.estado}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workflow Actions */}
      {showActions && (
        <Card className="border-dashed border-primary/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <div className="text-sm font-medium">🔄 Acciones de Workflow</div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  Aprobar Todas
                </Button>
                <Button variant="outline" size="sm">
                  Revisar Pendientes
                </Button>
                <Button variant="outline" size="sm">
                  Liquidar Flujo
                </Button>
                <Button variant="outline" size="sm">
                  Generar Reporte
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
