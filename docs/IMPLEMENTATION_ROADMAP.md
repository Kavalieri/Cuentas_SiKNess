# Plan de Implementación - Sistema Financiero Profesional Completo

**Fecha**: 7 octubre 2025  
**Objetivo**: Crear un sistema robusto de gestión financiera para parejas con contribuciones, créditos, ahorro y exportación.

---

## 📊 **ESTADO ACTUAL - YA IMPLEMENTADO**

### Base de Datos ✅
- `monthly_periods`: Gestión de cierre mensual (future/active/closing/closed/historical)
- `member_credits`: Créditos con decisión flexible (`monthly_decision`: apply_to_month | keep_active | transfer_to_savings)
- `household_savings`: Fondo de ahorro común con metas
- `savings_transactions`: Historial completo con balance tracking
- `contribution_adjustments`: Ajustes manuales con auditoría
- `transactions`: Sistema completo con ownership, split, estados, auditoría

### Funciones SQL ✅
- `ensure_monthly_period()`: Crea período si no existe
- `close_monthly_period()`: Cierra mes, bloquea transactions/adjustments
- `reopen_monthly_period()`: Reabre mes
- `apply_member_credits()`: Aplica créditos activos FIFO
- `transfer_credit_to_savings()`: Transfiere crédito al fondo (200 LOC)
- `withdraw_from_savings()`: Retira con validación balance (150 LOC)
- `deposit_to_savings()`: Depósito manual (100 LOC)

### Server Actions ✅
- `savings/actions.ts`: 8 actions (transfer, withdraw, deposit, get balance, etc.)
- `expenses/actions.ts`: CRUD transacciones con auditoría completa
- `contributions/actions.ts`: Gestión de contribuciones y ajustes

### UI Existente ✅
- Dashboard con 3 pestañas: Balance, Ahorro, Estadísticas
- SavingsTab component
- PendingCreditsWidget
- PrivacyProvider + PrivacyToggle + PrivateAmount
- AddTransactionDialog + EditTransactionDialog (con paid_by selector)
- TransactionsList con filtros

---

## 🎯 **ROADMAP - IMPLEMENTACIÓN COMPLETA**

### **FASE 1: Modo Privacidad Extendido** ⏱️ 30 min - **P0**

**Estado**: PrivateAmount component ya existe ✅

**Tareas**:
1. ✅ Verificar PrivateAmount component (ya existe)
2. Actualizar DashboardContent:
   - Resumen mensual (ingresos, gastos, balance)
   - Cards de estadísticas
   - Gráficos (ExpensesByCategoryChart, IncomeVsExpensesChart)
3. Actualizar TransactionsList:
   - Columna "Monto" en desktop
   - Cards en mobile
4. Actualizar SavingsTab:
   - Balance actual
   - Meta de ahorro
   - Historial de transacciones
5. Actualizar PendingCreditsWidget:
   - Monto de cada crédito
6. Test completo: Toggle privacy → Verificar que TODO se oculta

**Archivos a modificar**:
- `app/app/components/DashboardContent.tsx`
- `app/app/components/TransactionsList.tsx`
- `components/savings/SavingsTab.tsx`
- `components/credits/PendingCreditsWidget.tsx`

---

### **FASE 2: Gestión de Créditos al Inicio de Mes** ⏱️ 60 min - **P0**

**Objetivo**: Dialog para decidir qué hacer con créditos activos al inicio de mes.

**Componentes**:
1. **CreditDecisionDialog.tsx** (nuevo):
   ```tsx
   interface Props {
     credit: {
       id: string;
       amount: number;
       description: string;
       origin_date: string;
     };
     onDecide: (decision: 'apply' | 'keep' | 'transfer') => Promise<void>;
   }
   ```
   - Radio buttons: "Aplicar este mes", "Mantener activo", "Transferir a ahorro"
   - Explicación de cada opción
   - Botón "Confirmar decisión"

2. **Server Action** - `credits/actions.ts`:
   ```typescript
   export async function decideCreditAction(
     creditId: string,
     decision: 'apply_to_month' | 'keep_active' | 'transfer_to_savings'
   ): Promise<Result>
   ```
   - UPDATE member_credits SET monthly_decision = decision
   - Si decision = 'transfer_to_savings': llamar transfer_credit_to_savings()
   - Si decision = 'apply_to_month': UPDATE auto_apply = true

3. **PendingCreditsWidget** (mejorado):
   - Detectar si estamos al inicio de mes (día 1-5)
   - Mostrar badge "🔔 Decisión pendiente" si hay créditos sin decidir
   - Abrir CreditDecisionDialog al hacer click

**Archivos**:
- `app/credits/actions.ts` (nuevo)
- `components/credits/CreditDecisionDialog.tsx` (nuevo)
- `components/credits/PendingCreditsWidget.tsx` (modificar)

---

### **FASE 3: Panel de Balance Personal** ⏱️ 45 min - **P0**

**Objetivo**: Card o sección que muestre el balance personal del usuario.

**Componente**: **PersonalBalanceCard.tsx** (nuevo)

**Datos a mostrar**:
```
┌─────────────────────────────────────┐
│  💰 Mi Balance Personal (Octubre)   │
├─────────────────────────────────────┤
│  Contribución esperada:    750.00€  │
│  Ya pagado este mes:       720.00€  │
│  ────────────────────────────────   │
│  Pendiente de pagar:        30.00€  │
│                                     │
│  💳 Créditos activos:       50.00€  │
│  📊 Balance general:       +20.00€  │
└─────────────────────────────────────┘
```

**Server Action** - `contributions/actions.ts`:
```typescript
export async function getPersonalBalance(): Promise<Result<{
  expectedContribution: number;
  paidThisMonth: number;
  activeCredits: number;
  balance: number;
}>>
```

**Ubicación**: Dashboard, arriba de las pestañas o como nueva pestaña "Mi Balance"

**Archivos**:
- `components/contributions/PersonalBalanceCard.tsx` (nuevo)
- `app/app/contributions/actions.ts` (agregar getPersonalBalance)

---

### **FASE 4: Sistema de Exportación - MVP** ⏱️ 90 min - **P1**

**Objetivo**: Exportar datos a PDF, Excel, CSV.

#### **4.1 Exportación PDF** (Prioridad máxima)

**Librería**: `jspdf` + `jspdf-autotable`

```bash
npm install jspdf jspdf-autotable
npm install -D @types/jspdf
```

**Endpoint**: `/api/export/monthly-pdf`

**Contenido del PDF**:
```
┌────────────────────────────────────────┐
│  CuentasSiK - Resumen Mensual          │
│  Octubre 2025                          │
│  Hogar: Casa Test                      │
├────────────────────────────────────────┤
│                                        │
│  📊 RESUMEN                            │
│  Ingresos:              2,000.00€      │
│  Gastos:                1,500.00€      │
│  Balance:                 500.00€      │
│                                        │
│  👥 CONTRIBUCIONES                     │
│  - caballeropomes: 750€ / 750€ ✅      │
│  - fumetas.sik:    250€ / 250€ ✅      │
│                                        │
│  📋 TRANSACCIONES (Top 10)             │
│  [Tabla con fecha, tipo, categoría, monto]
│                                        │
│  💰 AHORRO                             │
│  Balance actual: 1,000€                │
│  Meta: 5,000€ (20% completado)         │
└────────────────────────────────────────┘
```

**Server Action**:
```typescript
// app/api/export/monthly-pdf/route.ts
export async function GET(request: Request) {
  // Obtener datos del mes
  // Generar PDF con jsPDF
  // Retornar Response con Content-Type: application/pdf
}
```

**Botón**: DashboardContent → "📥 Exportar Mes (PDF)"

#### **4.2 Exportación Excel** (Fase 2)

**Librería**: `exceljs`

**Contenido**:
- Hoja 1: Resumen mensual
- Hoja 2: Transacciones completas
- Hoja 3: Contribuciones
- Hoja 4: Ahorro

#### **4.3 Exportación CSV** (Fase 2)

Simple export de transacciones en formato CSV.

**Archivos**:
- `app/api/export/monthly-pdf/route.ts` (nuevo)
- `app/api/export/excel/route.ts` (nuevo - fase 2)
- `lib/pdf-generator.ts` (nuevo - helper)

---

### **FASE 5: Mejoras UI Ahorro** ⏱️ 30 min - **P1**

**Objetivo**: Hacer más prominente y clara la sección de ahorro.

**Mejoras**:
1. **SavingsTab.tsx**:
   - Agregar progress bar visual: `<Progress value={percentage} />`
   - Botón grande: "➕ Aportar al Fondo" (abre DepositDialog)
   - Card de resumen más destacada
   - Historial con filtros: Tipo, Rango de fechas

2. **DepositDialog.tsx** (nuevo):
   - Input de monto
   - Select de miembro (quién aporta)
   - Textarea de descripción
   - Botón "Depositar"

3. **WithdrawDialog.tsx** (nuevo):
   - Input de monto
   - Select de razón (emergencia, vacaciones, etc.)
   - Checkbox: "¿Crear transacción común?" (resta del balance)
   - Botón "Retirar"

**Archivos**:
- `components/savings/SavingsTab.tsx` (modificar)
- `components/savings/DepositDialog.tsx` (nuevo)
- `components/savings/WithdrawDialog.tsx` (nuevo)

---

### **FASE 6: Gestión de Períodos Mensuales - UI** ⏱️ 45 min - **P1**

**Objetivo**: Interfaz para cerrar/reabrir meses en `/app/periods`.

**Página existente**: `app/app/periods/page.tsx`

**Componentes a agregar**:
1. **PeriodCard.tsx**:
   - Estado del período (active, closed, etc.)
   - Botones: "Cerrar mes" (solo si active), "Reabrir" (solo si closed)
   - Validaciones:
     * No cerrar si hay transactions con status = 'draft'
     * No cerrar si hay contribution_adjustments pendientes
     * Advertencia: "Este mes tiene X transacciones bloqueadas"

2. **ClosePeriodDialog.tsx**:
   - Confirmación de cierre
   - Input de notas opcionales
   - Checkbox: "He revisado todas las transacciones"
   - Botón "Cerrar Mes" (rojo, prominente)

3. **ReopenPeriodDialog.tsx**:
   - Confirmación de reapertura
   - Input de razón (obligatorio)
   - Advertencia: "Esto permitirá editar transacciones bloqueadas"
   - Botón "Reabrir Mes" (amarillo, con precaución)

**Server Actions** (ya existen en SQL, necesitan wrappers):
```typescript
// app/app/periods/actions.ts
export async function closePeriod(periodId: string, notes?: string): Promise<Result>
export async function reopenPeriod(periodId: string, reason: string): Promise<Result>
```

**Archivos**:
- `app/app/periods/components/PeriodCard.tsx` (nuevo)
- `app/app/periods/components/ClosePeriodDialog.tsx` (nuevo)
- `app/app/periods/components/ReopenPeriodDialog.tsx` (nuevo)
- `app/app/periods/actions.ts` (nuevo)

---

### **FASE 7: UI Móvil Mejorada** ⏱️ 60 min - **P2**

**Objetivo**: Responsive completo, optimizado para smartphone.

**Mejoras**:
1. **Tabs con scroll horizontal**:
   ```tsx
   <TabsList className="inline-flex w-auto overflow-x-auto">
   ```

2. **Cards más compactos en mobile**:
   ```tsx
   <Card className="p-4 md:p-6">
   ```

3. **Bottom Navigation Bar** (opcional):
   - Navegación sticky al bottom en mobile
   - Iconos: Dashboard, Gastos, Ahorro, Más

4. **Gestos swipe entre tabs** (opcional):
   - Librería: `react-swipeable`
   - Swipe left/right para cambiar de tab

5. **Floating Action Button**:
   - Botón redondo en bottom-right: "+"
   - Abre AddTransactionDialog
   - Solo en mobile

**Archivos**:
- `app/app/layout.tsx` (agregar BottomNav)
- `app/app/components/DashboardContent.tsx` (mejorar responsive)
- `components/shared/BottomNav.tsx` (nuevo)
- `components/shared/FloatingActionButton.tsx` (nuevo)

---

### **FASE 8: Exportación Avanzada** ⏱️ 90 min - **P2**

**Objetivo**: Excel completo, infografías, CSV.

#### **8.1 Excel Completo**
- `exceljs`: 4 hojas (Resumen, Transacciones, Contribuciones, Ahorro)
- Formato profesional: Colores, bordes, columnas auto-width

#### **8.2 Infografía**
- `canvas`: Generar imagen PNG con estadísticas visuales
- Chart.js para gráficos
- Exportar como imagen descargable

#### **8.3 CSV Simple**
- Export básico de transacciones
- Formato: fecha,tipo,categoría,monto,descripción

---

## 📝 **CHECKLIST DE IMPLEMENTACIÓN**

### **Prioridad P0 (Esta sesión)**
- [ ] Extender modo privacidad a TODAS las cantidades
- [ ] CreditDecisionDialog + decideCreditAction()
- [ ] PersonalBalanceCard + getPersonalBalance()

### **Prioridad P1 (Esta sesión o próxima)**
- [ ] Exportación PDF básica
- [ ] Mejoras UI Ahorro (DepositDialog, WithdrawDialog)
- [ ] Gestión períodos mensuales UI

### **Prioridad P2 (Próxima sesión)**
- [ ] Exportación Excel/CSV completa
- [ ] Infografías automáticas
- [ ] UI móvil optimizada completa

---

## 🚀 **ORDEN DE EJECUCIÓN SUGERIDO**

1. **Modo Privacidad Extendido** → Rápido, alto impacto visual
2. **PersonalBalanceCard** → Muestra valor inmediato al usuario
3. **CreditDecisionDialog** → Funcionalidad crítica para gestión mensual
4. **Exportación PDF** → Feature wow, diferenciador
5. **Mejoras UI Ahorro** → Pulir experiencia
6. **Gestión Períodos** → Funcionalidad avanzada
7. **UI Móvil** → Optimización final
8. **Exportación Avanzada** → Polish adicional

---

## 📚 **REFERENCIAS**

- [jsPDF Docs](https://github.com/parallax/jsPDF)
- [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- [ExcelJS](https://github.com/exceljs/exceljs)
- [Chart.js](https://www.chartjs.org/)
- [React Swipeable](https://github.com/FormidableLabs/react-swipeable)
