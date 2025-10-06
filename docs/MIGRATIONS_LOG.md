# Migrations Log - CuentasSiK

Registro de migraciones SQL aplicadas directamente via MCP Supabase (sin archivos de migración local).

## 2025-10-07

### fix_household_members_rls_recursion

**Problema**: Recursión infinita en política RLS de `household_members`
- Error: `42P17: infinite recursion detected in policy for relation "household_members"`
- Causa: Política SELECT hacía subquery a la misma tabla que protegía
- Impacto: `getUserHouseholds()` fallaba, usuarios redirigidos a onboarding

**Solución**:
```sql
-- Función auxiliar con SECURITY DEFINER (bypasea RLS)
CREATE OR REPLACE FUNCTION get_user_household_ids()
RETURNS TABLE(household_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT hm.household_id
  FROM household_members hm
  WHERE hm.profile_id = get_current_profile_id();
$$;

-- Política RLS sin recursión
CREATE POLICY "Members can view all members in their households"
ON household_members
FOR SELECT
USING (
  household_id IN (SELECT get_user_household_ids())
);
```

**Resultado**: ✅ Política funciona correctamente, retorna todos los miembros del household

---

### fix_household_members_select_policy

**Problema**: Solo se mostraba 1 miembro en selector de transacciones
- Política anterior: `WHERE profile_id = get_current_profile_id()`
- Solo permitía ver tu propio registro en `household_members`

**Solución**: (REVERTIDA por recursión infinita, ver fix_household_members_rls_recursion)
```sql
-- ❌ CAUSÓ RECURSIÓN:
CREATE POLICY "Members can view all members in their households"
ON household_members
FOR SELECT
USING (
  household_id IN (
    SELECT household_id 
    FROM household_members 
    WHERE profile_id = get_current_profile_id()
  )
);
```

**Lección aprendida**: Nunca hacer subquery a la misma tabla en una política RLS. Usar funciones SECURITY DEFINER en su lugar.

---

## Referencias

- [Supabase RLS with Security Definer Functions](https://supabase.com/docs/guides/auth/row-level-security#policies-with-security-definer-functions)
- [PostgreSQL CREATE FUNCTION](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [RLS Performance](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations)
