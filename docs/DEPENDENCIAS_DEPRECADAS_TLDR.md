# 🔄 Dependencias Deprecadas - TL;DR

**Estado**: ⚠️ Warnings - No bloquean producción
**Acción requerida**: **NO actualizar antes de producción**
**Próxima revisión**: Post-deployment (1-2 semanas)

---

## 📊 Resumen Ultra-Corto

| Dependencia | Impacto | Origen | Acción |
|------------|---------|--------|--------|
| **eslint@8.57.1** | 🔴 Alto | Directa | Migrar a v9 (post-prod) |
| **exceljs deps** | 🟡 Medio | Transitivas | Monitorear memoria |
| **rimraf/glob** | 🟡 Medio | ESLint | Se resuelve con ESLint 9 |
| **lodash.isequal** | 🟢 Bajo | ExcelJS | Esperar upstream |
| **fstream/inflight** | 🟡 Medio | ExcelJS | Esperar upstream |

---

## ✅ Qué Hacer Ahora

**Respuesta corta**: **NADA**

1. ✅ Warnings documentados (ver `DEPENDENCIAS_DEPRECADAS_ANALISIS.md`)
2. ✅ No impactan producción
3. ✅ Plan de acción definido para post-producción

**Continuar con el deployment de producción como estaba planeado.**

---

## 🎯 Próximos Pasos (Post-Producción)

### Prioridad 1: ESLint 9 Migration (~1 semana post-prod)
```bash
# 1. Crear branch
git checkout -b feat/eslint-9-migration

# 2. Actualizar ESLint
npm install eslint@9 --save-dev
npm install @typescript-eslint/parser@8 --save-dev
npm install @typescript-eslint/eslint-plugin@8 --save-dev

# 3. Migrar config
npx @eslint/migrate-config .eslintrc.js

# 4. Testing
npm run lint
npm run typecheck

# 5. CI/CD
# Verificar que GitHub Actions pasa
```

**Estimación**: 4-6 horas de trabajo

### Prioridad 2: Monitorear Producción (~1 mes)
- Ver logs de PM2 para memory leaks
- Monitorear uso de memoria cuando se generen exports Excel
- Si hay problemas → considerar alternativas a ExcelJS

### Prioridad 3: Automatización (~2 meses)
- Configurar Dependabot para actualizaciones automáticas
- Establecer rutina mensual de revisión de dependencias

---

## ❓ FAQs

**¿Por qué no actualizar ahora?**
Porque ESLint 9 requiere cambios breaking en configuración. Es mejor validar producción primero y hacer la migración con calma después.

**¿Los warnings afectan la funcionalidad?**
No. Son solo avisos de que esas versiones eventualmente dejarán de recibir soporte.

**¿Hay riesgo de seguridad?**
No inmediato. Solo son deprecation warnings, no vulnerabilidades de seguridad.

**¿Cuándo actualizar?**
1-2 semanas después del deployment de producción, cuando tengamos baseline estable.

---

**Documentación completa**: `docs/TO-DO/DEPENDENCIAS_DEPRECADAS_ANALISIS.md`
**Última actualización**: 2025-10-28
