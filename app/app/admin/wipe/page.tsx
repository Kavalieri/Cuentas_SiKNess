'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Home } from 'lucide-react';
import { toast } from 'sonner';
import { selectiveWipeHousehold } from '@/app/app/admin/actions';
import { WipeOptionsSelector, type WipeOptions } from '@/components/shared/WipeOptionsSelector';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

interface Household {
  id: string;
  name: string;
  created_at: string | null;
}

export default function WipeHouseholdPage() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<string>('');
  const [options, setOptions] = useState<WipeOptions>({
    transactions: true,
    contributions: true,
    adjustments: true,
    categories: true,
    memberIncomes: true,
    householdSettings: true,
    households: false, // NO elimina el hogar por defecto
  });

  useEffect(() => {
    async function loadHouseholds() {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from('households')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading households:', error);
        toast.error('Error al cargar hogares');
        return;
      }

      setHouseholds(data || []);
    }

    loadHouseholds();
  }, []);

  const handleWipe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedHousehold) {
      toast.error('Debes seleccionar un hogar');
      return;
    }

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
    formData.append('householdId', selectedHousehold);
    Object.entries(options).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    
    const result = await selectiveWipeHousehold(formData);
    
    if (!result.ok) {
      toast.error(result.message);
      setIsLoading(false);
    } else {
      toast.success('Wipe del hogar completado correctamente', {
        description: options.households 
          ? 'El hogar fue eliminado completamente.' 
          : 'Los datos del hogar fueron limpiados. El hogar se mantiene intacto.',
      });
      setConfirmation('');
      setSelectedHousehold('');
      router.refresh();
    }
  };

  const selectedHouseholdData = households.find(h => h.id === selectedHousehold);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Home className="h-8 w-8 text-destructive" />
        <div>
          <h1 className="text-3xl font-bold">Limpiar Datos de un Hogar</h1>
          <p className="text-muted-foreground">
            Selecciona un hogar y elige qué elementos deseas eliminar
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
            Esta operación eliminará los elementos seleccionados del hogar elegido.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selector de hogar */}
          <div className="space-y-2">
            <Label htmlFor="household">Selecciona el hogar a limpiar</Label>
            <Select value={selectedHousehold} onValueChange={setSelectedHousehold} disabled={isLoading}>
              <SelectTrigger id="household">
                <SelectValue placeholder="Elige un hogar..." />
              </SelectTrigger>
              <SelectContent>
                {households.map((household) => (
                  <SelectItem key={household.id} value={household.id}>
                    {household.name} {household.created_at && `(creado ${new Date(household.created_at).toLocaleDateString()})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedHouseholdData && (
              <p className="text-sm text-muted-foreground">
                Hogar seleccionado: <strong>{selectedHouseholdData.name}</strong>
              </p>
            )}
          </div>

          <WipeOptionsSelector
            options={options}
            onChange={setOptions}
            showHouseholdsOption={true}
            disabled={isLoading || !selectedHousehold}
          />

          <form onSubmit={handleWipe} className="space-y-4 pt-6 border-t">
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-500 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
                💡 Recomendaciones
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                <li>Si NO eliminas el hogar, se limpiarán solo los datos seleccionados</li>
                <li>Si SÍ eliminas el hogar, se eliminará completamente (incluye miembros)</li>
                <li>Las categorías se recrearán automáticamente si se eliminan</li>
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
                disabled={isLoading || !selectedHousehold}
              />
            </div>

            <Button 
              type="submit" 
              variant="destructive" 
              className="w-full"
              disabled={isLoading || confirmation !== 'ELIMINAR TODO' || !selectedHousehold}
            >
              {isLoading ? 'Ejecutando Wipe...' : '🗑️ Confirmar Wipe del Hogar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          💡 Casos de uso: Limpiar datos de prueba de un hogar específico, 
          resetear un hogar manteniendo su estructura.
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
