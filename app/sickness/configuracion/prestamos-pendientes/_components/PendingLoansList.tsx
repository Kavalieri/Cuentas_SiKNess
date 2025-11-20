'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { approveLoanRequest, rejectLoanRequest } from '@/lib/loans/actions';
import { Calendar, CheckCircle2, Clock, FileText, User, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface PendingLoan {
  id: string;
  profile_id: string;
  display_name: string;
  amount: number;
  description: string | null;
  requested_at: string;
}

interface PendingLoansListProps {
  requests: PendingLoan[];
}

export function PendingLoansList({ requests }: PendingLoansListProps) {
  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <PendingLoanCard key={request.id} request={request} />
      ))}
    </div>
  );
}

function PendingLoanCard({ request }: { request: PendingLoan }) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const result = await approveLoanRequest(request.id);
      if (result.ok) {
        alert(
          `✅ Préstamo aprobado: Se ha aprobado el préstamo de €${request.amount.toFixed(2)} para ${
            request.display_name
          }`,
        );
        router.refresh();
      } else {
        alert(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      alert('❌ Error: Ocurrió un error al aprobar el préstamo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('❌ Motivo requerido: Debes indicar el motivo del rechazo');
      return;
    }

    setIsLoading(true);
    try {
      const result = await rejectLoanRequest(request.id, rejectionReason);
      if (result.ok) {
        alert(`Préstamo rechazado: Se ha rechazado la solicitud de ${request.display_name}`);
        router.refresh();
      } else {
        alert(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      alert('❌ Error: Ocurrió un error al rechazar el préstamo');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="h-5 w-5" />
              {request.display_name}
            </CardTitle>
            <CardDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(request.requested_at)}
              </span>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pendiente
              </Badge>
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">€{request.amount.toFixed(2)}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {request.description && (
          <div className="flex items-start gap-2 pb-4 border-b">
            <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Descripción</Label>
              <p className="text-sm mt-1">{request.description}</p>
            </div>
          </div>
        )}

        {!isRejecting ? (
          <div className="flex gap-2">
            <Button onClick={handleApprove} disabled={isLoading} className="flex-1" size="lg">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Aprobar Préstamo
            </Button>
            <Button
              onClick={() => setIsRejecting(true)}
              disabled={isLoading}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rechazar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`rejection-reason-${request.id}`}>Motivo del rechazo</Label>
              <Textarea
                id={`rejection-reason-${request.id}`}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explica por qué rechazas esta solicitud..."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleReject}
                disabled={isLoading || !rejectionReason.trim()}
                variant="destructive"
                className="flex-1"
              >
                Confirmar Rechazo
              </Button>
              <Button
                onClick={() => {
                  setIsRejecting(false);
                  setRejectionReason('');
                }}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
