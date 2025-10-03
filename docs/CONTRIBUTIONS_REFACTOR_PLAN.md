# Plan de Refactorización: Sistema de Contribuciones

**Fecha**: 3 de octubre de 2025  
**Objetivo**: Simplificar y mejorar el sistema de contribuciones del hogar

## Problemas Actuales

1. **UI Compleja**: 3 pestañas (Estado, Configuración, Historial) → redundante
2. **Roles confusos**: No queda claro qué puede hacer Owner vs Admin vs Usuario
3. **Bug de configuración**: Resumen del hogar dice "no configurado" aunque esté todo OK
4. **Falta integración**: Marcar contribución como pagada no crea movimiento de ingreso
5. **Historial redundante**: Ya existe en la pestaña de gastos/movimientos

## Solución Propuesta

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
