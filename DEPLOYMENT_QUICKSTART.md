# 🚀 Deployment Quick Guide - CuentasSiK v0.3.0-alpha

**Para**: Equipo de Implementación Linux Production  
**Versión**: v0.3.0-alpha (Phase 8 Complete)  
**Fecha**: 8 octubre 2025  
**Status**: Pre-release Ready

---

## ⚡ TL;DR

Esta release añade:
1. **Navegación unificada** en todos los dispositivos
2. **Fix bloqueo de aportaciones** (ahora siempre disponible)
3. **Sistema de plantillas pre-pagos** (alquiler, luz, agua, internet)

**Status**: ✅ Build passing (30 rutas), listo para producción

---

## 📋 Deployment Checklist Rápido

### 1. Base de Datos (Supabase) - 5 min

```bash
# Aplicar 2 migraciones nuevas
npx supabase db push
```

**Validación**:
```sql
-- Debe retornar 4 plantillas por household
SELECT COUNT(*) FROM contribution_adjustment_templates;
```

### 2. Aplicación (Next.js) - 10 min

```bash
# Regenerar tipos
npx supabase gen types typescript --project-id fizxvvtakvmmeflmbwud > types/database.ts

# Build
npm run build
# Verificar: ✓ 30 routes generated

# Deploy
pm2 restart cuentassik
# O: vercel --prod
```

### 3. Testing Post-Deploy - 5 min

- [ ] Acceder a `/app/contributions/adjustments`
- [ ] Click "Desde Plantilla" → debe mostrar 4 plantillas
- [ ] Seleccionar una → formulario pre-llenado
- [ ] Submit → toast success + ajuste creado

**Total**: ~20 minutos de deployment

---

## 🔧 Comandos Deployment Completo

### Opción A: Vercel (recomendado)

```bash
vercel --prod
```

### Opción B: Linux Server (PM2 + Nginx)

```bash
# En servidor
cd /var/www/CuentasSiK
git pull origin main
npm ci
npm run build
pm2 restart cuentassik

# Verificar
pm2 logs cuentassik --lines 50
curl http://localhost:3000/app/contributions/adjustments
```

---

## 🐛 Troubleshooting Express

| Problema | Solución Rápida |
|----------|-----------------|
| Plantillas no aparecen | Ejecutar seed manual (ver SQL en RELEASE_NOTES) |
| Build falla con tipos | `npx supabase gen types...` + `rm -rf .next` |
| Error al crear ajuste | Verificar categoría "Aportación Cuenta Conjunta" existe |
| Last amount no actualiza | Revisar RLS policy UPDATE en templates table |

**Logs completos**: `pm2 logs cuentassik --lines 200`

---

## 📞 Contacto Rápido

**Repositorio**: https://github.com/Kavalieri/CuentasSiK  
**Branch**: `main`  
**Issues**: GitHub Issues con label `bug` o `deployment`

**Documentación completa**: Ver `RELEASE_NOTES_v0.3.0.md` (650+ líneas)

---

## ✅ Verificación Exitosa

**Si todo funciona, deberías ver**:
- ✅ Bottom nav en desktop y móvil
- ✅ Botón "Desde Plantilla" en ajustes
- ✅ 4 cards de plantillas (Alquiler, Luz, Agua, Internet)
- ✅ Formulario pre-llenado al seleccionar plantilla
- ✅ Ajuste creado exitosamente tras submit

**¡Listo! 🎉**
