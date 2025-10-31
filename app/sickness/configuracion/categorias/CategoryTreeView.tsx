'use client';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, Edit, Plus, Trash2 } from 'lucide-react';
import type {
    CategoryHierarchy,
    CategoryWithSubcategories,
    Subcategory
} from './hierarchy-actions';

interface CategoryTreeViewProps {
  hierarchy: CategoryHierarchy[]; // Array directo de parents, no un objeto wrapper
  isOwner: boolean;
  // Parent category handlers
  onEditParent: (parent: CategoryHierarchy) => void;
  onDeleteParent: (parent: CategoryHierarchy) => void;
  // Category handlers
  onCreateCategory: (parentId: string) => void;
  onEditCategory: (category: CategoryWithSubcategories, parentId: string) => void;
  onDeleteCategory: (category: CategoryWithSubcategories, parentId: string) => void;
  // Subcategory handlers
  onCreateSubcategory: (categoryId: string) => void;
  onEditSubcategory: (subcategory: Subcategory, categoryId: string) => void;
  onDeleteSubcategory: (subcategory: Subcategory, categoryId: string) => void;
}

export function CategoryTreeView({
  hierarchy,
  isOwner,
  onEditParent,
  onDeleteParent,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  onCreateSubcategory,
  onEditSubcategory,
  onDeleteSubcategory,
}: CategoryTreeViewProps) {
  // Separar por tipo
  const expenseParents = hierarchy.filter((p: CategoryHierarchy) => p.type === 'expense');
  const incomeParents = hierarchy.filter((p: CategoryHierarchy) => p.type === 'income');

  const renderParentSection = (parents: CategoryHierarchy[], title: string, type: 'income' | 'expense') => (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{title}</CardTitle>
          {isOwner && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // TODO: Abrir modal para crear parent
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Grupo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {parents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay grupos de {type === 'expense' ? 'gastos' : 'ingresos'}</p>
        ) : (
          <Accordion type="multiple" className="w-full space-y-2">
          {parents.map((parent: CategoryHierarchy) => (
              <AccordionItem key={parent.id} value={parent.id}>
                <AccordionTrigger className="hover:no-underline flex-row-reverse justify-end [&[data-state=open]>svg]:rotate-180 [&>svg]:order-first [&>svg]:mr-2">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{parent.icon}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-semibold">{parent.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {parent.categories.length} categorías
                      </Badge>
                    </div>
                    {isOwner && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <div
                          role="button"
                          tabIndex={0}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditParent(parent);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onEditParent(parent);
                            }
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <div
                              role="button"
                              tabIndex={0}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </div>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar grupo &quot;{parent.name}&quot;?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esto eliminará todas las categorías y subcategorías dentro de este grupo.
                                Si hay transacciones asociadas, no se podrá eliminar.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDeleteParent(parent)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    {/* Botón para crear categoría */}
                    {isOwner && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-8"
                        onClick={() => onCreateCategory(parent.id)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Categoría
                      </Button>
                    )}

                    {/* Lista de categorías */}
                    {parent.categories.length === 0 ? (
                      <p className="text-sm text-muted-foreground ml-8">
                        No hay categorías en este grupo
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {parent.categories.map((category: CategoryWithSubcategories) => (
                          <div key={category.id} className="ml-8 border-l-2 border-muted pl-4">
                            {/* Cabecera de categoría */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {category.icon && <span className="text-xl">{category.icon}</span>}
                                <span className="font-medium">{category.name}</span>
                                {category.subcategories.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {category.subcategories.length} subcategorías
                                  </Badge>
                                )}
                              </div>
                              {isOwner && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => onEditCategory(category, parent.id)}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          ¿Eliminar categoría &quot;{category.name}&quot;?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esto eliminará todas las subcategorías dentro de esta categoría.
                                          Si hay transacciones asociadas, no se podrá eliminar.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => onDeleteCategory(category, parent.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                            </div>

                            {/* Subcategorías */}
                            <div className="space-y-1.5 ml-6">
                              {isOwner && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => onCreateSubcategory(category.id)}
                                >
                                  <Plus className="mr-1 h-3 w-3" />
                                  Nueva Subcategoría
                                </Button>
                              )}
                              {category.subcategories.map((subcategory: Subcategory) => (
                                <div
                                  key={subcategory.id}
                                  className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50"
                                >
                                  <div className="flex items-center gap-2">
                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                    {subcategory.icon && <span>{subcategory.icon}</span>}
                                    <span>{subcategory.name}</span>
                                  </div>
                                  {isOwner && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={() => onEditSubcategory(subcategory, category.id)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 text-destructive hover:text-destructive"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>
                                              ¿Eliminar subcategoría &quot;{subcategory.name}&quot;?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Las transacciones asociadas quedarán sin subcategoría (no se eliminarán).
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => onDeleteSubcategory(subcategory, category.id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Eliminar
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {renderParentSection(expenseParents, '💸 Gastos', 'expense')}
      {renderParentSection(incomeParents, '💰 Ingresos', 'income')}
    </div>
  );
}
