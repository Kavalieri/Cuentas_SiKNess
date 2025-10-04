'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { selectiveWipeSystem } from '@/app/app/admin/actions';
import { WipeOptionsSelector, type WipeOptions } from '@/components/shared/WipeOptionsSelector';

export default function RestoreToStockPage() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<WipeOptions>({
    transactions: true,
    contributions: true,
    adjustments: true,
    categories: true,
    memberIncomes: true,
    householdSettings: true,
    households: false, // Por SEGURIDAD: NO elimina hogares por defecto
  });

  const handleRestore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (confirmation !== 'ELIMINAR TODO') {
      toast.error('Debes escribir exactamente "ELIMINAR TODO" para confirmar');
      return;
    }

    const hasSelection = Object.values(options).some(v => v === true);
    if (!hasSelection) {
      toast.error('Debes seleccionar al menos un elemento para eliminar');
      return;
    }

    setIsLoading(true);
    
    const formData = new FormData();
    formData.append('confirmation', confirmation);
    Object.entries(options).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    
    const result = await selectiveWipeSystem(formData);
    
    if (!result.ok) {
      toast.error(result.message);
      setIsLoading(false);
    } else {
      toast.success('Wipe selectivo completado correctamente', {
        description: options.households 
          ? 'Los hogares fueron eliminados. Los usuarios deberán crear nuevos hogares.' 
          : 'Los hogares se mantuvieron intactos. Los datos fueron limpiados selectivamente.',
      });
      router.push('/app/admin');
      router.refresh();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <RefreshCcw className="h-8 w-8 text-destructive" />
        <div>
          <h1 className="text-3xl font-bold">Restaurar Sistema (Wipe Selectivo Global)</h1>
          <p className="text-muted-foreground">
            Elige qué elementos del sistema deseas eliminar
          </p>
        </div>
      </div>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            🚨 ADVERTENCIA: ESTA ACCIÓN ES IRREVERSIBLE
          </CardTitle>
          <CardDescription>
            Esta operación está diseñada para <strong>desarrollo y testing</strong>.
            Eliminará los elementos seleccionados de <strong>TODO el sistema</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <WipeOptionsSelector
            options={options}
            onChange={setOptions}
            showHouseholdsOption={true}
            disabled={isLoading}
          />

          <form onSubmit={handleRestore} className="space-y-4 pt-6 border-t">
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-500 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
                💡 Recomendaciones
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                <li>Si NO eliminas hogares, se limpiarán solo los datos de todos los hogares</li>
                <li>Si SÍ eliminas hogares, forzarás re-onboarding completo (los usuarios crean nuevos hogares)</li>
                <li>Después del wipe, ejecuta <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">db/seed.sql</code> si necesitas datos de prueba</li>
              </ul>
            </div>

            <div>
              <Label htmlFor="confirmation">
                Para confirmar, escribe <strong className="text-destructive">ELIMINAR TODO</strong>
              </Label>
              <Input
                id="confirmation"
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="ELIMINAR TODO"
                className="mt-2"
                disabled={isLoading}
              />
            </div>

            <Button 
              type="submit" 
              variant="destructive" 
              className="w-full"
              disabled={isLoading || confirmation !== 'ELIMINAR TODO'}
            >
              {isLoading ? 'Ejecutando Wipe...' : '🔄 Confirmar Wipe Selectivo'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          💡 Casos de uso: Limpiar datos de testing antes del primer deploy en producción, 
          resetear datos manteniendo la estructura de hogares.
        </CardFooter>
      </Card>

      <Button 
        variant="outline" 
        onClick={() => router.back()}
        disabled={isLoading}
      >
        ← Cancelar y Volver
      </Button>
    </div>
  );
}
