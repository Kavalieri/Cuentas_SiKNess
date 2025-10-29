# 📦 CuentasSiK - Control de Versiones y Builds Reproducibles

**Guía para gestionar dependencias y asegurar builds consistentes**

---

## 🎯 Objetivo

Garantizar que cada build de producción use **exactamente las mismas versiones** de dependencias que fueron probadas en desarrollo, evitando actualizaciones no deseadas que puedan introducir bugs.

---

## 📋 Sistema de Version Locking

### package.json - Definición de Rangos

El archivo `package.json` define **rangos de versiones aceptables**:

```json
{
  "dependencies": {
    "next": "^15.0.0",        // Permite 15.0.0 a < 16.0.0
    "react": "^18.3.1",       // Permite 18.3.1 a < 19.0.0
    "typescript": "^5.6.0"    // Permite 5.6.0 a < 6.0.0
  }
}
```

**Caret (^)**: Permite actualizaciones de versiones menores y parches, pero NO mayores.
- `^15.0.0` → puede instalar 15.1.0, 15.2.0, pero NO 16.0.0
- `^18.3.1` → puede instalar 18.3.2, 18.4.0, pero NO 19.0.0

### package-lock.json - Versiones Exactas

El archivo `package-lock.json` registra las **versiones EXACTAS** instaladas:

```json
{
  "packages": {
    "node_modules/next": {
      "version": "15.0.3",    // Versión EXACTA instalada
      "resolved": "https://registry.npmjs.org/next/-/next-15.0.3.tgz",
      "integrity": "sha512-..."
    }
  }
}
```

**Importante**: Este archivo DEBE estar en Git y NUNCA editarse manualmente.

---

## ⚖️ npm install vs npm ci

### npm install (NO usar en producción)

```bash
npm install
```

**Comportamiento:**
1. Lee `package.json`
2. Instala versiones dentro de los rangos permitidos
3. Puede instalar versiones MÁS NUEVAS que las del lock file
4. Actualiza `package-lock.json` automáticamente

**Problema:** Diferentes desarrolladores o builds pueden obtener versiones distintas.

### npm ci (SIEMPRE usar en producción)

```bash
npm ci
```

**Comportamiento:**
1. Lee `package-lock.json` **exclusivamente**
2. Instala versiones EXACTAS especificadas
3. Ignora `package.json` (solo verifica compatibilidad)
4. NO modifica `package-lock.json`
5. Más rápido (elimina node_modules/ y reinstala desde cero)

**Ventaja:** Build 100% reproducible. Garantiza las mismas versiones siempre.

---

## 🔧 Workflow de Desarrollo

### 1. Agregar Nueva Dependencia

```bash
# Desarrollo
npm install nombre-paquete

# Esto actualiza package.json Y package-lock.json
```

### 2. Actualizar Dependencia Existente

```bash
# Actualizar a última versión dentro del rango
npm update nombre-paquete

# Actualizar a una versión específica
npm install nombre-paquete@1.2.3

# Ver qué paquetes tienen actualizaciones disponibles
npm outdated
```

### 3. Verificar Cambios

```bash
# Ver diferencias en package-lock.json
git diff package-lock.json

# Verificar que la app funciona correctamente
npm run dev
npm run build
npm run test
```

### 4. Commit de Cambios

```bash
# SIEMPRE commitear package.json Y package-lock.json juntos
git add package.json package-lock.json
git commit -m "chore(deps): update [nombre-paquete] to [version]"
```

---

## 🚀 Workflow de Producción

### Build para Deploy

```bash
# ✅ CORRECTO: Usar npm ci
npm ci              # Instala versiones EXACTAS desde lock file
npm run build       # Build con versiones verificadas

# ❌ INCORRECTO: Usar npm install
npm install         # Puede instalar versiones diferentes
npm run build       # Build con versiones no probadas
```

### Script de Deploy Automatizado

```bash
#!/bin/bash
# deploy.sh

set -e  # Salir si cualquier comando falla

echo "🔒 Instalando dependencias exactas..."
npm ci

echo "🏗️  Building aplicación..."
npm run build

echo "🧪 Ejecutando tests..."
npm run test

echo "✅ Build exitoso. Listo para deploy."
```

---

## 🔐 Seguridad y Auditorías

### Verificar Vulnerabilidades

```bash
# Escanear vulnerabilidades
npm audit

# Mostrar solo vulnerabilidades críticas y altas
npm audit --audit-level=high

# Intentar fix automático (cuidado: puede actualizar versiones)
npm audit fix

# Ver qué cambiaría sin aplicarlos
npm audit fix --dry-run
```

### Mantener Dependencias Actualizadas (con cuidado)

```bash
# Ver qué paquetes están desactualizados
npm outdated

# Actualizar dependencias de desarrollo
npm update --dev

# Actualizar dependencias de producción (una por una)
npm update nombre-paquete

# SIEMPRE probar después de actualizar
npm run test
npm run build
```

---

## 📊 Monitoreo de Dependencias

### Verificar Estado Actual

```bash
# Listar todas las dependencias instaladas
npm list --depth=0

# Ver versión específica de un paquete
npm list nombre-paquete

# Ver todas las versiones (incluyendo subdependencias)
npm list
```

### Herramientas Adicionales (Opcional)

```bash
# npm-check-updates - Ver actualizaciones mayores disponibles
npx npm-check-updates

# npm-check-updates - Actualizar package.json a últimas versiones
npx npm-check-updates -u
npm install  # Instalar nuevas versiones
```

---

## ⚠️ Casos Especiales

### Dependencias con Vulnerabilidades

Si `npm audit` reporta vulnerabilidades:

1. **Evaluar severidad**:
   - LOW/MODERATE: Evaluar riesgo vs beneficio
   - HIGH/CRITICAL: Actualizar lo antes posible

2. **Actualizar paquete afectado**:
   ```bash
   npm audit fix  # Intenta fix automático
   # O manualmente:
   npm update paquete-vulnerable
   ```

3. **Si no hay fix disponible**:
   - Buscar alternativas al paquete
   - Reportar issue al mantenedor
   - Considerar fork temporal con fix

### Breaking Changes en Actualizaciones

Si una actualización rompe la aplicación:

1. **Revertir cambios**:
   ```bash
   git checkout HEAD -- package.json package-lock.json
   npm ci
   ```

2. **Investigar changelog del paquete**:
   - Ver `CHANGELOG.md` del paquete
   - Buscar breaking changes
   - Ajustar código según migration guide

3. **Actualizar gradualmente**:
   - Actualizar versiones menores primero
   - Probar cada incremento
   - Documentar cambios necesarios

---

## 🎯 Best Practices

### ✅ DO

- ✅ Usar `npm ci` en CI/CD y producción
- ✅ Commitear `package-lock.json` siempre
- ✅ Actualizar dependencias regularmente (pero controladamente)
- ✅ Ejecutar tests después de cada actualización
- ✅ Documentar actualizaciones importantes en CHANGELOG
- ✅ Usar versiones específicas para dependencias críticas
- ✅ Mantener Node.js actualizado (LTS)

### ❌ DON'T

- ❌ Usar `npm install` en producción
- ❌ Ignorar `package-lock.json` en Git
- ❌ Editar `package-lock.json` manualmente
- ❌ Actualizar todas las dependencias a la vez
- ❌ Ignorar warnings de `npm audit`
- ❌ Usar `npm install --force` sin entender por qué
- ❌ Mezclar npm y yarn (elegir uno y mantenerlo)

---

## 🔍 Troubleshooting

### "Diferentes versiones en local vs CI"

```bash
# Solución: Usar npm ci en ambos
npm ci
```

### "package-lock.json tiene conflictos en Git"

```bash
# Opción 1: Regenerar lock file
rm package-lock.json
npm install

# Opción 2: Resolver conflictos manualmente
# Aceptar la versión de main y regenerar
git checkout main -- package-lock.json
npm install
```

### "Build funciona en local pero falla en producción"

```bash
# Verificar diferencias de Node.js
node --version  # Local
# vs
node --version  # Producción

# Verificar que se usa npm ci en producción
# NO npm install
```

### "Error: Cannot find module"

```bash
# Reinstalar desde cero
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Referencias

- [npm ci documentation](https://docs.npmjs.com/cli/v10/commands/npm-ci)
- [package-lock.json docs](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json)
- [Semantic Versioning](https://semver.org/)
- [npm audit docs](https://docs.npmjs.com/cli/v10/commands/npm-audit)

---

**Última actualización**: 29 Octubre 2025
**Versión del proyecto**: 1.1.0
