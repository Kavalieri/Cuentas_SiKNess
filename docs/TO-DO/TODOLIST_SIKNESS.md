# 📝 TODOLIST · SiKNess

**Actualizado:** 16/10/2025

---

## Fase 1 · Shell global y placeholders

- [x] Crear carpetas y rutas principales en `/sickness` (configuración, periodo, balance)
- [x] Añadir páginas mock para perfil, hogar, categorías, periodo y balance
- [x] Implementar menú burguer con navegación a todas las rutas
- [x] Añadir selectores globales de hogar y periodo (componentes y mock)
- [x] Validar navegación y placeholders en DEV ✅ (16/10/2025 - Servidor funcionando correctamente)

## ⚡ FASE 2: Context Global y Selectores (COMPLETADA ✅ 16/10/2025)

**Estado**: ✅ **COMPLETADA** con integración backend completa y UI refinada

### Contexto Unificado

- ✅ Crear `SiKnessContext` con tipos completos (household, period, balance, user)
- ✅ Implementar provider en `/app/sickness/layout.tsx`
- ✅ Auto-inicialización con `useEffect` desde `/api/sickness/init`
- ✅ Persistencia de privacy mode en localStorage

### Selectores Globales

- ✅ Crear `GlobalHouseholdSelector` conectado al contexto
- ✅ Crear `GlobalPeriodSelector` conectado al contexto
- ✅ **Eliminar duplicación de selectores en topbar** (17/10/2025)
- ✅ Layout optimizado: hogar (izq) + periodo/balance (centro) + controles (der)

### APIs Backend (Todas creadas y funcionales)

- ✅ `GET /api/sickness/init` - Carga inicial completa (user, households, periods, balance)
- ✅ `POST /api/sickness/household/set-active` - Cambiar hogar activo
- ✅ `POST /api/sickness/period/set-active` - Cambiar periodo activo
- ✅ `POST /api/sickness/balance` - Calcular balance del periodo

### Acciones Contexto → Backend

- ✅ `selectHousehold()` → POST /api/sickness/household/set-active
- ✅ `selectPeriod()` → POST /api/sickness/period/set-active
- ✅ `refreshBalance()` → POST /api/sickness/balance
- ✅ `refreshPeriods()` → re-fetch household data

**Commits**:

- `d534e19` - "feat(sickness): completar Fase 2 - integración completa de contexto con APIs"
- **PRÓXIMO** - "fix(sickness): eliminar selectores duplicados en topbar"

---

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
