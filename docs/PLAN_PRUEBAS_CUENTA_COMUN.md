# Plan de Pruebas - Sistema Cuenta Común

**Issues relacionados**: #17, #19
**Fecha**: 1 Noviembre 2025
**Estado**: � En ejecución (DB tests completados)

---

## 🎯 Objetivo

Validar que el sistema de Cuenta Común funciona correctamente:
1. Tabla `joint_accounts` creada y trigger funcionando
2. Transacciones de gasto común usan `paid_by = joint_account_uuid`
3. Transacciones de ingreso común usan `paid_by = member_uuid`
4. UI muestra correctamente "Cuenta Común" vs nombre de miembro
5. Las 24 transacciones corruptas se reparan correctamente (22 con UUID miembro + 2 con NULL)

---

## ✅ PRE-REQUISITOS

### Base de Datos DEV
- [x] Migración `20251101_214509_remove_unique_constraint` aplicada
- [x] Migración `20251101_130000_create_joint_accounts` aplicada
- [x] Tabla `joint_accounts` existe con 1 registro
- [x] Trigger `trigger_create_joint_account` instalado
- [x] Script de reparación `20251101_fix_paid_by_common_transactions.sql` ejecutado

### Aplicación
- [x] Código compilando sin errores
- [x] Servidor DEV funcionando (puerto 3001)
- [x] Usuario de prueba autenticado

---

## 📋 PRUEBAS DE BASE DE DATOS

### Test DB-1: Verificar Estructura
```sql
-- Ejecutar en DEV
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev

-- 1. Verificar tabla existe
\d joint_accounts

-- Resultado esperado:
-- Tabla con columnas: id (uuid), household_id (uuid), display_name (text), created_at (timestamptz)
```

**Estado**: ⬜ Pendiente
**Resultado**:

---

### Test DB-2: Verificar Trigger Auto-creación
```sql
-- 2. Verificar trigger instalado
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_create_joint_account';

-- Resultado esperado: 1 fila
```

**Estado**: ⬜ Pendiente
**Resultado**:

---

### Test DB-3: Verificar Joint Account Existente
```sql
-- 3. Ver joint account del hogar
SELECT ja.id, ja.household_id, ja.display_name, h.name as household_name
FROM joint_accounts ja
JOIN households h ON h.id = ja.household_id;

-- Resultado esperado: 1 fila con UUID y "Cuenta Común"
```

**Estado**: ⬜ Pendiente
**Resultado**:

---

### Test DB-4: Transacciones Corruptas (PRE-FIX)
```sql
-- 4. Contar transacciones con paid_by incorrecto
SELECT COUNT(*) as corrupted_count
FROM transactions t
WHERE t.flow_type = 'common'
  AND t.type = 'expense'
  AND (t.paid_by IS NULL OR t.paid_by NOT IN (SELECT id FROM joint_accounts));

-- Resultado esperado: 24 (22 con UUID miembro + 2 con NULL)
```

**Estado**: ✅ Completado
**Resultado**: 24 transacciones corruptas encontradas (Mercadona, Jamón, Día, Luz, Agua, etc.)

---

### Test DB-5: Ejecutar Script de Reparación
```bash
# Ejecutar script de reparación
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev \
  -f scripts/data-fixes/20251101_fix_paid_by_common_transactions.sql
```

**Pasos**:
1. ✅ Ejecutado PASO 1 (análisis) - 22 transacciones identificadas
2. ✅ Revisado output - datos correctos
3. ✅ Ejecutado PASO 2 (UPDATE) - 22 actualizadas
4. ✅ Verificado PASO 3 (verificación) - 0 incorrectas restantes
5. ✅ Corregidas 2 adicionales con paid_by = NULL

**Estado**: ✅ Completado
**Resultado**:
- 22 transacciones actualizadas (paid_by: UUID miembro → UUID joint_account)
- 2 transacciones adicionales actualizadas (paid_by: NULL → UUID joint_account)
- Total: 24 transacciones reparadas
- Monto total: 630.01€ (de las 22 principales)
- COMMIT exitoso

---

### Test DB-6: Transacciones Corruptas (POST-FIX)
```sql
-- Repetir query después de fix
SELECT COUNT(*) as corrupted_count
FROM transactions t
WHERE t.flow_type = 'common'
  AND t.type = 'expense'
  AND (t.paid_by IS NULL OR t.paid_by NOT IN (SELECT id FROM joint_accounts));

-- Resultado esperado: 0
```

**Estado**: ✅ Completado
**Resultado**: 0 transacciones incorrectas restantes. ✅ 24 gastos comunes con Cuenta Común.

---

### Test DB-5: Ejecutar Script de Reparación
```bash
# Ejecutar script de reparación
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_dev \
  -f scripts/data-fixes/20251101_fix_paid_by_common_transactions.sql
```

**Pasos**:
1. Ejecutar solo PASO 1 (análisis)
2. Revisar output (debe mostrar las 26 transacciones)
3. Descomentar PASO 2 en el script
4. Ejecutar completo (con UPDATE)
5. Verificar PASO 3 (verificación)

**Estado**: ⬜ Pendiente
**Resultado**:

---

### Test DB-6: Transacciones Corruptas (POST-FIX)
```sql
-- Repetir query después de fix
SELECT COUNT(*) as corrupted_count
FROM transactions t
WHERE t.flow_type = 'common'
  AND t.type = 'expense'
  AND t.paid_by NOT IN (SELECT id FROM joint_accounts);

-- Resultado esperado: 0
```

**Estado**: ⬜ Pendiente
**Resultado**:

---

## 🖥️ PRUEBAS DE INTERFAZ

### Test UI-1: Crear Gasto Común
**Ruta**: `/sickness/balance`

**Pasos**:
1. Click en "Nuevo Movimiento"
2. Seleccionar:
   - Tipo: Gasto común
   - Categoría: Cualquiera (ej: Supermercado)
   - Cantidad: 50.00€
   - Descripción: "Prueba Cuenta Común - Gasto"
3. Submit

**Verificación UI**:
- [ ] Transacción aparece en lista
- [ ] Muestra "Gastado por: Cuenta Común" (NO nombre de miembro)

**Verificación DB**:
```sql
SELECT id, type, flow_type, amount, description, paid_by
FROM transactions
WHERE description = 'Prueba Cuenta Común - Gasto'
ORDER BY occurred_at DESC LIMIT 1;

-- Verificar: paid_by = UUID de joint_accounts
-- Verificar: flow_type = 'common', type = 'expense'
```

**Estado**: ⬜ Pendiente
**Resultado**:

---

### Test UI-2: Crear Ingreso Común
**Ruta**: `/sickness/balance`

**Pasos**:
1. Click en "Nuevo Movimiento"
2. Seleccionar:
   - Tipo: Ingreso común
   - Miembro: Kava (o el usuario actual)
   - Cantidad: 100.00€
   - Descripción: "Prueba Cuenta Común - Ingreso"
3. Submit

**Verificación UI**:
- [ ] Transacción aparece en lista
- [ ] Muestra "Ingresado por: [Nombre del Miembro]" (NO "Cuenta Común")

**Verificación DB**:
```sql
SELECT id, type, flow_type, amount, description, paid_by
FROM transactions
WHERE description = 'Prueba Cuenta Común - Ingreso'
ORDER BY occurred_at DESC LIMIT 1;

-- Verificar: paid_by = UUID del miembro (NO joint_account)
-- Verificar: flow_type = 'common', type = 'income'
```

**Estado**: ⬜ Pendiente
**Resultado**:

---

### Test UI-3: Editar Transacción (No Alterar paid_by)
**Ruta**: `/sickness/balance`

**Pasos**:
1. Buscar la transacción creada en Test UI-1
2. Click en "Editar"
3. Cambiar cantidad a 75.00€
4. Submit

**Verificación DB**:
```sql
SELECT id, amount, paid_by
FROM transactions
WHERE description = 'Prueba Cuenta Común - Gasto'
ORDER BY occurred_at DESC LIMIT 1;

-- Verificar: amount = 75.00
-- Verificar: paid_by NO cambió (sigue siendo joint_account UUID)
```

**Estado**: ⬜ Pendiente
**Resultado**:

---

### Test UI-4: Visualizar Transacciones Reparadas
**Ruta**: `/sickness/balance`

**Pasos**:
1. Buscar transacciones de "Mercadona" o "Lavandería" (previamente corruptas)
2. Verificar que ahora muestran "Cuenta Común"

**Ejemplos a buscar**:
- Mercadona (varias entradas)
- Lavandería Blanca
- Sanikat

**Verificación**:
- [ ] Todas muestran "Cuenta Común" en el campo "Gastado por"
- [ ] Ninguna muestra "Kava" u otro nombre de miembro

**Estado**: ⬜ Pendiente
**Resultado**:

---

## 🔍 PRUEBAS DE API

### Test API-1: Endpoint Global Transactions
```bash
# Verificar que el JOIN con joint_accounts funciona
curl -X GET "http://localhost:3001/api/sickness/transactions/global?householdId=XXX" \
  -H "Cookie: auth-token=XXX" | jq '.transactions[] | select(.paid_by_display_name == "Cuenta Común")' | head -5
```

**Verificación**:
- [ ] Respuesta incluye campo `paid_by_display_name`
- [ ] Gastos comunes muestran "Cuenta Común"
- [ ] Ingresos comunes muestran nombre del miembro

**Estado**: ⬜ Pendiente
**Resultado**:

---

## 🧪 PRUEBAS DE CÓDIGO

### Test CODE-1: Helper getJointAccountId()
```typescript
// En consola del navegador o test unitario
import { getJointAccountId } from '@/lib/jointAccount';

const householdId = 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228'; // Tu household
const result = await getJointAccountId(householdId);

console.log(result);
// Esperado: { ok: true, data: "UUID de joint_account" }
```

**Estado**: ⬜ Pendiente
**Resultado**:

---

### Test CODE-2: Helper isJointAccountId()
```typescript
import { isJointAccountId } from '@/lib/jointAccount';

// Test con UUID de joint account (usar el de Test CODE-1)
const isJoint = await isJointAccountId('UUID_JOINT_ACCOUNT');
console.log(isJoint); // Esperado: true

// Test con UUID de miembro
const isMember = await isJointAccountId('5a27b943-84fb-453d-83fb-bf850883e767');
console.log(isMember); // Esperado: false
```

**Estado**: ⬜ Pendiente
**Resultado**:

---

## 📊 CRITERIOS DE ACEPTACIÓN

Para cerrar Issues #17 y #19, TODOS estos criterios deben cumplirse:

### Base de Datos
- [x] Tabla `joint_accounts` creada y operativa
- [x] Trigger auto-crea joint_accounts para nuevos households
- [ ] Script de reparación ejecutado sin errores
- [ ] 0 transacciones corruptas después de reparación

### Lógica de Negocio
- [ ] Gastos comunes usan `paid_by = joint_account_uuid`
- [ ] Ingresos comunes usan `paid_by = member_uuid`
- [ ] Edición de transacciones no altera `paid_by` incorrectamente

### Interfaz de Usuario
- [ ] TransactionCard muestra "Cuenta Común" para gastos comunes
- [ ] TransactionCard muestra nombre de miembro para ingresos comunes
- [ ] Transacciones previamente corruptas se visualizan correctamente

### API
- [ ] Endpoint `/api/sickness/transactions/global` incluye `paid_by_display_name`
- [ ] JOIN con `joint_accounts` funciona correctamente

### Testing
- [ ] Todas las pruebas de este plan ejecutadas y pasadas
- [ ] Sin errores de compilación
- [ ] Sin errores de runtime

---

## 🚀 DEPLOYMENT A PRODUCCIÓN

**SOLO después de que TODAS las pruebas pasen en DEV**:

### Paso 1: Aplicar Migraciones a PROD
```bash
# Orden importante: primero constraint, luego joint_accounts
./scripts/apply_migration.sh prod 20251101_214509_remove_unique_constraint_from_migrations_table_to_allow_retry_audit_trail.sql
./scripts/apply_migration.sh prod 20251101_130000_create_joint_accounts.sql
```

### Paso 2: Ejecutar Reparación en PROD
```bash
# IMPORTANTE: Revisar primero los datos de PROD (pueden ser diferentes a DEV)
psql -h 127.0.0.1 -U cuentassik_user -d cuentassik_prod \
  -f scripts/data-fixes/20251101_fix_paid_by_common_transactions.sql
```

### Paso 3: Reiniciar PROD
```bash
pm2 restart cuentassik-prod
```

### Paso 4: Verificación Post-Deploy
- [ ] PROD compila sin errores
- [ ] Ninguna regresión en funcionalidad existente
- [ ] Repetir Tests UI-4 en PROD (verificar transacciones corruptas reparadas)

---

## 📝 NOTAS

**Ejecutor**: _Nombre del tester_
**Fecha ejecución**: _DD/MM/YYYY_
**Entorno**: DEV → PROD
**Issues cerrados**: #17, #19 (solo después de completar TODO)

---

## ❌ ROLLBACK (Si algo falla)

### En caso de error crítico en PROD:

```sql
-- 1. Restaurar paid_by de transacciones (si es necesario)
BEGIN;
-- Usar backup creado por script de reparación
-- ...
ROLLBACK; -- o COMMIT si todo OK

-- 2. Si necesitas eliminar joint_accounts:
DROP TRIGGER IF EXISTS trigger_create_joint_account ON households CASCADE;
DROP FUNCTION IF EXISTS create_joint_account_for_household() CASCADE;
DROP FUNCTION IF EXISTS get_joint_account_id(UUID) CASCADE;
DROP TABLE IF EXISTS joint_accounts CASCADE;

-- 3. Revertir cambios en código (git revert)
git revert dcfd33d 6415f14
git push origin main
pm2 restart cuentassik-prod
```
