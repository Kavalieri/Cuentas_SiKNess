# Fix para RLS - Aplicar Políticas Corregidas

## Opción 1: Usar Supabase SQL Editor (Recomendado)

1. Ve a: https://supabase.com/dashboard/project/fizxvvtakvmmeflmbwud/sql
2. Copia y pega todo el contenido de `db/fix-rls-policies.sql`
3. Click en "Run"

## Opción 2: Usar Supabase CLI

```bash
# Aplicar el fix directamente
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.fizxvvtakvmmeflmbwud.supabase.co:5432/postgres" --file db/fix-rls-policies.sql

# O ejecutar directamente
psql "postgresql://postgres:[YOUR-PASSWORD]@db.fizxvvtakvmmeflmbwud.supabase.co:5432/postgres" -f db/fix-rls-policies.sql
```

## Verificar que funcionó

Después de aplicar el fix, prueba crear un household de nuevo. El error debería desaparecer.

## Explicación del Problema

El error "infinite recursion detected in policy" ocurría porque la política de `household_members` estaba haciendo:

```sql
-- ❌ INCORRECTO (causaba recursión)
exists (
  select 1 from household_members hm
  where hm.household_id = household_members.household_id
    and hm.user_id = auth.uid()
)
```

Esto hacía que PostgreSQL verificara la misma tabla durante la verificación de la política, causando un loop infinito.

La solución es usar subconsultas más simples:

```sql
-- ✅ CORRECTO
household_id in (
  select household_id from household_members where user_id = auth.uid()
)
```

O verificar directamente el `user_id`:

```sql
-- ✅ CORRECTO
user_id = auth.uid() OR household_id in (...)
```
