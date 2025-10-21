-- ============================================================
-- MIGRACIÓN: Agregar Sistema de Reembolsos Activos
-- ============================================================
--
-- Objetivo:
--   Permitir que los miembros creen reembolsos activos (expense_direct)
--   que se descuenten automáticamente del balance pendiente.
--
--   Dos modos de reembolso:
--   1. ACTIVO: Usuario crea gasto directo de reembolso (expense_direct)
--      → Se crea automáticamente el par income_direct
--      → Se descuenta del balance pendiente
--
--   2. DECLARADO: Usuario vincula un reembolso a un gasto directo existente
--      → Owner aprueba la vinculación
--      → Se registra qué gasto directo incluye el reembolso
--
-- Cambios:
--   - Agregar columna 'refund_claim_id' en transactions
--     (USD para vincular reembolsos declarados a gastos directos)
--
-- ============================================================

SET ROLE :'SEED_OWNER';

-- ============================================================
-- 1. Agregar columna de vinculación de reembolso a transactions
-- ============================================================
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS refund_claim_id uuid
CONSTRAINT fk_refund_claim REFERENCES public.transactions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.transactions.refund_claim_id IS
  'UUID que vincula un reembolso DECLARADO a su gasto directo correspondiente.
   Permite saber: "Este gasto directo incluye un reembolso de X euros".
   NULL = sin vinculación de reembolso (gasto directo normal o reembolso activo independiente).
   Self-referencing: refund_claim_id apunta a otra fila en transactions (el gasto directo que respalda el reembolso).';

-- ============================================================
-- 2. Crear tabla de Reclamaciones de Reembolso (REFUND CLAIMS)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.refund_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,

  -- Gasto directo que respalda este reembolso
  expense_transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,

  -- Transacción del reembolso (expense_direct generada por este claim)
  refund_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,

  -- Miembro que realiza el reembolso
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Monto reclamado como reembolso (ej: vivienda 300€ → reembolso 50€)
  refund_amount numeric(10, 2) NOT NULL CHECK (refund_amount > 0),

  -- Estado del reclamo
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Descripción/razón del reembolso
  reason text,

  -- Auditoría
  created_at timestamp with time zone DEFAULT now(),
  created_by_profile_id uuid REFERENCES public.profiles(id),
  approved_at timestamp with time zone,
  approved_by_profile_id uuid REFERENCES public.profiles(id),
  updated_at timestamp with time zone DEFAULT now(),

  -- Constraint: El gasto debe ser type='expense_direct'
  CONSTRAINT expense_must_be_direct CHECK (true) -- Validado en aplicación
);

CREATE INDEX IF NOT EXISTS idx_refund_claims_household ON public.refund_claims(household_id);
CREATE INDEX IF NOT EXISTS idx_refund_claims_status ON public.refund_claims(status);
CREATE INDEX IF NOT EXISTS idx_refund_claims_expense_tx ON public.refund_claims(expense_transaction_id);
CREATE INDEX IF NOT EXISTS idx_refund_claims_profile ON public.refund_claims(profile_id);

COMMENT ON TABLE public.refund_claims IS
  'Reclamos de reembolso: cuando un gasto directo (expense_direct) incluye un reembolso de la aportación.
   Ejemplo: "El gasto de vivienda de 300€ incluye un reembolso de 50€"
   Permite que el owner apruebe o rechace el reclamo antes de descuento.';

COMMENT ON COLUMN public.refund_claims.status IS
  'pending: Reclamo en espera de aprobación del owner.
   approved: Owner aprobó, se cuenta el reembolso en el balance.
   rejected: Owner rechazó, no se cuenta el reembolso.';

-- ============================================================
-- 3. Trigger para actualizar updated_at en refund_claims
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_refund_claims_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_refund_claims_updated_at ON public.refund_claims;
CREATE TRIGGER trg_update_refund_claims_updated_at
BEFORE UPDATE ON public.refund_claims
FOR EACH ROW
EXECUTE FUNCTION public.update_refund_claims_updated_at();

-- ============================================================
-- 4. Vista: Reembolsos Pendientes por Hogar
-- ============================================================
CREATE OR REPLACE VIEW public.v_pending_refund_claims AS
SELECT
  rc.id,
  rc.household_id,
  rc.profile_id,
  p.email,
  p.display_name,
  rc.refund_amount,
  rc.reason,
  t_expense.amount as expense_amount,
  c.name as expense_category,
  c.icon as category_icon,
  t_expense.description as expense_description,
  t_expense.occurred_at as expense_date,
  rc.created_at as claimed_at,
  rc.status
FROM public.refund_claims rc
JOIN public.profiles p ON p.id = rc.profile_id
JOIN public.transactions t_expense ON t_expense.id = rc.expense_transaction_id
LEFT JOIN public.categories c ON c.id = t_expense.category_id
WHERE rc.status = 'pending'
ORDER BY rc.created_at ASC;

COMMENT ON VIEW public.v_pending_refund_claims IS
  'Vista para listar reclamos de reembolso pendientes de aprobación (solo owner).
   Muestra detalles del gasto directo y el reembolso reclamado.';

-- ============================================================
-- 5. Función: Calcular Reembolsos Aprobados para un Miembro
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_approved_refunds(
  p_household_id uuid,
  p_profile_id uuid
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(rc.refund_amount), 0)
  FROM public.refund_claims rc
  WHERE rc.household_id = p_household_id
    AND rc.profile_id = p_profile_id
    AND rc.status = 'approved';
$$;

COMMENT ON FUNCTION public.get_approved_refunds(uuid, uuid) IS
  'Suma de reembolsos aprobados para un miembro en un hogar.
   Se usa en el cálculo de balance pendiente para descontar reembolsos ya validados.';

-- ============================================================
-- Permisos: cuentassik_user puede leer y modificar
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refund_claims TO cuentassik_user;
GRANT SELECT ON public.v_pending_refund_claims TO cuentassik_user;
GRANT EXECUTE ON FUNCTION public.get_approved_refunds(uuid, uuid) TO cuentassik_user;

-- ============================================================
-- Registrar migración
-- ============================================================
INSERT INTO public._migrations (
  migration_name,
  applied_at,
  applied_by,
  description
) VALUES (
  '20251021_143000_add_refund_claims.sql',
  NOW(),
  CURRENT_USER,
  'Agregar sistema de reembolsos activos y declarados (refund_claims)'
) ON CONFLICT (migration_name) DO NOTHING;

RESET ROLE;
