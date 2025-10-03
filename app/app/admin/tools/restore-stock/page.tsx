'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Shield, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { restoreToStock } from '@/app/app/admin/actions';

export default function RestoreToStockPage() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRestore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (confirmation !== 'ELIMINAR TODO') {
      toast.error('Debes escribir exactamente "ELIMINAR TODO" para confirmar');
      return;
    }

    setIsLoading(true);
    
    const formData = new FormData();
    formData.append('confirmation', confirmation);
    
    const result = await restoreToStock(formData);
    
    if (!result.ok) {
      toast.error(result.message);
      setIsLoading(false);
    } else {
      toast.success('Sistema restaurado a stock correctamente', {
        description: 'Se ha limpiado todo el sistema. Ejecuta seed.sql manualmente si necesitas datos de prueba.',
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
          <h1 className="text-3xl font-bold">Restaurar Sistema a Stock</h1>
          <p className="text-muted-foreground">
            Limpia completamente el sistema y fuerza re-onboarding
          </p>
        </div>
      </div>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            🚨 ADVERTENCIA CRÍTICA: ESTA ACCIÓN ES IRREVERSIBLE
          </CardTitle>
          <CardDescription>
            Esta operación está diseñada para <strong>desarrollo y testing</strong>.
            Eliminará TODO el contenido del sistema y forzará a todos los usuarios a volver a crear hogares.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Se eliminarán permanentemente:
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>✅ <strong>Todos los hogares</strong></li>
              <li>✅ <strong>Todos los movimientos</strong> (gastos e ingresos)</li>
              <li>✅ <strong>Todas las categorías</strong></li>
              <li>✅ <strong>Todas las contribuciones</strong> y ajustes</li>
              <li>✅ <strong>Todos los settings</strong> de hogares</li>
              <li>✅ <strong>Todas las membresías</strong></li>
              <li>✅ <strong>Todos los ingresos</strong> de miembros</li>
            </ul>
          </div>

          <Card className="border-green-500 bg-green-50 dark:bg-green-950">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                Datos Protegidos (NO se eliminarán)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-green-800 dark:text-green-200">
                <li><strong>auth.users</strong> - Cuentas de usuario (Supabase Auth)</li>
                <li><strong>system_admins</strong> - Administradores permanentes del sistema</li>
              </ul>
              <p className="mt-3 text-xs text-green-700 dark:text-green-300">
                ⚡ Los usuarios existentes podrán volver a hacer login y crear nuevos hogares desde cero.
              </p>
            </CardContent>
          </Card>

          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-500 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
              📝 Paso Post-Restore (Manual)
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Después del restore, necesitarás ejecutar <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">db/seed.sql</code> manualmente 
              en Supabase SQL Editor si quieres restaurar las categorías por defecto.
            </p>
          </div>

          <form onSubmit={handleRestore} className="space-y-4 mt-6">
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
              {isLoading ? 'Restaurando...' : '🔄 Confirmar Restore to Stock'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          💡 Casos de uso: Limpiar datos de testing antes del primer deploy en producción, 
          resetear completamente el entorno de desarrollo.
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
