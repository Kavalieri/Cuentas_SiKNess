# ✅ Configuración de Release Please - Completada

**Fecha**: 3 de Octubre 2025  
**Sistema**: Release Please + GitHub Actions  
**Status**: ✅ Configurado y listo

---

## 🎯 Configuración Aplicada

### 1. Pre-releases Alpha
- ✅ `prerelease: true` en `release-please-config.json`
- ✅ `prerelease-type: "alpha"`
- ✅ Versión inicial: `0.0.0`
- ✅ Primera release será: `0.0.1-alpha.0`

### 2. Archivos Modificados

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

#### `package.json`
```json
{
  "version": "0.0.0"
}
```

#### `.github/workflows/release-please.yml`
```yaml
- uses: google-github-actions/release-please-action@v4
  with:
    config-file: release-please-config.json
    manifest-file: .release-please-manifest.json
```

### 3. Documentación Creada
- ✅ `docs/VERSIONING_AND_RELEASES.md` - Guía completa
- ✅ `README.md` - Sección actualizada con link

---

## 🚀 Cómo Funciona

### Flujo Automático

1. **Haces commit y push a `main`**:
```bash
git commit -m "feat: add new dashboard"
git push origin main
```

2. **GitHub Action se ejecuta automáticamente**:
   - Analiza commits desde última release
   - Detecta tipo de bump según Conventional Commits
   - Crea/actualiza PR: `chore: release 0.0.1-alpha.0`

3. **Revisas el Release PR**:
   - Ver cambios en `CHANGELOG.md`
   - Verificar bump de versión
   - Aprobar cuando estés listo

4. **Haces merge del Release PR**:
```bash
# Desde GitHub UI o CLI
gh pr merge <PR_NUMBER> --squash
```

5. **Release automático**:
   - Se crea Git tag: `v0.0.1-alpha.0`
   - Se publica GitHub Release (marcado como pre-release)
   - Se actualiza `.release-please-manifest.json`

---

## 📊 Ejemplos de Versionado

### Commits y Bumps

| Commit | Versión Actual | Nueva Versión |
|--------|---------------|---------------|
| `feat: add dashboard` | `0.0.0` | `0.0.1-alpha.0` |
| `fix: resolve bug` | `0.0.1-alpha.0` | `0.0.1-alpha.1` |
| `feat: add categories` | `0.0.1-alpha.1` | `0.1.0-alpha.0` |
| `feat!: breaking change` | `0.1.0-alpha.0` | `1.0.0-alpha.0` |

### Conventional Commits

✅ **Producen bump**:
- `feat:` → minor bump
- `fix:` → patch bump
- `feat!:` o `BREAKING CHANGE:` → major bump

❌ **NO producen bump**:
- `chore:` mantenimiento
- `docs:` documentación
- `refactor:` refactorización
- `test:` tests
- `style:` formateo

---

## 🧪 Testing del Sistema

### Primer Commit de Prueba

```bash
# 1. Hacer un cambio de prueba
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "feat: test release please configuration"
git push origin main

# 2. Esperar ~30 segundos
# 3. Verificar que se creó PR automático
gh pr list

# 4. Ver el PR creado
gh pr view <PR_NUMBER>

# Expected output:
# Title: chore: release 0.0.1-alpha.0
# Files changed:
#   - package.json (version: "0.0.1-alpha.0")
#   - .release-please-manifest.json (".": "0.0.1-alpha.0")
#   - CHANGELOG.md (con entry de "feat: test...")
```

---

## 📋 Checklist de Verificación

### Configuración
- [x] `release-please-config.json` con `prerelease: true`
- [x] `.release-please-manifest.json` en `0.0.0`
- [x] `package.json` version `0.0.0`
- [x] Workflow actualizado con config-file

### Documentación
- [x] `docs/VERSIONING_AND_RELEASES.md` creado
- [x] `README.md` actualizado con sección de versionado
- [x] Ejemplos de Conventional Commits documentados

### Listo para Usar
- [x] Configuración committed en git
- [x] Workflow habilitado en GitHub Actions
- [x] Permisos correctos en workflow (write contents y PRs)

---

## 🔧 Comandos Útiles

### Ver Release PR
```bash
gh pr list --label "autorelease: pending"
```

### Mergear Release PR
```bash
gh pr merge <PR_NUMBER> --squash
```

### Ver Releases
```bash
gh release list
```

### Ver Tags
```bash
git tag -l
```

### Trigger Manual (si es necesario)
```bash
gh workflow run release-please.yml
```

---

## 🚨 Solución de Problemas

### PR No Se Crea

**Posibles causas**:
1. No hay commits con `feat:` o `fix:` desde última release
2. Workflow deshabilitado
3. Permisos incorrectos

**Solución**:
```bash
# Verificar commits recientes
git log --oneline -10

# Ver estado del workflow
gh workflow view release-please.yml

# Trigger manual
gh workflow run release-please.yml
```

### Release Marcada como Estable

**Causa**: `prerelease: false` en config

**Solución**: Verificar `release-please-config.json`

---

## 🎓 Transición a Releases Estables (Futuro)

Cuando el proyecto esté listo para producción:

1. Cambiar `release-please-config.json`:
```json
{
  "prerelease": false
}
```

2. El próximo merge producirá:
   - De `0.9.5-alpha.3` → `1.0.0` (stable)

3. Las releases ya no tendrán sufijo `-alpha.X`

---

## 📚 Referencias

- [Release Please Docs](https://github.com/googleapis/release-please)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions](https://docs.github.com/actions)

---

**Configurado por**: GitHub Copilot  
**Próximo paso**: Commit inicial con `chore:` para establecer baseline  
**Status**: ✅ Listo para producción
