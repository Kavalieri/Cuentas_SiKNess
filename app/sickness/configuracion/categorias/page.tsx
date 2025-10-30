'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useSiKness } from '@/contexts/SiKnessContext';
import type { EmojiClickData } from 'emoji-picker-react';
import { Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createCategory, deleteCategory, updateCategory } from './actions';
import { CategoryTreeView } from './CategoryTreeView';
import {
    createParentCategory,
    createSubcategory,
    deleteParentCategory,
    deleteSubcategory,
    getCategoryHierarchy,
    updateParentCategory,
    updateSubcategory,
    type CategoryHierarchy,
    type CategoryWithSubcategories,
    type Subcategory,
} from './hierarchy-actions';

// Import dinámico del emoji picker (solo client-side)
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

// ============================================================================
// TYPES
// ============================================================================

type DialogMode = 'parent' | 'category' | 'subcategory';
type ActionType = 'create' | 'edit';

type ParentFormData = {
  id?: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  displayOrder: number;
};

type CategoryFormData = {
  id?: string;
  name: string;
  icon: string;
  parentId: string;
  displayOrder: number;
};

type SubcategoryFormData = {
  id?: string;
  name: string;
  icon: string;
  categoryId: string;
  displayOrder: number;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CategoriasPage() {
  const { householdId, isOwner } = useSiKness();

  // Estados principales
  const [hierarchy, setHierarchy] = useState<CategoryHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('parent');
  const [actionType, setActionType] = useState<ActionType>('create');

  // Form data states
  const [parentForm, setParentForm] = useState<ParentFormData>({
    name: '',
    icon: '🏠',
    type: 'expense',
    displayOrder: 0,
  });

  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: '',
    icon: '📁',
    parentId: '',
    displayOrder: 0,
  });

  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryFormData>({
    name: '',
    icon: '📄',
    categoryId: '',
    displayOrder: 0,
  });

  // ============================================================================
  // LOAD HIERARCHY
  // ============================================================================

  const loadHierarchy = async () => {
    if (!householdId) return;

    setLoading(true);
    const result = await getCategoryHierarchy(householdId);

    if (result.ok && result.data) {
      setHierarchy(result.data);
    } else if (!result.ok) {
      toast.error(result.message || 'Error al cargar la jerarquía');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHierarchy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  useEffect(() => {
    loadHierarchy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  // ============================================================================
  // PARENT CATEGORY HANDLERS
  // ============================================================================

  const handleCreateParent = () => {
    setParentForm({ name: '', icon: '🏠', type: 'expense', displayOrder: 0 });
    setDialogMode('parent');
    setActionType('create');
    setDialogOpen(true);
  };

  const handleEditParent = (parent: CategoryHierarchy) => {
    setParentForm({
      id: parent.id,
      name: parent.name,
      icon: parent.icon,
      type: parent.type,
      displayOrder: parent.displayOrder,
    });
    setDialogMode('parent');
    setActionType('edit');
    setDialogOpen(true);
  };

  const handleDeleteParent = async (parent: CategoryHierarchy) => {
    if (!householdId) return;

    const confirmed = window.confirm(
      `¿Eliminar el grupo "${parent.name}"?\n\nEsto también eliminará todas sus categorías y subcategorías.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('parentId', parent.id);
      formData.append('householdId', householdId);

      const result = await deleteParentCategory(formData);

      if (result.ok) {
        toast.success(`Grupo "${parent.name}" eliminado`);
        await loadHierarchy();
      } else {
        toast.error(result.message);
      }
    });
  };

  // ============================================================================
  // CATEGORY HANDLERS
  // ============================================================================

  const handleCreateCategory = (parentId: string) => {
    setCategoryForm({ name: '', icon: '📁', parentId, displayOrder: 0 });
    setDialogMode('category');
    setActionType('create');
    setDialogOpen(true);
  };

  const handleEditCategory = (category: CategoryWithSubcategories, parentId: string) => {
    setCategoryForm({
      id: category.id,
      name: category.name,
      icon: category.icon || '📁',
      parentId,
      displayOrder: category.display_order || 0,
    });
    setDialogMode('category');
    setActionType('edit');
    setDialogOpen(true);
  };

  const handleDeleteCategory = async (category: CategoryWithSubcategories, parentId: string) => {
    if (!householdId) return;

    const confirmed = window.confirm(
      `¿Eliminar la categoría "${category.name}"?\n\nEsto también eliminará todas sus subcategorías.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('categoryId', category.id);

      const result = await deleteCategory(formData);

      if (result.ok) {
        toast.success(`Categoría "${category.name}" eliminada`);
        await loadHierarchy();
      } else {
        toast.error(result.message);
      }
    });
  };

  // ============================================================================
  // SUBCATEGORY HANDLERS
  // ============================================================================

  const handleCreateSubcategory = (categoryId: string) => {
    setSubcategoryForm({ name: '', icon: '', categoryId, displayOrder: 0 });
    setDialogMode('subcategory');
    setActionType('create');
    setDialogOpen(true);
  };

  const handleEditSubcategory = (subcategory: Subcategory, categoryId: string) => {
    setSubcategoryForm({
      id: subcategory.id,
      name: subcategory.name,
      icon: subcategory.icon || '',
      categoryId,
      displayOrder: subcategory.displayOrder || 0,
    });
    setDialogMode('subcategory');
    setActionType('edit');
    setDialogOpen(true);
  };

  const handleDeleteSubcategory = async (subcategory: Subcategory, categoryId: string) => {
    if (!householdId) return;

    const confirmed = window.confirm(`¿Eliminar la subcategoría "${subcategory.name}"?`);

    if (!confirmed) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('subcategoryId', subcategory.id);

      const result = await deleteSubcategory(formData);

      if (result.ok) {
        toast.success(`Subcategoría "${subcategory.name}" eliminada`);
        await loadHierarchy();
      } else {
        toast.error(result.message);
      }
    });
  };

  // ============================================================================
  // FORM SUBMIT HANDLERS
  // ============================================================================

  const handleSubmitParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('householdId', householdId);
      formData.append('name', parentForm.name);
      formData.append('icon', parentForm.icon);
      formData.append('type', parentForm.type);
      formData.append('displayOrder', parentForm.displayOrder.toString());

      let result;

      if (actionType === 'create') {
        result = await createParentCategory(formData);
      } else {
        formData.append('parentId', parentForm.id!);
        result = await updateParentCategory(formData);
      }

      if (result.ok) {
        toast.success(
          actionType === 'create'
            ? `Grupo "${parentForm.name}" creado`
            : `Grupo "${parentForm.name}" actualizado`,
        );
        setDialogOpen(false);
        await loadHierarchy();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', categoryForm.name);
      formData.append('icon', categoryForm.icon);
      formData.append('parentId', categoryForm.parentId);
      formData.append('displayOrder', categoryForm.displayOrder.toString());

      let result;

      if (actionType === 'create') {
        formData.append('householdId', householdId);
        // Obtener el tipo del parent
        const parent = hierarchy.find((p) => p.id === categoryForm.parentId);
        if (parent) {
          formData.append('type', parent.type);
        }
        result = await createCategory(formData);
      } else {
        formData.append('categoryId', categoryForm.id!);
        result = await updateCategory(formData);
      }

      if (result.ok) {
        toast.success(
          actionType === 'create'
            ? `Categoría "${categoryForm.name}" creada`
            : `Categoría "${categoryForm.name}" actualizada`,
        );
        setDialogOpen(false);
        await loadHierarchy();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleSubmitSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('categoryId', subcategoryForm.categoryId);
      formData.append('name', subcategoryForm.name);
      if (subcategoryForm.icon) {
        formData.append('icon', subcategoryForm.icon);
      }
      formData.append('displayOrder', subcategoryForm.displayOrder.toString());

      let result;

      if (actionType === 'create') {
        result = await createSubcategory(formData);
      } else {
        formData.append('subcategoryId', subcategoryForm.id!);
        result = await updateSubcategory(formData);
      }

      if (result.ok) {
        toast.success(
          actionType === 'create'
            ? `Subcategoría "${subcategoryForm.name}" creada`
            : `Subcategoría "${subcategoryForm.name}" actualizada`,
        );
        setDialogOpen(false);
        await loadHierarchy();
      } else {
        toast.error(result.message);
      }
    });
  };

  // ============================================================================
  // EMOJI PICKER HANDLER
  // ============================================================================

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    if (dialogMode === 'parent') {
      setParentForm({ ...parentForm, icon: emojiData.emoji });
    } else if (dialogMode === 'category') {
      setCategoryForm({ ...categoryForm, icon: emojiData.emoji });
    } else {
      setSubcategoryForm({ ...subcategoryForm, icon: emojiData.emoji });
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando jerarquía...</p>
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
            Gestiona la jerarquía de categorías: Grupos → Categorías → Subcategorías
          </p>
        </div>
        {isOwner && (
          <Button onClick={handleCreateParent} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Grupo
          </Button>
        )}
      </div>

      {/* Tree View */}
      <CategoryTreeView
        hierarchy={hierarchy}
        isOwner={isOwner}
        onEditParent={handleEditParent}
        onDeleteParent={handleDeleteParent}
        onCreateCategory={handleCreateCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        onCreateSubcategory={handleCreateSubcategory}
        onEditSubcategory={handleEditSubcategory}
        onDeleteSubcategory={handleDeleteSubcategory}
      />

      {/* Unified Dialog for Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'create' ? 'Crear' : 'Editar'}{' '}
              {dialogMode === 'parent'
                ? 'Grupo'
                : dialogMode === 'category'
                  ? 'Categoría'
                  : 'Subcategoría'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'parent' &&
                'Los grupos organizan tus categorías por tipo (Gasto/Ingreso)'}
              {dialogMode === 'category' && 'Las categorías agrupan subcategorías relacionadas'}
              {dialogMode === 'subcategory' &&
                'Las subcategorías son el nivel más específico de clasificación'}
            </DialogDescription>
          </DialogHeader>

          {/* Parent Form */}
          {dialogMode === 'parent' && (
            <form onSubmit={handleSubmitParent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parent-name">Nombre</Label>
                <Input
                  id="parent-name"
                  value={parentForm.name}
                  onChange={(e) => setParentForm({ ...parentForm, name: e.target.value })}
                  placeholder="Ej: Vivienda y Servicios"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Icono</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <span className="text-2xl mr-2">{parentForm.icon || '🏠'}</span>
                      <span className="text-muted-foreground">Click para cambiar</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <EmojiPicker
                      onEmojiClick={handleEmojiSelect}
                      width="100%"
                      height="350px"
                      searchPlaceholder="Buscar emoji..."
                      previewConfig={{ showPreview: false }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {actionType === 'create' && (
                <div className="space-y-2">
                  <Label htmlFor="parent-type">Tipo</Label>
                  <Select
                    value={parentForm.type}
                    onValueChange={(value: 'income' | 'expense') =>
                      setParentForm({ ...parentForm, type: value })
                    }
                  >
                    <SelectTrigger id="parent-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">💸 Gasto</SelectItem>
                      <SelectItem value="income">💰 Ingreso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="parent-order">Orden (opcional)</Label>
                <Input
                  id="parent-order"
                  type="number"
                  value={parentForm.displayOrder}
                  onChange={(e) =>
                    setParentForm({ ...parentForm, displayOrder: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {actionType === 'create' ? 'Crear' : 'Actualizar'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* Category Form */}
          {dialogMode === 'category' && (
            <form onSubmit={handleSubmitCategory} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Nombre</Label>
                <Input
                  id="category-name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Ej: Internet y Telefonía"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Icono</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <span className="text-2xl mr-2">{categoryForm.icon || '📁'}</span>
                      <span className="text-muted-foreground">Click para cambiar</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <EmojiPicker
                      onEmojiClick={handleEmojiSelect}
                      width="100%"
                      height="350px"
                      searchPlaceholder="Buscar emoji..."
                      previewConfig={{ showPreview: false }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-order">Orden (opcional)</Label>
                <Input
                  id="category-order"
                  type="number"
                  value={categoryForm.displayOrder}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      displayOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {actionType === 'create' ? 'Crear' : 'Actualizar'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* Subcategory Form */}
          {dialogMode === 'subcategory' && (
            <form onSubmit={handleSubmitSubcategory} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subcategory-name">Nombre</Label>
                <Input
                  id="subcategory-name"
                  value={subcategoryForm.name}
                  onChange={(e) =>
                    setSubcategoryForm({ ...subcategoryForm, name: e.target.value })
                  }
                  placeholder="Ej: Fibra óptica"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Icono (opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <span className="text-2xl mr-2">{subcategoryForm.icon || '📄'}</span>
                      <span className="text-muted-foreground">Click para cambiar</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <EmojiPicker
                      onEmojiClick={handleEmojiSelect}
                      width="100%"
                      height="350px"
                      searchPlaceholder="Buscar emoji..."
                      previewConfig={{ showPreview: false }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory-order">Orden (opcional)</Label>
                <Input
                  id="subcategory-order"
                  type="number"
                  value={subcategoryForm.displayOrder}
                  onChange={(e) =>
                    setSubcategoryForm({
                      ...subcategoryForm,
                      displayOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {actionType === 'create' ? 'Crear' : 'Actualizar'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
