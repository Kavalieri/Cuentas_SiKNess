'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AddCategoryDialog } from '@/app/app/categories/components/AddCategoryDialog';
import { CategoryItem } from '@/app/app/categories/components/CategoryItem';
import { getCategories } from '@/app/app/categories/actions';
import { Loader2 } from 'lucide-react';

interface CategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  householdName: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: string;
}

export function CategoriesDialog({
  open,
  onOpenChange,
  householdId,
  householdName,
}: CategoriesDialogProps) {
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open, householdId]);

  const loadCategories = async () => {
    setIsLoading(true);

    const [expensesResult, incomesResult] = await Promise.all([
      getCategories('expense'),
      getCategories('income'),
    ]);

    if (expensesResult.ok) {
      setExpenseCategories(expensesResult.data as Category[]);
    }

    if (incomesResult.ok) {
      setIncomeCategories(incomesResult.data as Category[]);
    }

    setIsLoading(false);
  };

  const handleCategoryChange = () => {
    // Recargar categorías después de crear/editar/eliminar
    loadCategories();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Categorías del Hogar</DialogTitle>
          <DialogDescription>
            Gestiona las categorías de <strong>{householdName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-end">
            <AddCategoryDialog />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Categorías de Gastos */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Categorías de Gastos</CardTitle>
                    <Badge variant="secondary">{expenseCategories.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {expenseCategories.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No hay categorías de gastos configuradas aún.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {expenseCategories.map((category) => (
                        <CategoryItem key={category.id} category={category} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Categorías de Ingresos */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Categorías de Ingresos</CardTitle>
                    <Badge variant="secondary">{incomeCategories.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {incomeCategories.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No hay categorías de ingresos configuradas aún.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {incomeCategories.map((category) => (
                        <CategoryItem key={category.id} category={category} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            <p className="font-semibold mb-2">💡 Acerca de las categorías:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Las categorías por defecto se crean automáticamente al crear el hogar</li>
              <li>Puedes agregar nuevas categorías personalizadas</li>
              <li>Cada hogar tiene sus propias categorías independientes</li>
              <li>Las categorías se usan para clasificar tus movimientos</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
