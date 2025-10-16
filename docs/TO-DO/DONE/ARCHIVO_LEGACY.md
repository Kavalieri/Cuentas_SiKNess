# 🗂️ Archivo de Código Legacy - CuentasSiK

**Fecha**: 16 Octubre 2025  
**Acción**: Archivado completo de código legacy y experimental  
**Ubicación**: `/archive/legacy/`  
**Estado Git**: **EXCLUIDO del repositorio** (`.gitignore`)

---

## 🎯 Objetivo

Limpiar el proyecto de código obsoleto y experimental para construir **SiKness** desde una base limpia, manteniendo el código legacy disponible localmente para referencia histórica sin contaminar el repositorio Git.

---

## 📦 Código Archivado

### Sistema Clásico - `/app/app/`

**159 archivos** movidos a `/archive/legacy/app/app/`

- Dashboard con tabs (estructura antigua)
- Gestión de gastos, ingresos, contribuciones
- Administración, reportes, ahorro
- Configuración con múltiples tabs

**Razón**: Diseño con tabs incompatible con nuevo enfoque mobile-first de SiKness

### Sistema Dual-Flow - `/app/dual-flow/`

**47 archivos** movidos a `/archive/legacy/app/dual-flow/`

- Sistema experimental de doble flujo
- Workflow de periodos (preparación, cálculo, validación)
- Componentes de balance y contribuciones
- Context de periodo separado

**Razón**: Sistema experimental nunca completado, lógica migrada a SiKness

### Sistema Mobile - `/app/mobile/`

**Ningún archivo** (directorio vacío, no fue necesario moverlo)

### Componentes Legacy

**17 archivos** movidos a `/archive/legacy/components/`

- Balance breakdown cards
- Componentes de créditos y contribuciones
- Modales de periodo (cerrar, reabrir)
- Componentes de ahorro

**Razón**: Componentes específicos de sistemas legacy, reemplazados en SiKness

### Hooks Legacy

**1 archivo** movido a `/archive/legacy/lib/hooks/`

- `usePrivateFormat.ts` - Hook de formato privado (funcionalidad integrada en SiKnessContext)

**Razón**: Funcionalidad absorbida por el contexto unificado

### APIs Legacy

**6 archivos** movidos a `/archive/legacy/app/api/dual-flow/`

- Dashboard stats
- Household management
- Notifications
- Period operations

**Razón**: APIs específicas del sistema dual-flow experimental

### Documentación Legacy

**7 archivos** movidos a `/archive/legacy/docs/`

- QA plan del dual-flow
- Documentos de setup antiguos
- Auditorías y unificación de flujos

**Razón**: Documentación histórica de sistemas ya deprecados

---

## 🔍 Inventario Completo

### Resumen por Tipo

| Tipo              | Cantidad | Ubicación                     |
| ----------------- | -------- | ----------------------------- |
| Pages (App)       | 159      | `/archive/legacy/app/app/`    |
| Pages (DualFlow)  | 47       | `/archive/legacy/app/dual-flow/` |
| APIs              | 6        | `/archive/legacy/app/api/`    |
| Components        | 17       | `/archive/legacy/components/` |
| Hooks             | 1        | `/archive/legacy/lib/hooks/`  |
| Documentación     | 7        | `/archive/legacy/docs/`       |
| **TOTAL**         | **237**  | **archivos legacy**           |

### Estructura del Archive

```
archive/
└── legacy/
    ├── app/
    │   ├── app/          # Sistema clásico (159 archivos)
    │   ├── dual-flow/    # Sistema experimental (47 archivos)
    │   └── api/
    │       └── dual-flow/ # APIs experimentales (6 archivos)
    ├── components/       # Componentes legacy (17 archivos)
    ├── lib/
    │   └── hooks/        # Hooks legacy (1 archivo)
    └── docs/             # Documentación histórica (7 archivos)
```

---

## 🚫 Exclusión de Git

### Configuración `.gitignore`

```gitignore
# Legacy code (archivado)
.archive/
archive/
/archive/
```

### ¿Por qué excluir de Git?

1. **Limpieza del repositorio**: El código legacy no es parte del proyecto activo
2. **Historial preservado**: Todo el código legacy ya está en el historial de Git
3. **Reducción de tamaño**: Menos archivos = clones más rápidos
4. **Enfoque claro**: El repositorio refleja solo el código activo (SiKness)
5. **Referencia local**: Los desarrolladores pueden mantener `/archive/` localmente si necesitan consultar código antiguo

### Commits Relacionados

- `3b999c7` - chore(git): excluir directorio archive/legacy del repositorio
- [commits anteriores del archivado de código]

---

## ✅ Código Activo (Mantenido en Repo)

### Sistema SiKness - `/app/sickness/`

**TODO el código nuevo está activo y trackeado:**

- ✅ Layout principal (`layout.tsx`)
- ✅ Dashboard con balance cards (`dashboard/page.tsx`)
- ✅ Componentes globales (selectores, menú, topbar)
- ✅ Context unificado (`SiKnessContext`)
- ✅ APIs backend (`/app/api/sickness/`)
- ✅ Páginas placeholder (configuración, periodo, balance)

### Librerías Core

**Mantenidas y actualizadas:**

- ✅ `/lib/db.ts` - Acceso directo a PostgreSQL
- ✅ `/lib/pgServer.ts` - Wrapper de compatibilidad (renombrado)
- ✅ `/lib/auth.ts` - Autenticación OAuth
- ✅ `/lib/result.ts` - Sistema de resultados
- ✅ `/lib/periods.ts` - Helpers de periodos
- ✅ `/contexts/SiKnessContext.tsx` - Estado global

### UI Compartida

**Componentes activos:**

- ✅ `components/ui/*` - Shadcn/ui completo
- ✅ `components/shared/*` - Componentes reutilizables de SiKness

---

## 📋 Validación

### Pre-Archivado

- ✅ Lint sin errores en código activo
- ✅ TypeCheck pasando en código activo
- ✅ Sistema SiKness funcionando correctamente

### Post-Archivado

- ✅ Código legacy movido correctamente
- ✅ Sistema SiKness sigue funcionando
- ✅ Lint y TypeCheck siguen pasando en código activo
- ✅ Archive excluido de Git (no aparece en `git status`)
- ✅ Documentación actualizada

### Verificación Git

```bash
# Verificar que archive/ está ignorado
git status --porcelain | grep archive
# (sin resultados = correcto)

# Verificar .gitignore
cat .gitignore | grep archive
# .archive/
# archive/
# /archive/
```

---

## 🔄 Proceso de Recuperación (Si Fuera Necesario)

Si en el futuro necesitas recuperar código legacy:

1. **Desde Git History**:
   ```bash
   # Ver commits antes del archivado
   git log --all --full-history -- "app/app/expenses/page.tsx"
   
   # Recuperar archivo específico de un commit anterior
   git checkout <commit-hash> -- app/app/expenses/page.tsx
   ```

2. **Desde Archive Local**:
   ```bash
   # Copiar desde archive/legacy/
   cp archive/legacy/app/app/expenses/page.tsx app/app/expenses/
   ```

3. **Desde Backup Remoto** (si se hizo):
   ```bash
   # Recuperar desde branch de backup (si existe)
   git checkout legacy-backup -- app/app/expenses/page.tsx
   ```

---

## 📚 Referencias

- **Plan Completo**: `docs/TO-DO/Cuentas_SiKNess.md`
- **Análisis Refactor**: `docs/TO-DO/ANALISIS_REFACTOR_SIKNESS.md`
- **Renombrado PG**: `docs/TO-DO/DONE/RENOMBRADO_SUPABASE_A_PG.md`
- **TODOList SiKness**: `docs/TO-DO/TODOLIST_SIKNESS.md`

---

## 🎯 Próximos Pasos

Con el código legacy archivado y excluido de Git, el proyecto está listo para:

1. ✅ **Desarrollo limpio de SiKness** sin interferencias de código antiguo
2. ✅ **Repositorio más ligero** y rápido de clonar
3. ✅ **Commits futuros** enfocados solo en código activo
4. ✅ **Onboarding más fácil** para nuevos desarrolladores (menos ruido)
5. ✅ **Historial Git claro** con solo cambios relevantes

---

**Estado Final**: 
- 🟢 Código legacy archivado localmente
- 🟢 Git limpio (archive/ excluido)
- 🟢 Sistema SiKness funcional
- 🟢 Documentación completa
- 🟢 Listo para continuar desarrollo

**Última actualización**: 16 Octubre 2025
