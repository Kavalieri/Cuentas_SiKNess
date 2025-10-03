# Mejoras en Flujo de Invitación y UI de Contribuciones

**Fecha**: 3 de octubre de 2025  
**Problemas Resueltos**: 
1. Flujo de invitación incompleto (no redirigía correctamente después del login)
2. Falta de UI para generar y visualizar contribuciones en la pestaña Resumen

## Problema 1: Flujo de Invitación

### Descripción del Problema
Al hacer click en un link de invitación sin estar autenticado:
- ❌ Redirigía al login genérico sin contexto
- ❌ Después del login, no volvía a la página de invitación
- ❌ El usuario no sabía que había una invitación pendiente
- ❌ No había indicación de que debía aceptar la membresía

### Solución Implementada

#### 1. Auth Callback Mejorado
**Archivo**: `app/auth/callback/route.ts`

```typescript
// NUEVO: Detectar token de invitación en cookie
const cookieStore = await cookies();
const invitationToken = cookieStore.get('invitation_token');

if (invitationToken?.value) {
  // Redirigir automáticamente a la página de invitación
  return NextResponse.redirect(
    new URL(`/app/invite?token=${invitationToken.value}`, request.url)
  );
}
```

**Cambios**:
- ✅ Importa `cookies` de `next/headers`
- ✅ Lee cookie `invitation_token` guardada por el middleware
- ✅ Si existe, redirige a `/app/invite?token=xxx` después del login
- ✅ Si no existe, redirige a `/app` normalmente

**Flujo Completo**:
1. Usuario hace click en link: `https://app.com/invite?token=abc123`
2. Middleware detecta `?token=xxx` y lo guarda en cookie (1 hora TTL)
3. Usuario no autenticado → redirige a `/login?returnUrl=/app/invite?token=abc123`
4. Usuario ingresa email → recibe magic link
5. Usuario hace click en magic link → auth callback
6. Callback detecta cookie `invitation_token`
7. Redirige automáticamente a `/app/invite?token=abc123`
8. Página `/app/invite` muestra UI de aceptación

#### 2. Login Mejorado con Contexto
**Archivo**: `app/login/page.tsx`

**Cambios**:
- ✅ Detecta si viene con `returnUrl` que contiene `/app/invite`
- ✅ Muestra mensaje especial: "¡Te han invitado!"
- ✅ Icono UserPlus en el título
- ✅ Descripción diferente para invitaciones
- ✅ Alert informativo: "Has recibido una invitación..."

**UI Nueva**:
```tsx
{hasInvitation && (
  <Alert>
    <Mail className="h-4 w-4" />
    <AlertDescription>
      Has recibido una invitación. Después de iniciar sesión, 
      podrás aceptarla automáticamente.
    </AlertDescription>
  </Alert>
)}
```

**Estados del Login**:
- **Normal**: "Iniciar Sesión" + formulario estándar
- **Con Invitación**: "¡Te han invitado!" + alert explicativo + formulario

**Nuevo Componente**:
- Instalado: `shadcn/ui alert` component

## Problema 2: UI de Contribuciones en Resumen

### Descripción del Problema
En la pestaña "Resumen" del Hogar:
- ❌ No mostraba instrucciones cuando falta configuración
- ❌ No permitía calcular contribuciones directamente
- ❌ No indicaba cuándo/cómo ingresar al fondo
- ❌ Usuario no sabía qué hacer después de configurar

### Solución Implementada

#### 1. Sistema de Estados Inteligente
**Archivo**: `app/app/household/components/MonthlyFundStatus.tsx`

**3 Estados Posibles**:

##### Estado 1: Configuración Incompleta
```typescript
const hasIncomesConfigured = members.every(m => m.currentIncome > 0);
const hasGoalConfigured = monthlyFund > 0;
const needsConfiguration = !hasIncomesConfigured || !hasGoalConfigured;
```

**UI Mostrada**:
- 🟡 Card amarillo con alerta
- 📋 Lista de qué falta configurar:
  - "Configurar el fondo objetivo" (si monthlyFund === 0)
  - "Configurar ingresos de los miembros" (si algún miembro tiene income === 0)
- 🔗 Instrucciones de dónde ir (pestaña Contribuciones → Configuración)

##### Estado 2: Sin Contribuciones Calculadas
```typescript
!needsConfiguration && contributions.length === 0
```

**UI Mostrada**:
- 🔵 Card azul informativo
- 🧮 Botón grande: "Calcular Contribuciones del Mes"
- 📝 Explicación: Ya está todo configurado, solo falta calcular

**Acción del Botón**:
```typescript
const handleCalculateContributions = async () => {
  const result = await calculateAndCreateContributions(
    householdId,
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() + 1
  );
  
  toast.success('✅ Contribuciones calculadas correctamente');
  router.refresh();
};
```

##### Estado 3: Contribuciones Activas
```typescript
contributions.length > 0
```

**UI Mostrada**:
- 🟢 Card con progreso del fondo
- 💰 Barra de progreso visual (verde)
- 📊 Lista de miembros con:
  - ✅ Estado (Pagado / Pendiente)
  - 💵 Monto esperado
  - 📅 Fecha de aportación (si pagado)
  - 🔘 Botón "Marcar como Aportado" (solo mes actual + usuario actual)

#### 2. Botón Calcular Integrado

**Nuevas Importaciones**:
```typescript
import { calculateAndCreateContributions } from '@/app/app/contributions/actions';
import { useRouter } from 'next/navigation';
```

**Función Nueva**:
```typescript
const handleCalculateContributions = async () => {
  setIsCalculating(true);
  
  const result = await calculateAndCreateContributions(
    householdId,
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() + 1
  );
  
  setIsCalculating(false);
  
  if (!result.ok) {
    toast.error(result.message);
    return;
  }
  
  toast.success('✅ Contribuciones calculadas correctamente');
  router.refresh(); // Recargar para mostrar contribuciones
};
```

**Ventajas**:
- ✅ No requiere ir a otra pestaña
- ✅ Feedback inmediato con toast
- ✅ Recarga automática para mostrar resultados
- ✅ Manejo de errores con mensajes claros

#### 3. Mejora en Refresh

**Antes**: `window.location.reload()` (recarga completa)  
**Ahora**: `router.refresh()` (Server Component refresh sin full reload)

**Beneficios**:
- ⚡ Más rápido
- 💾 Preserva estado del cliente
- 🎯 Solo actualiza datos del servidor

## Flujo Completo de Usuario

### Escenario 1: Usuario Nuevo con Invitación

```
1. Owner crea invitación → Copia link
2. Usuario nuevo hace click en link
   ↓
3. Middleware captura token → Guarda en cookie
   ↓
4. Redirige a /login con mensaje "¡Te han invitado!"
   ↓
5. Usuario ingresa email → Recibe magic link
   ↓
6. Click en magic link → Auth callback
   ↓
7. Callback detecta cookie → Redirige a /app/invite?token=xxx
   ↓
8. Página /app/invite:
   - Valida token
   - Muestra nombre del hogar
   - Botón "Aceptar y Unirme"
   ↓
9. Usuario acepta → Se une al hogar → Redirige a /app
```

### Escenario 2: Configurar Contribuciones Primer Mes

```
1. Owner entra al hogar → Pestaña "Resumen"
   ↓
2. Ve card amarillo: "Configuración Incompleta"
   - Lista: Falta fondo objetivo + ingresos
   ↓
3. Va a pestaña "Contribuciones" → "Configuración"
   - Establece fondo: 2000€
   - Configura ingresos de cada miembro
   ↓
4. Vuelve a pestaña "Resumen"
   - Ahora ve card azul: "Contribuciones No Calculadas"
   - Botón: "🧮 Calcular Contribuciones del Mes"
   ↓
5. Click en botón → Calcula automáticamente
   - Toast: "✅ Contribuciones calculadas correctamente"
   - Recarga automática
   ↓
6. Ahora ve card verde con:
   - Barra de progreso del fondo
   - Lista de miembros con montos
   - Botones "Marcar como Aportado"
```

### Escenario 3: Marcar Aportación Mensual

```
1. Miembro aporta su parte al fondo (transferencia real)
   ↓
2. Entra a /app/household → Pestaña "Resumen"
   ↓
3. Ve su fila con botón "Marcar como Aportado"
   ↓
4. Click en botón
   - Toast: "✅ Aportación marcada como realizada"
   - Recarga automática
   ↓
5. Su fila ahora muestra:
   - ✅ Icono verde de check
   - Badge: "Aportado"
   - Fecha de aportación
   ↓
6. Barra de progreso se actualiza automáticamente
```

## Archivos Modificados

### 1. `app/auth/callback/route.ts`
- **Líneas añadidas**: 8
- **Cambios**: Detección y redirección automática con token de invitación
- **Imports nuevos**: `cookies` from `next/headers`

### 2. `app/login/page.tsx`
- **Líneas añadidas**: ~25
- **Cambios**: 
  - Estado `hasInvitation`
  - useEffect para detectar returnUrl
  - Título y descripción condicional
  - Alert component con mensaje contextual
- **Imports nuevos**: `Alert`, `AlertDescription`, `Mail`, `UserPlus`
- **Componentes instalados**: `shadcn/ui alert`

### 3. `app/app/household/components/MonthlyFundStatus.tsx`
- **Líneas añadidas**: ~80
- **Cambios principales**:
  - Detección de configuración incompleta
  - Card amarillo con instrucciones
  - Card azul con botón de calcular
  - Función `handleCalculateContributions`
  - Cambio de `window.location.reload()` a `router.refresh()`
- **Imports nuevos**: `calculateAndCreateContributions`, `useRouter`
- **State nuevo**: `isCalculating`

## Testing

### ✅ Build Exitoso
```bash
npm run build
✓ Compiled successfully in 4.9s
✓ 23 pages generated
```

### ⏳ Testing Manual Pendiente

**Flujo de Invitación**:
- [ ] Crear invitación como owner
- [ ] Copiar link y pegar en incógnito
- [ ] Verificar que muestra "¡Te han invitado!"
- [ ] Ingresar email y recibir magic link
- [ ] Click en magic link
- [ ] Verificar redirección a /app/invite?token=xxx
- [ ] Aceptar invitación
- [ ] Verificar que se une al hogar

**UI de Contribuciones**:
- [ ] Hogar sin configuración → Ver card amarillo
- [ ] Configurar fondo e ingresos
- [ ] Volver a Resumen → Ver card azul con botón
- [ ] Click en "Calcular Contribuciones"
- [ ] Verificar que se crean correctamente
- [ ] Ver card verde con barra de progreso
- [ ] Marcar aportación como realizada
- [ ] Verificar que actualiza sin full reload

## Beneficios para el Usuario

### Flujo de Invitación
1. **Claridad**: Sabe desde el login que tiene una invitación
2. **Sin fricciones**: Redirección automática después del auth
3. **Contexto**: Mensaje explicativo en cada paso
4. **Sin pérdida**: Cookie persiste 1 hora si cierra ventana

### UI de Contribuciones
1. **Guía paso a paso**: Mensajes claros de qué configurar
2. **Acción directa**: Botón para calcular sin cambiar de pestaña
3. **Feedback inmediato**: Toasts y actualizaciones en tiempo real
4. **Progreso visual**: Barra y badges para ver estado del fondo
5. **Autonomía**: Cada miembro marca sus propias aportaciones

## Próximos Pasos Sugeridos

### Invitaciones
1. **Email automático** cuando se crea invitación (integrar con SMTP)
2. **Notificación push** cuando alguien acepta invitación
3. **Histórico de invitaciones** enviadas y aceptadas
4. **Expiración personalizable** (ahora fijo 7 días)

### Contribuciones
1. **Cálculo automático** al inicio de cada mes (cron job)
2. **Recordatorio automático** cuando falta aportación
3. **Historial de aportaciones** por miembro
4. **Ajustes manuales** con justificación (ya existe en backend)
5. **Gráficos** de evolución del fondo mes a mes

### General
1. **Onboarding guiado** para nuevos usuarios
2. **Tour interactivo** de las funcionalidades
3. **Centro de notificaciones** en el header
4. **Estadísticas generales** del hogar

## Notas Técnicas

### Cookies en Middleware
El token de invitación se guarda con:
```typescript
maxAge: 3600, // 1 hora
httpOnly: true, // No accesible desde JS
sameSite: 'lax', // Protección CSRF
path: '/', // Disponible en toda la app
```

### Server Components vs Client Components
- **OverviewWrapper**: Cliente (maneja estado y cambios de mes)
- **MonthlyFundStatus**: Cliente (botones interactivos)
- **household/page.tsx**: Servidor (fetch inicial de datos)

Esta separación permite:
- ⚡ Initial load rápido (SSR)
- 🔄 Interactividad sin full reload
- 📦 Bundle size optimizado

### Manejo de Errores
Todos los server actions retornan `Result<T>`:
```typescript
type Result<T> = 
  | { ok: true; data?: T }
  | { ok: false; message: string };
```

Esto permite:
- ✅ Type-safe error handling
- ✅ Mensajes descriptivos al usuario
- ✅ No crashea la app con excepciones
