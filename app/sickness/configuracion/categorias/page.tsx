'use client';

import { useEffect, useState, useTransition } from 'react';
import { useSiKness } from '@/contexts/SiKnessContext';
import {
  getHouseholdCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from './actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

// Iconos disponibles para categorías
const AVAILABLE_ICONS = {
  expense: [
    '🏠',
    '🛒',
    '🚗',
    '🍽️',
    '🎭',
    '🏥',
    '📚',
    '🪑',
    '👕',
    '🐶',
    '🎁',
    '📱',
    '⚽',
    '💄',
    '➕',
    '📡',
    '💡',
    '💧',
    '🔥',
    '📞',
    '🏢',
    '🛡️',
    '📋',
    '🧹',
    '🔧',
  ],
  income: ['💰', '💼', '📈', '🏷️', '↩️', '🏦', '🎉', '➕'],
};

type CategoryFormData = {
  id?: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
};

export default function CategoriasPage() {
  const { householdId, isOwner } = useSiKness();

  // Estados
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Formulario
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    icon: '🏠',
    type: 'expense',
  });

  // Categoría a eliminar
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Cargar categorías
  useEffect(() => {
    if (!householdId) return;

    const loadCategories = async () => {
      setLoading(true);
      const result = await getHouseholdCategories(householdId);

      if (result.ok && result.data) {
        setCategories(result.data);
      } else {
        const errorMessage = !result.ok ? result.message : 'Error al cargar las categorías';
        toast.error(errorMessage);
      }
      setLoading(false);
    };

    loadCategories();
  }, [householdId]);

  // Handlers
  const handleCreateCategory = () => {
    setFormData({ name: '', icon: '🏠', type: 'expense' });
    setCreateDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setFormData({
      id: category.id,
      name: category.name,
      icon: category.icon,
      type: category.type,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId) return;

    startTransition(async () => {
      const formDataObj = new FormData();
      formDataObj.append('householdId', householdId);
      formDataObj.append('name', formData.name);
      formDataObj.append('icon', formData.icon);
      formDataObj.append('type', formData.type);

      const result = await createCategory(formDataObj);

      if (result.ok) {
        toast.success(`Se ha creado la categoría "${formData.name}"`);
        setCreateDialogOpen(false);
        // Recargar categorías
        const refreshResult = await getHouseholdCategories(householdId);
        if (refreshResult.ok && refreshResult.data) {
          setCategories(refreshResult.data);
        }
      } else {
        const errorMessage = !result.ok ? result.message : 'Error al crear la categoría';
        toast.error(errorMessage);
      }
    });
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId || !formData.id) return;

    startTransition(async () => {
      const formDataObj = new FormData();
      formDataObj.append('categoryId', formData.id!);
      formDataObj.append('name', formData.name);
      formDataObj.append('icon', formData.icon);

      const result = await updateCategory(formDataObj);

      if (result.ok) {
        toast.success(`Se ha actualizado la categoría "${formData.name}"`);
        setEditDialogOpen(false);
        // Recargar categorías
        const refreshResult = await getHouseholdCategories(householdId);
        if (refreshResult.ok && refreshResult.data) {
          setCategories(refreshResult.data);
        }
      } else {
        const errorMessage = !result.ok ? result.message : 'Error al actualizar la categoría';
        toast.error(errorMessage);
      }
    });
  };

  const handleConfirmDelete = async () => {
    if (!householdId || !categoryToDelete) return;

    startTransition(async () => {
      const formDataObj = new FormData();
      formDataObj.append('categoryId', categoryToDelete.id);

      const result = await deleteCategory(formDataObj);

      if (result.ok) {
        toast.success(`Se ha eliminado la categoría "${categoryToDelete.name}"`);
        setDeleteDialogOpen(false);
        setCategoryToDelete(null);
        // Recargar categorías
        const refreshResult = await getHouseholdCategories(householdId);
        if (refreshResult.ok && refreshResult.data) {
          setCategories(refreshResult.data);
        }
      } else {
        const errorMessage = !result.ok ? result.message : 'Error al eliminar la categoría';
        toast.error(errorMessage);
      }
    });
  };

  // Agrupar categorías por tipo
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando categorías...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 pb-20 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorías</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las categorías de tus ingresos y gastos
          </p>
        </div>
        {isOwner && (
          <Button onClick={handleCreateCategory} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva
          </Button>
        )}
      </div>

      {/* Gastos */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-red-600">Gastos</h2>
        <div className="grid gap-2">
          {expenseCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 border rounded-lg">
              No hay categorías de gastos
            </p>
          ) : (
            expenseCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <span className="font-medium">{category.name}</span>
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditCategory(category)}
                      disabled={isPending}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(category)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ingresos */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-green-600">Ingresos</h2>
        <div className="grid gap-2">
          {incomeCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 border rounded-lg">
              No hay categorías de ingresos
            </p>
          ) : (
            incomeCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <span className="font-medium">{category.name}</span>
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditCategory(category)}
                      disabled={isPending}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(category)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dialog: Crear Categoría */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmitCreate}>
            <DialogHeader>
              <DialogTitle>Nueva Categoría</DialogTitle>
              <DialogDescription>Crea una nueva categoría para tu hogar</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="create-type">Tipo</Label>
                <select
                  id="create-type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: e.target.value as 'income' | 'expense',
                      icon: e.target.value === 'expense' ? '🏠' : '💰',
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-name">Nombre</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Supermercado"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Icono</Label>
                <div className="grid grid-cols-8 gap-2">
                  {AVAILABLE_ICONS[formData.type].map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                      className={`text-2xl p-2 rounded-md border transition-colors ${
                        formData.icon === icon
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending || !formData.name.trim()}>
                {isPending ? 'Creando...' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Categoría */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmitUpdate}>
            <DialogHeader>
              <DialogTitle>Editar Categoría</DialogTitle>
              <DialogDescription>Modifica el nombre o icono de la categoría</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nombre</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Supermercado"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Icono</Label>
                <div className="grid grid-cols-8 gap-2">
                  {AVAILABLE_ICONS[formData.type].map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                      className={`text-2xl p-2 rounded-md border transition-colors ${
                        formData.icon === icon
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending || !formData.name.trim()}>
                {isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La categoría &quot;{categoryToDelete?.name}&quot;
              será eliminada permanentemente.
              {categoryToDelete && (
                <span className="block mt-2 text-sm text-muted-foreground">
                  Solo puedes eliminar categorías que no tengan transacciones asociadas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
