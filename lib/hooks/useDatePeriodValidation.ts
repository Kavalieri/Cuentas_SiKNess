import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Respuesta del endpoint de lookup de periodo
 */
interface PeriodLookupResponse {
  found: boolean;
  date: string;
  message: string;
  allowedTypes: string[];
  canCreate: boolean;
  phase: string | null;
  period?: {
    id: string;
    year: number | null;
    month: number | null;
    phase: string;
    status: string | null;
  };
}

/**
 * Cache local de periodos consultados
 * Formato: { "YYYY-MM-DD": PeriodLookupResponse }
 */
const periodCache = new Map<string, PeriodLookupResponse>();

/**
 * Hook para validar tipos de transacción permitidos según la fecha seleccionada
 *
 * @param selectedDate - Fecha seleccionada en formato YYYY-MM-DD o Date
 * @returns {
 *   allowedTypes: Tipos de transacción permitidos para esta fecha
 *   canCreate: Si se pueden crear transacciones en esta fecha
 *   message: Mensaje descriptivo sobre el estado del periodo
 *   phase: Fase del periodo (preparing, validation, active, closing, closed)
 *   isLoading: Si está cargando la validación
 *   error: Error si hubo problema al consultar
 * }
 *
 * @example
 * ```tsx
 * const { allowedTypes, canCreate, message, isLoading } = useDatePeriodValidation(selectedDate);
 *
 * // Mostrar feedback bajo el campo de fecha
 * {message && (
 *   <p className={canCreate ? "text-green-600" : "text-red-600"}>
 *     {message}
 *   </p>
 * )}
 *
 * // Deshabilitar tipos no permitidos
 * <option value="income" disabled={!allowedTypes.includes('income')}>
 *   Ingreso
 * </option>
 * ```
 */
export function useDatePeriodValidation(selectedDate: string | Date | null) {
  const [allowedTypes, setAllowedTypes] = useState<string[]>([]);
  const [canCreate, setCanCreate] = useState(true);
  const [message, setMessage] = useState<string>('');
  const [phase, setPhase] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref para cancelar requests obsoletos
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Normalizar fecha a formato YYYY-MM-DD
   */
  const normalizeDateToString = useCallback((date: string | Date | null): string | null => {
    if (!date) return null;

    if (typeof date === 'string') {
      // Ya está en formato string, asumimos que es YYYY-MM-DD o YYYY-MM-DDTHH:MM
      const datePart = date.split('T')[0];
      return datePart || null;
    }

    // Convertir Date a YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  /**
   * Validar periodo para una fecha específica
   */
  const validatePeriod = useCallback(async (dateString: string) => {
    // Verificar cache primero
    const cached = periodCache.get(dateString);
    if (cached) {
      setAllowedTypes(cached.allowedTypes);
      setCanCreate(cached.canCreate);
      setMessage(cached.message);
      setPhase(cached.phase);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Crear nuevo AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/sickness/periods/lookup?date=${dateString}`,
        { signal: abortController.signal }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data: PeriodLookupResponse = await response.json();

      // Guardar en cache
      periodCache.set(dateString, data);

      // Actualizar estado
      setAllowedTypes(data.allowedTypes);
      setCanCreate(data.canCreate);
      setMessage(data.message);
      setPhase(data.phase);
      setError(null);
    } catch (err) {
      // Ignorar errores de abort (request cancelado)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Error al validar periodo';
      console.error('Error al validar periodo:', err);
      setError(errorMessage);
      setAllowedTypes([]);
      setCanCreate(false);
      setMessage('Error al validar periodo. Por favor, intenta de nuevo.');
      setPhase(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Efecto: Validar cuando cambia la fecha
   */
  useEffect(() => {
    const dateString = normalizeDateToString(selectedDate);

    if (!dateString) {
      // Sin fecha seleccionada
      setAllowedTypes([]);
      setCanCreate(false);
      setMessage('');
      setPhase(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Validar periodo para esta fecha
    validatePeriod(dateString);

    // Cleanup: cancelar request si el componente se desmonta
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedDate, normalizeDateToString, validatePeriod]);

  return {
    allowedTypes,
    canCreate,
    message,
    phase,
    isLoading,
    error,
  };
}

/**
 * Función helper para limpiar el cache (útil para testing o cuando se crean nuevos periodos)
 */
export function clearPeriodCache() {
  periodCache.clear();
}
