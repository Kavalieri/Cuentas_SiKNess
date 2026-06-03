# � Checklist: Sync PROD→DEV + Limpieza + Merge v3.0.0

**Fecha**: 2 Junio 2026
**Objetivo**: Sincronizar datos, limpiar Git, resolver errores, mergear v3.0.0

---

## 🎯 Pasos a Seguir

### 1️⃣ **Sincronizar Datos PROD → DEV**

**OPCIÓN A: Copia completa (RECOMENDADO - datos + permisos idénticos)**

```bash
# 1. Backup de seguridad
sudo -u postgres pg_dump -Fc cuentassik_prod > /tmp/backup_prod_$(date +%Y%m%d).dump
sudo -u postgres pg_dump -Fc cuentassik_dev > /tmp/backup_dev_$(date +%Y%m%d).dump

# 2. Detener DEV
pm2 stop cuentassik-dev

# 3. Reemplazar DEV completo con PROD
sudo -u postgres dropdb cuentassik_dev
sudo -u postgres createdb cuentassik_dev -O cuentassik_owner
sudo -u postgres pg_restore -d cuentassik_dev /tmp/backup_prod_$(date +%Y%m%d).dump

# 4. Verificar
sudo -u postgres psql -d cuentassik_dev -c "SELECT count(*) FROM transactions;"
pm2 restart cuentassik-dev
```

- [ ] Backup PROD creado
- [ ] Backup DEV creado
- [ ] Base de datos copiada
- [ ] DEV funciona con datos PROD

**OPCIÓN B: Solo datos nuevos (incremental)**

```bash
# 1. Ver última transacción en DEV
sudo -u postgres psql -d cuentassik_dev -c \
  "SELECT id, occurred_at FROM transactions ORDER BY occurred_at DESC LIMIT 1;"
# Anotar fecha: _______________________

# 2. Exportar solo transacciones nuevas desde esa fecha
sudo -u postgres pg_dump -d cuentassik_prod \
  --data-only \
  --table=transactions \
  --table=monthly_periods \
  --table=member_incomes \
  --where="occurred_at > 'FECHA_ANOTADA'" \
  > /tmp/prod_incremental.sql

# 3. Importar en DEV
sudo -u postgres psql -d cuentassik_dev -f /tmp/prod_incremental.sql

# 4. Verificar conteos
sudo -u postgres psql -d cuentassik_dev -c \
  "SELECT count(*) FROM transactions WHERE occurred_at > 'FECHA_ANOTADA';"
```

- [ ] Fecha última transacción anotada
- [ ] Datos incrementales exportados
- [ ] Datos importados en DEV
- [ ] Conteos verificados

---

### 2️⃣ **Limpiar Git**

```bash
cd /home/kava/workspace/proyectos/CuentasSiK/repo

# Ver estado actual
git status

# Limpiar archivos basura
rm -f config1.1 hash solrz solrz.1
git clean -n  # Preview (quitar -n para ejecutar)

# Revisar cambios pendientes
git diff app/sickness/credito-deuda/historial-prestamos/page.tsx
git diff database/migrations/20251120_053150_remove_redundant_empty_tables_fase1_issue63.sql

# Decisión: Commit o Revert
# Si son cambios útiles:
git add .
git commit -m "chore: cleanup y ajustes menores"

# Si no son útiles:
git checkout -- app/sickness/credito-deuda/historial-prestamos/page.tsx
git checkout -- database/migrations/20251120_053150_remove_redundant_empty_tables_fase1_issue63.sql
```

- [ ] Archivos basura eliminados
- [ ] Cambios revisados
- [ ] Git limpio (`git status` clean o solo cambios deseados)

---

### 3️⃣ **Revisar y Corregir Errores ANTES de Nuevos Cambios**

```bash
# Ver logs de PROD
pm2 logs cuentassik-prod --lines 100 --nostream --err | grep -i "error\|exception"

# Ver logs de DEV
pm2 logs cuentassik-dev --lines 100 --nostream --err | grep -i "error\|exception"

# Compilación limpia
npm run typecheck
npm run lint
```

**Errores detectados**:

1. **owner_profile_id** (`lib/auth.ts:698`)

   ```typescript
   // ❌ INCORRECTO:
   const result = await query<{ owner_profile_id: string }>(
     `SELECT owner_profile_id FROM households WHERE id = $1`,
     [householdId],
   );

   // ✅ CORRECTO:
   const result = await query<{ is_owner: boolean }>(
     `SELECT is_owner FROM household_members
      WHERE profile_id = $1 AND household_id = $2`,
     [currentUser.profile_id, householdId],
   );
   return result.rows.length > 0 && result.rows[0].is_owner;
   ```

- [ ] Errores en logs revisados
- [ ] `lib/auth.ts` corregido
- [ ] TypeCheck OK
- [ ] Lint OK
- [ ] Probado en DEV (`pm2 restart cuentassik-dev`)

---

### 4️⃣ **Mergear PR #5 (v3.0.0)**

```bash
# Revisar PR
gh pr view 5

# Mergear (si todo está OK)
gh pr merge 5 --merge

# Actualizar local
git pull origin main

# Verificar CHANGELOG
head -50 CHANGELOG.md
```

- [ ] PR #5 revisado
- [ ] PR #5 mergeado
- [ ] Main actualizado localmente
- [ ] CHANGELOG verificado

---

### 5️⃣ **Commit y Push de Correcciones (si aplica)**

```bash
# Si hiciste correcciones (ej: lib/auth.ts)
git add lib/auth.ts
git commit -m "fix(auth): corregir isHouseholdOwner - usar household_members.is_owner"
git push origin main
```

- [ ] Cambios commiteados
- [ ] Push a GitHub OK

---

### 6️⃣ **Deploy a PROD (SOLO SI HAY FIXES CRÍTICOS)**

⚠️ **IMPORTANTE**: Solo hacer deploy si corregiste errores críticos. Si no hay cambios, SALTAR este paso.

```bash
# Build
npm run build

# Restart PROD
pm2 restart cuentassik-prod

# Verificar
pm2 logs cuentassik-prod --lines 30 --nostream
pm2 status
```

- [ ] Build OK
- [ ] PROD reiniciado
- [ ] Sin errores en logs
- [ ] Aplicación funciona normalmente

---

## ✅ Checklist Final

- [ ] Datos PROD → DEV sincronizados
- [ ] Git limpio (sin archivos basura, sin cambios no deseados)
- [ ] Errores revisados y corregidos
- [ ] PR #5 v3.0.0 mergeado
- [ ] PROD funcionando sin tocar lo que ya funciona
- [ ] Proyecto listo para nuevos cambios

---

## 🆘 Rollback de Emergencia

```bash
# Si algo falla en PROD:
sudo -u postgres pg_restore --clean -d cuentassik_prod /tmp/backup_prod_YYYYMMDD.dump
git revert HEAD
npm run build
pm2 restart cuentassik-prod
```

- [ ] Backups guardados en `/tmp/backup_*`
