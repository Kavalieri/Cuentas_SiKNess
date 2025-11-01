-- Debug: Ver paid_by en transacciones de "Mercadona" y "Lavandería"
SELECT
  t.id,
  t.description,
  t.flow_type,
  t.type,
  t.amount,
  t.paid_by,
  t.profile_id,
  t.real_payer_id,
  CASE
    WHEN t.paid_by IS NULL THEN 'NULL (Cuenta Común)'
    ELSE CONCAT('UUID: ', t.paid_by)
  END as paid_by_status,
  p.display_name as registrado_por,
  pb.display_name as paid_by_display_name
FROM transactions t
LEFT JOIN profiles p ON t.profile_id = p.id
LEFT JOIN profiles pb ON t.paid_by = pb.id
WHERE t.description ILIKE '%mercadona%'
   OR t.description ILIKE '%lavander%'
ORDER BY t.occurred_at DESC
LIMIT 10;
