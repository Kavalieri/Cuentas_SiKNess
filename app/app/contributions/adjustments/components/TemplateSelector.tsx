'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { getAdjustmentTemplates } from '@/app/app/contributions/adjustments/template-actions';
import type { AdjustmentTemplate } from '@/app/app/contributions/adjustments/template-actions';

interface TemplateSelectorProps {
  onSelectTemplate: (template: AdjustmentTemplate) => void;
}

export function TemplateSelector({ onSelectTemplate }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<AdjustmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTemplates() {
      setLoading(true);
      setError(null);

      const result = await getAdjustmentTemplates();

      if (result.ok) {
        setTemplates(result.data || []);
      } else {
        setError(result.message);
      }

      setLoading(false);
    }

    loadTemplates();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Cargando plantillas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border border-muted bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No hay plantillas configuradas. Contacta al administrador del hogar.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {templates.map((template) => (
        <Card
          key={template.id}
          className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
          onClick={() => onSelectTemplate(template)}
        >
          <CardContent className="flex flex-col items-center justify-center p-4 text-center">
            {/* Icono */}
            <div className="mb-2 text-4xl">{template.icon || '📋'}</div>

            {/* Nombre */}
            <h3 className="mb-1 text-sm font-medium">{template.name}</h3>

            {/* Último monto usado (hint) */}
            {template.last_used_amount && (
              <p className="text-xs text-muted-foreground">
                Último: {formatCurrency(template.last_used_amount)}
              </p>
            )}

            {/* Categoría por defecto (opcional) */}
            {template.category && (
              <p className="mt-1 text-xs text-muted-foreground">{template.category.name}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
