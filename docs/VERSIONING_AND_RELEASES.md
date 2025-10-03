# 🚀 Sistema de Versionado y Releases

## Estrategia de Versionado

**Proyecto**: CuentasSiK  
**Sistema**: Release Please + GitHub Actions  
**Convención**: Semantic Versioning 2.0.0 con Pre-releases Alpha

---

## 📋 Configuración Actual

### Versionado
- **Versión inicial**: `0.0.0`
- **Primera release**: `0.0.1-alpha.0`
- **Tipo de pre-release**: `alpha`
- **Convención de commits**: Conventional Commits

### Archivos de Configuración

#### `release-please-config.json`
```json
{
  "packages": {
    ".": {
      "release-type": "node",
      "changelog-path": "CHANGELOG.md",
      "prerelease": true,
      "prerelease-type": "alpha"
    }
  },
  "bump-minor-pre-major": true,
  "bump-patch-for-minor-pre-major": true
}
```

#### `.release-please-manifest.json`
```json
{
  ".": "0.0.0"
}
```

---

## 🔄 Workflow de Desarrollo

### 1. Hacer Cambios en el Código

```bash
# Hacer cambios en archivos
git add .
git commit -m "feat: add new feature"
git push origin main
```

### 2. Release Please Automático

Después del push a `main`, GitHub Actions ejecutará Release Please:

1. **Analiza commits** desde la última release
2. **Determina el tipo de bump** según Conventional Commits:
   - `feat:` → bump **minor** (0.0.x → 0.1.0-alpha.0)
   - `fix:` → bump **patch** (0.0.x → 0.0.y-alpha.0)
   - `feat!:` o `BREAKING CHANGE:` → bump **major** (0.x.y → 1.0.0-alpha.0)
   - `chore:`, `docs:`, `refactor:` → **no bump**
3. **Crea/actualiza PR** titulado `chore: release 0.0.1-alpha.0`
4. **Genera CHANGELOG.md** con todos los cambios

### 3. Revisar el Release PR

El PR creado por Release Please incluye:
- ✅ Bump de versión en `package.json`
- ✅ Actualización de `.release-please-manifest.json`
- ✅ Generación/actualización de `CHANGELOG.md`
- ✅ Git tag preparado

### 4. Hacer Merge del PR

Cuando estés listo para publicar:

```bash
# Opción A: Desde GitHub UI
# - Ir al PR "chore: release X.Y.Z-alpha.N"
# - Hacer clic en "Merge pull request"

# Opción B: Desde CLI
gh pr merge <PR_NUMBER> --squash
```

### 5. Release Automático

Después del merge:
1. Release Please crea el **Git tag** (ej: `v0.0.1-alpha.0`)
2. Se crea una **GitHub Release** automáticamente
3. La release se marca como **Pre-release** (alpha)

---

## 📊 Ejemplos de Versionado

### Pre-releases (Fase Actual)

| Commits desde última release | Nueva versión |
|------------------------------|---------------|
| `feat: add dashboard` | `0.0.1-alpha.0` |
| `fix: resolve bug` | `0.0.1-alpha.1` |
| `feat: add categories` | `0.1.0-alpha.0` |
| `feat!: breaking change` | `1.0.0-alpha.0` |

### Releases Estables (Futuro)

Cuando el proyecto esté listo para producción:

1. Cambiar configuración:
```json
{
  "prerelease": false
}
```

2. La próxima release será:
   - De `0.9.5-alpha.3` → `1.0.0` (estable)

---

## 🎯 Conventional Commits

### Formato
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Tipos Principales

#### `feat:` - Nueva Funcionalidad
```bash
feat: add expense filtering by category
feat(ui): implement dark mode toggle
```
**Bump**: Minor (0.0.x → 0.1.0-alpha.0)

#### `fix:` - Corrección de Bug
```bash
fix: resolve authentication redirect loop
fix(api): handle null household_id correctly
```
**Bump**: Patch (0.0.x → 0.0.y-alpha.0)

#### `chore:` - Mantenimiento
```bash
chore: update dependencies
chore: cleanup console.logs
```
**Bump**: Ninguno

#### `docs:` - Documentación
```bash
docs: update README with deployment steps
docs(api): add JSDoc comments to helpers
```
**Bump**: Ninguno

#### `refactor:` - Refactorización
```bash
refactor: extract validation to separate module
refactor(db): optimize query performance
```
**Bump**: Ninguno

#### `test:` - Tests
```bash
test: add unit tests for date helpers
test(e2e): add login flow test
```
**Bump**: Ninguno

#### Breaking Changes
```bash
feat!: change API response format

BREAKING CHANGE: API now returns data wrapped in 'result' object
```
**Bump**: Major (0.x.y → 1.0.0-alpha.0)

---

## 🛠️ Comandos Útiles

### Ver Versión Actual
```bash
npm run version  # O simplemente ver package.json
```

### Ver Changelog
```bash
cat CHANGELOG.md
```

### Listar Releases
```bash
gh release list
```

### Ver Último Tag
```bash
git describe --tags --abbrev=0
```

### Forzar Release (si es necesario)
```bash
# Trigger manual workflow
gh workflow run release-please.yml
```

---

## 📚 Recursos de Referencia

### Release Please
- [Documentación oficial](https://github.com/googleapis/release-please)
- [Action de GitHub](https://github.com/google-github-actions/release-please-action)

### Conventional Commits
- [Especificación](https://www.conventionalcommits.org/)
- [Angular Convention](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)

### Semantic Versioning
- [Especificación SemVer 2.0.0](https://semver.org/)

---

## 🚨 Problemas Comunes

### PR de Release No Se Crea

**Causa**: No hay commits válidos para release desde la última versión.

**Solución**: 
- Asegúrate de usar Conventional Commits (`feat:`, `fix:`)
- Verifica que los commits están en `main`

### Versión No Se Incrementa

**Causa**: Solo hay commits de tipo `chore`, `docs`, etc.

**Solución**: Usar `feat:` o `fix:` para triggers de bump.

### Release Marcada como Estable

**Causa**: `prerelease: false` en configuración.

**Solución**: Verificar `release-please-config.json` tiene `prerelease: true`.

---

## 🎓 Flujo Completo de Ejemplo

```bash
# 1. Desarrollar feature
git checkout -b feat/new-dashboard
# ... hacer cambios ...
git add .
git commit -m "feat: implement dashboard with monthly summary"
git push origin feat/new-dashboard

# 2. Crear PR y mergear a main
gh pr create --title "feat: implement dashboard"
gh pr merge --squash

# 3. Release Please se activa automáticamente
# - Analiza el commit "feat: ..."
# - Crea PR: "chore: release 0.0.1-alpha.0"

# 4. Revisar y mergear Release PR
gh pr merge <RELEASE_PR_NUMBER> --squash

# 5. ✅ Release 0.0.1-alpha.0 publicado automáticamente
```

---

**Configurado por**: GitHub Copilot  
**Fecha**: 3 de Octubre 2025  
**Status**: ✅ Listo para usar
