'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createHousehold } from '@/app/app/household/actions';

export default function CreateHouseholdPage() {
  const [householdName, setHouseholdName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', householdName);

      const result = await createHousehold(formData);

      if (!result.ok) {
        toast.error(result.message);
      } else {
        toast.success('¡Hogar creado exitosamente!');
        // Recargar para que el dashboard detecte el household
        window.location.href = '/app';
      }
    } catch {
      toast.error('Ocurrió un error. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Crear tu Hogar</h1>
        <p className="text-muted-foreground">
          Primero necesitas crear un hogar para empezar a registrar gastos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo Hogar</CardTitle>
          <CardDescription>
            Dale un nombre a tu hogar. Podrás invitar a otros miembros más adelante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateHousehold} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="household-name">Nombre del Hogar *</Label>
              <Input
                id="household-name"
                placeholder="Ej: Casa SiK"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" disabled={isLoading || !householdName.trim()}>
              {isLoading ? 'Creando...' : 'Crear Hogar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
