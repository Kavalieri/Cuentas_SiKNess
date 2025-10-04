-- Script para eliminar ajuste huérfano y sus movimientos relacionados
-- Ejecutar en Supabase SQL Editor si el ajuste aún aparece después de intentar eliminarlo

-- 1. Ver todos los ajustes actuales
SELECT 
  ca.id,
  ca.amount,
  ca.type,
  ca.reason,
  ca.movement_id,
  ca.category_id,
  c.year,
  c.month,
  p.email
FROM contribution_adjustments ca
JOIN contributions c ON ca.contribution_id = c.id
JOIN profiles p ON c.profile_id = p.id
ORDER BY ca.created_at DESC;

-- 2. Ver movimientos que podrían estar relacionados con ajustes
SELECT 
  id,
  type,
  amount,
  description,
  category_id,
  occurred_at
FROM transactions
WHERE 
  description LIKE '%[Pre-pago]%'
  OR description LIKE '%[Ajuste:%'
  OR description LIKE '%Aporte virtual%'
ORDER BY occurred_at DESC;

-- 3. ELIMINAR ajuste específico (reemplazar con el ID correcto)
-- Primero obtener el ID del ajuste problemático:
-- SELECT id FROM contribution_adjustments WHERE reason LIKE '%vivienda%' OR reason LIKE '%piso%';

-- Luego ejecutar (DESCOMENTA Y REEMPLAZA <adjustment_id>):
-- DELETE FROM contribution_adjustments WHERE id = '<adjustment_id>';

-- 4. ELIMINAR movimientos relacionados manualmente si es necesario
-- DELETE FROM transactions WHERE description LIKE '%Pago de piso%';
