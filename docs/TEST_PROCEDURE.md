# Pasos para Prueba Limpia con Nuevas Funcionalidades

## 🎯 Objetivo
Probar desde cero el sistema de contribuciones con pre-pagos y movimientos automáticos duales, partiendo de un estado limpio pero con usuarios ya configurados.

## 📋 Pasos a Seguir

### 1. Ejecutar Wipe Selectivo

**En Supabase SQL Editor**:
1. Abre [Supabase SQL Editor](https://supabase.com/dashboard/project/fizxvvtakvmmeflmbwud/sql)
2. Copia y pega el contenido de `db/wipe_data_preserve_users.sql`
3. Ejecuta el script (Run)
4. Verifica el output en la consola:
   ```
   ✓ Household created: Casa Test
   ✓ Members added: 2 users
   ✓ Active household set for both users
   ✓ Default categories created: 10 categories
   ```

**Estado después del wipe**:
- ✅ Usuarios preservados: fumetas.sik, caballeropomes
- ✅ System admins preservados
- ✅ Hogar "Casa Test" creado (vacío)
- ✅ 2 miembros: 1 owner (fumetas), 1 member (caballero)
- ✅ 10 categorías por defecto
- ✅ Active household configurado
- ❌ Sin transacciones, contribuciones, ajustes, ingresos

### 2. Reiniciar Servidor de Desarrollo

```bash
# Si está corriendo, detener con Ctrl+C
npm run dev
```

### 3. Login y Verificar Estado Inicial

1. Login como owner (fumetas.sik@gmail.com)
2. Deberías ver:
   - Dashboard vacío (sin movimientos)
   - Balance: 0,00 €
   - Ingresos del mes: 0,00 €
   - Gastos del mes: 0,00 €

### 4. Probar Privacy Mode (Nuevo)

1. En el header, verás nuevo botón **Eye** (👁️) junto al tema
2. Haz click → todas las cantidades se ocultan como `•••`
3. Haz click de nuevo → se muestran normalmente
4. Recarga página → debe mantener la preferencia (localStorage)

### 5. Configurar Ingresos de los Miembros

**En Contribuciones → pestaña "Configuración"**:

1. **Configurar ingresos**:
   - Fumetas: 1150 €/mes
   - Caballero: 1500 €/mes
   
2. **Configurar meta mensual**: 1200 €

3. **Crear contribuciones del mes actual**:
   - Click en "Calcular Contribuciones"
   - Verifica cálculos proporcionales:
     - Fumetas: ~520,75 € (43.4%)
     - Caballero: ~679,25 € (56.6%)

### 6. Crear Ajuste de Pre-pago (Clave del Test)

**En Contribuciones → sección "Ajustes de Contribución"**:

1. Click en **"Agregar Ajuste"**
2. Configurar:
   - **Miembro**: fumetas.sik@gmail.com
   - **Tipo de Ajuste**: Pre-pago
   - **Monto**: `-350` (negativo = descuento)
   - **Categoría**: Vivienda
   - **Razón**: "Pago de piso octubre 2025"
3. Click en **"Agregar Ajuste"**

**El sistema debe crear automáticamente 2 movimientos**:

**Movimiento 1 - Gasto**:
- Tipo: Expense
- Categoría: 🏠 Vivienda
- Monto: -350,00 €
- Descripción: "Pago de piso octubre 2025 [Pre-pago]"

**Movimiento 2 - Ingreso Virtual**:
- Tipo: Income
- Categoría: (ninguna)
- Monto: +350,00 €
- Descripción: "Aporte virtual 10/2025 - fumetas.sik@gmail.com [Ajuste: Pago de piso octubre 2025]"

### 7. Verificar Cálculos Actualizados

**En Contribuciones → Tu Contribución (fumetas)**:
- **Base**: 520,75 €
- **Ajustes**: -350,00 €
- **Total esperado**: **170,75 €** ✅
- **Ya pagado**: 0,00 €
- **Pendiente**: 170,75 €
- **Estado**: Pendiente

**En Contribuciones → Resumen del Hogar**:
- **Meta mensual**: 1200,00 €
- **Total recaudado**: **350,00 €** (el pre-pago ya cuenta) ✅
- **Pendiente**: 850,00 €

### 8. Registrar Pagos al Fondo Común

**Fumetas** (desde su tarjeta):
1. Click en "Registrar Pago"
2. Monto: 170,75 €
3. Click en "Marcar como Pagado"

**Caballero** (como owner, desde lista de miembros):
1. Buscar a caballero en la lista
2. Click en "Registrar Pago"
3. Monto: 680 € (un poco más de lo esperado)
4. Marcar como pagado

**Se deben crear 2 movimientos más**:
- Ingreso: +170,75 € - "Contribución mensual 10/2025 - fumetas.sik@gmail.com"
- Ingreso: +680,00 € - "Contribución mensual 10/2025 - caballeropomes@gmail.com"

### 9. Verificar Estado Final

**Dashboard**:
- **Ingresos del Mes**: **1200,75 €** ✅
  - 350 € (pre-pago fumetas)
  - 170,75 € (pago fumetas)
  - 680 € (pago caballero)
- **Gastos del Mes**: **350,00 €** ✅
  - 350 € (vivienda pagada por fumetas)
- **Balance del Mes**: **850,75 €** ✅

**Contribuciones → Resumen del Hogar**:
- **Meta mensual**: 1200,00 €
- **Total recaudado**: **1200,75 €** ✅
- **Pendiente**: **0,00 €** o "Meta alcanzada" ✅

**Contribuciones → Fumetas**:
- Total esperado: 170,75 €
- Ya pagado: 170,75 €
- Estado: **Pagado** ✅

**Contribuciones → Caballero**:
- Total esperado: 679,25 €
- Ya pagado: 680,00 €
- Estado: **Aporte Extra** ✅

**Últimos Movimientos** (4 totales):
1. 🏠 Vivienda (Gasto): -350,00 € - "Pago de piso octubre 2025 [Pre-pago]"
2. 💰 Nómina (Ingreso): +350,00 € - "Aporte virtual 10/2025 - fumetas..."
3. 💰 Nómina (Ingreso): +170,75 € - "Contribución mensual 10/2025 - fumetas..."
4. 💰 Nómina (Ingreso): +680,00 € - "Contribución mensual 10/2025 - caballero..."

### 10. Probar Eliminación de Ajuste (Si es necesario)

**Si quieres probar la limpieza**:
1. Ve a Contribuciones → Ajustes de Contribución
2. Busca el ajuste de -350 € (vivienda)
3. Click en 🗑️ Eliminar
4. Confirma: "¿Eliminar este ajuste? Se eliminarán también los movimientos asociados."
5. Verifica que se eliminan:
   - El ajuste
   - El movimiento de gasto (-350€)
   - El movimiento de ingreso virtual (+350€)
6. Verifica que los cálculos vuelven a los valores sin ajuste:
   - Fumetas esperado: 520,75 € (base sin ajuste)
   - Total recaudado: 850,75 € (sin el pre-pago)

## ✅ Checklist de Funcionalidades a Verificar

- [ ] Wipe preserva usuarios pero limpia datos
- [ ] Hogar "Casa Test" se crea automáticamente
- [ ] 10 categorías por defecto creadas
- [ ] Privacy Mode oculta cantidades con toggle
- [ ] Privacy Mode persiste en localStorage
- [ ] Ajuste tipo pre-pago crea 2 movimientos automáticamente
- [ ] Movimiento de gasto tiene [Pre-pago] en descripción
- [ ] Movimiento de ingreso virtual tiene email y [Ajuste: razón]
- [ ] Total recaudado incluye ingresos virtuales de pre-pagos
- [ ] Dashboard muestra ingresos correctos (1200,75€)
- [ ] Contribución individual calcula correctamente (170,75€ fumetas)
- [ ] Status se actualiza a "Pagado" cuando se completa
- [ ] Eliminación de ajuste limpia ambos movimientos
- [ ] UI se actualiza inmediatamente sin recargar (router.refresh)

## 📊 Valores Esperados del Test

| Concepto | Valor Esperado |
|----------|----------------|
| **Fumetas base** | 520,75 € |
| **Fumetas ajuste** | -350,00 € |
| **Fumetas esperado** | 170,75 € |
| **Fumetas pagado** | 170,75 € |
| **Caballero esperado** | 679,25 € |
| **Caballero pagado** | 680,00 € |
| **Pre-pago (vivienda)** | 350,00 € |
| **Total recaudado** | 1200,75 € |
| **Total ingresos** | 1200,75 € |
| **Total gastos** | 350,00 € |
| **Balance final** | 850,75 € |

## 🐛 Problemas Conocidos a Verificar

- ⚠️ Si el ajuste antiguo aún aparece después del wipe, significa que el script no se ejecutó correctamente
- ⚠️ Si los movimientos no se crean al agregar el ajuste, revisar logs del servidor
- ⚠️ Si el total recaudado no incluye el pre-pago, verificar la query de ingresos en `page.tsx`

## 🎓 Notas Técnicas

**Trigger Automático**: `update_contribution_adjustments_total()`
- Se ejecuta automáticamente al INSERT/UPDATE/DELETE en `contribution_adjustments`
- Recalcula `adjustments_total` y `expected_amount` en `contributions`
- NO necesita intervención manual

**Lógica de Cálculo**:
```
expected_amount = base_amount + adjustments_total
remainingToPay = expected_amount - paid_amount
totalPaid = Σ(ingresos del mes) // incluye virtuales automáticamente
```

**Server Actions Involucrados**:
- `addContributionAdjustment()` → crea ajuste + movimientos duales
- `deleteContributionAdjustment()` → elimina ajuste + movimientos asociados
- `recordContributionPayment()` → crea movimiento de ingreso
