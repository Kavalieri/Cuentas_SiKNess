'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Skull } from 'lucide-react';
import { toast } from 'sonner';
import { selectiveWipeHousehold } from '@/app/app/admin/actions';
import { WipeOptionsSelector, type WipeOptions } from '@/components/shared/WipeOptionsSelector';

interface DangerousPageProps {
  householdId: string;
  householdName: string;
}

export default function DangerousPage({ householdId, householdName }: DangerousPageProps) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<WipeOptions>({
    transactions: true,
    contributions: true,
    adjustments: true,
    categories: false, // No elimina categorías por defecto (mantiene personalización)
    memberIncomes: true,
    householdSettings: true,
    households: false, // NO elimina el hogar por defecto
  });

  const handleWipe = async (e: React.FormEvent<HTMLFormElement>) => {
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
    formData.append('householdId', householdId);
    Object.entries(options).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    
    const result = await selectiveWipeHousehold(formData);
    
    if (!result.ok) {
      toast.error(result.message);
      setIsLoading(false);
    } else {
      if (options.households) {
        // Si eliminó el hogar, redirigir a crear nuevo hogar
        toast.success('Hogar eliminado completamente', {
          description: 'Serás redirigido para crear un nuevo hogar.',
        });
        router.push('/app/household/create');
      } else {
        toast.success('Datos del hogar limpiados correctamente', {
          description: 'El hogar se mantiene intacto con los miembros actuales.',
        });
        setConfirmation('');
        router.refresh();
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Skull className="h-8 w-8 text-destructive" />
        <div>
          <h1 className="text-3xl font-bold text-destructive">⚠️ Zona Peligrosa</h1>
          <p className="text-muted-foreground">
            Limpia los datos de tu hogar o elimínalo completamente
          </p>
        </div>
      </div>

      <Card className="border-destructive bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            🚨 ADVERTENCIA: ESTA ACCIÓN ES IRREVERSIBLE
          </CardTitle>
          <CardDescription>
            Estás a punto de modificar o eliminar datos del hogar <strong>&quot;{householdName}&quot;</strong>.
            Esta acción NO SE PUEDE DESHACER.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <WipeOptionsSelector
            options={options}
            onChange={setOptions}
            showHouseholdsOption={true}
            disabled={isLoading}
          />

          <form onSubmit={handleWipe} className="space-y-4 pt-6 border-t border-destructive/50">
            <div className="bg-red-50 dark:bg-red-950 border-2 border-red-500 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-red-800 dark:text-red-200 flex items-center gap-2">
                <Skull className="h-4 w-4" />
                ⚠️ IMPORTANTE: Lee esto antes de continuar
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
                <li>Si NO eliminas el hogar, se limpiarán solo los datos seleccionados</li>
                <li>Si SÍ eliminas el hogar, perderás TODA la información incluyendo miembros</li>
                <li>Si eliminas el hogar siendo el único owner, deberás crear uno nuevo</li>
                <li>Las categorías se recrearán por defecto si las eliminas</li>
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
                className="mt-2 border-destructive focus:ring-destructive"
                disabled={isLoading}
              />
            </div>

            <Button 
              type="submit" 
              variant="destructive" 
              className="w-full"
              disabled={isLoading || confirmation !== 'ELIMINAR TODO'}
            >
              {isLoading ? 'Ejecutando Wipe...' : options.households ? '☠️ ELIMINAR HOGAR COMPLETAMENTE' : '🗑️ Limpiar Datos Seleccionados'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground border-t border-destructive/30">
          💡 Casos de uso: Resetear el hogar al inicio de un nuevo periodo (año fiscal), 
          limpiar datos de prueba antes de uso real, eliminar el hogar si ya no es necesario.
        </CardFooter>
      </Card>

      <Button 
        variant="outline" 
        onClick={() => router.push('/app/household')}
        disabled={isLoading}
      >
        ← Cancelar y Volver
      </Button>
    </div>
  );
}
