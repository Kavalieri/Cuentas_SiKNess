-- Backfill: añade categorías de crédito/deuda a hogares existentes
-- DATOS: inserta categorías faltantes (idempotente)

SET ROLE cuentassik_dev_owner;

-- Insertar "Préstamo Personal" en hogares que no la tienen
INSERT INTO categories (household_id, name, icon, type, created_at)
SELECT h.id, 'Préstamo Personal', '💰', 'expense', NOW()
FROM households h
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.household_id = h.id
    AND c.name = 'Préstamo Personal'
    AND (c.type = 'expense' OR c.type IS NULL)
);

-- Insertar "Pago Préstamo" en hogares que no la tienen
INSERT INTO categories (household_id, name, icon, type, created_at)
SELECT h.id, 'Pago Préstamo', '💳', 'income', NOW()
FROM households h
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.household_id = h.id
    AND c.name = 'Pago Préstamo'
    AND (c.type = 'income' OR c.type IS NULL)
);

-- Insertar "Reembolso Saldo a Favor" en hogares que no la tienen
INSERT INTO categories (household_id, name, icon, type, created_at)
SELECT h.id, 'Reembolso Saldo a Favor', '↩️', 'expense', NOW()
FROM households h
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.household_id = h.id
    AND c.name = 'Reembolso Saldo a Favor'
    AND (c.type = 'expense' OR c.type IS NULL)
);

RESET ROLE;
