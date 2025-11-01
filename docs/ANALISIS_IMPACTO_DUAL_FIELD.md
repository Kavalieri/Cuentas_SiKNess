# Análisis de Impacto: Sistema Dual-Field en Transacciones

**Fecha**: 1 Noviembre 2025
**Contexto**: Implementación de tracking dual (origen + ejecutor) para transacciones

---

## 🎯 Nueva Especificación del Usuario

### Criterios Unificados

**Terminología estándar:**
- Gastos: "Gastado por"
- Ingresos: "Ingresado por"

**Sistema de campos duales:**

#### 1. Gastos Comunes (flow_type='common', type='expense')
```
Campo 1: "Gastado por" → Cuenta Común (origen del dinero)
Campo 2: "Realizado por" → Miembro que pasó la tarjeta
Display: "Gastado por Cuenta Común (realizado por Kava)"
```

#### 2. Ingresos Comunes (flow_type='common', type='income')
```
Campo 1: "Ingresado por" → Miembro (origen)
Campo 2: Destino implícito → Cuenta Común
Display: "Ingresado por Kava a Cuenta Común"
```

#### 3. Gastos Directos (flow_type='direct', type='expense_direct')
```
Campo 1: "Gastado por" → Cuenta Común (el dinero sale de ahí)
Campo 2: "Realizado por" → Miembro que gastó
Nota: El ingreso directo previo ya identifica quién puso el dinero
Display: "Gastado por Cuenta Común (realizado por Kava)"
```

---

## 📋 Cambios en Base de Datos

### Nueva Columna Requerida

```sql
ALTER TABLE transactions
ADD COLUMN performed_by_profile_id UUID REFERENCES profiles(id);

COMMENT ON COLUMN transactions.performed_by_profile_id IS
  'Miembro que FÍSICAMENTE ejecutó la transacción (pasó tarjeta, hizo ingreso).
   Complementa a paid_by (origen del dinero).';
```

### Semántica de Campos

| Campo | Significado | Valores Posibles |
|-------|-------------|------------------|
| `paid_by` | **Origen** del dinero | `joint_account_uuid` o `member_uuid` |
| `performed_by_profile_id` | **Ejecutor** físico | `member_uuid` (siempre un miembro real) |

### Lógica por Tipo de Transacción

| Tipo | paid_by | performed_by_profile_id | Display |
|------|---------|-------------------------|---------|
| Gasto Común | Cuenta Común | Miembro X | "Gastado por Cuenta Común (realizado por X)" |
| Ingreso Común | Miembro X | NULL o Miembro X | "Ingresado por X a Cuenta Común" |
| Gasto Directo | Cuenta Común | Miembro X | "Gastado por Cuenta Común (realizado por X)" |
| Ingreso Directo Compensatorio | Miembro X | NULL | "Compensación a X" |

---

## 🔍 Impacto en Issues Activas

### ✅ Issue #19: "Cuenta Común como entidad" - AMPLIAR

**Estado**: 🟢 Parcialmente implementado (single-field)
**Acción requerida**: ⚠️ **AMPLIAR** con sistema dual-field

**Cambios necesarios:**

#### 1. Migración adicional
```sql
-- Ya existe (Issue #19 original)
CREATE TABLE joint_accounts (...);

-- NUEVO (dual-field)
ALTER TABLE transactions
ADD COLUMN performed_by_profile_id UUID REFERENCES profiles(id);
```

#### 2. Helper `lib/jointAccount.ts` - AMPLIAR
```typescript
// Ya existe
export async function getJointAccountId(householdId: string): Promise<Result<string>>;

// NUEVO - No necesita cambios, solo documentar uso dual
```

#### 3. Formularios - MODIFICAR
```typescript
// ANTES (Issue #19 original)
if (type === 'expense' && flow === 'common') {
  paid_by = await getJointAccountId(householdId);
}

// DESPUÉS (dual-field)
if (type === 'expense' && flow === 'common') {
  paid_by = await getJointAccountId(householdId);           // Origen: Cuenta Común
  performed_by_profile_id = selectedMemberId;               // Ejecutor: Miembro
}
```

#### 4. TransactionCard - MODIFICAR
```typescript
// ANTES (Issue #19 original)
const paidBy = paid_by_is_joint_account ? 'Cuenta Común' : paidByName;

// DESPUÉS (dual-field)
const paidByDisplay = isCommonExpense
  ? `Cuenta Común (realizado por ${performedByName})`
  : isCommonIncome
    ? `${paidByName} a Cuenta Común`
    : paidByName;
```

**Estimación adicional**: +4 horas sobre Issue #19 original

---

### ✅ Issue #20: "Clarificar campos de trazabilidad" - RESOLVER

**Estado**: 🟡 Abierto (decisión pendiente sobre `performed_by_email`)
**Acción requerida**: ✅ **RESOLVER** - La nueva especificación responde esta issue

**Decisión tomada por usuario:**

**Opción C (RECOMENDADA)**: Crear `performed_by_profile_id`

**Alineamiento con nueva especificación:**
- ✅ `profile_id` = Quien **registró** en el sistema
- ✅ `paid_by` = **Origen** del dinero (Cuenta Común o Miembro)
- ✅ `performed_by_profile_id` = Quien **ejecutó físicamente** (nuevo)
- ✅ `real_payer_id` = Solo gastos directos (mantener)

**Acciones:**
1. Marcar Issue #20 como **RESUELTA** por esta especificación
2. Crear `performed_by_profile_id` según Issue #20 Opción C
3. Deprecar `performed_by_email` → `performed_by_email_deprecated`
4. Actualizar documentación según Issue #20 Fase 4

**Estimación**: 2 horas (ya planificada en Issue #20)

---

### ⚠️ Issue #18: "Compensación gastos directos" - MODIFICAR

**Estado**: 🟡 Investigación pendiente
**Acción requerida**: ⚠️ **MODIFICAR** según nuevo criterio

**Nueva especificación afecta a:**

#### Gastos Directos (expense_direct)
```typescript
// NUEVO criterio
paid_by = await getJointAccountId(householdId);  // Cuenta Común (el dinero sale de ahí)
performed_by_profile_id = memberId;              // Quien gastó
real_payer_id = memberId;                        // Mantener para compatibilidad
```

#### Ingresos Compensatorios (income)
```typescript
// NUEVO criterio
paid_by = memberId;                              // Crédito al miembro
performed_by_profile_id = NULL;                  // Sistema automático, no hay ejecutor físico
```

**Display esperado:**
- Gasto directo: "Gastado por Cuenta Común (realizado por Kava)"
- Ingreso compensatorio: "Compensación a Kava"

**Investigación adicional necesaria:**
1. Verificar que compensaciones heredan categoría del gasto directo
2. Asegurar que `paid_by` se asigna correctamente según nuevo criterio
3. Poblar `performed_by_profile_id` en creación de gastos directos

**Estimación adicional**: +2 horas sobre investigación original

---

### ❌ Issue #17: "Fix TransactionCard" - CERRADO

**Estado**: ✅ Cerrado (Issue #19 lo reemplazó)
**Acción requerida**: ❌ **NINGUNA** (ya resuelto)

**Nota**: Issue #17 era sobre display de categorías, no sobre paid_by dual-field.

---

### ❌ Issue #16: "Migración categorías" - NO AFECTA

**Estado**: 🟡 Abierto (migración de datos)
**Acción requerida**: ❌ **NO AFECTA** (trata sobre categorías, no paid_by)

**Nota**: Sistema dual-field no impacta migración de categorías/subcategorías.

---

### ❌ Issue #15: "Formulario encadenado" - MODIFICAR MENOR

**Estado**: 🟡 Abierto (recordar valores en formulario)
**Acción requerida**: ⚠️ **MODIFICAR MENOR** (añadir performed_by a valores recordados)

**Cambios necesarios:**
```typescript
// ANTES
const rememberedValues = {
  category_id,
  subcategory_id,
  group_id
};

// DESPUÉS
const rememberedValues = {
  category_id,
  subcategory_id,
  group_id,
  performed_by_profile_id  // NUEVO
};
```

**Estimación adicional**: +15 minutos

---

### ⚠️ Issue #14: "Validación campos formulario" - APLICAR A NUEVO CAMPO

**Estado**: 🟡 Abierto (validación de campos numéricos)
**Acción requerida**: ⚠️ **APLICAR** validación al nuevo selector `performed_by`

**Cambios necesarios:**
- Selector `performed_by_profile_id` debe ser **requerido** para gastos/ingresos comunes
- Validación Zod:
```typescript
performed_by_profile_id: z.string().uuid().optional()
  .refine((val) => {
    if ((flow_type === 'common' && type === 'expense') ||
        (flow_type === 'direct' && type === 'expense_direct')) {
      return val !== undefined;
    }
    return true;
  }, 'Selecciona quién realizó la transacción')
```

**Estimación adicional**: +30 minutos

---

### ❌ Issue #11: "Migración types gradual" - NO AFECTA

**Estado**: 🟡 Abierto (migración gradual types)
**Acción requerida**: ❌ **NO AFECTA** directamente

**Nota**: Los types autogenerados incluirán automáticamente `performed_by_profile_id` tras la migración.

---

## 📊 Resumen de Impacto

### Issues Que Requieren Modificación

| Issue | Título | Impacto | Esfuerzo Adicional |
|-------|--------|---------|---------------------|
| #19 | Cuenta Común | ⚠️ AMPLIAR | +4 horas |
| #20 | Trazabilidad | ✅ RESOLVER | +2 horas (ya estimado) |
| #18 | Compensaciones | ⚠️ MODIFICAR | +2 horas |
| #15 | Formulario encadenado | ⚠️ MENOR | +15 min |
| #14 | Validación | ⚠️ APLICAR | +30 min |

### Issues NO Afectadas

| Issue | Título | Motivo |
|-------|--------|--------|
| #17 | TransactionCard | Cerrado (reemplazado por #19) |
| #16 | Migración categorías | Trata sobre categorías, no paid_by |
| #11 | Migración types | Types autogenerados incluirán nuevo campo automáticamente |

---

## 🛠️ Plan de Implementación Consolidado

### Fase 1: Base de Datos (1 hora)

**Migración única que consolida Issue #19 + Issue #20:**

```sql
-- database/migrations/development/20251101_180000_add_performed_by_field.sql

-- 1. Añadir nueva columna
ALTER TABLE transactions
ADD COLUMN performed_by_profile_id UUID REFERENCES profiles(id);

COMMENT ON COLUMN transactions.performed_by_profile_id IS
  'Miembro que FÍSICAMENTE ejecutó la transacción (pasó tarjeta, hizo ingreso).
   - Gastos comunes: quien pasó la tarjeta
   - Ingresos comunes: quien hizo el ingreso (puede coincidir con paid_by)
   - Gastos directos: quien realizó el gasto
   - Ingresos compensatorios: NULL (automático del sistema)';

-- 2. Poblar datos existentes (inferencia razonable)
-- Gastos comunes: inferir del profile_id (quien registró, asumimos que también ejecutó)
UPDATE transactions
SET performed_by_profile_id = profile_id
WHERE flow_type = 'common'
  AND type = 'expense'
  AND performed_by_profile_id IS NULL;

-- Ingresos comunes: inferir del paid_by (quien ingresa)
UPDATE transactions
SET performed_by_profile_id = paid_by::uuid
WHERE flow_type = 'common'
  AND type = 'income'
  AND performed_by_profile_id IS NULL
  AND paid_by IS NOT NULL;

-- Gastos directos: inferir del real_payer_id
UPDATE transactions
SET performed_by_profile_id = real_payer_id
WHERE flow_type = 'direct'
  AND type = 'expense_direct'
  AND performed_by_profile_id IS NULL
  AND real_payer_id IS NOT NULL;

-- Ingresos compensatorios: dejar NULL (automático)
-- (No requiere update, ya es NULL por defecto)

-- 3. Deprecar performed_by_email (Issue #20)
ALTER TABLE transactions
RENAME COLUMN performed_by_email TO performed_by_email_deprecated;

COMMENT ON COLUMN transactions.performed_by_email_deprecated IS
  'DEPRECADO: Usar performed_by_profile_id en su lugar.
   Mantener temporalmente para auditoría/migración.';
```

---

### Fase 2: TypeScript Types (automático)

```bash
# Regenerar types tras migración
npm run types:generate:dev

# Resultado esperado en types/database.generated.ts:
export interface Transactions {
  id: string;
  paid_by: string | null;
  performed_by_profile_id: string | null;  // NUEVO
  performed_by_email_deprecated: string | null;  // Deprecado
  real_payer_id: string | null;
  // ... resto de campos
}
```

---

### Fase 3: Backend - Server Actions (2 horas)

#### lib/transactions/unified.ts

```typescript
// createCommonFlowTransaction
async function createCommonFlowTransaction(data: TransactionData) {
  let paid_by: string;
  let performed_by_profile_id: string | null = null;

  if (data.type === 'expense') {
    // Gastos comunes: Cuenta Común + Ejecutor
    const jointResult = await getJointAccountId(householdId);
    if (!jointResult.ok) return fail('No se pudo obtener la Cuenta Común');

    paid_by = jointResult.data;                          // Origen: Cuenta Común
    performed_by_profile_id = data.performed_by;          // Ejecutor: Miembro

    if (!performed_by_profile_id) {
      return fail('Selecciona quién realizó el gasto');
    }
  } else if (data.type === 'income') {
    // Ingresos comunes: Miembro → Cuenta Común
    if (!data.paid_by || data.paid_by === 'common') {
      return fail('Los ingresos comunes deben tener un miembro asignado');
    }

    paid_by = data.paid_by;                              // Origen: Miembro
    performed_by_profile_id = data.paid_by;              // Ejecutor: mismo (quien ingresa)
  }

  await query(
    `INSERT INTO transactions (
      paid_by,
      performed_by_profile_id,
      ...
    ) VALUES ($1, $2, ...)`,
    [paid_by, performed_by_profile_id, ...]
  );
}
```

#### app/sickness/dual-flow - Gastos Directos (Issue #18)

```typescript
// Crear gasto directo + compensación
async function createDirectExpense(data: DirectExpenseData) {
  const jointAccountId = await getJointAccountId(householdId);

  // 1. Gasto directo
  await query(
    `INSERT INTO transactions (
      flow_type,
      type,
      paid_by,
      performed_by_profile_id,
      real_payer_id,
      ...
    ) VALUES ('direct', 'expense_direct', $1, $2, $2, ...)`,
    [
      jointAccountId.data,        // paid_by: Cuenta Común (el dinero sale de ahí)
      data.member_id,             // performed_by: Quien gastó
      // real_payer_id = member_id (mantener para compatibilidad)
    ]
  );

  // 2. Ingreso compensatorio
  await query(
    `INSERT INTO transactions (
      flow_type,
      type,
      paid_by,
      performed_by_profile_id,  -- NULL: automático del sistema
      ...
    ) VALUES ('direct', 'income', $1, NULL, ...)`,
    [data.member_id]  // paid_by: Crédito al miembro
  );
}
```

---

### Fase 4: API Routes (1 hora)

#### app/api/sickness/transactions/global/route.ts

```sql
-- Añadir JOIN adicional para performed_by
LEFT JOIN profiles p_performer ON t.performed_by_profile_id = p_performer.id

-- Seleccionar campos
t.paid_by,
t.performed_by_profile_id,
CASE
  WHEN ja.id IS NOT NULL THEN ja.display_name
  WHEN p_paid.id IS NOT NULL THEN COALESCE(p_paid.display_name, p_paid.email)
  ELSE NULL
END as paid_by_display_name,
COALESCE(p_performer.display_name, p_performer.email) as performed_by_display_name,
ja.id IS NOT NULL as paid_by_is_joint_account
```

---

### Fase 5: Frontend - Formularios (2 horas)

#### Formulario Gasto/Ingreso Común

```typescript
// NUEVO: Selector "¿Quién realizó esta transacción?"
<Select
  value={performedBy}
  onValueChange={setPerformedBy}
>
  <SelectTrigger>
    <SelectValue placeholder={
      isExpense
        ? "¿Quién pasó la tarjeta?"
        : "¿Quién hizo el ingreso?"
    } />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value={currentUserId}>
      Yo ({currentUserName})
    </SelectItem>
    {otherMembers.map(member => (
      <SelectItem key={member.id} value={member.id}>
        {member.display_name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// Validación
const schema = z.object({
  performed_by_profile_id: z.string().uuid({
    message: isExpense
      ? 'Selecciona quién pasó la tarjeta'
      : 'Selecciona quién hizo el ingreso'
  })
});
```

#### Formulario Gasto Directo

```typescript
// NUEVO: Selector similar
<Select
  label="¿Quién realizó este gasto?"
  value={performedBy}
  onValueChange={setPerformedBy}
>
  {/* Similar al anterior */}
</Select>
```

---

### Fase 6: Frontend - Display (1 hora)

#### components/shared/TransactionCard.tsx

```typescript
const getPayerDisplay = () => {
  const {
    flow_type,
    type,
    paid_by_display_name,
    performed_by_display_name,
    paid_by_is_joint_account
  } = tx;

  // Gasto común
  if (flow_type === 'common' && type === 'expense') {
    return performed_by_display_name
      ? `Cuenta Común (realizado por ${performed_by_display_name})`
      : 'Cuenta Común';
  }

  // Ingreso común
  if (flow_type === 'common' && type === 'income') {
    return `${paid_by_display_name} a Cuenta Común`;
  }

  // Gasto directo
  if (flow_type === 'direct' && type === 'expense_direct') {
    return performed_by_display_name
      ? `Cuenta Común (realizado por ${performed_by_display_name})`
      : 'Cuenta Común';
  }

  // Ingreso compensatorio
  if (flow_type === 'direct' && type === 'income') {
    return `Compensación a ${paid_by_display_name}`;
  }

  // Fallback
  return paid_by_display_name || 'Desconocido';
};

// Usar en UI
<div className="text-sm text-muted-foreground">
  {isIncome ? 'Ingresado por' : 'Gastado por'}: {getPayerDisplay()}
</div>
```

---

### Fase 7: Testing (2 horas)

#### Test Suite Completo

**Test 1: Crear Gasto Común**
```typescript
// Input
{
  flow_type: 'common',
  type: 'expense',
  amount: 50,
  description: 'Mercadona',
  performed_by: 'kava_uuid'
}

// Expected DB
{
  paid_by: 'joint_account_uuid',
  performed_by_profile_id: 'kava_uuid'
}

// Expected Display
"Gastado por Cuenta Común (realizado por Kava)"
```

**Test 2: Crear Ingreso Común**
```typescript
// Input
{
  flow_type: 'common',
  type: 'income',
  amount: 600,
  description: 'Aportación mensual',
  paid_by: 'kava_uuid'
}

// Expected DB
{
  paid_by: 'kava_uuid',
  performed_by_profile_id: 'kava_uuid'
}

// Expected Display
"Ingresado por Kava a Cuenta Común"
```

**Test 3: Crear Gasto Directo**
```typescript
// Input
{
  flow_type: 'direct',
  type: 'expense_direct',
  amount: 60,
  description: 'Alquiler + Comunidad',
  performed_by: 'kava_uuid'
}

// Expected DB
{
  paid_by: 'joint_account_uuid',
  performed_by_profile_id: 'kava_uuid',
  real_payer_id: 'kava_uuid'
}

// Expected Display
"Gastado por Cuenta Común (realizado por Kava)"
```

**Test 4: Validación Formulario**
```typescript
// Gasto común sin performed_by
{
  flow_type: 'common',
  type: 'expense',
  amount: 50,
  performed_by: null  // ❌
}

// Expected Error
"Selecciona quién pasó la tarjeta"
```

**Test 5: Display de Transacciones Existentes**
```typescript
// Transacciones migradas (performed_by inferido)
// Verificar que NO se pierde información
// Verificar que display es consistente
```

---

### Fase 8: Deployment (30 min)

```bash
# 1. Aplicar migración en DEV
./scripts/apply_migration.sh dev 20251101_180000_add_performed_by_field.sql

# 2. Verificar tipos regenerados
npm run types:generate:dev

# 3. Testing manual en DEV
# (Ejecutar Test Suite arriba)

# 4. Promover a tested/
./scripts/promote_migration.sh 20251101_180000_add_performed_by_field.sql

# 5. Aplicar en PROD (con backup previo)
./scripts/apply_migration.sh prod 20251101_180000_add_performed_by_field.sql

# 6. Reiniciar PROD
pm2 restart cuentassik-prod
```

---

## 📋 Checklist Completo de Implementación

### Base de Datos
- [ ] Crear migración `20251101_180000_add_performed_by_field.sql`
- [ ] Añadir columna `performed_by_profile_id`
- [ ] Poblar datos existentes (inferencia)
- [ ] Deprecar `performed_by_email`
- [ ] Aplicar en DEV
- [ ] Regenerar types TypeScript
- [ ] Verificar constraints y comentarios

### Backend
- [ ] Actualizar `lib/transactions/unified.ts` (gastos/ingresos comunes)
- [ ] Actualizar `app/sickness/balance/actions.ts` (edición)
- [ ] Actualizar `app/sickness/dual-flow/*/actions.ts` (gastos directos)
- [ ] Actualizar API route `global/route.ts` (query + JOIN)
- [ ] Añadir validación Zod para `performed_by_profile_id`

### Frontend
- [ ] Añadir selector "¿Quién realizó?" en formulario gastos comunes
- [ ] Añadir selector "¿Quién realizó?" en formulario ingresos comunes
- [ ] Añadir selector "¿Quién realizó?" en formulario gastos directos
- [ ] Actualizar `TransactionCard.tsx` con display dual
- [ ] Actualizar formulario encadenado (Issue #15) - recordar performed_by
- [ ] Cambiar "Pagador" → "Gastado por" / "Ingresado por" (todos los componentes)

### Testing
- [ ] Test 1: Crear gasto común con ejecutor
- [ ] Test 2: Crear ingreso común
- [ ] Test 3: Crear gasto directo con ejecutor
- [ ] Test 4: Validación formulario (performed_by requerido)
- [ ] Test 5: Display de transacciones existentes (migradas)
- [ ] Test 6: Edición de transacciones (mantener performed_by)
- [ ] Test 7: Formulario encadenado (recordar performed_by)

### Deployment
- [ ] Backup DEV
- [ ] Aplicar migración DEV
- [ ] Testing completo en DEV
- [ ] Promover migración a tested/
- [ ] Backup PROD (OBLIGATORIO)
- [ ] Aplicar migración PROD
- [ ] Reiniciar PROD
- [ ] Verificar en PROD

### Documentación
- [ ] Actualizar Issue #19 con cambios duales
- [ ] Cerrar Issue #20 (resuelta por esta implementación)
- [ ] Actualizar Issue #18 con nuevo criterio gastos directos
- [ ] Actualizar `database/README.md` con nuevo campo
- [ ] Actualizar `.github/copilot-instructions.md`
- [ ] Crear `docs/TRANSACTION_DUAL_FIELD.md` con guía completa

### Issues a Actualizar
- [ ] Actualizar Issue #19 con scope ampliado
- [ ] Cerrar Issue #20 como resuelto
- [ ] Actualizar Issue #18 con nuevo criterio
- [ ] Actualizar Issue #15 (menor)
- [ ] Actualizar Issue #14 (menor)

---

## 📊 Estimación Total

| Fase | Descripción | Tiempo |
|------|-------------|--------|
| 1 | Base de Datos (migración) | 1 hora |
| 2 | Types (automático) | 5 min |
| 3 | Backend (server actions) | 2 horas |
| 4 | API Routes | 1 hora |
| 5 | Frontend (formularios) | 2 horas |
| 6 | Frontend (display) | 1 hora |
| 7 | Testing | 2 horas |
| 8 | Deployment | 30 min |
| 9 | Documentación | 1 hora |
| **TOTAL** | | **~10-11 horas** |

**Prioridad**: 🔴 ALTA (requisito del usuario para cerrar bloque)
**Riesgo**: 🟡 MEDIO (cambio estructural, pero bien planificado)

---

## ✅ Criterios de Aceptación Final

### Funcionalidad
- ✅ Gastos comunes muestran: "Gastado por Cuenta Común (realizado por X)"
- ✅ Ingresos comunes muestran: "Ingresado por X a Cuenta Común"
- ✅ Gastos directos muestran: "Gastado por Cuenta Común (realizado por X)"
- ✅ Formularios solicitan "¿Quién realizó?" cuando aplica
- ✅ Validación requiere performed_by en gastos/ingresos comunes y directos

### Base de Datos
- ✅ Columna `performed_by_profile_id` existe y tiene datos
- ✅ Datos históricos migrados (inferencia razonable)
- ✅ `performed_by_email` deprecado pero preservado

### Código
- ✅ Compilación TypeScript limpia
- ✅ Linters sin errores
- ✅ Types autogenerados incluyen nuevo campo
- ✅ No quedan referencias a "Pagador" (solo "Gastado por" / "Ingresado por")

### Testing
- ✅ Todos los tests pasan (7 tests definidos)
- ✅ Testing manual exitoso en DEV
- ✅ Testing manual exitoso en PROD (post-deploy)

### Documentación
- ✅ Issues actualizadas (#19, #20, #18, #15, #14)
- ✅ README actualizado
- ✅ Copilot instructions actualizadas
- ✅ Guía de uso documentada

---

## 🚀 Siguiente Paso Inmediato

**EMPEZAR POR:**

1. **Crear migración** (`20251101_180000_add_performed_by_field.sql`)
2. **Aplicar en DEV**
3. **Regenerar types**
4. **Actualizar un formulario simple** (gasto común) como PoC
5. **Verificar que funciona end-to-end**
6. **Continuar con resto de fases**

---

**¿Proceder con Fase 1 (Migración)?**
