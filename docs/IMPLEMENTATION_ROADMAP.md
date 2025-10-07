# Plan de Implementación - Sistema Financiero Profesional Completo

**Fecha**: 7 octubre 2025  
**Objetivo**: Crear un sistema robusto de gestión financiera para parejas con contribuciones, créditos, ahorro y exportación.

---

## 🧠 **ARQUITECTURA CONCEPTUAL - CRÉDITO vs AHORRO**

### **CRÉDITO (member_credits) - Dinero Adicional en Balance Principal**

**Definición**: Dinero que un miembro aporta DE MÁS sobre su contribución esperada.

**Ejemplo**: 
- Sistema calcula contribución: 500€
- Miembro ingresa: 550€
- Resultado: 500€ cumplen contribución + **50€ CRÉDITO**

**Características CRÍTICAS**:
- ✅ El crédito FORMA PARTE del **balance principal** de la cuenta común
- ✅ El crédito **PUEDE GASTARSE** (está disponible para expenses)
- ✅ El crédito pertenece al miembro que lo aportó (rastreo por `profile_id`)
- ✅ Al inicio de mes, el miembro decide qué hacer con su crédito

**Decisiones del Miembro (al inicio de mes)**:
1. **Aplicar al mes siguiente** (`monthly_decision: 'apply_to_month'`):
   - Su contribución del próximo mes se **reduce** en el monto del crédito
   - Si le pedían 500€, ahora solo paga 450€
   - El crédito desaparece (`status: 'applied'`)

2. **Mantener activo** (`monthly_decision: 'keep_active'`):
   - El crédito **SIGUE EN EL BALANCE PRINCIPAL**
   - Puede usarse para gastos comunes del hogar
   - Seguirá disponible para decisión en meses futuros
   - NO se mueve a ningún lado (permanece líquido)

3. **Transferir a ahorro** (`monthly_decision: 'transfer_to_savings'`):
   - Se **SACA** del balance principal
   - Se **AÑADE** al balance de ahorro
   - Ya NO puede gastarse en expenses (queda bloqueado)
   - Simula mover el dinero físicamente a cuenta de ahorro bancaria

**Fórmula Balance Principal**:
```
Balance Principal = Contribuciones + Ingresos + Créditos Activos - Gastos - Transferencias a Ahorro
```

**⚠️ IMPORTANTE - Visibilidad de Créditos**:

Los créditos activos FORMAN PARTE del balance principal, pero deben ser VISIBLES para evitar confusión:

**Dashboard - Desglose del Balance** (visible para TODOS):
```
┌─────────────────────────────────────────┐
│  💰 Balance Principal                   │
├─────────────────────────────────────────┤
│  Balance Total:              1,000.00€  │
│  ├─ Balance Libre:             850.00€  │
│  ├─ Créditos Activos:          150.00€  │
│  └─ Créditos Reservados:         0.00€  │
│                                         │
│  ⚠️ Los créditos activos pueden gastarse│
│  pero pertenecen a miembros específicos │
└─────────────────────────────────────────┘
```

**Estados de Crédito**:
1. **Activo** (`reserved_at: NULL`): 
   - Forma parte del balance total
   - PUEDE gastarse en expenses
   - Visible en "Créditos Activos"

2. **Reservado** (`reserved_at: NOT NULL`): 
   - Se RESTA del balance total inmediatamente
   - YA NO puede gastarse (bloqueado para próximo mes)
   - Visible en "Créditos Reservados" (solo para awareness)
   - Solo el dueño ve el detalle en su card personal

**Card Personal de Créditos** (solo visible para el dueño):
```
┌─────────────────────────────────────────┐
│  💳 Mis Créditos                        │
├─────────────────────────────────────────┤
│  Crédito Activo:               50.00€   │
│  Estado: Disponible para gastar         │
│                                         │
│  [Gestionar Crédito]                    │
└─────────────────────────────────────────┘
```

Cuando reserva para próximo mes:
```
┌─────────────────────────────────────────┐
│  💳 Mis Créditos                        │
├─────────────────────────────────────────┤
│  Crédito Reservado:            50.00€   │
│  Para: Noviembre 2025                   │
│  Tu contribución: 450€ (en vez de 500€) │
│                                         │
│  ⚠️ Ya NO está disponible para gastos   │
└─────────────────────────────────────────┘
```

---

### **AHORRO (household_savings) - Balance Paralelo Bloqueado**

**Definición**: Sistema de balance PARALELO al principal, simula cuenta bancaria de ahorro real.

**Características CRÍTICAS**:
- ✅ Es una cuenta **separada físicamente** del balance principal
- ❌ **NUNCA** recibe gastos directamente (no es una categoría)
- ❌ **NUNCA** recibe ingresos personales directamente
- ✅ **SOLO** se mueve mediante **transferencias** entre balances
- 🎯 Objetivo: Bloquear dinero para metas específicas (vacaciones, emergencias, etc.)

**Movimientos Válidos**:
1. **Transferencia IN** (Balance Principal → Ahorro):
   - Mover dinero del balance común al ahorro
   - NO es un "aporte" de un miembro específico
   - Se RESTA del balance principal (dinero bloqueado)
   - Requiere que balance principal tenga fondos suficientes

2. **Transferencia OUT** (Ahorro → Balance Principal):
   - Mover dinero del ahorro al balance común
   - NO crea transacción de ingreso (solo mueve entre balances)
   - Se SUMA al balance principal (dinero disponible)
   - Requiere que ahorro tenga fondos suficientes

3. **Transferencia desde Crédito** (Crédito → Ahorro):
   - Decisión mensual del miembro: `transfer_to_savings`
   - Se SACA del balance principal (el crédito deja de estar disponible)
   - Se AÑADE al ahorro (queda bloqueado)
   - Rastreo: `savings_transaction.source_credit_id`

**Fórmula Balance Ahorro**:
```
Balance Ahorro = Transferencias IN - Transferencias OUT
```

**Tipos de `savings_transactions`**:
- `transfer_in`: Balance principal → Ahorro (depositar)
- `transfer_out`: Ahorro → Balance principal (retirar)
- `transfer_from_credit`: Crédito de miembro → Ahorro (decisión mensual)
- `interest`: Interés acumulado (opcional, gamificación)
- `adjustment`: Corrección manual (admin)

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

**Objetivo**: Dialog para que el miembro decida qué hacer con sus créditos activos.

**Concepto**: Crédito = Dinero adicional aportado que ESTÁ EN EL BALANCE PRINCIPAL (puede gastarse).

**Componentes**:
1. **CreditDecisionDialog.tsx** (nuevo):
   ```tsx
   interface Props {
     credit: {
       id: string;
       amount: number;
       description: string;
       origin_date: string;
       status: 'active';
     };
     onDecide: (decision: 'apply_to_month' | 'keep_active' | 'transfer_to_savings') => Promise<void>;
   }
   ```
   
   **3 Opciones (Radio Buttons)**:
   
   **🔵 Opción 1: Aplicar al Mes Siguiente**
   ```
   ✓ Tu contribución del próximo mes se reducirá en 50€
   ✓ Si te piden 500€, solo pagarás 450€
   ✓ El crédito desaparecerá (se habrá usado)
   ⚠️ El dinero permanece en el balance principal
   ```
   
   **🟢 Opción 2: Mantener Activo** (Default recomendado)
   ```
   ✓ El crédito sigue disponible en el balance principal
   ✓ Puede usarse para gastos comunes del hogar
   ✓ Seguirá disponible para decisión en futuros meses
   ✓ Mantienes flexibilidad (puedes decidir después)
   ```
   
   **🟡 Opción 3: Transferir a Ahorro**
   ```
   ✓ Se mueve del balance principal al ahorro
   ✓ Ya NO puede gastarse en expenses (bloqueado)
   ✓ Suma al balance de ahorro para metas específicas
   ⚠️ Requiere decisión consciente (acción irreversible hasta retiro de ahorro)
   ```

2. **Server Action** - `app/credits/actions.ts` (nuevo):
   ```typescript
   export async function decideCreditAction(
     creditId: string,
     decision: 'apply_to_month' | 'keep_active' | 'transfer_to_savings'
   ): Promise<Result<{ success: boolean }>> {
     // 1. Validar que el crédito existe y está 'active'
     // 2. UPDATE member_credits SET monthly_decision = decision
     // 3. Si decision = 'transfer_to_savings':
     //    - Llamar transfer_credit_to_savings() (función SQL existente)
     //    - Actualizar status = 'transferred'
     //    - Crear savings_transaction (type: 'transfer_from_credit')
     // 4. Si decision = 'apply_to_month':
     //    - UPDATE auto_apply = true (para FIFO automático)
     // 5. Si decision = 'keep_active':
     //    - No hacer nada (el crédito sigue activo)
     // 6. revalidatePath('/app')
   }
   ```

3. **PendingCreditsWidget** (mejorado):
   - Detectar si estamos al inicio de mes (día 1-5)
   - Mostrar badge "🔔 Decisión pendiente" si hay créditos sin decidir
   - Al hacer click: Abrir CreditDecisionDialog
   - Mostrar resumen: "Tienes 50€ de crédito activo en el balance principal"

**Archivos**:
- `app/credits/actions.ts` (nuevo)
- `components/credits/CreditDecisionDialog.tsx` (nuevo)
- `components/credits/PendingCreditsWidget.tsx` (modificar)

**Validaciones**:
- Solo el dueño del crédito puede decidir
- Solo créditos con `status: 'active'` son elegibles
- Transferir a ahorro: Validar que balance principal no quede negativo
- Aplicar a mes: Validar que hay período mensual activo
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

### **FASE 3: Panel de Balance Personal + Desglose de Créditos** ⏱️ 60 min - **P0**

**Objetivo**: Mostrar balance personal del usuario Y desglose claro de créditos en balance principal.

**Componentes**:

#### **3.1 BalanceBreakdownCard.tsx** (nuevo) - Visible para TODOS

Reemplaza la card simple de "Balance del Mes" en DashboardContent con desglose detallado:

```tsx
<Card>
  <CardHeader>
    <CardTitle>💰 Balance Principal</CardTitle>
    <CardDescription>Desglose del balance de la cuenta común</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Balance Total */}
    <div className="p-4 bg-primary/10 rounded-lg">
      <p className="text-sm text-muted-foreground">Balance Total</p>
      <p className="text-3xl font-bold">
        <PrivateAmount amount={balance.total} />
      </p>
    </div>
    
    {/* Desglose */}
    <div className="space-y-2 text-sm">
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">Balance Libre:</span>
        <span className="font-semibold">
          <PrivateAmount amount={balance.free} />
        </span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-blue-600 dark:text-blue-400">Créditos Activos:</span>
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          <PrivateAmount amount={balance.activeCredits} />
        </span>
      </div>
      
      {balance.reservedCredits > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-orange-600 dark:text-orange-400">Créditos Reservados:</span>
          <span className="font-semibold text-orange-600 dark:text-orange-400">
            <PrivateAmount amount={balance.reservedCredits} />
          </span>
        </div>
      )}
    </div>
    
    {/* Advertencia si hay créditos activos */}
    {balance.activeCredits > 0 && (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Los créditos activos pueden gastarse pero pertenecen a miembros específicos
        </AlertDescription>
      </Alert>
    )}
  </CardContent>
</Card>
```

**Server Action** - `app/app/expenses/actions.ts` (modificar getMonthSummary):
```typescript
export async function getMonthSummary(year: number, month: number): Promise<Result<{
  income: number;
  expenses: number;
  balance: number;
  // NUEVO: Desglose de créditos
  freeBalance: number;        // Balance - créditos
  activeCredits: number;       // Créditos con reserved_at NULL
  reservedCredits: number;     // Créditos con reserved_at NOT NULL
}>>
```

#### **3.2 MyCreditsCard.tsx** (nuevo) - Solo visible para el DUEÑO

Card personal que muestra los créditos del usuario actual:

```tsx
<Card>
  <CardHeader>
    <CardTitle>💳 Mis Créditos</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {/* Créditos Activos */}
    {myActiveCredits > 0 && (
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-bold text-blue-900 dark:text-blue-100">
              Crédito Activo
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              <PrivateAmount amount={myActiveCredits} />
            </p>
          </div>
          <Badge variant="outline" className="bg-blue-100">
            Disponible
          </Badge>
        </div>
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
          Este dinero está en el balance principal y puede gastarse en expenses comunes
        </p>
        <Button 
          onClick={openCreditDecisionDialog} 
          variant="outline"
          className="w-full"
        >
          Gestionar Crédito
        </Button>
      </div>
    )}
    
    {/* Créditos Reservados */}
    {myReservedCredits > 0 && (
      <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border-2 border-orange-200 dark:border-orange-800">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-bold text-orange-900 dark:text-orange-100">
              Crédito Reservado
            </p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              <PrivateAmount amount={myReservedCredits} />
            </p>
          </div>
          <Badge variant="outline" className="bg-orange-100">
            Bloqueado
          </Badge>
        </div>
        <p className="text-sm text-orange-800 dark:text-orange-200 mb-1">
          Aplicado a tu contribución de <strong>{nextMonthName}</strong>
        </p>
        <p className="text-xs text-orange-700 dark:text-orange-300">
          Tu contribución: <PrivateAmount amount={nextMonthContribution} /> (en vez de <PrivateAmount amount={normalContribution} />)
        </p>
        <Alert className="mt-3 border-orange-300">
          <AlertDescription className="text-xs">
            ⚠️ Este dinero ya NO está disponible para gastos comunes
          </AlertDescription>
        </Alert>
      </div>
    )}
    
    {/* Sin créditos */}
    {myActiveCredits === 0 && myReservedCredits === 0 && (
      <p className="text-sm text-muted-foreground text-center py-4">
        No tienes créditos activos ni reservados
      </p>
    )}
  </CardContent>
</Card>
```

#### **3.3 PersonalBalanceCard.tsx** (nuevo) - Resumen personal

```tsx
<Card>
  <CardHeader>
    <CardTitle>📊 Mi Balance Personal ({currentMonthName})</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Contribución esperada:</span>
        <span className="font-semibold">
          <PrivateAmount amount={expectedContribution} />
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Ya pagado este mes:</span>
        <span className="font-semibold text-green-600">
          <PrivateAmount amount={paidThisMonth} />
        </span>
      </div>
      <Separator />
      <div className="flex justify-between items-center">
        <span className="font-medium">Pendiente de pagar:</span>
        <span className={`text-xl font-bold ${pending > 0 ? 'text-red-600' : 'text-green-600'}`}>
          <PrivateAmount amount={pending} />
        </span>
      </div>
    </div>
  </CardContent>
</Card>
```

**Server Actions** - `app/app/contributions/actions.ts`:
```typescript
// Obtener balance personal del usuario actual
export async function getPersonalBalance(): Promise<Result<{
  expectedContribution: number;
  paidThisMonth: number;
  pending: number;
  myActiveCredits: number;
  myReservedCredits: number;
  nextMonthContribution: number;  // Si hay crédito reservado
}>>

// Obtener desglose de balance principal (para BalanceBreakdownCard)
export async function getBalanceBreakdown(): Promise<Result<{
  total: number;
  free: number;              // total - activeCredits - reservedCredits
  activeCredits: number;     // SUM(amount) WHERE reserved_at IS NULL
  reservedCredits: number;   // SUM(amount) WHERE reserved_at IS NOT NULL
}>>
```

**Ubicación en UI**:
- **BalanceBreakdownCard**: Reemplaza la card simple de "Balance del Mes" en Dashboard
- **MyCreditsCard**: Nueva card en Dashboard, arriba de las pestañas (solo si usuario tiene créditos)
- **PersonalBalanceCard**: Nueva pestaña "Mi Balance" o card en Dashboard

**Archivos**:
- `components/balance/BalanceBreakdownCard.tsx` (nuevo)
- `components/credits/MyCreditsCard.tsx` (nuevo)
- `components/contributions/PersonalBalanceCard.tsx` (nuevo)
- `app/app/contributions/actions.ts` (agregar getPersonalBalance, getBalanceBreakdown)
- `app/app/components/DashboardContent.tsx` (integrar nuevas cards)

**Migración SQL necesaria** (nueva columna):
```sql
ALTER TABLE member_credits
ADD COLUMN reserved_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN member_credits.reserved_at IS 
'Timestamp cuando el crédito fue reservado para aplicar al mes siguiente. 
NULL = activo (puede gastarse), NOT NULL = reservado (bloqueado)';
```

---

### **FASE 4: Sistema de Exportación Completo** ⏱️ 180 min (3 sesiones) - **P0 CRÍTICO**

**📋 NOTA IMPORTANTE**: Ver documento completo en `docs/EXPORT_SYSTEM_PLAN.md` (11,500 líneas)

**Objetivo**: Sistema robusto de exportación multi-formato (PDF, CSV, Excel) con UI completa.

**Estado**: 📝 Planificación completada - Listo para implementar

#### **4.1 Exportación PDF** (P0 - Esta sesión - 90 min)

**Librería**: `jspdf` + `jspdf-autotable`

```bash
npm install jspdf jspdf-autotable exceljs
npm install -D @types/jspdf
```

**Características**:
- Resumen mensual ejecutivo (1-2 páginas A4)
- 5 secciones: Header, Resumen, Balance, Contribuciones, Top Transacciones, Ahorro
- Footer con fecha generación y paginación
- Client-side generation (mejor control visual)

**Contenido del PDF**:
```
┌─────────────────────────────────────────────────┐
│  🏠 CuentasSiK - Casa Test                      │
│  📅 Octubre 2025                                │
│  ───────────────────────────────────────────    │
│                                                 │
│  📊 RESUMEN FINANCIERO                          │
│  ├─ Ingresos:          2,000.00 €               │
│  ├─ Gastos:            1,500.00 €               │
│  └─ Balance:             500.00 € ✅            │
│                                                 │
│  � BALANCE DESGLOSADO                          │
│  ├─ Balance Libre:     1,200.00 €               │
│  ├─ Créditos Activos:    200.00 €               │
│  └─ Créditos Reservados: 100.00 €               │
│                                                 │
│  � CONTRIBUCIONES                              │
│  [Tabla con miembro, esperado, pagado, estado] │
│                                                 │
│  �📋 TOP 10 TRANSACCIONES                        │
│  [Tabla con fecha, tipo, categoría, monto]     │
│                                                 │
│  � AHORRO DEL HOGAR                            │
│  Balance: 1,000€ | Meta: 5,000€ (20%)           │
└─────────────────────────────────────────────────┘
```

**Implementación**:
- `lib/export/pdf-generator.ts`: Lógica de generación
- `lib/export/types.ts`: Tipos compartidos (ExportData, ExportOptions)
- `app/exports/actions.ts`: Server action `getExportData()`
- `components/exports/ExportButton.tsx`: Botón en Dashboard
- `components/exports/ExportDialog.tsx`: Dialog con opciones

**Flujo**:
1. Usuario click "📥 Exportar" en Dashboard
2. Dialog abre con opciones: Formato (PDF/CSV/Excel), Período (mes/año)
3. Server action obtiene datos estructurados del período
4. Client-side generation genera archivo
5. Auto-descarga con nombre: `CuentasSiK_CasaTest_2025-10.pdf`

#### **4.2 Exportación CSV** (P1 - Próxima sesión - 30 min)

**Características**:
- Export simple de transacciones
- Formato RFC 4180 (estándar CSV)
- UTF-8 con BOM (para Excel Windows)
- Columnas: Fecha,Tipo,Categoría,Monto,Moneda,Descripción,Pagado Por

**Implementación**:
- `lib/export/csv-generator.ts`: String template (sin librería)
- Mismo dialog que PDF (opción CSV en RadioGroup)

#### **4.3 Exportación Excel Completa** (P2 - Futuro - 120 min)

**Librería**: `exceljs` (~500KB - lazy load obligatorio)

**Características**:
- 5 hojas (pestañas): Resumen, Transacciones, Contribuciones, Ahorro, Categorías
- Estilos profesionales: Headers negrita + fondo azul
- Formato moneda: `#,##0.00 €`
- Fórmulas: SUM, AVERAGE en hoja Resumen
- Auto-width de columnas

**Implementación**:
- `lib/export/excel-generator.ts`: Generación multi-hoja con ExcelJS
- Dynamic import para lazy loading (no afectar bundle inicial)

---

**Archivos creados**:
- `docs/EXPORT_SYSTEM_PLAN.md` ✅ (Plan completo de 11,500 líneas)
- `lib/export/types.ts` (próximo)
- `lib/export/pdf-generator.ts` (próximo)
- `lib/export/csv-generator.ts` (próximo)
- `lib/export/excel-generator.ts` (próximo)
- `app/exports/actions.ts` (próximo)
- `components/exports/ExportButton.tsx` (próximo)
- `components/exports/ExportDialog.tsx` (próximo)

**Botón**: DashboardContent → "📥 Exportar" junto a MonthSelector

#### **ELIMINADO: 4.2 y 4.3 antiguos** (Excel/CSV redundantes, ver arriba)

---

### **FASE 5: Mejoras UI Ahorro - TRANSFERENCIAS ENTRE BALANCES** ⏱️ 45 min - **P1**

**Objetivo**: Clarificar que ahorro es un balance PARALELO (solo transferencias, no aportes directos).

**IMPORTANTE**: El ahorro NO es una categoría ni recibe aportes. Es una cuenta separada donde se MUEVE dinero del balance principal.

**Mejoras**:

1. **SavingsTab.tsx** (modificar):
   - Agregar progress bar visual: `<Progress value={percentage} />`
   - Renombrar botón: "💸 Transferir a Ahorro" (NO "Aportar al Fondo")
   - Card de resumen con 2 balances claramente separados:
     ```
     Balance Principal: 1,000€
     Balance Ahorro:      500€
     ```
   - Historial con filtros: Tipo (transfer_in, transfer_out, transfer_from_credit)

2. **TransferToSavingsDialog.tsx** (nuevo, NO "DepositDialog"):
   ```tsx
   <Dialog>
     <DialogTitle>💸 Transferir a Ahorro</DialogTitle>
     <DialogDescription>
       Mover dinero del balance principal al ahorro
     </DialogDescription>
     
     <div className="space-y-4">
       {/* Muestra balances actuales */}
       <Alert>
         <AlertDescription>
           Balance Principal: <strong>{balancePrincipal}€</strong><br/>
           Balance Ahorro: <strong>{balanceAhorro}€</strong>
         </AlertDescription>
       </Alert>
       
       {/* Input de monto */}
       <div>
         <Label>Monto a transferir</Label>
         <Input 
           type="number" 
           max={balancePrincipal}
           placeholder="Ejemplo: 100.00"
         />
       </div>
       
       {/* Categoría de ahorro (opcional) */}
       <div>
         <Label>Categoría (opcional)</Label>
         <Select>
           <SelectItem value="emergency">🚨 Emergencia</SelectItem>
           <SelectItem value="vacation">✈️ Vacaciones</SelectItem>
           <SelectItem value="home">🏠 Hogar</SelectItem>
           <SelectItem value="investment">📈 Inversión</SelectItem>
           <SelectItem value="other">➕ Otros</SelectItem>
         </Select>
       </div>
       
       {/* Descripción */}
       <div>
         <Label>Descripción</Label>
         <Textarea placeholder="Ejemplo: Para viaje a Italia en verano" />
       </div>
       
       {/* Preview del resultado */}
       <Alert className="bg-blue-50">
         <AlertDescription>
           📊 Después de la transferencia:<br/>
           Balance Principal: <strong>{balancePrincipal - monto}€</strong><br/>
           Balance Ahorro: <strong>{balanceAhorro + monto}€</strong>
         </AlertDescription>
       </Alert>
     </div>
     
     <DialogFooter>
       <Button onClick={handleTransfer}>
         Confirmar Transferencia
       </Button>
     </DialogFooter>
   </Dialog>
   ```

3. **TransferFromSavingsDialog.tsx** (nuevo, NO "WithdrawDialog"):
   ```tsx
   <Dialog>
     <DialogTitle>💰 Transferir de Ahorro</DialogTitle>
     <DialogDescription>
       Mover dinero del ahorro al balance principal
     </DialogDescription>
     
     <div className="space-y-4">
       {/* Similar a TransferToSavingsDialog pero inverso */}
       <Alert>
         <AlertDescription>
           Balance Ahorro: <strong>{balanceAhorro}€</strong><br/>
           Balance Principal: <strong>{balancePrincipal}€</strong>
         </AlertDescription>
       </Alert>
       
       <Input 
         type="number" 
         max={balanceAhorro}
         label="Monto a transferir"
       />
       
       <Select label="Razón">
         <SelectItem value="goal_reached">✅ Meta alcanzada</SelectItem>
         <SelectItem value="emergency">🚨 Emergencia</SelectItem>
         <SelectItem value="needed">💸 Necesidad puntual</SelectItem>
       </Select>
       
       <Alert className="bg-orange-50">
         <AlertDescription>
           ⚠️ Este dinero volverá al balance principal y podrá gastarse en expenses comunes
         </AlertDescription>
       </Alert>
     </div>
   </Dialog>
   ```

**Server Actions** - `app/savings/actions.ts` (modificar existentes):
```typescript
// Transferir del balance principal al ahorro
export async function transferToSavings(
  householdId: string,
  amount: number,
  category?: string,
  description?: string
): Promise<Result> {
  // 1. Validar que balance principal >= amount
  // 2. INSERT savings_transaction (type: 'transfer_in', amount, category, description)
  // 3. UPDATE household_savings SET current_balance = current_balance + amount
  // 4. NO crear transaction en transactions table (solo mover entre balances)
}

// Transferir del ahorro al balance principal
export async function transferFromSavings(
  householdId: string,
  amount: number,
  reason: string,
  notes?: string
): Promise<Result> {
  // 1. Validar que balance ahorro >= amount
  // 2. INSERT savings_transaction (type: 'transfer_out', amount, description: reason)
  // 3. UPDATE household_savings SET current_balance = current_balance - amount
  // 4. NO crear transaction de ingreso (solo mover entre balances)
}
```

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

### **COMPLETADO ✅**
- [x] **FASE 1**: Extender modo privacidad a TODAS las cantidades (commit 1e61149)
  - [x] Aplicar PrivateAmount a 7+ componentes
  - [x] Build exitoso, push a GitHub
- [x] **Documentación Arquitectura**: CRÉDITO vs AHORRO clarificada (commit 843e709)
  - [x] docs/IMPLEMENTATION_ROADMAP.md: 8 fases documentadas
  - [x] supabase/migrations/20251007000000_add_reserved_at_to_member_credits.sql: 194 líneas
- [x] **Migración SQL**: Aplicar `add_reserved_at_to_member_credits.sql` vía MCP ✅
  - [x] Columna `reserved_at` agregada a member_credits
  - [x] 4 funciones SQL creadas (reserve/unreserve, get_active/reserved_credits_sum)
  - [x] Verificado con `mcp_supabase_list_tables`
- [x] **FASE 3**: Balance Breakdown Cards (commit 8a33a28)
  - [x] BalanceBreakdownCard: Desglose 3 líneas (libre + activo + reservado) - visible TODOS
  - [x] MyCreditsCard: Detalle personal créditos - visible solo OWNER
  - [x] PersonalBalanceCard: Tracking contribución mensual
  - [x] Server actions: `getBalanceBreakdown()`, `getPersonalBalance()`
  - [x] Actualizado DashboardContent.tsx para usar nuevas cards
  - [x] Build exitoso: 27 rutas, 0 errores
- [x] **FASE 2**: Credit Decision Dialog (commit 0b13f09)
  - [x] CreditDecisionDialog.tsx: 3 opciones (apply/keep/transfer) con descripciones visuales
  - [x] app/credits/actions.ts: decideCreditAction() + getMyCredits()
  - [x] MyCreditsCard: Integración dialog + alerta inicio de mes (días 1-5)
  - [x] lib/date.ts: isStartOfMonth() helper agregado
  - [x] Build exitoso: 27 rutas, 0 errores TypeScript, 0 warnings ESLint

### **Prioridad P0 (CRÍTICO - Esta sesión - 3 horas)**
- [ ] **FASE 4: Sistema de Exportación Completo** 📥
  - [ ] **Fase 0: Preparación** (10 min)
    - [ ] Instalar: `npm install jspdf jspdf-autotable exceljs`
    - [ ] Crear estructura: `lib/export/`, `app/exports/`, `components/exports/`
    - [ ] Crear `lib/export/types.ts` con tipos ExportData, ExportOptions
  - [ ] **Fase 1: PDF Generator** (90 min)
    - [ ] `lib/export/pdf-generator.ts`: generateMonthlyPDF()
    - [ ] 5 secciones: Header, Resumen, Balance, Contribuciones, Top Transacciones, Ahorro
    - [ ] Footer con fecha generación y paginación
    - [ ] Testing: PDF de prueba con datos mock
  - [ ] **Fase 2: Server Actions** (60 min)
    - [ ] `app/exports/actions.ts`: getExportData(options)
    - [ ] Queries: transacciones, balance, contribuciones, ahorro, categorías
    - [ ] Testing: Verificar datos estructurados correctos
  - [ ] **Fase 3: UI Components** (60 min)
    - [ ] `components/exports/ExportButton.tsx`: Botón en Dashboard
    - [ ] `components/exports/ExportDialog.tsx`: RadioGroup (PDF/CSV/Excel)
    - [ ] Integrar en DashboardContent.tsx junto a MonthSelector
    - [ ] Testing: Flujo completo Click → PDF descarga

### **Prioridad P1 (Alta - Próxima sesión - 2 horas)**
- [ ] **FASE 4.2: Exportación CSV** (30 min)
  - [ ] `lib/export/csv-generator.ts`: generateTransactionsCSV()
  - [ ] UTF-8 con BOM, escape de comillas, formato RFC 4180
  - [ ] Testing: CSV en Excel Windows
- [ ] **FASE 4.3: Refinamiento PDF** (30 min)
  - [ ] Estilos avanzados, optimizar layout
  - [ ] Testing: Datasets grandes (100+ transacciones)
- [ ] **FASE 5**: Transferencias entre Balances (60 min)
  - [ ] TransferToSavingsDialog (no DepositDialog)
  - [ ] TransferFromSavingsDialog (no WithdrawDialog)
  - [ ] Server actions: `transferToSavings()`, `transferFromSavings()`

### **Prioridad P2 (Media - Sesiones futuras)**
- [ ] **FASE 6**: Gestión Períodos Mensuales UI
  - [ ] ClosePeriodButton con validaciones
  - [ ] ReopenPeriodDialog para correcciones
  - [ ] PeriodHistoryPanel con logs
- [ ] **FASE 7**: UI Móvil Optimizada
  - [ ] BottomNav con iconos
  - [ ] FloatingActionButton para agregar transacciones
  - [ ] Optimización responsive de todas las vistas
- [ ] **FASE 8**: Exportación Avanzada
  - [ ] Excel completo con 4 hojas (ExcelJS)
  - [ ] CSV simple
  - [ ] Infografías automáticas (Chart.js + canvas)

---

## 🚀 **ORDEN DE EJECUCIÓN ACTUALIZADO**

### **Esta Sesión (P0-P1)**
1. ✅ **Modo Privacidad Extendido** → COMPLETADO (commit 1e61149)
2. ⏳ **Documentación + Migración SQL** → Commit + aplicar vía MCP
3. 🔄 **FASE 3: Balance Breakdown Cards** → **PREREQUISITO para FASE 2**
   - BalanceBreakdownCard proporciona visibilidad crítica
   - MyCreditsCard muestra créditos propios del usuario
   - PersonalBalanceCard tracking de contribución
4. 🔄 **FASE 2: Credit Decision Dialog** → Depende de FASE 3
5. 🔄 **FASE 4: Exportación PDF** → Feature wow diferenciador

### **Próxima Sesión (P1-P2)**
6. **FASE 5: Transferencias Balances** → Pulir experiencia ahorro
7. **FASE 6: Gestión Períodos** → Funcionalidad avanzada
8. **FASE 7: UI Móvil** → Optimización final
9. **FASE 8: Exportación Avanzada** → Polish adicional

**NOTA CRÍTICA**: FASE 3 ANTES de FASE 2 porque el balance breakdown proporciona el contexto visual necesario para que el usuario entienda qué son sus créditos y cómo afectan al balance antes de tomar decisiones sobre ellos.

---

## 📚 **REFERENCIAS**

- [jsPDF Docs](https://github.com/parallax/jsPDF)
- [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- [ExcelJS](https://github.com/exceljs/exceljs)
- [Chart.js](https://www.chartjs.org/)
- [React Swipeable](https://github.com/FormidableLabs/react-swipeable)
