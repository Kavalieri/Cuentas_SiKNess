## Reestructuración Completa - 2 de Octubre 2025

### ✅ PARTE 1: HOUSEHOLD (COMPLETADO)

**Cambios realizados**:
1. ✅ `/app/settings` → `/app/household`
2. ✅ Navegación actualizada: Dashboard → **Hogar** → Movimientos → Categorías → Contribuciones → Perfil
3. ✅ Lógica condicional implementada:
   - **Owners**: Ver y editar nombre del hogar + gestión completa de miembros
   - **Members**: Solo lectura del hogar + lista de miembros sin acciones

**Archivos creados**:
- `app/app/household/page.tsx` - Página principal con lógica condicional
- `app/app/household/create/page.tsx` - Creación de hogar
- `app/app/household/components/HouseholdInfo.tsx` - Card info del hogar (editable para owners)
- `app/app/household/components/MembersList.tsx` - Gestión de miembros (actions para owners)
- `app/app/household/actions.ts` - Server Actions (createHousehold, updateHouseholdName, updateMemberRole, removeMember)

**Navegación actualizada**:
```tsx
Dashboard → Hogar → Movimientos → Categorías → Contribuciones → Perfil → Admin (si owner)
```

---

### 🚧 PARTE 2: ADMIN GLOBAL (PENDIENTE)

**Objetivo**: Convertir `/app/admin` en un backend de gestión global (no centrado en el hogar del usuario).

**Nuevo sistema de permisos necesario**:
- Crear tabla `system_admins` o campo `is_system_admin` en `auth.users`
- Solo usuarios con `is_system_admin = true` pueden acceder
- Actualizar `lib/adminCheck.ts` para verificar permisos globales

**Nueva estructura propuesta**:
```
/app/admin/
├─ page.tsx                    # Dashboard global con estadísticas
├─ layout.tsx                  # Verifica is_system_admin
├─ households/
│  ├─ page.tsx                 # Listado de TODOS los hogares
│  └─ [id]/
│     └─ page.tsx              # Detalle de un hogar específico
├─ users/
│  ├─ page.tsx                 # Listado de TODOS los usuarios
│  └─ [id]/
│     └─ page.tsx              # Detalle de un usuario específico
├─ categories/
│  └─ page.tsx                 # Todas las categorías por hogar
├─ movements/
│  └─ page.tsx                 # Todos los movimientos (bulk delete)
└─ tools/
   ├─ restore-stock/page.tsx   # Restaurar datos a stock
   └─ wipe/page.tsx             # Limpiar todos los datos

```

**Server Actions globales necesarias**:
```typescript
// app/app/admin/actions.ts
- getAllHouseholds()           # Ver todos los hogares
- getAllUsers()                # Ver todos los usuarios
- deleteHousehold(id)          # Eliminar hogar completo
- assignUserToHousehold()      # Asignar usuario a hogar
- deleteMovements(ids[])       # Eliminar movimientos en bloque
- restoreToStock()             # Wipe + forzar re-onboarding
```

**Decisión pendiente**: 
- ¿Cómo identificar system_admin? 
  - Opción 1: Email hardcodeado en `.env` → `ADMIN_EMAILS=kava@example.com`
  - Opción 2: Tabla `system_admins` en DB
  - Opción 3: Campo `is_admin` en metadata de Supabase Auth

---

### 📝 Próximos Pasos

1. **Decidir sistema de permisos globales**: ¿Email en .env o tabla DB?
2. **Actualizar `lib/adminCheck.ts`**: Agregar `isSystemAdmin()`
3. **Reestructurar admin panel**: Implementar nueva estructura
4. **Crear Server Actions globales**: CRUD de todos los recursos
5. **UI de gestión global**: Tablas con listados de todos los elementos

---

### Estado actual del build

```bash
✓ Compiled successfully in 3.8s
✓ 16 páginas generadas
✓ No TypeScript errors
✓ No ESLint errors
```

**Páginas nuevas**:
- `/app/household` - Hogar condicional (owner vs member)
- `/app/household/create` - Creación de hogar

**Páginas a reestructurar**:
- `/app/admin` - Dashboard global (no solo del hogar del usuario)
- `/app/admin/members` - Mover funcionalidad a `/app/household` ✅
- `/app/admin/wipe` - Convertir en herramienta global
