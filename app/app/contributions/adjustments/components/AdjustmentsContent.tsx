'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AdjustmentsHeader } from './AdjustmentsHeader';
import { AdjustmentsList } from './AdjustmentsList';
import { AddAdjustmentDialog } from './AddAdjustmentDialog';
import { TemplateSelector } from './TemplateSelector';
import { QuickAdjustmentForm } from './QuickAdjustmentForm';
import { LoadingState } from '@/components/shared/data-display/LoadingState';
import { getAllHouseholdAdjustments, getMyAdjustments } from '@/app/app/contributions/adjustment-actions';
import type { Database } from '@/types/database';
import type { AdjustmentTemplate } from '@/app/app/contributions/adjustments/template-actions';

type AdjustmentRow = Database['public']['Tables']['contribution_adjustments']['Row'];
type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'icon' | 'type'>;

interface AdjustmentData {
  adjustment: AdjustmentRow;
  member: {
    profile_id: string;
    display_name: string | null;
    email: string;
  };
  contribution: {
    year: number;
    month: number;
  };
  category: Category | null;
}

interface AdjustmentsContentProps {
  currentUserProfileId: string;
  isOwner: boolean;
  categories: Category[];
  currency: string;
}

export function AdjustmentsContent({
  currentUserProfileId,
  isOwner,
  categories,
  currency,
}: AdjustmentsContentProps) {
  const [adjustments, setAdjustments] = useState<AdjustmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AdjustmentTemplate | null>(null);
  const [showQuickForm, setShowQuickForm] = useState(false);

    const loadAdjustments = async () => {
    setLoading(true);
    
    const result = isOwner 
      ? await getAllHouseholdAdjustments()
      : await getMyAdjustments();
    
    if (result.ok && result.data) {
      // Las actions retornan datos con joins anidados
      // Necesitamos transformar a AdjustmentData
      type RawItem = {
        contributions: {
          profile_id: string;
          year: number;
          month: number;
          profiles: {
            display_name: string | null;
            email: string;
          };
        };
        category: Category | null;
        expense_category: Category | null;
        [key: string]: unknown;
      };
      
      const rawData = result.data as unknown as RawItem[];
      const transformed = rawData.map((item) => ({
        adjustment: item as unknown as AdjustmentRow,
        member: {
          profile_id: item.contributions.profile_id,
          display_name: item.contributions.profiles.display_name,
          email: item.contributions.profiles.email,
        },
        contribution: {
          year: item.contributions.year,
          month: item.contributions.month,
        },
        category: item.expense_category || item.category || null,
      }));
      
      setAdjustments(transformed);
    } else if (!result.ok) {
      toast.error(result.message || 'Error al cargar ajustes');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    void loadAdjustments();
  }, [isOwner]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdjustmentAdded = () => {
    loadAdjustments();
    setShowAddDialog(false);
  };

  const handleAdjustmentUpdated = () => {
    loadAdjustments();
  };

  const handleTemplateSelected = (template: AdjustmentTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
    setShowQuickForm(true);
  };

  const handleQuickFormSuccess = () => {
    loadAdjustments();
    setShowQuickForm(false);
    setSelectedTemplate(null);
  };

  if (loading) {
    return <LoadingState message="Cargando ajustes..." />;
  }

  return (
    <div className="space-y-6">
      <AdjustmentsHeader
        isOwner={isOwner}
        onAddClick={() => setShowAddDialog(true)}
        onAddFromTemplateClick={() => setShowTemplateSelector(true)}
        totalCount={adjustments.length}
      />

      {/* Selector de plantillas (cuando se muestra) */}
      {showTemplateSelector && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Selecciona una plantilla:</h3>
            <button
              onClick={() => setShowTemplateSelector(false)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
          <TemplateSelector onSelectTemplate={handleTemplateSelected} />
        </div>
      )}

      <AdjustmentsList
        adjustments={adjustments}
        isOwner={isOwner}
        currentUserProfileId={currentUserProfileId}
        currency={currency}
        onAdjustmentUpdated={handleAdjustmentUpdated}
      />

      <AddAdjustmentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        categories={categories}
        currency={currency}
        onSuccess={handleAdjustmentAdded}
      />

      {selectedTemplate && (
        <QuickAdjustmentForm
          template={selectedTemplate}
          categories={categories.filter((c) => c.type === 'expense')}
          open={showQuickForm}
          onOpenChange={setShowQuickForm}
          onSuccess={handleQuickFormSuccess}
        />
      )}
    </div>
  );
}
