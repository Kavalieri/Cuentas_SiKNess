# 📝 TODOLIST · SiKNess

**Actualizado:** 16/10/2025

---

## Fase 1 · Shell global y placeholders

- [x] Crear carpetas y rutas principales en `/sickness` (configuración, periodo, balance)
- [x] Añadir páginas mock para perfil, hogar, categorías, periodo y balance
- [x] Implementar menú burguer con navegación a todas las rutas
- [x] Añadir selectores globales de hogar y periodo (componentes y mock)
- [x] Validar navegación y placeholders en DEV ✅ (16/10/2025 - Servidor funcionando correctamente)

## Fase 2 · Componentes globales y contexto ✅ COMPLETADA (16/10/2025)

- [x] Crear `SiKnessContext` unificado (gestión hogar, periodo, usuario) ✅
- [x] Implementar `GlobalHouseholdSelector` (dropdown) - Conectado al contexto ✅
- [x] Implementar `GlobalPeriodSelector` (calendario) - Conectado al contexto ✅
- [x] Crear APIs de soporte para cambio de hogar y periodo ✅
  - `/api/sickness/balance` (POST balance del periodo) ✅
  - `/api/sickness/household/set-active` (POST cambio de hogar) ✅
  - `/api/sickness/period/set-active` (POST cambio de periodo) ✅
  - `/api/sickness/init` (GET carga inicial completa) ✅
- [x] Añadir toggles dark/light y privacidad ✅ (Ya implementado con next-themes)
- [x] Integrar API `/api/sickness/init` en el contexto para carga inicial automática ✅
- [x] Conectar acciones del contexto a las APIs (selectHousehold, selectPeriod, refreshBalance) ✅

## Fase 3 · Integración y lógica real

- [ ] Conectar selectores a datos reales (queries)
- [ ] CRUD perfil, hogar y categorías
- [ ] Workflow de periodo (fases, checklist, cierre)
- [ ] Dashboard de balance y transacciones

## Fase 4 · Depuración y migración

- [ ] Deprecar legacy y experimental (redirects)
- [ ] Eliminar tablas BD redundantes (migración)
- [ ] Testing y QA
- [ ] Actualizar documentación y AGENTS.md

---

**Notas rápidas:**

- Documentar cada avance en `docs/TO-DO/Cuentas_SiKNess.md` y `ANALISIS_REFACTOR_SIKNESS.md`
- Validar navegación y experiencia móvil en cada iteración
- Mantener consistencia visual y de UX
