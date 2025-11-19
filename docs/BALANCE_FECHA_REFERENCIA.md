# Balance - Fecha de Referencia Mostrada

**Fecha:** 19 Noviembre 2025
**Autor:** AI Assistant

---

## 📅 Fecha Mostrada: 4 de Noviembre 2025

### Consulta SQL

```sql
SELECT performed_by_profile_id, MAX(occurred_at) as last_transaction
FROM transactions
WHERE household_id = '...'
GROUP BY performed_by_profile_id;
```

**Resultado:**

- **Kava**: 2025-11-04
- **Sarini13**: 2025-11-04

### Transacciones del 4 de Noviembre

| Fecha      | Descripción                    | Monto   | Tipo    | Miembro  |
| ---------- | ------------------------------ | ------- | ------- | -------- |
| 2025-11-04 | Ingreso                        | €150.36 | income  | Sarini13 |
| 2025-11-04 | (sin desc.)                    | €21.84  | expense | Kava     |
| 2025-11-04 | (sin desc.)                    | €25.75  | expense | Sarini13 |
| 2025-11-04 | Desatascador, olla y coladores | €18.90  | expense | Kava     |

### Contexto de Períodos

| Período        | Fase       | Cerrado             |
| -------------- | ---------- | ------------------- |
| Octubre 2025   | **closed** | 2025-11-02 21:49:31 |
| Noviembre 2025 | **active** | (abierto)           |

---

## 🔍 Interpretación

La fecha **4 de noviembre 2025** corresponde a:

1. **Últimas transacciones registradas** en el sistema para ambos miembros
2. **Noviembre ya estaba activo** (octubre cerrado el 2 nov)
3. **NO es fecha de cierre/validación**, sino última actividad real

### Por Qué Aparece Esta Fecha

La implementación en `lib/balance/queries.ts` (líneas 107-118) consulta:

```typescript
const lastTransactionRes = await query(
  `SELECT performed_by_profile_id as profile_id,
          MAX(occurred_at) as last_transaction
   FROM transactions
   WHERE household_id = $1
   GROUP BY performed_by_profile_id`,
  [householdId],
);
```

**Resultado:** Muestra la fecha de la **última transacción ejecutada** por cada miembro, independientemente de:

- Estado del período (abierto/cerrado)
- Fase del período (validation/active/closed)
- Tipo de transacción (income/expense/direct)

---

## ✅ Comportamiento Esperado vs Actual

### Actual (Correcto) ✅

- **Fecha mostrada**: 4 noviembre 2025
- **Fuente**: Última transacción (`MAX(occurred_at)`)
- **Aplica a**: Cada miembro individualmente

### Alternativas Consideradas ❌

**Opción 1: Fecha de cierre del último período**

- Problema: Octubre cerró el 2 nov, pero hubo transacciones el 4 nov
- No refleja actividad reciente

**Opción 2: Fecha actual**

- Problema: No informa cuándo fue la última actividad
- Menos útil para el usuario

**Opción 3: Fecha de validación/contribución**

- Problema: Períodos contribution_disabled no tienen esta fecha
- Inconsistente entre períodos

---

## 📝 Conclusión

**Decisión Final:** Mantener fecha de última transacción (`MAX(occurred_at)`)

**Justificación:**

1. ✅ Refleja actividad real más reciente
2. ✅ Consistente para todos los períodos (incluidos contribution_disabled)
3. ✅ Útil para auditoría ("¿cuándo fue el último movimiento?")
4. ✅ No confunde con fechas de cierre de período

**Para Futuras Necesidades:**

Si se requiere mostrar diferentes fechas contextuales:

- **Última transacción**: `MAX(occurred_at)` (actual ✅)
- **Cierre de período**: `monthly_periods.closed_at`
- **Última validación**: `monthly_periods.opened_at` o fase change
- **Fecha actual**: `new Date()` (evitar, menos útil)

---

## 🔧 Implementación Técnica

**Archivo:** `lib/balance/queries.ts` (líneas 107-124)

```typescript
// Query para última transacción
const lastTransactionRes = await query<{
  profile_id: string;
  last_transaction: string;
}>(
  `
    SELECT performed_by_profile_id as profile_id,
           MAX(occurred_at) as last_transaction
    FROM transactions
    WHERE household_id = $1
    GROUP BY performed_by_profile_id
  `,
  [householdId],
);

// Map para asignar a cada miembro
const lastTransactionMap = new Map(
  lastTransactionRes.rows.map((r) => [r.profile_id, r.last_transaction]),
);

// En members.map():
last_updated_at: lastTransactionMap.get(m.profile_id) || new Date().toISOString(),
```

**Formato en UI:** Convertido a texto legible mediante `format.ts`:

```typescript
export function formatDate(dateStr: string): string {
  // "2025-11-04" → "4 nov"
}
```

---

**Última actualización:** 19 Noviembre 2025
**Estado:** ✅ DOCUMENTADO Y VALIDADO
