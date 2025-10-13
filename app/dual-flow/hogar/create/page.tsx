'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CreateHouseholdPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [householdName, setHouseholdName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!householdName.trim()) {
      alert('Por favor, ingresa un nombre para el hogar');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/dual-flow/households', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: householdName.trim(),
        }),
      });

      if (response.ok) {
        const { householdId } = await response.json();
        
        // Redirigir al nuevo hogar
        router.push(`/dual-flow/hogar/switch?id=${householdId}`);
      } else {
        const error = await response.json();
        alert(error.message || 'Error creando el hogar');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creando el hogar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Crear Nuevo Hogar</h1>
        <p className="text-muted-foreground">
          Crea un nuevo hogar para gestionar gastos por separado
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Información del Hogar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="householdName">Nombre del Hogar</Label>
              <Input
                id="householdName"
                placeholder="ej: Mi Casa, Hogar López, etc."
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !householdName.trim()}
                className="flex-1 flex items-center gap-2"
              >
                {isLoading ? (
                  'Creando...'
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Crear Hogar
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="h-20"></div>
    </div>
  );
}