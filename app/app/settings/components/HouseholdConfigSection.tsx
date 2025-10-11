'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';
import { updateHouseholdName } from '@/app/app/household/actions';
import { formatDate } from '@/lib/format';

interface HouseholdConfigSectionProps {
  household: {
    id: string;
    name: string;
    created_at: string;
  };
  isOwner: boolean;
}

export function HouseholdConfigSection({ household, isOwner }: HouseholdConfigSectionProps) {
  const [name, setName] = useState(household.name);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || name === household.name) {
      setIsEditing(false);
      setName(household.name);
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
      toast.success('Nombre actualizado correctamente');
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setName(household.name);
    setIsEditing(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(household.id);
      setIdCopied(true);
      toast.success('ID copiado al portapapeles');
      setTimeout(() => setIdCopied(false), 2000);
    } catch (error) {
      toast.error('Error al copiar ID');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración del Hogar</CardTitle>
        <CardDescription>
          {isOwner
            ? 'Gestiona la información básica de tu hogar'
            : 'Información del hogar (solo lectura)'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nombre del hogar */}
        <div className="space-y-2">
          <Label htmlFor="household-name">Nombre del Hogar</Label>
          {isOwner ? (
            <div className="flex gap-2">
              <Input
                id="household-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing || isLoading}
                placeholder="Nombre del hogar"
              />
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  Editar
                </Button>
              ) : (
                <>
                  <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleCancel}
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
              className="bg-muted"
            />
          )}
        </div>

        {/* ID del hogar (copiable) */}
        <div className="space-y-2">
          <Label>ID del Hogar</Label>
          <div className="flex gap-2">
            <Input
              value={household.id}
              disabled
              className="font-mono text-xs bg-muted"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              title="Copiar ID"
            >
              {idCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Usa este ID para invitar miembros al hogar
          </p>
        </div>

        {/* Fecha de creación */}
        <div className="space-y-1">
          <Label>Fecha de Creación</Label>
          <p className="text-sm text-muted-foreground">
            {formatDate(new Date(household.created_at))}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
