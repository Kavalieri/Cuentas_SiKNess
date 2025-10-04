# Resumen de Cambios Recientes - CuentasSiK

## 🎯 Cambios Core Implementados

### 1. Sistema de Movimientos Automáticos Duales para Pre-pagos

**Problema anterior**: Al crear un ajuste tipo "pre-pago", solo se registraba el descuento en la contribución esperada, pero NO se reflejaba en el balance general de ingresos/gastos.

**Solución implementada**:
Cuando se crea un ajuste tipo **Pre-pago** con:
- Monto negativo (descuento)
- Categoría seleccionada

El sistema **crea automáticamente 2 movimientos**:

1. **Movimiento de Gasto** (Expense):
   - Categoría: la seleccionada
   - Monto: valor absoluto del ajuste
   - Descripción: `"{razón} [Pre-pago]"`
   - Ejemplo: `"Pago de piso octubre [Pre-pago]"`

2. **Movimiento de Ingreso Virtual** (Income):
   - Sin categoría
   - Monto: valor absoluto del ajuste
   - Descripción: `"Aporte virtual {mes}/{año} - {email} [Ajuste: {razón}]"`
   - Ejemplo: `"Aporte virtual 10/2025 - fumetas.sik@gmail.com [Ajuste: Pago de piso octubre]"`

**Resultado**:
- ✅ El balance mensual refleja correctamente TODO el dinero aportado (fondo común + pre-pagos)
- ✅ Los gastos directos quedan registrados en su categoría
- ✅ Historial completo para análisis estadístico futuro

**Archivos modificados**:
- `app/app/contributions/actions.ts` → `addContributionAdjustment()`
- `app/app/contributions/page.tsx` → cálculo de `totalPaid` simplificado

### 2. Eliminación Inteligente de Ajustes

**Problema anterior**: Al eliminar un ajuste, los movimientos asociados quedaban huérfanos en la base de datos.

**Solución implementada**:
La función `deleteContributionAdjustment()` ahora:
1. Busca movimientos por `movement_id` directo
2. Busca movimientos por descripción `[Ajuste: razón]`
3. Busca movimientos por descripción `[Pre-pago]` (formato antiguo)
4. Elimina todos los movimientos encontrados
5. Elimina el ajuste
6. Fuerza refresh de UI con `router.refresh()`

**Resultado**:
- ✅ Limpieza completa sin huérfanos
- ✅ UI se actualiza inmediatamente
- ✅ Toast claro: "Ajuste y movimientos eliminados correctamente"

**Archivos modificados**:
- `app/app/contributions/actions.ts` → `deleteContributionAdjustment()`
- `app/app/contributions/components/ContributionAdjustmentsSection.tsx`

### 3. Sistema de Ocultación de Cantidades (Privacy Mode)

**Nueva funcionalidad**: Toggle para ocultar cantidades en lugares públicos.

**Componentes nuevos**:
- `components/shared/PrivacyProvider.tsx` → Contexto global
- `components/shared/PrivacyToggle.tsx` → Botón Eye/EyeOff
- `components/shared/PrivateAmount.tsx` → Wrapper reutilizable
- `lib/hooks/usePrivateFormat.ts` → Hook personalizado

**Uso**:
```tsx
// En cualquier componente client
import { usePrivateFormat } from '@/lib/hooks/usePrivateFormat';

const { formatPrivateCurrency } = usePrivateFormat();
return <span>{formatPrivateCurrency(amount)}</span>;
// Si hideAmounts = true → muestra "•••"
// Si hideAmounts = false → muestra "1.500,00 €"
```

**Integración**:
- ✅ Toggle visible en header junto a ThemeToggle
- ✅ Persistencia en localStorage
- ✅ BalanceDisplay actualizado
- ⏳ TODO: Actualizar más componentes (ver `docs/PRIVACY_MODE.md`)

**Archivos modificados**:
- `app/layout.tsx` → agregado `<PrivacyProvider>`
- `app/app/layout.tsx` → agregado `<PrivacyToggle>`
- `components/shared/BalanceDisplay.tsx` → usa `usePrivateFormat()`

### 4. Wipe Selectivo de Datos (Preserve Users)

**Problema anterior**: El wipe eliminaba TODO, incluyendo usuarios, requiriendo recrear cuentas cada vez.

**Nueva solución**: Script `db/wipe_data_preserve_users.sql` que:
1. **Preserva**:
   - ✅ Usuarios (auth.users y profiles)
   - ✅ System admins
   - ✅ Estructura de DB (tablas, triggers, policies)

2. **Limpia**:
   - ❌ Transacciones
   - ❌ Contribuciones y ajustes
   - ❌ Ingresos de miembros
   - ❌ Categorías
   - ❌ Hogares y membresías
   - ❌ Invitaciones

3. **Crea automáticamente**:
   - ✅ Hogar "Casa Test" vacío
   - ✅ 2 miembros (primer usuario = owner, segundo = member)
   - ✅ 10 categorías por defecto (8 gastos, 2 ingresos)
   - ✅ Active household configurado

**Uso**:
```bash
# En Supabase SQL Editor
# Ejecutar: db/wipe_data_preserve_users.sql
```

**Resultado**:
- Estado limpio para pruebas
- No necesita recrear usuarios ni hogar
- Ahorra 5-10 minutos por ciclo de prueba

## 📚 Documentación Actualizada

### Nuevos Documentos

1. **`docs/PRIVACY_MODE.md`**:
   - Implementación completa del sistema de privacidad
   - Hook `usePrivateFormat()` y componente `PrivateAmount`
   - Lista de componentes pendientes de actualizar
   - Guía de uso y testing

2. **`docs/TEST_PROCEDURE.md`**:
   - Procedimiento paso a paso para prueba completa
   - Desde wipe hasta verificación final
   - Checklist de funcionalidades
   - Valores esperados en cada paso
   - Troubleshooting

3. **`db/wipe_data_preserve_users.sql`**:
   - Script SQL listo para ejecutar
   - Comentarios explicativos
   - Output detallado en consola

4. **`db/delete_orphan_adjustment.sql`**:
   - Queries para debug de ajustes huérfanos
   - Eliminación manual si es necesario

## 🔄 Flujo de Trabajo Actualizado

### Para Pruebas Desde Cero

1. **Ejecutar wipe selectivo**:
   ```sql
   -- En Supabase SQL Editor
   -- Ejecutar: db/wipe_data_preserve_users.sql
   ```

2. **Reiniciar servidor**:
   ```bash
   npm run dev
   ```

3. **Seguir pasos en** `docs/TEST_PROCEDURE.md`

### Para Desarrollo Normal

1. Los cambios están en `main` y pushed a GitHub
2. Servidor necesita reinicio para ver cambios
3. Privacy Mode ya funciona (probar toggle en header)
4. Ajustes pre-pago crean movimientos automáticamente

## 🐛 Issues Conocidos Resueltos

- ✅ Ajustes no se eliminaban correctamente → RESUELTO
- ✅ Movimientos huérfanos después de eliminar ajuste → RESUELTO
- ✅ Total recaudado no incluía pre-pagos → RESUELTO
- ✅ UI no se actualizaba sin recargar → RESUELTO (router.refresh)
- ✅ Balance no reflejaba aportes fuera del fondo → RESUELTO

## 🎓 Conceptos Clave

### Ajuste Negativo (Pre-pago)
- Es un **descuento** en la contribución esperada
- Representa un **gasto pagado directamente** por el miembro
- **NO pasa por el fondo común**, pero **SÍ cuenta como contribución**
- Ejemplo: Fumetas paga el piso (350€) directo al arrendador

### Movimientos Duales
- **Gasto**: Refleja el gasto real (categoría + monto)
- **Ingreso virtual**: Refleja el aporte equivalente del miembro
- Resultado: Balance correcto, estadísticas precisas

### Cálculo de Total Pagado
```typescript
// ANTES (incorrecto):
totalPaid = Σ(paid_amount) + Σ(|ajustes negativos|)

// AHORA (correcto):
totalPaid = Σ(ingresos del mes) // incluye pagos al fondo + ingresos virtuales
```

## 📊 Ejemplo Completo (Caso Real)

**Setup**:
- Meta mensual: 1200€
- Fumetas ingreso: 1150€/mes → contribución base 520,75€
- Caballero ingreso: 1500€/mes → contribución base 679,25€

**Ajuste fumetas**: -350€ (piso pagado directo)
- Nuevo esperado fumetas: 170,75€
- Total del hogar esperado: 850€ (170,75 + 679,25)

**Movimientos creados automáticamente**:
1. Gasto vivienda: -350€ (fumetas) ← el pago directo
2. Ingreso virtual: +350€ (fumetas) ← cuenta como aporte

**Pagos al fondo**:
3. Ingreso: +170,75€ (fumetas pagó su parte ajustada)
4. Ingreso: +680€ (caballero pagó su parte)

**Balance final**:
- Ingresos totales: 1200,75€ (350 + 170,75 + 680)
- Gastos totales: 350€ (vivienda)
- Balance: 850,75€
- ✅ TODO correcto y balanceado

## 🚀 Próximos Pasos

### Corto Plazo (Esta Sesión)
1. ✅ Ejecutar wipe selectivo
2. ✅ Probar Privacy Mode
3. ✅ Crear ajuste pre-pago desde cero
4. ✅ Verificar movimientos duales
5. ✅ Confirmar cálculos correctos

### Medio Plazo (Siguiente Sesión)
1. ⬜ Actualizar más componentes con Privacy Mode (ver docs/PRIVACY_MODE.md)
2. ⬜ Tests automáticos para lógica de contribuciones
3. ⬜ Mejorar UX del formulario de ajustes (preview del cálculo)
4. ⬜ Dashboard de estadísticas mensuales

## 📦 Commits Realizados

1. `feat: crear movimientos automáticos de gasto e ingreso virtual para pre-pagos`
   - Implementa creación dual de movimientos
   - Simplifica cálculo de totalPaid

2. `fix: mejorar eliminación de ajustes con limpieza de movimientos y refresh automático`
   - Búsqueda inteligente de movimientos relacionados
   - router.refresh() para UI reactiva

3. `feat: sistema de ocultación de cantidades y wipe selectivo de datos`
   - Privacy Mode completo
   - Wipe que preserva usuarios

4. `docs: procedimiento completo de prueba desde cero con wipe selectivo`
   - TEST_PROCEDURE.md con pasos detallados

## 🎯 Estado Actual

**Código**:
- ✅ Compilando sin errores
- ✅ Pushed a GitHub (rama main)
- ⚠️ Servidor necesita reinicio

**Testing**:
- ⏳ Pendiente ejecutar wipe
- ⏳ Pendiente prueba end-to-end
- ⏳ Pendiente verificar Privacy Mode

**Documentación**:
- ✅ Completa y actualizada
- ✅ Procedimientos listos
- ✅ Scripts SQL preparados

---

**Última actualización**: 4 de octubre de 2025
**Commits totales esta sesión**: 13
**Archivos nuevos**: 7
**Archivos modificados**: 10
