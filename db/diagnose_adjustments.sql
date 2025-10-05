-- ========================================================================
-- DIAGNÓSTICO: Verificar estado de contribution_adjustments
-- ========================================================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ========================================================================

-- 1. Ver todos los ajustes del hogar
SELECT 
  ca.id,
  ca.type,
  ca.amount,
  ca.status,
  ca.reason,
  ca.movement_id,
  ca.income_movement_id,
  ca.created_at,
  ca.approved_at,
  p.display_name as member_name
FROM contribution_adjustments ca
JOIN contributions c ON ca.contribution_id = c.id
JOIN profiles p ON c.profile_id = p.id
ORDER BY ca.created_at DESC
LIMIT 20;

-- 2. Ver ajustes pending sin movimientos (estado correcto)
SELECT 
  id,
  type,
  status,
  movement_id,
  income_movement_id,
  created_at
FROM contribution_adjustments
WHERE status = 'pending'
  AND movement_id IS NULL;

-- 3. Ver ajustes approved CON movimientos (estado correcto)
SELECT 
  id,
  type,
  status,
  movement_id,
  income_movement_id,
  created_at
FROM contribution_adjustments
WHERE status = 'approved'
  AND movement_id IS NOT NULL;

-- 4. Ver ajustes INCORRECTOS (approved sin movimientos o pending con movimientos)
SELECT 
  id,
  type,
  status,
  movement_id,
  income_movement_id,
  created_at,
  'INCORRECTO: approved sin movement_id' as issue
FROM contribution_adjustments
WHERE status = 'approved'
  AND movement_id IS NULL

UNION ALL

SELECT 
  id,
  type,
  status,
  movement_id,
  income_movement_id,
  created_at,
  'INCORRECTO: pending con movement_id' as issue
FROM contribution_adjustments
WHERE status = 'pending'
  AND movement_id IS NOT NULL;
