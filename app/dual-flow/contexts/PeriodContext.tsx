'use client';

import type { MonthInfo, MonthlyPeriod } from '@/lib/periods';
import { getCurrentMonth } from '@/lib/periods';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Interface del contexto de período
 * Maneja el período seleccionado globalmente y sus datos asociados
 */
interface PeriodContextType {
  // Estado del período
  currentPeriod: MonthInfo;
  selectedPeriod: MonthInfo;
  periodData: MonthlyPeriod | null;

  // Estados de carga
  loading: boolean;
  error: string | null;

  // Datos del hogar
  householdId: string | null;

  // Funciones
  setPeriod: (year: number, month: number) => void;
  refresh: () => Promise<void>;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

/**
 * Hook para usar el contexto de período
 */
export function usePeriodContext() {
  const context = useContext(PeriodContext);
  if (context === undefined) {
    throw new Error('usePeriodContext must be used within a PeriodProvider');
  }
  return context;
}

/**
 * Proveedor del contexto de período
 * Conecta con PostgreSQL para cargar datos reales
 */
export function PeriodProvider({ children }: { children: ReactNode }) {
  // Estado del período
  const [currentPeriod] = useState<MonthInfo>(() => getCurrentMonth());
  const [selectedPeriod, setSelectedPeriod] = useState<MonthInfo>(() => {
    // Intentar cargar desde sessionStorage
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('dual-flow-selected-period');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.year && parsed.month) {
            return { year: parsed.year, month: parsed.month };
          }
        } catch (e) {
          console.warn('Error parsing stored period:', e);
        }
      }
    }
    return getCurrentMonth();
  });

  // Estado de datos
  const [periodData, setPeriodData] = useState<MonthlyPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  /**
   * Carga los datos del período desde PostgreSQL
   */
  const loadPeriodData = useCallback(
    async (year: number, month: number): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        // Obtener household ID si no lo tenemos
        let currentHouseholdId = householdId;
        if (!currentHouseholdId) {
          const householdResponse = await fetch('/api/dual-flow/household/get');
          if (!householdResponse.ok) {
            setError('No tienes un hogar activo');
            return;
          }
          const householdResult = await householdResponse.json();
          if (!householdResult.ok) {
            setError(householdResult.message || 'No tienes un hogar activo');
            return;
          }
          currentHouseholdId = householdResult.data.householdId;
          setHouseholdId(currentHouseholdId);
        }

        // Primero intentar buscar período existente
        let response = await fetch('/api/dual-flow/periods/get', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year, month, householdId: currentHouseholdId }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.ok && result.data) {
            setPeriodData(result.data);
            return;
          }
        }

        // Si no existe el período, intentar crearlo
        console.log(`Período ${year}-${month} no existe, intentando crear...`);
        response = await fetch('/api/dual-flow/periods/ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year, month }),
        });

        if (response.ok) {
          const ensureResult = await response.json();
          if (ensureResult.ok) {
            // Período creado, ahora obtener los datos
            const getResponse = await fetch('/api/dual-flow/periods/get', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ year, month, householdId: currentHouseholdId }),
            });

            if (getResponse.ok) {
              const getResult = await getResponse.json();
              if (getResult.ok) {
                setPeriodData(getResult.data);
                return;
              }
            }
          }
        }

        // Si llegamos aquí, algo falló
        setError('No se pudo cargar o crear el período');
        setPeriodData(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado');
        console.error('Error loading period data:', err);
        setPeriodData(null);
      } finally {
        setLoading(false);
      }
    },
    [householdId],
  );

  /**
   * Cambia el período seleccionado
   */
  const setPeriod = (year: number, month: number) => {
    const newPeriod = { year, month };
    setSelectedPeriod(newPeriod);

    // Persistir en sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dual-flow-selected-period', JSON.stringify(newPeriod));
    }
  };

  /**
   * Refresca los datos del período actual
   */
  const refresh = async () => {
    await loadPeriodData(selectedPeriod.year, selectedPeriod.month);
  };

  /**
   * Navegación de períodos
   */
  const goToPreviousMonth = () => {
    if (selectedPeriod.month === 1) {
      setPeriod(selectedPeriod.year - 1, 12);
    } else {
      setPeriod(selectedPeriod.year, selectedPeriod.month - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedPeriod.month === 12) {
      setPeriod(selectedPeriod.year + 1, 1);
    } else {
      setPeriod(selectedPeriod.year, selectedPeriod.month + 1);
    }
  };

  const goToCurrentMonth = () => {
    setPeriod(currentPeriod.year, currentPeriod.month);
  };

  // Cargar datos cuando cambie el período seleccionado
  useEffect(() => {
    loadPeriodData(selectedPeriod.year, selectedPeriod.month);
  }, [selectedPeriod.year, selectedPeriod.month, loadPeriodData]);

  // Inicializar household ID al montar
  useEffect(() => {
    const initHouseholdId = async () => {
      try {
        const response = await fetch('/api/dual-flow/household/get');
        if (response.ok) {
          const result = await response.json();
          if (result.ok) {
            setHouseholdId(result.data.householdId);
          }
        }
      } catch (err) {
        console.error('Error getting household ID:', err);
      }
    };
    initHouseholdId();
  }, []);

  const contextValue: PeriodContextType = {
    currentPeriod,
    selectedPeriod,
    periodData,
    loading,
    error,
    householdId,
    setPeriod,
    refresh,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
  };

  return <PeriodContext.Provider value={contextValue}>{children}</PeriodContext.Provider>;
}
