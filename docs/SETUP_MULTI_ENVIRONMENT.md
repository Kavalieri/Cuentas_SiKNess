# 🚀 Guía de Implementación - Entornos Dev/Staging/Production

## 📋 Orden de Implementación Recomendado

1. ✅ **Diagnosticar y fixear bug del dashboard** (PRIMERO)
2. ✅ **Crear proyecto Supabase Development** (DÍA 1)
3. ✅ **Configurar Vercel multi-entorno** (DÍA 1-2)
4. ✅ **Validar workflow completo** (DÍA 2-3)

---

## 🔧 PASO 1: Fix Bug Dashboard (URGENTE - Hacer AHORA)

### 1.1. Ejecutar Diagnóstico
1. Ir a Supabase Dashboard: https://supabase.com/dashboard
2. Seleccionar proyecto `CuentasSiK` (Production)
3. Ir a SQL Editor
4. Abrir archivo `docs/DASHBOARD_BUG_DIAGNOSIS.md`
5. Ejecutar Queries 1-5 secuencialmente
6. Anotar resultados

### 1.2. Aplicar Fix Según Diagnóstico
**Si falta los movimientos** (Query 4 tiene NULLs):
```bash
# Ejecutar script de fix en Supabase SQL Editor
# Ver docs/DASHBOARD_BUG_DIAGNOSIS.md - Sección "FIX"
```

**Si el problema es de código**:
```bash
# Verificar getMonthSummary() no filtra adjustment_id
git checkout -b fix/dashboard-missing-adjustments
# Editar app/app/expenses/actions.ts si es necesario
git commit -m "fix(dashboard): incluir ajustes en cálculo mensual"
git push origin fix/dashboard-missing-adjustments
# Crear PR y mergear
```

---

## 🗄️ PASO 2: Crear Proyecto Supabase Development

### 2.1. Crear Nuevo Proyecto en Supabase

1. **Ir a Supabase Dashboard**: https://supabase.com/dashboard
2. **Click "New Project"**
3. **Configurar**:
   - **Name**: `CuentasSiK Development`
   - **Database Password**: (Generar segura, guardar en 1Password)
   - **Region**: `East US (North Virginia)` (igual que producción)
   - **Plan**: Free (suficiente para desarrollo)
4. **Wait for provisioning** (~2 minutos)

### 2.2. Guardar Credenciales

Una vez creado el proyecto, obtener:

1. **Project URL**: 
   ```
   https://<project_ref>.supabase.co
   ```

2. **Anon Key**: 
   - Ir a Settings → API
   - Copiar `anon` `public` key

3. **Project Ref**:
   - Está en la URL del proyecto
   - Ejemplo: `abcdefghijklmnop`

**Guardar en archivo temporal** (NO commitear):
```bash
# .env.development (temporal - NO commitear)
NEXT_PUBLIC_SUPABASE_URL_DEV=https://<project_ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV=eyJ...
SUPABASE_PROJECT_REF_DEV=<project_ref>
```

---

### 2.3. Replicar Schema de Producción a Development

```bash
# 1. Asegurarse de estar en main branch actualizado
git checkout main
git pull origin main

# 2. Verificar que supabase CLI está instalado
npx supabase --version
# Si no está: npm install -g supabase

# 3. Inicializar supabase (si no está hecho)
npx supabase init

# 4. Vincular al proyecto PRODUCTION para exportar
npx supabase link --project-ref fizxvvtakvmmeflmbwud
# Pedirá database password de producción

# 5. Exportar schema actual de producción
npx supabase db pull
# Esto crea/actualiza archivos en supabase/migrations/

# 6. Desvincular de producción
npx supabase unlink

# 7. Vincular al proyecto DEVELOPMENT
npx supabase link --project-ref <dev_project_ref>
# Pedirá database password de development

# 8. Aplicar todas las migraciones a development
npx supabase db push
# Esto aplica TODO el schema a development

# 9. Verificar que se aplicó correctamente
npx supabase db diff
# No debería mostrar diferencias
```

### 2.4. Seed Data en Development

```bash
# Opción A: Ejecutar seed.sql manualmente
# 1. Ir a Supabase Dashboard (Development project)
# 2. SQL Editor
# 3. Copiar contenido de db/seed.sql
# 4. Ejecutar

# Opción B: Usar psql (si tienes instalado)
npx supabase db execute --file db/seed.sql
```

### 2.5. Validar Development Project

```bash
# Test rápido: verificar tablas
npx supabase db list

# Verificar datos en Supabase Dashboard
# Ir a Table Editor → Ver que existen:
# - households
# - household_members
# - categories
# - transactions
# - contribution_adjustments
# etc.
```

---

## ⚙️ PASO 3: Configurar Vercel para Multi-Entorno

### 3.1. Añadir Variables de Entorno en Vercel

1. **Ir a Vercel Dashboard**: https://vercel.com/kavalieris-projects/cuentas-sik
2. **Settings → Environment Variables**
3. **Añadir/Editar variables**:

#### Variables Existentes (Production)
Estas ya existen, **NO tocar**:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://fizxvvtakvmmeflmbwud.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<prod_anon_key>`
- **Scope**: ✅ Production

#### Variables Nuevas (Preview/Development)
**Añadir NUEVAS variables con los MISMOS nombres pero scope diferente**:

**Variable 1**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://<dev_project_ref>.supabase.co`
- **Scope**: 
  - ⬜ Production
  - ✅ Preview
  - ✅ Development
- **Save**

**Variable 2**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `<dev_anon_key>`
- **Scope**:
  - ⬜ Production
  - ✅ Preview
  - ✅ Development
- **Save**

**Variable 3**: `SUPABASE_PROJECT_REF` (nueva)
- **Value**: `fizxvvtakvmmeflmbwud`
- **Scope**: ✅ Production
- **Save**

**Variable 4**: `SUPABASE_PROJECT_REF` (scope diferente)
- **Value**: `<dev_project_ref>`
- **Scope**: 
  - ⬜ Production
  - ✅ Preview
  - ✅ Development
- **Save**

### 3.2. Configurar Deploy Triggers

**En Vercel Dashboard** → Settings → Git:

1. **Production Branch**: 
   - ✅ Mantener como `main`
   
2. **Preview Deployments**:
   - ✅ Enable automatic preview deployments for all branches
   
3. **Ignored Build Step** (si está configurado):
   - ⚠️ **ELIMINAR cualquier script de ignored build**
   - Queremos que TODOS los branches se desplieguen

### 3.3. Configurar Branch Protection en GitHub

1. **Ir a GitHub**: https://github.com/Kavalieri/CuentasSiK
2. **Settings → Branches**
3. **Branch protection rules → Add rule**

**Configuración para `main`**:
```
Branch name pattern: main

✅ Require a pull request before merging
   ✅ Require approvals: 1
   ⬜ Dismiss stale pull request approvals when new commits are pushed
   ⬜ Require review from Code Owners
   ⬜ Restrict who can dismiss pull request reviews

✅ Require status checks to pass before merging
   ✅ Require branches to be up to date before merging
   Buscar y añadir:
   - ✅ Vercel (cuentas-sik)
   
⬜ Require conversation resolution before merging
⬜ Require signed commits
⬜ Require linear history
⬜ Require deployments to succeed before merging

✅ Do not allow bypassing the above settings
⬜ Restrict who can push to matching branches
⬜ Allow force pushes
⬜ Allow deletions
```

**Save changes**

---

## 🔄 PASO 4: Workflow de Desarrollo Nuevo

### 4.1. Feature Development (Ejemplo)

```bash
# 1. Crear branch desde main
git checkout main
git pull origin main
git checkout -b feat/nueva-caracteristica

# 2. Configurar .env.local para usar Supabase DEV
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://<dev_project_ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev_anon_key>
EOF

# 3. Desarrollo local
npm run dev
# Trabaja en localhost:3000 con Supabase DEV

# 4. Commits
git add .
git commit -m "feat: implementar nueva característica"

# 5. Push a GitHub
git push origin feat/nueva-caracteristica

# 6. Vercel auto-despliega PREVIEW
# URL: https://cuentas-sik-git-feat-nueva-caracteristica-kavalieris-projects.vercel.app
# Usa: Supabase DEV (por las variables de Preview)

# 7. Revisar deployment preview
# Click en el link que Vercel comenta en GitHub

# 8. Crear Pull Request
gh pr create --base main --head feat/nueva-caracteristica --title "feat: Nueva Característica"

# 9. Code Review
# Otros desarrolladores revisan en el preview deployment

# 10. Merge PR
# → Vercel auto-despliega a PRODUCTION
# → Usa Supabase PRODUCTION (por variables de Production)
```

### 4.2. Validar que Funciona

**Test 1: Push a branch nuevo**
```bash
git checkout -b test/multi-entorno
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "test: validar multi-entorno"
git push origin test/multi-entorno
```

**Verificar**:
1. GitHub Actions ejecuta
2. Vercel despliega PREVIEW (no production)
3. URL preview usa Supabase DEV
4. Production NO se afecta

**Test 2: Merge a main**
```bash
# Crear PR y mergear
gh pr create --base main --head test/multi-entorno
gh pr merge --squash
```

**Verificar**:
1. Vercel despliega PRODUCTION
2. Production usa Supabase PRODUCTION
3. Preview deployment se marca como "Promoting to Production"

---

## 📚 PASO 5: Documentar Workflow

### 5.1. Actualizar README.md

Añadir sección "Development":
```markdown
## 🛠️ Development

### Local Development
1. Clone repository
2. Copy `.env.example` to `.env.local`
3. Configure Supabase DEV credentials
4. Run `npm run dev`

### Preview Deployments
- Every push to any branch creates a preview deployment
- Preview deployments use Supabase Development database
- URL: `https://cuentas-sik-git-<branch>-kavalieris-projects.vercel.app`

### Production Deployments
- Only merges to `main` deploy to production
- Production uses Supabase Production database
- URL: `https://cuentas-sik.vercel.app`
```

### 5.2. Crear DEVELOPMENT.md

```bash
# Crear archivo con guías de desarrollo
cat > docs/DEVELOPMENT.md << 'EOF'
# 🛠️ Development Workflow

## Entornos

| Entorno | Base de Datos | Deploy Trigger | URL |
|---------|---------------|----------------|-----|
| Local | Supabase DEV | `npm run dev` | localhost:3000 |
| Preview | Supabase DEV | Push to branch | `*-git-<branch>-*.vercel.app` |
| Production | Supabase PROD | Merge to main | `cuentas-sik.vercel.app` |

## Workflow Estándar

[... incluir workflow del PASO 4.1 ...]

## Scripts Útiles

[... incluir scripts de sync, etc ...]
EOF
```

### 5.3. Actualizar CONTRIBUTING.md

```markdown
## 🌳 Branch Strategy

- `main`: Production-ready code
- `feat/*`: New features
- `fix/*`: Bug fixes
- `chore/*`: Maintenance tasks

## 🚀 Deployment

- **Preview**: Automatic on push to any branch (Supabase DEV)
- **Production**: Automatic on merge to `main` (Supabase PROD)

## 🧪 Testing

1. Test locally with `npm run dev` (Supabase DEV)
2. Push to branch → Test in Preview deployment
3. Create PR → Code review
4. Merge → Deploy to Production
```

---

## ✅ Checklist Final

### Antes de Considerar Completo

- [ ] **Bug dashboard fixeado** y verificado en producción
- [ ] **Supabase Development** proyecto creado y funcional
- [ ] **Schema replicado** de PROD a DEV
- [ ] **Seed data** ejecutado en DEV
- [ ] **Variables de entorno** configuradas en Vercel (Production vs Preview)
- [ ] **Branch protection** configurado en GitHub
- [ ] **Test 1** (push branch): Preview deployment OK
- [ ] **Test 2** (merge main): Production deployment OK
- [ ] **Documentación** actualizada (README, DEVELOPMENT.md, CONTRIBUTING.md)
- [ ] **.env.local** configurado con Supabase DEV
- [ ] **.gitignore** incluye `.env.local`

---

## 🆘 Troubleshooting

### Preview deployment usa Supabase PROD
**Causa**: Variables de entorno mal configuradas
**Fix**: Verificar en Vercel que las variables con scope "Preview" tienen las credenciales DEV

### Production deployment usa Supabase DEV
**Causa**: Variables de entorno mal configuradas
**Fix**: Verificar que variables con scope "Production" tienen credenciales PROD

### Build falla en Preview
**Causa**: Datos de seed en DEV incompletos
**Fix**: Ejecutar `db/seed.sql` en Supabase DEV SQL Editor

### No puedo pushear a main
**Causa**: Branch protection activado
**Fix**: Correcto - debes crear PR y mergear

---

## 📞 Soporte

Si algo sale mal:
1. Revisar logs en Vercel Dashboard
2. Revisar logs en Supabase Dashboard
3. Verificar variables de entorno
4. Comparar con esta guía

---

**¿Listo para empezar?** 🚀

Comienza con **PASO 1** (Fix bug dashboard) y luego continúa secuencialmente.
