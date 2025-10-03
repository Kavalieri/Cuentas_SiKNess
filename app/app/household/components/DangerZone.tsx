'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { wipeHouseholdData } from '@/app/app/admin/actions';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export function DangerZone() {
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleWipe = async () => {
    if (confirmation !== 'ELIMINAR TODO') {
      toast.error('Debes escribir "ELIMINAR TODO" para confirmar');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('confirmation', confirmation);

    const result = await wipeHouseholdData(formData);

    setIsLoading(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Datos eliminados correctamente');
    setConfirmation('');
    
    // Recargar la página para reflejar los cambios
    window.location.reload();
  };

  const isConfirmed = confirmation === 'ELIMINAR TODO';

  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <CardTitle className="text-destructive">⚠️ Zona Peligrosa</CardTitle>
        </div>
        <CardDescription>
          Operaciones irreversibles que afectan a los datos de tu hogar.
          <br />
          <strong className="text-destructive">Usar con extrema precaución.</strong>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Lista de lo que se eliminará */}
        <div>
          <h3 className="font-semibold mb-3">Al limpiar datos se eliminarán:</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-destructive">✓</span>
              <span>Todos los movimientos (gastos e ingresos)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-destructive">✓</span>
              <span>Todas las categorías personalizadas</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-destructive">✓</span>
              <span>Todas las contribuciones y su historial</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-destructive">✓</span>
              <span>Todos los ajustes manuales</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-destructive">✓</span>
              <span>Configuración de ingresos de miembros</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-destructive">✓</span>
              <span>Configuración de meta mensual</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Se mantendrán:</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Los miembros del hogar</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Las categorías por defecto (se recrean automáticamente)</span>
            </li>
          </ul>
        </div>

        {/* Confirmación */}
        <div className="space-y-2 pt-4 border-t">
          <Label htmlFor="confirmation" className="text-base">
            Para confirmar, escribe <code className="bg-muted px-2 py-1 rounded">ELIMINAR TODO</code>
          </Label>
          <Input
            id="confirmation"
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="ELIMINAR TODO"
            className="font-mono"
            disabled={isLoading}
          />
        </div>

        <Button 
          variant="destructive" 
          onClick={handleWipe} 
          disabled={!isConfirmed || isLoading}
          className="w-full"
        >
          {isLoading ? 'Eliminando...' : '🗑️ Limpiar Datos del Hogar'}
        </Button>

        {/* Advertencia adicional */}
        <div className="mt-4 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          <p className="font-semibold mb-2">💡 Casos de uso:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Limpiar datos de testing antes de empezar a usar la app en producción</li>
            <li>Resetear el hogar para empezar un nuevo año fiscal</li>
            <li>Eliminar datos de prueba durante el desarrollo</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
