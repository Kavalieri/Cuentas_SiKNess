/**
 * Tipos relacionados con miembros del hogar (consumidos por páginas de configuración).
 * El resto de contratos legacy fueron migrados a SiKnessContext y eliminados.
 */
export interface HouseholdContextUser {
  id: string;
  email: string;
  displayName?: string | null;
  role?: string;
  income?: number;
  joinedAt?: string;
}
