'use client';

import { getCategoryHierarchy, type CategoryHierarchy } from '@/app/sickness/configuracion/categorias/hierarchy-actions';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface CategoryHierarchyContextType {
  hierarchy: CategoryHierarchy[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CategoryHierarchyContext = createContext<CategoryHierarchyContextType | null>(null);

interface CategoryHierarchyProviderProps {
  children: ReactNode;
  householdId: string;
}

/**
 * Provider que carga la jerarquía de categorías UNA SOLA VEZ al montar
 * y la mantiene en memoria para reutilizar en todos los componentes hijos.
 *
 * Evita el problema de N+1 queries y carga repetida en cada diálogo.
 *
 * @example
 * <CategoryHierarchyProvider householdId={householdId}>
 *   <BalancePage />
 * </CategoryHierarchyProvider>
 */
export function CategoryHierarchyProvider({ children, householdId }: CategoryHierarchyProviderProps) {
  const [hierarchy, setHierarchy] = useState<CategoryHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHierarchy = async () => {
    if (!householdId) {
      setError('No household ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await getCategoryHierarchy(householdId);

      if (result.ok && result.data) {
        setHierarchy(result.data);
      } else {
        setError(!result.ok ? result.message : 'Error al cargar jerarquía');
      }
    } catch (err) {
      console.error('[CategoryHierarchyProvider] Error:', err);
      setError('Error inesperado al cargar jerarquía');
    } finally {
      setLoading(false);
    }
  };

  // Cargar al montar y cuando cambie el householdId
  useEffect(() => {
    loadHierarchy();
  }, [householdId]);

  const refresh = async () => {
    await loadHierarchy();
  };

  return (
    <CategoryHierarchyContext.Provider value={{ hierarchy, loading, error, refresh }}>
      {children}
    </CategoryHierarchyContext.Provider>
  );
}

/**
 * Hook para acceder a la jerarquía de categorías pre-cargada
 *
 * @returns {CategoryHierarchyContextType} Jerarquía cargada, estado de loading y función refresh
 * @throws {Error} Si se usa fuera del CategoryHierarchyProvider
 *
 * @example
 * const { hierarchy, loading } = useCategoryHierarchy();
 * if (loading) return <Spinner />;
 * // Usar hierarchy sin volver a cargar
 */
export function useCategoryHierarchy() {
  const context = useContext(CategoryHierarchyContext);

  if (!context) {
    throw new Error('useCategoryHierarchy debe usarse dentro de CategoryHierarchyProvider');
  }

  return context;
}
