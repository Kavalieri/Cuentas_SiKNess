# 🔄 Plan de Refactor: Gestión de Periodo y Balance

**Fecha**: 17 Octubre 2025
**Estado**: Planificado
**Prioridad**: CRÍTICA

---

## 🚨 Problemas Identificados

### 1. **Balance no detecta correctamente la fase del período**
- **Síntoma**: Los estados condicionales no funcionan (`status === 'locked'`, etc.)
- **Causa**: Inconsistencia mayúsculas/minúsculas en status ("SETUP" vs "setup", "LOCKED" vs "locked")
- **Impacto**: ContributionsDisplay no aparece, CTAs incorrectos, badges equivocados
- **Ubicación**: `app/sickness/balance/page.tsx` línea 59-60

### 2. **Bloqueo de período poco claro**
- **Síntoma**: Botón "Bloquear para validación" sin explicación ni confirmación
- **Causa**: Falta diálogo de confirmación y feedback post-acción
- **Impacto**: Usuarios no entienden qué hace ni si funcionó
- **Ubicación**: `app/sickness/periodo/page.tsx` línea 218

### 3. **Guía de fases no intuitiva**
- **Síntoma**: Secciones de texto plano sin visualización del estado
- **Causa**: UI antigua sin Cards, sin estados visuales, sin progreso claro
- **Impacto**: Usuarios no saben en qué fase están ni qué hacer
- **Ubicación**: `app/sickness/periodo/page.tsx` (todo el componente)

### 4. **Información financiera mal ubicada**
- **Síntoma**: Datos del período (ingresos/gastos/balance) solo en Balance
- **Causa**: Arquitectura inicial no consideró separación de concerns
- **Impacto**: Usuarios deben cambiar de página para ver info del período
- **Ubicación**: `app/sickness/balance/page.tsx` (cards de métricas)

---

## 🎯 Objetivos del Refactor

1. ✅ **Detección correcta de estados** → Balance reacciona correctamente a la fase
2. 🎨 **UI moderna con Cards** → Visualización intuitiva y atractiva
3. 💬 **Feedback claro** → Usuarios saben qué está pasando en todo momento
4. 📊 **Datos en el lugar correcto** → Gestión de Periodo = info del período, Balance = transacciones
5. 📱 **Mobile-first** → Coherencia visual y usabilidad en móvil

---

## 📋 Plan de Trabajo (Secuencial)

### **FASE 1: FIX CRÍTICO - Detección de Estado** 🔥
**Tiempo estimado**: 30 min
**Archivos afectados**:
- `app/sickness/balance/page.tsx`
- `contexts/SiKnessContext.tsx`

**Acciones**:
1. Normalizar comparación de status con `.toLowerCase()` en Balance
2. Verificar que SiKnessContext devuelve status en formato consistente
3. Agregar console.log temporal para debug
4. Probar que ContributionsDisplay aparece cuando `status === 'locked'`

**Criterios de éxito**:
- ✅ ContributionsDisplay visible en estado LOCKED
- ✅ Badges muestran estado correcto
- ✅ CTAs se habilitan/deshabilitan correctamente

---

### **FASE 2: Componente PhaseCard Reutilizable** 🎨
**Tiempo estimado**: 1h
**Archivo nuevo**: `components/periodo/PhaseCard.tsx`

**Especificación**:
```tsx
interface PhaseCardProps {
  phase: number;
  title: string;
  icon: React.ReactNode;
  status: 'completed' | 'active' | 'pending' | 'locked';
  description: string;
  checklist?: Array<{ label: string; completed: boolean }>;
  actions?: Array<{ label: string; onClick: () => void; variant: 'primary' | 'secondary'; disabled?: boolean }>;
}
```

**Diseño**:
- Card con border color-coded por status
- Header: icono + título + badge de estado
- Body: descripción + checklist visual (✓/✗)
- Footer: botones de acción (si los hay)
- Estados:
  * `completed`: Verde, checkmark grande, border verde
  * `active`: Azul, pulse animation, border azul
  * `pending`: Gris, lock icon, border gris tenue
  * `locked`: Amarillo, warning icon, border amarillo

**Criterios de éxito**:
- ✅ Componente reutilizable con TypeScript estricto
- ✅ Responsive (mobile y desktop)
- ✅ Estados visuales claros
- ✅ Accesible (ARIA labels)

---

### **FASE 3: Rediseñar Gestión de Periodo** 🏗️
**Tiempo estimado**: 2h
**Archivo**: `app/sickness/periodo/page.tsx`

**Estructura nueva**:
```tsx
<div className="container mx-auto p-4 space-y-6">
  {/* Header con período actual y progreso visual */}
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <div>
          <h1>Periodo {month}/{year}</h1>
          <Badge>{statusLabel}</Badge>
        </div>
        <Progress value={progress} />
      </div>
    </CardHeader>
  </Card>

  {/* Resumen financiero del período */}
  <Card>
    <CardHeader>
      <CardTitle>Resumen Financiero</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Saldo inicial" value={openingBalance} />
        <MetricCard label="Ingresos" value={totalIncome} />
        <MetricCard label="Gastos" value={totalExpenses} />
        <MetricCard label="Saldo final" value={closingBalance} />
      </div>
    </CardContent>
  </Card>

  {/* Fase 1: Configuración */}
  <PhaseCard
    phase={1}
    title="Configuración Inicial"
    icon={<Settings />}
    status={phase1Status}
    description="Prepara el período antes de usarlo"
    checklist={[
      { label: 'Objetivo mensual configurado', completed: hasGoal },
      { label: 'Ingresos de todos los miembros', completed: allMembersHaveIncome },
    ]}
    actions={[
      { label: 'Bloquear para validación', onClick: handleLock, variant: 'primary', disabled: !canLock }
    ]}
  />

  {/* Fase 2: Validación */}
  <PhaseCard
    phase={2}
    title="Validación de Contribuciones"
    icon={<CheckSquare />}
    status={phase2Status}
    description="Revisa los cálculos antes de abrir"
    actions={[
      { label: 'Abrir período', onClick: handleOpen, variant: 'primary', disabled: status !== 'locked' }
    ]}
  />

  {/* Fase 3: Uso Activo */}
  <PhaseCard
    phase={3}
    title="Registro de Movimientos"
    icon={<Activity />}
    status={phase3Status}
    description="Registra gastos e ingresos del mes"
    actions={[
      { label: 'Ver Balance y Transacciones', onClick: () => router.push('/sickness/balance'), variant: 'secondary' },
      { label: 'Iniciar cierre', onClick: handleStartClosing, variant: 'primary', disabled: status !== 'active' }
    ]}
  />

  {/* Fase 4: Cierre */}
  <PhaseCard
    phase={4}
    title="Cierre de Período"
    icon={<Lock />}
    status={phase4Status}
    description="Finaliza el mes y archiva"
    actions={[
      { label: 'Cerrar período', onClick: handleClose, variant: 'destructive', disabled: status !== 'closing' }
    ]}
  />
</div>
```

**Criterios de éxito**:
- ✅ Cards visuales en lugar de secciones de texto
- ✅ Progreso claro con estados color-coded
- ✅ Información financiera del período visible
- ✅ Navegación intuitiva entre fases

---

### **FASE 4: ConfirmDialog para Acciones Críticas** 🔔
**Tiempo estimado**: 45 min
**Archivo nuevo**: `components/shared/ConfirmDialog.tsx`

**Especificación**:
```tsx
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  consequences?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
}
```

**Uso**:
```tsx
// Antes de bloquear
<ConfirmDialog
  open={showLockDialog}
  onOpenChange={setShowLockDialog}
  title="¿Bloquear período para validación?"
  description="Esto calculará las contribuciones de cada miembro basándose en sus ingresos y el objetivo común."
  consequences={[
    'No podrás modificar ingresos ni el objetivo',
    'Podrás registrar gastos directos que ajustarán las contribuciones',
    'Los owners deberán validar antes de abrir'
  ]}
  confirmLabel="Sí, bloquear"
  onConfirm={handleLockConfirmed}
/>
```

**Criterios de éxito**:
- ✅ Dialog modal con blur backdrop
- ✅ Explicación clara de la acción
- ✅ Lista de consecuencias visible
- ✅ Botones confirmar/cancelar con loading state
- ✅ Reutilizable para todas las acciones críticas

---

### **FASE 5: Reorganizar Balance** 📊
**Tiempo estimado**: 1.5h
**Archivo**: `app/sickness/balance/page.tsx`

**Estructura nueva**:
```tsx
<div className="container mx-auto p-4 space-y-6">
  {/* Header minimalista */}
  <div>
    <h1>Balance y Movimientos</h1>
    <p className="text-muted-foreground">{periodName}</p>
  </div>

  {/* Saldo actual prominente */}
  <Card className="border-primary/20 bg-primary/5">
    <CardContent className="pt-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Saldo Disponible</p>
        <p className="text-5xl font-bold">{formatCurrency(closingBalance)}</p>
        <div className="flex justify-center items-center gap-2 mt-2">
          {isPositive ? <TrendingUp className="text-green-600" /> : <TrendingDown className="text-red-600" />}
          <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(balanceDifference)}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Contribuciones si locked */}
  {status === 'locked' && <ContributionsDisplay />}

  {/* CTA Crear movimiento */}
  {canCreateMovement && (
    <Card>
      <CardContent className="pt-6">
        <Button onClick={handleNewMovement} size="lg" className="w-full">
          <Plus className="mr-2" />
          Nuevo Movimiento
        </Button>
      </CardContent>
    </Card>
  )}

  {/* Filtros */}
  <Card>
    <CardHeader>
      <CardTitle>Filtros</CardTitle>
    </CardHeader>
    <CardContent>
      {/* ... filtros existentes ... */}
    </CardContent>
  </Card>

  {/* Lista de transacciones */}
  <Card>
    <CardHeader>
      <CardTitle>Transacciones</CardTitle>
    </CardHeader>
    <CardContent>
      <RecentTransactions {...filterProps} />
    </CardContent>
  </Card>
</div>
```

**Cambios clave**:
- ❌ Remover información del período (ya está en Gestión de Periodo)
- ❌ Remover cards de ingresos/gastos totales
- ✅ Saldo actual ultra-prominente (Card especial)
- ✅ CTA "Nuevo Movimiento" en Card separada
- ✅ Filtros en Card colapsable (opcional)
- ✅ Transacciones en Card con scroll

**Criterios de éxito**:
- ✅ Enfoque en saldo y transacciones
- ✅ CTA clara y condicional
- ✅ Menos cluttering visual
- ✅ Más rápido de escanear

---

### **FASE 6: API Financial Summary** 🔌
**Tiempo estimado**: 30 min
**Archivo nuevo**: `app/api/periods/financial-summary/route.ts`

**Endpoint**: `GET /api/periods/financial-summary?periodId={id}`

**Response**:
```json
{
  "ok": true,
  "data": {
    "periodId": "uuid",
    "year": 2025,
    "month": 10,
    "status": "active",
    "openingBalance": 1200.50,
    "totalIncome": 2500.00,
    "totalExpenses": 1800.00,
    "closingBalance": 1900.50,
    "contributionsPending": 300.00,
    "directExpenses": 150.00
  }
}
```

**Criterios de éxito**:
- ✅ Endpoint funcional con auth
- ✅ Datos correctos desde monthly_periods y transactions
- ✅ Error handling robusto

---

## 🧪 Testing Plan

### Test Checklist (Después de cada fase)
- [ ] **Estados visuales**: Todos los estados (setup/locked/active/closing/closed) muestran correctamente
- [ ] **Navegación**: Deep links funcionan (Periodo → Balance)
- [ ] **Feedback**: Toasts y dialogs aparecen con info correcta
- [ ] **Responsive**: Todo funciona en móvil (375px) y desktop (1920px)
- [ ] **Accesibilidad**: Navegación con teclado, ARIA labels, contraste
- [ ] **Roles**: Owner ve todo, member ve lo permitido
- [ ] **Performance**: No lag al cambiar entre páginas

### Test E2E Completo
1. Login como owner
2. Verificar fase 1 (setup) con checklist
3. Configurar objetivo y todos los ingresos
4. Bloquear período → Ver dialog de confirmación → Confirmar
5. Verificar fase 2 (locked) activa, fase 1 completada
6. Ver Balance → Verificar ContributionsDisplay
7. Abrir período → Ver dialog → Confirmar
8. Verificar fase 3 (active) activa
9. Ir a Balance → Crear movimiento → Verificar CTA funciona
10. Volver a Periodo → Iniciar cierre → Dialog → Confirmar
11. Verificar fase 4 (closing)
12. Cerrar período final → Dialog → Confirmar
13. Verificar todas las fases completadas

---

## 📦 Componentes a Crear/Modificar

### Nuevos
- ✨ `components/periodo/PhaseCard.tsx`
- ✨ `components/shared/ConfirmDialog.tsx`
- ✨ `components/periodo/MetricCard.tsx`
- ✨ `app/api/periods/financial-summary/route.ts`

### Modificar
- 🔧 `app/sickness/periodo/page.tsx` (refactor completo)
- 🔧 `app/sickness/balance/page.tsx` (simplificar)
- 🔧 `contexts/SiKnessContext.tsx` (normalizar status)

---

## 🎨 Design System

### Colors por Estado
- **Completed**: `bg-green-50 border-green-500 text-green-700`
- **Active**: `bg-blue-50 border-blue-500 text-blue-700` + `animate-pulse` en border
- **Pending**: `bg-gray-50 border-gray-300 text-gray-500`
- **Locked**: `bg-amber-50 border-amber-500 text-amber-700`

### Iconos por Fase
- Fase 1 (Setup): `<Settings />` o `<ClipboardCheck />`
- Fase 2 (Validation): `<CheckSquare />` o `<Shield />`
- Fase 3 (Active): `<Activity />` o `<Zap />`
- Fase 4 (Close): `<Lock />` o `<Archive />`

### Spacing
- Cards: `space-y-6` entre ellas
- Padding interno: `p-6` en desktop, `p-4` en móvil
- Grid gaps: `gap-4` o `gap-6`

---

## 🚀 Orden de Ejecución Mañana

1. **08:00 - 08:30**: FASE 1 (Fix crítico detección estado)
2. **08:30 - 09:30**: FASE 2 (PhaseCard component)
3. **09:30 - 11:30**: FASE 3 (Rediseño Gestión de Periodo)
4. **11:30 - 12:15**: FASE 4 (ConfirmDialog)
5. **12:15 - 13:00**: Testing parcial + break
6. **13:00 - 14:30**: FASE 5 (Reorganizar Balance)
7. **14:30 - 15:00**: FASE 6 (API Financial Summary)
8. **15:00 - 16:00**: Testing E2E completo
9. **16:00 - 16:30**: Documentación y commit

---

## 📝 Notas Importantes

- ⚠️ NO tocar lógica de negocio (cálculos, permisos)
- ⚠️ Mantener compatibilidad con endpoints existentes
- ⚠️ Todos los cambios deben pasar lint + typecheck
- ⚠️ Usar MCPs para Git (no comandos manuales)
- ⚠️ Commits atómicos por fase
- ⚠️ Testing en DEV antes de cualquier merge

---

## ✅ Criterios de Éxito Global

- [ ] Usuario entiende en qué fase está **sin leer documentación**
- [ ] Usuario sabe exactamente qué hacer en cada momento
- [ ] Feedback claro antes y después de cada acción
- [ ] Información financiera visible en Gestión de Periodo
- [ ] Balance enfocado en transacciones y saldo
- [ ] UI moderna, visual y coherente (mobile-first)
- [ ] Sin bugs de detección de estado
- [ ] Navegación fluida entre páginas
- [ ] Accesible y responsive

---

**🔥 LISTO PARA EMPEZAR MAÑANA 🔥**
