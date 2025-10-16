# 🔍 Análisis Completo - Refactor CuentasSiK → SiKNess

**Fecha**: 16 Octubre 2025  
**Objetivo**: Mapear el estado actual antes de construir la nueva interfaz desde cero

---

## 🎯 Resumen Ejecutivo

El proyecto tiene **3 sistemas superpuestos** sin separación clara de responsabilidades:

1. **Sistema Clásico** (`app/app/*`) - Contributions tradicionales con ajustes
2. **Sistema Dual-Flow** (`app/dual-flow/*`) - Gastos directos con emparejamiento automático  
3. **Sistema Híbrido** (BD) - Tablas `monthly_periods`, `contribution_periods`, `dual_flow_transactions` coexistiendo

### Problema Principal
- **Redundancia**: Múltiples formas de hacer lo mismo
- **Inconsistencia**: No hay una única fuente de verdad
- **Complejidad**: Código sin usar conviviendo con código crítico

---

## 📊 Mapeo de Sistemas Actuales

### A. Sistema Clásico (`app/app/*`)

**Layout**: Con tabs (expenses, household, periods, etc.)

**Rutas principales**:
- `/app/app` - Dashboard con tabs
- `/app/app/expenses` - Gestión de gastos
- `/app/app/contributions` - Cálculo de contribuciones
- `/app/app/periods` - Gestión de períodos mensuales
- `/app/app/categories` - Categorías de ingresos/gastos
- `/app/app/household` - Gestión del hogar
- `/app/app/settings` - Configuración

**Tablas BD asociadas**:
- `monthly_periods` ✅ (EN USO)
- `contributions` ✅ (EN USO)
- `contribution_adjustments` ⚠️ (DEPRECATED según docs)
- `transactions` ✅ (EN USO - con campo `flow_type`)

**Estado**: 🟡 **FUNCIONAL PERO MEZCLADO** - Usa tabs, mezcla flujos

---

### B. Sistema Dual-Flow (`app/dual-flow/*`)

**Layout**: Sin tabs, móvil-first con topbar

**Rutas principales**:
- `/dual-flow/inicio` - Dashboard principal
- `/dual-flow/transacciones` - Lista de transacciones
- `/dual-flow/balance` - Resumen de balance
- `/dual-flow/contribucion` - Cálculo de aportaciones
- `/dual-flow/periodos` - Gestión de períodos

**Tablas BD asociadas**:
- `dual_flow_transactions` ⚠️ (TABLA ALTERNATIVA - no se integra con `transactions`)
- `dual_flow_config` ⚠️ (CONFIG ESPECÍFICA)

**Estado**: 🟡 **EXPERIMENTAL** - Diseño correcto (móvil-first) pero desconectado del resto

---

### C. Base de Datos - Estado Actual

#### Tablas Críticas (EN USO REAL)
```sql
✅ profiles - Usuarios del sistema
✅ households - Hogares
✅ household_members - Relación usuario-hogar con roles
✅ categories - Categorías personalizables
✅ transactions - Transacciones con flow_type (common/direct)
✅ monthly_periods - Períodos mensuales con balance
✅ member_incomes - Ingresos de miembros
✅ contributions - Contribuciones calculadas
```

#### Tablas Experimentales/Redundantes
```sql
⚠️ dual_flow_transactions - REDUNDANTE con transactions (flow_type)
⚠️ dual_flow_config - Config específica dual-flow
⚠️ contribution_periods - ¿Duplica monthly_periods? (TODOs en código)
⚠️ contribution_adjustments - Marcada DEPRECATED
⚠️ contribution_adjustment_templates - Marcada DEPRECATED
```

#### Funciones PostgreSQL Críticas
```sql
✅ ensure_monthly_period(household, year, month) - Crear/obtener período
✅ get_household_members_optimized(household_id) - Listar miembros
✅ get_member_income(household_id, profile_id, date) - Ingreso vigente
✅ calculate_member_net_contribution(...) - Cálculo de aportación neta
```

#### Vistas Materializadas
```sql
✅ mv_household_balances - Balance agregado por hogar
✅ mv_member_pending_contributions - Contribuciones pendientes
✅ household_stats - Estadísticas de hogares
```

---

## 🔧 Componentes Reutilizables

### Componentes Válidos del Sistema Clásico
```
✅ components/shared/Topbar.tsx - Topbar mobile-first (ya existe)
✅ components/ui/* - Shadcn/ui completo
✅ contexts/HouseholdContext.tsx - Context con state management
```

### Componentes del Dual-Flow a Evaluar
```
🟡 app/dual-flow/components/TransactionCard.tsx
🟡 app/dual-flow/components/BalanceCard.tsx
🟡 app/dual-flow/contexts/PeriodContext.tsx (fusionar con HouseholdContext)
```

---

## 🎨 Nueva Arquitectura Propuesta

### Estructura de Directorios
```
app/
  sickness/                        ← NUEVA APP (limpia desde cero)
    layout.tsx                     ← Shell nuevo (sin tabs)
    page.tsx                       ← Dashboard principal
    
    _components/                   ← Componentes privados del shell
      GlobalHouseholdSelector.tsx
      GlobalPeriodSelector.tsx
      BurgerMenu.tsx
      Topbar.tsx (específica)
      
    configuracion/
      perfil/page.tsx
      hogar/page.tsx
      categorias/page.tsx
      
    periodo/
      page.tsx                     ← Gestión fases (1→2→3→cierre)
      components/
        Fase1Preparacion.tsx
        Fase2Calculo.tsx
        Fase3Validacion.tsx
        CierrePeriodo.tsx
        
    balance/
      page.tsx                     ← Listado transacciones + tarjetas resumen

  app/                             ← SISTEMA LEGACY (mantener temporalmente)
  dual-flow/                       ← SISTEMA EXPERIMENTAL (deprecar)
```

### Context Global Unificado
```typescript
// contexts/SiKnessContext.tsx (fusión limpia)
interface SiKnessContextValue {
  // Hogar
  householdId: string | null;
  households: HouseholdOption[];
  isOwner: boolean;
  
  // Período
  activePeriod: {
    id: string | null;
    year: number;
    month: number;
    day: number;
    phase: 1 | 2 | 3 | 'closed';  // Fases del workflow
    status: 'active' | 'locked' | 'closed';
  };
  periods: PeriodOption[];
  
  // Balance
  balance: {
    opening: number;
    closing: number;
    income: number;
    expenses: number;
  } | null;
  
  // Usuario
  user: {
    id: string;
    email: string;
    displayName: string;
    isSystemAdmin: boolean;
  };
  
  // Privacidad
  privacyMode: boolean;
  
  // Acciones
  selectHousehold: (id: string) => Promise<void>;
  selectPeriod: (year: number, month: number) => Promise<void>;
  togglePrivacyMode: () => void;
}
```

---

## 📋 Plan de Implementación

### Fase 0: Preparativos (HOY)
- [x] Análisis completo del código actual (este doc)
- [ ] Backup de rutas legacy
- [ ] Crear doc de migración de datos

### Fase 1: Shell Global (Día 1-2)
- [ ] Crear `app/sickness/layout.tsx` (shell limpio)
- [ ] Implementar `GlobalHouseholdSelector` con dropdown
- [ ] Implementar `GlobalPeriodSelector` con calendario
- [ ] Crear `BurgerMenu` con navegación completa
- [ ] Implementar toggles (dark/light, privacy)
- [ ] Context `SiKnessContext` unificado

**Criterio de éxito**: Shell navegable con placeholders, sin errores

### Fase 2: Placeholders (Día 3-4)
- [ ] `/sickness/configuracion/perfil` - Formulario mock
- [ ] `/sickness/configuracion/hogar` - Gestión miembros mock
- [ ] `/sickness/configuracion/categorias` - Listado mock
- [ ] `/sickness/periodo` - Workflow fases (mock)
- [ ] `/sickness/balance` - Listado + tarjetas (mock)

**Criterio de éxito**: Toda la UI navegable, datos estáticos

### Fase 3: Conexión Real (Día 5-10)
- [ ] Conectar selectores globales (queries reales)
- [ ] Perfil: actualizar ingresos (`member_incomes`)
- [ ] Hogar: CRUD miembros real
- [ ] Categorías: CRUD categorías real
- [ ] Período Fase 1: Validación requisitos
- [ ] Período Fase 2: Cálculo + gastos previos
- [ ] Período Fase 3: Bloqueo + uso
- [ ] Balance: Listado transacciones real

**Criterio de éxito**: Sistema funcional end-to-end

### Fase 4: Migración y Limpieza (Día 11-15)
- [ ] Deprecar `/app/app/*` (redirect a `/sickness`)
- [ ] Deprecar `/dual-flow/*` (eliminar código)
- [ ] Eliminar tablas BD redundantes (migración)
- [ ] Actualizar AGENTS.md y docs
- [ ] Testing exhaustivo

---

## 🚨 Decisiones Técnicas Críticas

### 1. Tabla de Períodos
**Decisión**: Usar `monthly_periods` ÚNICAMENTE  
**Razón**: `contribution_periods` tiene TODOs y no aporta valor  
**Acción**: Eliminar `contribution_periods` en migración futura

### 2. Transacciones
**Decisión**: Usar `transactions` con `flow_type` (common/direct)  
**Razón**: `dual_flow_transactions` está desconectada del resto  
**Acción**: Migrar lógica de emparejamiento a `transactions`

### 3. Sistema de Ajustes
**Decisión**: ELIMINAR `contribution_adjustments`  
**Razón**: Ya está marcado DEPRECATED en seed  
**Acción**: Usar solo gastos directos con `flow_type='direct'`

### 4. Contexto Global
**Decisión**: UN SOLO contexto `SiKnessContext`  
**Razón**: Evitar múltiples contextos superpuestos  
**Acción**: Fusionar `HouseholdContext` + `PeriodContext`

---

## 📊 Métricas de Éxito

- ✅ 0 tabs en la nueva UI
- ✅ 100% responsive móvil-first
- ✅ 1 solo contexto global
- ✅ 0 tablas BD redundantes
- ✅ Todas las rutas con placeholders funcionales (Fase 2)
- ✅ Sistema completo funcional (Fase 3)

---

## 🔗 Referencias

- Plan completo: `docs/TO-DO/Cuentas_SiKNess.md`
- Seed BD: `database/migrations/applied/20251014_150000_seed.sql`
- PostgreSQL: `docs/TO-DO/DONE/POSTGRESQL_SISTEMA_COMPLETO.md`
- PM2: `docs/TO-DO/DONE/PM2_SISTEMA_COMPLETO.md`

---

**Próximo paso**: Empezar Fase 1 - Shell Global con placeholders
