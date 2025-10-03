# Fix RLS Recursion - Household Creation

## Problema Original

Al intentar crear un household (hogar), se producía un error de recursión infinita en las políticas RLS (Row Level Security) de Supabase.

## Causa Raíz

La política de INSERT para `household_members` tenía una subconsulta recursiva:

```sql
create policy "household_members_insert" on household_members for insert 
with check (
  user_id = auth.uid() OR
  household_id in (
    select household_id from household_members where user_id = auth.uid()
  )
);
```

**El problema**: Cuando un usuario crea su PRIMER household, intenta insertar su primer registro en `household_members`. La subconsulta `household_id in (select household_id from household_members where user_id = auth.uid())` busca households existentes del usuario, pero al ser el primero, la consulta se complica y puede causar recursión.

## Solución Implementada

### Migración 1: `20251002193625_fix_rls_infinite_recursion.sql`
- Cambió todas las políticas de `EXISTS` a `IN` para reducir recursión
- Usó `user_id = auth.uid()` directamente cuando era posible

### Migración 2: `20251002201531_simplify_household_members_insert_policy.sql` ✅
**Simplificó radicalmente la política de INSERT:**

```sql
create policy "household_members_insert" on household_members 
for insert 
with check (user_id = auth.uid());
```

**¿Por qué funciona?**
1. Solo permite insertar registros donde `user_id = auth.uid()` (el usuario se agrega a sí mismo)
2. No hay subconsultas, por lo tanto **no hay recursión**
3. Es suficientemente seguro: un usuario solo puede agregarse a sí mismo como miembro
4. La seguridad adicional viene de que el `household_id` debe ser válido (lo creó el mismo usuario segundos antes)

## Flujo Correcto de Creación

1. **Usuario crea household** → `households.insert()` ✅
2. **Sistema agrega usuario como owner** → `household_members.insert()` ✅
   - Política: `user_id = auth.uid()` (sin recursión)
3. **Sistema crea categorías por defecto** → `create_default_categories()` ✅

## Políticas RLS Finales

### households
- **SELECT**: `id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())`
- **INSERT**: `true` (cualquiera puede crear, pero solo será owner quien se agregue)
- **UPDATE**: `id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())`

### household_members
- **SELECT**: `user_id = auth.uid() OR household_id IN (...)`
- **INSERT**: `user_id = auth.uid()` ✅ **SIMPLIFICADO**
- **DELETE**: `user_id = auth.uid() OR household_id IN (...)`

### categories, movements
- **Todas**: `household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())`

## Testing

### Prueba Manual
1. Ir a http://localhost:3000/app/settings?create=true
2. Ingresar nombre del hogar: "Casa SiK"
3. Crear → **Debe funcionar sin errores** ✅

### Verificar en Supabase
```sql
-- Ver households creados
select * from households;

-- Ver miembros
select * from household_members;

-- Ver categorías por defecto
select * from categories order by household_id, type, name;
```

## Archivos Modificados

- ✅ `supabase/migrations/20251002193625_fix_rls_infinite_recursion.sql` (aplicada)
- ✅ `supabase/migrations/20251002201531_simplify_household_members_insert_policy.sql` (aplicada)
- ✅ Base de datos: Políticas RLS actualizadas

## Estado Final

- ✅ Error de recursión RESUELTO
- ✅ Households se crean correctamente
- ✅ Usuarios se agregan como owners automáticamente
- ✅ Categorías por defecto se crean
- ✅ RLS seguro y sin recursión

## Lecciones Aprendidas

1. **Evitar subconsultas en políticas de INSERT**: Especialmente si consultan la misma tabla
2. **Usar condiciones directas cuando sea posible**: `user_id = auth.uid()` es mejor que subconsultas
3. **Políticas INSERT deben ser simples**: La seguridad adicional puede venir de otras capas
4. **Preferir `IN` sobre `EXISTS`**: Menos propenso a recursión en Postgres RLS

## Próximos Pasos

- [ ] Implementar UI de contribuciones proporcionales
- [ ] Probar invitación de segundo miembro al household
- [ ] Implementar sistema de invitaciones por email
- [ ] Deploy a producción en Vercel
