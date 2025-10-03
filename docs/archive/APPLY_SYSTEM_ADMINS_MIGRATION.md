# Aplicar Migración de System Admins

## Ejecutar en Supabase SQL Editor

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/fizxvvtakvmmeflmbwud
2. Navega a **SQL Editor**
3. Copia y pega el contenido de `supabase/migrations/20251003000000_create_system_admins.sql`
4. Ejecuta el script

## Agregar tu primer admin

Después de ejecutar la migración, ejecuta esto reemplazando el email:

```sql
-- Insertar el primer admin (reemplaza con tu email)
INSERT INTO system_admins (user_id, notes) 
VALUES (
  (SELECT id FROM auth.users WHERE email = 'tu-email@example.com'),
  'Primer administrador del sistema'
);
```

## Verificar que funciona

```sql
-- Ver todos los system admins
SELECT 
  sa.user_id,
  u.email,
  sa.created_at,
  sa.notes
FROM system_admins sa
JOIN auth.users u ON u.id = sa.user_id;

-- Probar la función helper
SELECT is_system_admin();
```

## Regenerar tipos TypeScript (opcional)

Si tienes Supabase CLI instalado:

```bash
supabase gen types typescript --project-id fizxvvtakvmmeflmbwud > types/database.ts
```

Si no, los tipos se actualizarán manualmente en el siguiente commit.
