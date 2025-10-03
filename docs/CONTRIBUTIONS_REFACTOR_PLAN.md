# Plan de Refactorización: Sistema de Contribuciones

**Fecha**: 3 de octubre de 2025  
**Objetivo**: Simplificar y mejorar el sistema de contribuciones del hogar

## Estado Actual

✅ **Fase 1**: Simplificación UI - **COMPLETADO**  
✅ **Fase 2**: Integración con movimientos - **COMPLETADO**  
✅ **Fase 3**: Mejoras perfil - **YA EXISTÍA**  
✅ **Fase 6**: Tipos de cálculo - **COMPLETADO**  
⏳ **Fase 4**: Fix bugs household - **PENDIENTE**  
⏳ **Fase 5**: Testing completo - **PENDIENTE**

## Problemas Actuales (Resueltos)

1. ✅ **UI Compleja**: 3 pestañas (Estado, Configuración, Historial) → **RESUELTO: Vista única**
2. ✅ **Roles confusos**: No queda claro qué puede hacer Owner vs Admin vs Usuario → **RESUELTO: Permisos claros en UI**
3. ⏳ **Bug de configuración**: Resumen del hogar dice "no configurado" → **PENDIENTE: Testar**
4. ✅ **Falta integración**: Marcar contribución como pagada no crea movimiento → **RESUELTO: Crea movimiento + categoría Nómina**
5. ✅ **Historial redundante**: Ya existe en la pestaña de gastos/movimientos → **RESUELTO: Eliminado**
6. ✅ **Solo un tipo de cálculo**: Solo proporcional → **RESUELTO: 3 tipos disponibles**

## ✨ Nueva Funcionalidad: Tipos de Cálculo

### Tipos Implementados

#### 1. Proporcional al Ingreso (default)
- **Fórmula**: `(ingreso_miembro / total_ingresos) * meta_mensual`
- **Ejemplo**: Miembro A gana 2500€, Miembro B gana 1500€, Meta 2000€
  - Total ingresos = 4000€
  - A contribuye: (2500/4000) * 2000 = 1250€ (62.5%)
  - B contribuye: (1500/4000) * 2000 = 750€ (37.5%)
- **Ideal para**: Parejas con diferencias significativas de ingresos

#### 2. A Partes Iguales
- **Fórmula**: `meta_mensual / número_de_miembros`
- **Ejemplo**: 2 miembros, Meta 2000€
  - Cada miembro: 2000 / 2 = 1000€ (50%)
- **Ideal para**: Parejas que prefieren contribuir igual independientemente del ingreso

#### 3. Personalizado (Futuro)
- **Descripción**: El owner define manualmente el % de cada miembro
- **Ejemplo**: Owner decide que A contribuye 70% y B 30%
- **Estado**: Placeholder - implementación futura

### Cambios en la Base de Datos

#### Nueva columna `calculation_type` en `household_settings`
```sql
ALTER TABLE household_settings 
ADD COLUMN calculation_type TEXT NOT NULL DEFAULT 'proportional'
CHECK (calculation_type IN ('proportional', 'equal', 'custom'));
```

Valores:
- `'proportional'` - Proporcional al ingreso (default)
- `'equal'` - A partes iguales
- `'custom'` - Personalizado (futuro)

#### Función actualizada `calculate_monthly_contributions`
La función RPC de PostgreSQL ahora soporta los 3 tipos:

```sql
-- Lógica de cálculo según tipo
IF v_calculation_type = 'equal' THEN
  -- goal / member_count
ELSIF v_calculation_type = 'proportional' THEN
  -- (member_income / total_income) * goal
ELSIF v_calculation_type = 'custom' THEN
  -- Futuro: usar percentages pre-definidos
END IF;
```

### Cambios en la UI

#### ConfigurationSection (Solo Owner)
```tsx
<Select value={calculationType}>
  <SelectItem value="proportional">Proporcional al Ingreso</SelectItem>
  <SelectItem value="equal">A Partes Iguales</SelectItem>
  <SelectItem value="custom" disabled>Personalizado (Futuro)</SelectItem>
</Select>
```

**Descripción dinámica** según tipo seleccionado:
- Proporcional: "Cada miembro aporta según su ingreso mensual. Mayor ingreso = mayor contribución."
- Equal: "Todos los miembros aportan la misma cantidad, independientemente de sus ingresos."
- Custom: "Definir manualmente el porcentaje de contribución de cada miembro (próximamente)."

#### HouseholdSummary
Badge en el header mostrando el tipo de cálculo actual:
```tsx
<Badge variant="secondary">
  <Calculator className="h-3 w-3" />
  Proporcional al Ingreso
</Badge>
```

#### ContributionMembersList
Los porcentajes se calculan según el tipo activo (sin cambios visuales, solo lógica interna)

### Archivos Nuevos/Modificados

#### Nuevos Archivos
1. **`lib/contributionTypes.ts`**
   - Enum `CALCULATION_TYPES` con los 3 tipos
   - Labels y descripciones para cada tipo
   - Helper `calculateContributionAmount()` para cálculos client-side
   - Helper `getContributionPercentage()` para mostrar %

2. **`supabase/migrations/20251003120000_add_calculation_type_to_household_settings.sql`**
   - Añade columna `calculation_type`

3. **`supabase/migrations/20251003120001_update_calculate_monthly_contributions.sql`**
   - Actualiza función RPC para soportar tipos

#### Archivos Modificados
1. **`app/app/contributions/actions.ts`**
   - Import de `CALCULATION_TYPES`
   - Schema `HouseholdSettingsSchema` incluye `calculation_type`
   - Action `setContributionGoal` guarda el tipo seleccionado

2. **`app/app/contributions/page.tsx`**
   - Lee `calculationType` de settings
   - Pasa `calculationType` a componentes

3. **`app/app/contributions/components/ConfigurationSection.tsx`**
   - Select para elegir tipo (solo owner)
   - Muestra descripción dinámica
   - Envía `calculation_type` al backend

4. **`app/app/contributions/components/HouseholdSummary.tsx`**
   - Muestra badge con tipo de cálculo actual

5. **`types/database.ts`**
   - Regenerado con nuevo campo `calculation_type`

## Solución Propuesta (Original)

### Estructura Nueva (1 sola vista)

```
┌─────────────────────────────────────────────────────┐
│  💰 Contribuciones                                   │
│  Sistema de contribuciones proporcionales            │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │  🎯 TU CONTRIBUCIÓN ESTE MES                 │   │
│  │                                               │   │
│  │  Tu aportación: 1,250.00 €  (62.5%)          │   │
│  │  Estado: Pendiente                            │   │
│  │                                               │   │
│  │  [✓ Marcar como Pagado]                       │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │  📊 RESUMEN DEL HOGAR                        │   │
│  │                                               │   │
│  │  Meta mensual: 2,000.00 €                     │   │
│  │  Total recaudado: 0.00 € / 2,000.00 €         │   │
│  │  Progreso: ██░░░░░░░░ 0%                      │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │  👥 CONTRIBUCIONES POR MIEMBRO               │   │
│  │                                               │   │
│  │  ┌──────────────────────────────────────┐   │   │
│  │  │ 👤 user@example.com                   │   │   │
│  │  │ Ingreso mensual: 2,500 €              │   │   │
│  │  │ Contribución: 1,250 € (62.5%)         │   │   │
│  │  │ Estado: ⏳ Pendiente                   │   │   │
│  │  └──────────────────────────────────────┘   │   │
│  │                                               │   │
│  │  ┌──────────────────────────────────────┐   │   │
│  │  │ 👤 partner@example.com                │   │   │
│  │  │ Ingreso mensual: 1,500 €              │   │   │
│  │  │ Contribución: 750 € (37.5%)           │   │   │
│  │  │ Estado: ✅ Pagado                      │   │   │
│  │  └──────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │  ⚙️ CONFIGURACIÓN                            │   │
│  │                                               │   │
│  │  Meta mensual del hogar                       │   │
│  │  ┌─────────────────┐                          │   │
│  │  │ 2000.00         │  [Actualizar]            │   │
│  │  └─────────────────┘                          │   │
│  │                                               │   │
│  │  Tu ingreso mensual personal                  │   │
│  │  ┌─────────────────┐                          │   │
│  │  │ 2500.00         │  [Actualizar]            │   │
│  │  └─────────────────┘                          │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Permisos y Roles

#### Usuario Normal (Member)
✅ Ver su propia contribución  
✅ Marcar su contribución como pagada  
✅ Editar su propio ingreso mensual  
✅ Ver resumen del hogar  
✅ Ver contribuciones de otros miembros  
❌ Cambiar meta mensual del hogar  
❌ Editar ingresos de otros miembros  

#### Owner del Hogar
✅ Todo lo anterior +  
✅ Cambiar meta mensual del hogar  
✅ Gestionar miembros del hogar  
❌ Acceso a panel de admin de aplicación  

#### Admin de Aplicación (System Admin)
✅ Acceso a `/app/admin`  
✅ Ver todos los hogares  
✅ Gestionar usuarios  
✅ Wipe protection y tools  
❌ No tiene privilegios especiales en su propio hogar (actúa como member/owner normal)  

### Flujo de Contribución

1. **Inicio de mes** (automático o manual):
   ```
   calculateAndCreateContributions(householdId, month, year)
   ```
   - Calcula contribuciones proporcionales para cada miembro
   - Crea registros en tabla `contributions` con `status: 'pending'`

2. **Usuario marca como pagado**:
   ```
   markContributionAsPaid(contributionId)
   ```
   - Actualiza `contributions.paid_amount = expected_amount`
   - Actualiza `contributions.status = 'paid'`
   - **NUEVO**: Crea movimiento de ingreso:
     ```typescript
     {
       type: 'income',
       category_id: [ID de categoría "Nómina"],
       amount: contribution.expected_amount,
       note: `Contribución mensual ${month}/${year}`,
       occurred_at: new Date()
     }
     ```

3. **Cálculo proporcional**:
   ```typescript
   // Para cada miembro:
   const totalIncome = sum(all_member_incomes);
   const memberPercentage = memberIncome / totalIncome;
   const memberContribution = monthlyGoal * memberPercentage;
   ```

### Cambios en Archivos

#### 1. `/app/app/contributions/page.tsx`
**Antes**: 3 tabs (Status, Config, History)  
**Después**: 1 vista con 4 secciones:
- Hero: Tu contribución (con botón "Marcar como Pagado")
- Resumen del hogar (meta, progreso)
- Lista de miembros y sus contribuciones
- Configuración colapsable (solo owner puede cambiar meta)

#### 2. `/app/app/contributions/actions.ts`
**Nuevo action**:
```typescript
export async function markContributionAsPaid(
  contributionId: string
): Promise<Result> {
  // 1. Actualizar contribution
  // 2. Crear movimiento de ingreso
  // 3. Revalidar rutas
}
```

#### 3. `/app/app/profile/page.tsx`
**Agregar sección**: "Mi Ingreso Mensual"
- Input numérico editable por el usuario
- Botón "Actualizar Ingreso"
- Historial de cambios (últimos 3 meses)

#### 4. `/app/app/household/page.tsx`
**Fix del bug**: "aportación no configurada"
- Revisar query que obtiene member_incomes
- Asegurar que carga correctamente get_member_income RPC

#### 5. Nuevos componentes
- `/app/app/contributions/components/HeroContribution.tsx` → Tu contribución
- `/app/app/contributions/components/HouseholdSummary.tsx` → Resumen + progreso
- `/app/app/contributions/components/MembersList.tsx` → Lista de miembros
- `/app/app/contributions/components/ConfigurationSection.tsx` → Meta + ingresos

#### 6. Eliminar componentes obsoletos
- ~~StatusTab.tsx~~ (integrado en page.tsx)
- ~~HistoryTab.tsx~~ (ya existe en /app/expenses)
- ~~ConfigurationTab.tsx~~ (simplificado en ConfigurationSection.tsx)

### Validaciones y Casos Edge

1. **Primer acceso sin configuración**:
   - Mostrar mensaje: "Configura tu ingreso mensual y la meta del hogar"
   - Deshabilitar botón "Marcar como Pagado"

2. **Cambio de ingreso durante el mes**:
   - Recalcular contribuciones del mes actual
   - Mostrar notificación de cambio

3. **Solo un miembro en el hogar**:
   - Contribución = 100% de la meta
   - Mostrar mensaje: "Invita a tu pareja para contribuciones proporcionales"

4. **Meta mensual = 0**:
   - Mostrar advertencia: "Define una meta mensual mayor a 0"

### Testing

**Casos a probar**:
1. Usuario sin ingreso configurado → Ver mensaje de configuración
2. Usuario con ingreso configurado → Ver su contribución calculada
3. Marcar contribución como pagada → Verificar movimiento creado
4. Owner cambia meta → Verificar recalculo de contribuciones
5. Usuario edita su ingreso → Verificar recalculo de contribuciones
6. Dos miembros con ingresos diferentes → Verificar % correcto

### Migración de Datos

**No requiere migración SQL** - Tablas actuales son compatibles:
- `member_incomes` ✓
- `household_settings` ✓
- `contributions` ✓
- `contribution_adjustments` ✓ (para futuro)

Solo cambios en lógica de negocio y UI.

### Timeline de Implementación

**Fase 1** (30 min): Simplificar UI
- Eliminar tabs
- Crear HeroContribution component
- Mover configuración a sección colapsable

**Fase 2** (20 min): Integrar con movimientos
- Actualizar `markContributionAsPaid` action
- Crear movimiento de ingreso al marcar pagado
- Agregar categoria "Nómina" si no existe

**Fase 3** (20 min): Perfil de usuario
- Agregar sección "Mi Ingreso Mensual"
- Permitir editar ingreso propio
- Mostrar historial

**Fase 4** (15 min): Fix bugs
- Arreglar "aportación no configurada" en household page
- Verificar cálculo proporcional correcto

**Fase 5** (10 min): Testing
- Probar flujo completo
- Verificar permisos
- Compilar y deploy

**Total estimado**: ~95 minutos

---

## Próximos Pasos

1. ✅ Crear este documento de plan
2. ⏳ Implementar Fase 1: Simplificar UI
3. ⏳ Implementar Fase 2: Integración con movimientos
4. ⏳ Implementar Fase 3: Perfil de usuario
5. ⏳ Implementar Fase 4: Fix bugs
6. ⏳ Implementar Fase 5: Testing
7. ⏳ Commit y merge del PR #1 para release v0.0.1-alpha.0
