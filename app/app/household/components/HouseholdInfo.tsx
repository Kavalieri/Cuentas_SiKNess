'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updateHouseholdName } from '@/app/app/household/actions';
import { formatDate } from '@/lib/format';

type HouseholdInfoProps = {
  household: {
    id: string;
    name: string;
    created_at: string;
  };
  isOwner: boolean;
};

export function HouseholdInfo({ household, isOwner }: HouseholdInfoProps) {
  const [name, setName] = useState(household.name);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || name === household.name) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('household_id', household.id);
    formData.append('name', name);

    const result = await updateHouseholdName(formData);
    setIsLoading(false);

    if (!result.ok) {
      toast.error(result.message);
      setName(household.name);
    } else {
      toast.success('Nombre actualizado');
      setIsEditing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del Hogar</CardTitle>
        <CardDescription>
          {isOwner 
            ? 'Configura el nombre de tu hogar' 
            : 'Detalles de tu hogar'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="household-name">Nombre del Hogar</Label>
          {isOwner ? (
            <div className="flex gap-2">
              <Input
                id="household-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing || isLoading}
              />
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
              ) : (
                <>
                  <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setName(household.name);
                      setIsEditing(false);
                    }}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Input
              id="household-name"
              value={household.name}
              disabled
            />
          )}
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p>ID: <code className="bg-muted px-1 py-0.5 rounded">{household.id}</code></p>
          <p>Creado: {formatDate(new Date(household.created_at))}</p>
        </div>
      </CardContent>
    </Card>
  );
}
