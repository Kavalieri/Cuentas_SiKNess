-- Arreglar constraint UNIQUE de member_incomes para usar profile_id
-- Permite actualizar ingresos usando UPSERT

BEGIN;

-- Eliminar constraint antiguo con user_id
ALTER TABLE member_incomes 
  DROP CONSTRAINT IF EXISTS member_incomes_household_user_date_key;

-- Limpiar duplicados: mantener solo el registro más reciente (por created_at)
-- para cada combinación de (household_id, profile_id, effective_from)
DELETE FROM member_incomes
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY household_id, profile_id, effective_from 
        ORDER BY created_at DESC
      ) as rn
    FROM member_incomes
  ) t
  WHERE rn > 1
);

-- Verificar que no quedan duplicados
DO $$
DECLARE
  v_duplicates INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_duplicates
  FROM (
    SELECT household_id, profile_id, effective_from, COUNT(*) as cnt
    FROM member_incomes
    GROUP BY household_id, profile_id, effective_from
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF v_duplicates > 0 THEN
    RAISE EXCEPTION 'Still have % duplicate entries in member_incomes', v_duplicates;
  END IF;
  
  RAISE NOTICE 'Cleaned up duplicate member_incomes. Ready to add UNIQUE constraint.';
END;
$$;

-- Agregar nuevo constraint con profile_id
ALTER TABLE member_incomes 
  ADD CONSTRAINT member_incomes_household_profile_date_key 
  UNIQUE (household_id, profile_id, effective_from);

COMMENT ON CONSTRAINT member_incomes_household_profile_date_key ON member_incomes 
  IS 'Un único ingreso por hogar, miembro y fecha efectiva';

COMMIT;
