-- Limpiar duplicados de member_incomes antes de aplicar constraint UNIQUE
-- Esta migración debe ejecutarse ANTES de 20251004032000

-- Limpiar duplicados: mantener solo el registro más reciente (por created_at)
-- para cada combinación de (household_id, profile_id, effective_from)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY household_id, profile_id, effective_from 
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM member_incomes
)
DELETE FROM member_incomes
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Reportar cuántos registros se eliminaron
DO $$
DECLARE
  v_remaining_duplicates INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_remaining_duplicates
  FROM (
    SELECT household_id, profile_id, effective_from, COUNT(*) as cnt
    FROM member_incomes
    GROUP BY household_id, profile_id, effective_from
    HAVING COUNT(*) > 1
  ) dups;
  
  IF v_remaining_duplicates > 0 THEN
    RAISE EXCEPTION 'Still have % duplicate combinations after cleanup', v_remaining_duplicates;
  ELSE
    RAISE NOTICE '✓ All duplicates cleaned from member_incomes';
  END IF;
END;
$$;
