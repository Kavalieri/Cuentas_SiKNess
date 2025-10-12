'use client';

import { deleteContributionAdjustment } from '@/app/app/contributions/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AdjustmentItem {
  id: string;
  contribution_id: string;
  amount: number;
  type: 'manual' | 'prepayment';
  reason: string;
  created_at: string;
  profile_email: string;
  year: number;
  month: number;
  movement_id: string | null;
}

export default function AdjustmentsAdminPage() {
  const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadAdjustments();
  }, []);

  const loadAdjustments = async () => {
    try {
      const response = await fetch('/api/admin/adjustments');
      if (response.ok) {
        const data = await response.json();
        setAdjustments(data);
      }
    } catch {
      toast.error('No se pudieron cargar los ajustes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (adjustmentId: string, reason: string) => {
    if (!confirm(`¿Eliminar ajuste "${reason}"?`)) return;

    setDeleting(adjustmentId);
    try {
      const result = await deleteContributionAdjustment(adjustmentId);
      if (result.ok) {
        toast.success(
          'Ajuste eliminado - El ajuste y sus movimientos asociados han sido eliminados',
        );
        await loadAdjustments();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Error al eliminar el ajuste');
    } finally {
      setDeleting(null);
    }
  };

  const filteredAdjustments = adjustments.filter(
    (adj) =>
      adj.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adj.profile_email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Cargando ajustes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">🛠️ Administración de Ajustes</h1>
        <p className="text-muted-foreground">
          Herramienta para anular ajustes existentes y eliminar movimientos asociados
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Ajustes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar por razón o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredAdjustments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                {searchTerm ? 'No se encontraron ajustes' : 'No hay ajustes registrados'}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredAdjustments.map((adjustment) => (
            <Card key={adjustment.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{adjustment.reason}</CardTitle>
                    <CardDescription>
                      {adjustment.profile_email} • {adjustment.year}/
                      {adjustment.month.toString().padStart(2, '0')}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={adjustment.type === 'manual' ? 'default' : 'secondary'}>
                      {adjustment.type === 'manual' ? 'Manual' : 'Pre-pago'}
                    </Badge>
                    <Badge variant={adjustment.amount > 0 ? 'default' : 'destructive'}>
                      {adjustment.amount > 0 ? '+' : ''}
                      {adjustment.amount.toFixed(2)}€
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    <div>ID: {adjustment.id}</div>
                    <div>Creado: {new Date(adjustment.created_at).toLocaleDateString()}</div>
                    {adjustment.movement_id && <div>Movimiento: {adjustment.movement_id}</div>}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(adjustment.id, adjustment.reason)}
                    disabled={deleting === adjustment.id}
                    className="flex items-center gap-2"
                  >
                    {deleting === adjustment.id ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredAdjustments.length > 0 && (
        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Información Importante
            </CardTitle>
          </CardHeader>
          <CardContent className="text-orange-700">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Al eliminar un ajuste, también se eliminan todos los movimientos asociados</li>
              <li>La contribución se recalcula automáticamente tras la eliminación</li>
              <li>Esta acción es irreversible</li>
              <li>Se registra en el journal de auditoría</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
