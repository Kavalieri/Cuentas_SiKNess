# Fix: Household INSERT Policy

## Problema
```
new row violates row-level security policy for table "households"
```

## Causa
La política INSERT no especificaba explícitamente el rol `authenticated`.

## Solución Aplicada

**Migración**: `20251002204003_fix_households_insert_policy.sql`

```sql
-- Asegurar RLS habilitado
alter table households enable row level security;

-- Recrear política con rol explícito
drop policy if exists "households_insert" on households;

create policy "households_insert" on households 
for insert 
to authenticated  -- ← Clave: especificar rol
with check (true);
```

## Cambio Clave

- **ANTES**: `for insert with check (true)` (implícito)
- **AHORA**: `for insert to authenticated with check (true)` (explícito)

## Estado

✅ **RESUELTO** - Los households ahora se pueden crear sin errores de RLS

## Testing

1. Login en http://localhost:3000/login
2. Ir a `/app/settings?create=true`
3. Crear household → ✅ Debe funcionar sin errores

## Migraciones Totales

6 migraciones aplicadas exitosamente para resolver problemas de RLS.
