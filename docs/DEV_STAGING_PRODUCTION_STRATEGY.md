# 🏗️ Estrategia de Entornos: Dev, Staging y Production

## 🐛 Problema Actual Identificado

### Bug del Dashboard en Producción
**Síntoma**: Local muestra "Gastos del Mes: 431,45 €" (incluye Vivienda=350€), pero producción muestra "81,45 €"

**Causa Root**: 
- La función `getMonthSummary()` en `app/app/expenses/actions.ts` (línea 168) consulta **solo** la tabla `transactions`
- **NO incluye** los ajustes (contribution_adjustments) que generan movimientos automáticos
- Los ajustes tipo "prepayment" crean movimientos duales con categoría, pero si esos movimientos no están en `transactions`, no se contabilizan

**Fix Inmediato Requerido**:
```typescript
// ANTES (línea 184-188):
const { data, error } = await supabase
  .from('transactions')
  .select('type, amount')
  .eq('household_id', householdId)
  // ...

// DESPUÉS:
const { data, error } = await supabase
  .from('transactions')
  .select('type, amount, adjustment_id')  // ← Incluir adjustment_id
  .eq('household_id', householdId)
  // ... (mismo filtro de fechas)

// Y asegurarse que el filtro NO excluye movimientos con adjustment_id
```

**Diagnóstico Adicional Necesario**:
- Verificar si en producción los ajustes están creando movimientos en `transactions` correctamente
- Posible diferencia en migración o trigger entre local y producción

---

## 🎯 Estrategia de Entornos Profesional

### Arquitectura Objetivo

```
┌─────────────────────────────────────────────────────────────┐
│                     ENTORNOS                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. LOCAL (Developer)                                        │
│     ├─ Next.js: npm run dev (localhost:3000)                │
│     ├─ Supabase: Local (supabase start) o Remote DEV       │
│     └─ Git: cualquier branch                                │
│                                                              │
│  2. DEVELOPMENT/STAGING (Vercel Preview)                    │
│     ├─ Next.js: Auto-deploy en cada PUSH a cualquier branch│
│     ├─ Supabase: Proyecto DEVELOPMENT dedicado             │
│     ├─ URL: cuentas-sik-git-<branch>-kavalieris-projects   │
│     └─ Propósito: Testing pre-merge, QA, demos             │
│                                                              │
│  3. PRODUCTION (Vercel Production)                          │
│     ├─ Next.js: Deploy solo al MERGEAR PR o TAG release    │
│     ├─ Supabase: Proyecto PRODUCTION (actual)              │
│     ├─ URL: cuentas-sik.vercel.app                         │
│     └─ Propósito: Usuarios finales, stable release         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Plan de Implementación

### **FASE 1: Fix del Bug del Dashboard (CRÍTICO)**

#### 1.1. Diagnóstico Completo
```bash
# Conectar a Supabase Production y verificar
npx supabase db inspect --project-id fizxvvtakvmmeflmbwud

# Query de diagnóstico:
SELECT 
  t.id,
  t.type,
  t.amount,
  t.description,
  t.adjustment_id,
  t.occurred_at,
  ca.reason
FROM transactions t
LEFT JOIN contribution_adjustments ca ON t.adjustment_id = ca.id
WHERE t.household_id = '<household_id>'
  AND t.occurred_at >= '2025-10-01'
  AND t.occurred_at <= '2025-10-31'
ORDER BY t.occurred_at DESC;
```

#### 1.2. Fix en `app/app/expenses/actions.ts`
- **Archivo**: `app/app/expenses/actions.ts` línea 168-209
- **Cambio**: Asegurar que `getMonthSummary()` incluye TODOS los movimientos sin discriminar por `adjustment_id`
- **Validación**: Query debe retornar same result que local

#### 1.3. Deploy del Fix
- Commit: `fix(dashboard): incluir ajustes en cálculo de gastos mensuales`
- Push a `main` → Deploy automático a producción (última vez antes de cambiar workflow)
- Verificar en producción que dashboard muestra 431,45€

---

### **FASE 2: Crear Proyecto Supabase Development**

#### 2.1. Crear Nuevo Proyecto en Supabase Dashboard
1. Ir a https://supabase.com/dashboard
2. Crear nuevo proyecto: **"CuentasSiK Development"**
   - Nombre: `cuentas-sik-dev`
   - Región: Same as production (iad)
   - Database Password: (generar y guardar en 1Password)
3. Obtener credenciales:
   - `NEXT_PUBLIC_SUPABASE_URL_DEV`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV`
   - `SUPABASE_PROJECT_ID_DEV` (para CLI)

#### 2.2. Replicar Schema de Production a Development
```bash
# 1. Exportar schema de producción
npx supabase db pull --project-id fizxvvtakvmmeflmbwud

# 2. Vincular al proyecto DEV
npx supabase link --project-ref <dev_project_id>

# 3. Aplicar todas las migraciones al proyecto DEV
npx supabase db push --project-id <dev_project_id>

# 4. (Opcional) Copiar datos de seed
# Ejecutar db/seed.sql en Supabase DEV SQL Editor
```

#### 2.3. Script de Sincronización (Futuro)
Crear `scripts/sync-prod-to-dev.sh`:
```bash
#!/bin/bash
# Sincroniza schema y opcionalmente datos de PROD a DEV

echo "🔄 Sincronizando PROD → DEV..."

# 1. Exportar schema actual de producción
npx supabase db pull --project-id fizxvvtakvmmeflmbwud

# 2. Aplicar a development
npx supabase db push --project-id <dev_project_id>

# 3. (Opcional) Copiar datos anonymizados
# TODO: Implementar lógica de anonymización

echo "✅ Sincronización completada"
```

---

### **FASE 3: Configurar Vercel para Múltiples Entornos**

#### 3.1. Configurar Variables de Entorno en Vercel

**En Vercel Dashboard** → Project Settings → Environment Variables:

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fizxvvtakvmmeflmbwud.supabase.co` | `https://<dev_project>.supabase.co` | `https://<dev_project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<prod_key>` | `<dev_key>` | `<dev_key>` |
| `SUPABASE_PROJECT_ID` | `fizxvvtakvmmeflmbwud` | `<dev_project_id>` | `<dev_project_id>` |
| `NODE_ENV` | `production` | `development` | `development` |

**Importante**: 
- **Production**: Solo para branch `main` + merge de PR
- **Preview**: Para todos los branches excepto `main`
- **Development**: Para local development

#### 3.2. Configurar Deploy Contexts en Vercel

**Opción A: Vercel Dashboard (Recomendado)**
1. Ir a: Project Settings → Git
2. **Production Branch**: `main` (ya configurado)
3. **Enable "Ignored Build Step"**: ✅
4. Configurar build command personalizado:
   ```bash
   # En "Build Command Override"
   npm run build
   ```

**Opción B: Archivo `vercel.json`**
```json
{
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  },
  "github": {
    "silent": false,
    "autoAlias": false,
    "autoJobCancelation": true
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
    }
  }
}
```

#### 3.3. Configurar Protection Branch en GitHub

1. GitHub → Settings → Branches → Branch protection rules
2. Proteger `main`:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
     - ✅ Vercel Preview Build
     - ✅ TypeScript Check
     - ✅ ESLint
   - ✅ Require branches to be up to date before merging
   - ⚠️ Do not allow bypassing (salvo emergencias)

---

### **FASE 4: Workflow de Desarrollo Nuevo**

#### 4.1. Flujo Estándar para Features

```bash
# 1. Crear branch desde main
git checkout main
git pull origin main
git checkout -b feat/nueva-feature

# 2. Desarrollo local
npm run dev  # Usa Supabase DEV (configurar .env.local)

# 3. Commit y push
git add .
git commit -m "feat: implementar nueva feature"
git push origin feat/nueva-feature

# 4. Vercel auto-deploya a PREVIEW
# URL: https://cuentas-sik-git-feat-nueva-feature-kavalieris-projects.vercel.app
# Usa: Supabase DEV

# 5. Testing en preview deployment
# QA, pruebas de integración, demo

# 6. Crear Pull Request
gh pr create --base main --head feat/nueva-feature

# 7. Review + merge
# Vercel auto-deploya a PRODUCTION al mergear
# Usa: Supabase PRODUCTION
```

#### 4.2. Flujo de Releases

```bash
# 1. Merge PR → main (auto-deploy production)
# 2. Release Please crea PR automático

# 3. Mergear PR de release
# → Vercel deploy production (automático)
# → GitHub Release creada (automático)
# → Tag vX.Y.Z (automático)

# 4. Opcional: Rollback si hay problema
vercel rollback <deployment_url>
```

---

### **FASE 5: Configurar .env Files**

#### 5.1. `.env.local` (Local Development)
```env
# Usar Supabase DEV para desarrollo local
NEXT_PUBLIC_SUPABASE_URL=https://<dev_project_id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev_anon_key>
```

#### 5.2. `.env.example` (Template)
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Environment
NODE_ENV=development
```

#### 5.3. Actualizar `.gitignore`
```gitignore
# Environment
.env.local
.env.development
.env.production
.env*.local
```

---

## 📊 Comparativa de Entornos

| Aspecto | Local | Preview (Dev) | Production |
|---------|-------|---------------|------------|
| **Base de Datos** | Supabase DEV | Supabase DEV | Supabase PROD |
| **Deploy Trigger** | Manual (`npm run dev`) | Auto (push branch) | Auto (merge to main) |
| **URL** | localhost:3000 | `*-git-<branch>-*.vercel.app` | cuentas-sik.vercel.app |
| **Datos** | Seed/Test | Seed/Test | Real Users |
| **Purpose** | Development | QA/Testing/Demo | Users |
| **Rollback** | N/A | Deploy previous commit | Vercel Rollback |

---

## ✅ Checklist de Implementación

### FASE 1: Fix Bug Dashboard (HOY)
- [ ] Diagnosticar query en producción
- [ ] Fix `getMonthSummary()` en actions.ts
- [ ] Commit + push + verificar deployment
- [ ] Validar dashboard producción muestra 431,45€

### FASE 2: Supabase Development (HOY/MAÑANA)
- [ ] Crear proyecto Supabase Development
- [ ] Guardar credenciales en 1Password
- [ ] Exportar schema de producción
- [ ] Aplicar migraciones a development
- [ ] Ejecutar seed.sql en development
- [ ] Validar que development funciona

### FASE 3: Configurar Vercel (MAÑANA)
- [ ] Añadir variables de entorno para Preview
- [ ] Configurar Production Branch = main only
- [ ] Configurar Protection Rules en GitHub
- [ ] Validar que push a branch ≠ main despliega Preview
- [ ] Validar que merge a main despliega Production

### FASE 4: Documentación (MAÑANA)
- [ ] Actualizar README con workflow nuevo
- [ ] Crear DEVELOPMENT_WORKFLOW.md
- [ ] Actualizar CONTRIBUTING.md
- [ ] Actualizar copilot-instructions.md

### FASE 5: Testing (DESPUÉS)
- [ ] Crear branch de prueba
- [ ] Verificar deploy a Preview
- [ ] Verificar NO deploy a Production
- [ ] Mergear PR de prueba
- [ ] Verificar deploy a Production

---

## 🚨 Notas Importantes

### Costos de Supabase
- **Free Tier**: Hasta 500 MB database, 2 GB bandwidth
- **Development Project**: Suficiente para testing
- **Si necesitas más**: Pro plan $25/month

### Seguridad
- ✅ NUNCA commitear `.env.local`
- ✅ Usar Vercel Environment Variables UI
- ✅ Rotar keys si se exponen accidentalmente
- ✅ RLS policies deben ser idénticas en DEV y PROD

### Migraciones
- ✅ Testear SIEMPRE en DEV antes de aplicar en PROD
- ✅ Mantener `supabase/migrations/` sincronizado
- ✅ Usar `supabase db pull` para exportar cambios manuales

---

## 📚 Referencias

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Git Integration](https://vercel.com/docs/concepts/git)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Supabase Projects](https://supabase.com/docs/guides/platform/projects)

---

**Próxima Acción**: Implementar FASE 1 - Fix del bug del dashboard
