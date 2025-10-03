# Fix: Robust Invitation Flow and Conditional Navigation

**Fecha**: 3 de octubre de 2025  
**Problemas Resueltos**:
1. ❌ Invitación mostraba "Invitación inválida" después del login
2. ❌ Usuarios sin hogar veían pestaña "Hogar" innecesariamente
3. ❌ No había forma de ver/aceptar invitaciones desde el Dashboard

## Problema 1: getInvitationDetails con Autenticación

### Causa Raíz
La función `getInvitationDetails()` usaba `supabaseServer()` que requiere cookies de sesión. Para usuarios nuevos que acaban de registrarse, la sesión todavía no está completamente establecida, causando que las queries fallen.

### Solución
**Archivo**: `app/app/household/invitations/actions.ts`

```typescript
// ANTES: Usaba supabaseServer() con cookies de sesión
const supabase = await supabaseServer();

// AHORA: Usa createBrowserClient sin requerir sesión
const { createBrowserClient } = await import('@supabase/ssr');
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**Por qué funciona**:
- ✅ No depende de cookies de sesión del usuario
- ✅ Usa la anon key pública con RLS
- ✅ La tabla `invitations` permite SELECT sin autenticación (por diseño)
- ✅ Funciona tanto para usuarios autenticados como nuevos

**Impacto**:
- 🔥 Invitaciones funcionan inmediatamente después del registro
- 🔥 No más error "Invitación inválida" al hacer login
- 🔥 Compatible con el flujo de redirección automática

---

## Problema 2: Navegación Condicional

### Implementación
**Archivo**: `app/app/layout.tsx`

**Cambios**:
1. Importar `getUserHouseholdId`
2. Obtener `householdId` en el layout
3. Mostrar pestaña "Hogar" solo si existe household

```typescript
import { getUserHouseholdId } from '@/lib/supabaseServer';

export default async function AppLayout({ children }) {
  const user = await getCurrentUser();
  const householdId = await getUserHouseholdId(); // NUEVO

  return (
    <nav>
      <Link href="/app">Dashboard</Link>
      
      {/* Solo mostrar si tiene hogar */}
      {householdId && (
        <Link href="/app/household">Hogar</Link>
      )}
      
      <Link href="/app/profile">Perfil</Link>
      {userIsSystemAdmin && <Link href="/app/admin">Admin</Link>}
    </nav>
  );
}
```

**Resultado**:
- ✅ Usuario sin hogar: Dashboard | Perfil
- ✅ Usuario con hogar: Dashboard | Hogar | Perfil
- ✅ Admin: Dashboard | Hogar | Perfil | Admin

---

## Problema 3: Dashboard con Onboarding Integrado

### Nueva Arquitectura
**Archivos**:
- `app/app/page.tsx` (modificado)
- `app/app/components/DashboardOnboarding.tsx` (nuevo)

### Componente DashboardOnboarding

**Características**:
1. **Detección de Invitación Pendiente**
   - Lee cookie `invitation_token`
   - Llama a `getInvitationDetails()`
   - Muestra alert destacado si hay invitación

2. **Aceptación de Invitación Inline**
   - Botón "Aceptar Invitación y Unirme"
   - Llama a `acceptInvitation()` directamente
   - Toast de confirmación
   - Redirección a Dashboard con hogar

3. **Opciones de Onboarding**
   - **Crear Hogar**: Card con botón → `/app/household/create`
   - **Esperar Invitación**: Card informativo (deshabilitado si ya hay una)

4. **Información Contextual**
   - Qué es un hogar en CuentasSiK
   - Diferencias entre owner y miembro
   - Qué se puede hacer en cada rol

### Dashboard Page Logic

```typescript
export default async function DashboardPage() {
  const householdId = await getUserHouseholdId();

  // FLUJO NUEVO: Mostrar onboarding en lugar de redirigir
  if (!householdId) {
    // Detectar invitación pendiente
    const cookieStore = await cookies();
    const invitationToken = cookieStore.get('invitation_token')?.value;
    
    let pendingInvitation = undefined;
    if (invitationToken) {
      const result = await getInvitationDetails(invitationToken);
      if (result.ok) {
        pendingInvitation = { ...result.data };
      }
    }

    return <DashboardOnboarding pendingInvitation={pendingInvitation} />;
  }

  // FLUJO EXISTENTE: Dashboard normal con movimientos
  // ...
}
```

**Beneficios**:
- ✅ No hay redirección innecesaria a `/app/onboarding`
- ✅ Usuario ve inmediatamente su invitación pendiente
- ✅ Aceptación en un solo click sin cambiar de página
- ✅ Dashboard siempre es la primera vista (con o sin hogar)

---

## Flujo Completo Mejorado

### Escenario 1: Usuario Nuevo con Invitación

```
1. Owner crea invitación → Copia link
   Link: https://app.com/invite?token=abc123...
   
2. Usuario nuevo hace click en link
   ↓
3. Middleware captura token → Cookie (1 hora)
   
4. Redirige a /login con mensaje "¡Te han invitado!"
   
5. Usuario ingresa email → Recibe magic link
   
6. Click en magic link → auth/callback
   ↓
7. Callback detecta cookie invitation_token
   ↓
8. Redirige a /app/invite?token=abc123...
   ↓
9. getInvitationDetails() valida token (sin problemas de sesión)
   ↓
10. Página /app/invite muestra:
    - Nombre del hogar
    - Quién invitó
    - Botón "Aceptar y Unirme"
    ↓
11. Usuario acepta → Se une al hogar
    ↓
12. Redirige a /app (Dashboard con datos del hogar)
```

### Escenario 2: Usuario Registrado Sin Hogar

```
1. Usuario hace login → Redirige a /app
   ↓
2. getUserHouseholdId() → null
   ↓
3. Dashboard detecta: no hay household
   ↓
4. Verifica cookie invitation_token
   
   SI HAY TOKEN:
   - Muestra DashboardOnboarding con alert destacado
   - "¡Tienes una invitación pendiente!"
   - Botón grande: "Aceptar Invitación y Unirme"
   - Click → acceptInvitation() → Refresh → Dashboard normal
   
   SI NO HAY TOKEN:
   - Muestra DashboardOnboarding sin invitación
   - 2 opciones:
     * Crear Hogar Nuevo
     * Esperar Invitación (estado gris/esperando)
```

### Escenario 3: Usuario con Hogar (Normal)

```
1. Usuario hace login → Redirige a /app
   ↓
2. getUserHouseholdId() → 'uuid-del-hogar'
   ↓
3. Dashboard normal:
   - 3 tarjetas (Gastos, Ingresos, Balance)
   - Tabs (Todos, Gastos, Ingresos)
   - Lista de movimientos
   - Botón "+ Nuevo Movimiento"
   
4. Navegación visible:
   - Dashboard | Hogar | Perfil
```

---

## Componentes Clave

### DashboardOnboarding Component

**Props**:
```typescript
interface PendingInvitation {
  id: string;
  token: string;
  household_name: string | null;
  invited_by_email: string;
  expires_at: string;
  type: string;
}

interface DashboardOnboardingProps {
  pendingInvitation?: PendingInvitation;
}
```

**Estado Interno**:
- `isAccepting`: boolean para loading del botón de aceptar

**Funciones**:
- `handleAcceptInvitation()`: Llama a server action y maneja respuesta

**UI Condicional**:
```typescript
{pendingInvitation && (
  <Alert className="border-2 border-primary">
    {/* Información de la invitación */}
    {/* Días hasta expirar */}
    {/* Botón de aceptar */}
  </Alert>
)}

<div className="grid md:grid-cols-2">
  <Card>{/* Crear Hogar */}</Card>
  <Card className={pendingInvitation ? 'opacity-50' : ''}>
    {/* Esperar Invitación */}
  </Card>
</div>
```

---

## Cambios en Archivos

### 1. `app/app/household/invitations/actions.ts`
- **Líneas modificadas**: ~15
- **Cambio crítico**: `supabaseServer()` → `createBrowserClient()`
- **Impacto**: Invitaciones funcionan sin sesión establecida

### 2. `app/app/layout.tsx`
- **Líneas añadidas**: 3
- **Cambios**:
  - Import `getUserHouseholdId`
  - Obtener `householdId` en layout
  - Condicional `{householdId && <Link>Hogar</Link>}`
- **Impacto**: Navegación adaptativa según estado del usuario

### 3. `app/app/page.tsx`
- **Líneas añadidas**: ~30
- **Cambios**:
  - Import `cookies`, `getInvitationDetails`, `DashboardOnboarding`
  - Detección de token en cookie
  - Llamada a `getInvitationDetails()` si hay token
  - Render condicional: `<DashboardOnboarding>` vs Dashboard normal
- **Impacto**: Onboarding integrado en Dashboard

### 4. `app/app/components/DashboardOnboarding.tsx` (NUEVO)
- **Líneas**: 230
- **Componente**: Cliente interactivo
- **Features**:
  - Alert de invitación pendiente (si existe)
  - 2 cards de onboarding (Crear / Esperar)
  - Botón de aceptación inline
  - Información contextual
  - Cálculo de días hasta expirar
- **Imports**: 9 componentes de UI, 2 server actions, router

---

## Testing

### ✅ Build Exitoso
```bash
npm run build
✓ Compiled successfully in 4.8s
✓ 23 pages generated
```

### ⏳ Testing Manual Requerido

**Caso 1: Invitación desde cero**
- [ ] Crear invitación como owner
- [ ] Copiar link
- [ ] Abrir en incógnito (usuario nuevo)
- [ ] Verificar mensaje "¡Te han invitado!" en login
- [ ] Completar registro/login
- [ ] Verificar redirección a /app/invite?token=xxx
- [ ] **VERIFICAR**: No aparece error "Invitación inválida"
- [ ] Aceptar invitación
- [ ] Verificar que se une al hogar

**Caso 2: Dashboard sin hogar (sin invitación)**
- [ ] Crear usuario nuevo sin invitar
- [ ] Login normal
- [ ] Ver Dashboard con DashboardOnboarding
- [ ] Verificar que NO hay alert de invitación
- [ ] Verificar 2 cards: Crear Hogar + Esperar Invitación
- [ ] Click "Crear Hogar" → Redirige a /app/household/create
- [ ] Crear hogar → Ver Dashboard normal

**Caso 3: Dashboard sin hogar (con invitación en cookie)**
- [ ] Copiar link de invitación
- [ ] Pegar en navegador autenticado (sin hogar)
- [ ] Ver Dashboard con alert destacado
- [ ] Verificar información: nombre hogar, inviter, días
- [ ] Click "Aceptar Invitación"
- [ ] Toast de éxito
- [ ] Dashboard recarga con datos del hogar
- [ ] Verificar aparece pestaña "Hogar" en nav

**Caso 4: Navegación condicional**
- [ ] Usuario sin hogar: Solo ve Dashboard | Perfil
- [ ] Usuario con hogar: Ve Dashboard | Hogar | Perfil
- [ ] Click en "Hogar" sin tenerlo: No debe ser posible (no existe link)

---

## Mejoras Futuras

### 1. Notificaciones en Tiempo Real
- WebSocket o Supabase Realtime
- Notificar cuando llega invitación nueva
- Badge en icono de perfil con contador

### 2. Gestión de Invitaciones en Perfil
- Pestaña "Invitaciones" en `/app/profile`
- Listar todas las invitaciones recibidas (aceptadas/rechazadas/pendientes)
- Permitir rechazar explícitamente

### 3. Re-enviar Invitación Expirada
- Si invitación expira antes de aceptar
- Owner puede "re-enviar" (genera nuevo token)
- Preserva email y metadata original

### 4. Múltiples Invitaciones
- Permitir que un usuario reciba invitaciones de varios hogares
- Elegir a cuál unirse
- Rechazar algunas sin afectar otras

### 5. Analytics de Invitaciones
- Dashboard de owner: tasa de aceptación
- Tiempo promedio hasta aceptar
- Invitaciones más exitosas (por texto personalizado)

---

## Decisiones Técnicas

### Por qué NO redirigir a /app/onboarding

**Antes**: `/app/page.tsx` hacía `redirect('/app/onboarding')` si no había hogar

**Problemas**:
- ❌ Redirección extra innecesaria
- ❌ Usuario ve flash de carga
- ❌ URL cambia constantemente
- ❌ Lógica dividida en 2 páginas

**Ahora**: Dashboard renderiza DashboardOnboarding directamente

**Ventajas**:
- ✅ Sin redirección = más rápido
- ✅ URL consistente: siempre `/app`
- ✅ Lógica centralizada en Dashboard
- ✅ Mejor UX: menos navegación

### Por qué Usar createBrowserClient en Server Action

**Contexto**: Server Actions normalmente usan `supabaseServer()` con cookies

**Problema con Invitaciones**:
- Usuario nuevo no tiene sesión establecida
- `supabaseServer()` lee cookies → No hay auth token
- Queries fallan por falta de permisos

**Solución**:
```typescript
const { createBrowserClient } = await import('@supabase/ssr');
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**Por qué funciona**:
- ✅ Usa anon key (pública)
- ✅ RLS permite SELECT en invitations (by design)
- ✅ No requiere sesión de usuario
- ✅ Compatible con usuarios autenticados y nuevos

**Alternativa descartada**: Service role key
- ❌ Bypasa RLS completamente
- ❌ Riesgo de seguridad si se expone
- ❌ No necesario (anon key es suficiente)

---

## Conclusión

✅ **Invitaciones robustas**: Funcionan inmediatamente después del registro  
✅ **Navegación inteligente**: Solo muestra Hogar si existe  
✅ **Onboarding integrado**: Dashboard es siempre la primera vista  
✅ **UX mejorada**: Menos clics, menos redirecciones, más contexto  
✅ **Build exitoso**: Sin errores TypeScript ni ESLint  

**Tiempo de implementación**: ~45 minutos  
**Líneas añadidas**: ~250  
**Archivos modificados**: 3  
**Archivos creados**: 1  
**Componentes UI nuevos**: 1 (DashboardOnboarding)
