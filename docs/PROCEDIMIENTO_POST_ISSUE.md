# 📋 Procedimiento Post-Issue: Cierre Correcto

**Propósito**: Garantizar que cada issue se cierra correctamente con toda la documentación y commits necesarios.

---

## ✅ Checklist de Cierre de Issue

### 1. 🔍 Verificar Estado en GitHub

```bash
# Ver issues abiertos
gh issue list --state open

# Ver detalles del issue específico
gh issue view <número>
```

**Verificar:**
- [ ] El issue está CLOSED (si usaste "Closes #X" en el commit, se cierra automáticamente)
- [ ] Si no está cerrado, cerrarlo manualmente

---

### 2. 📝 Agregar Comentario Final de Resumen

**Usar GitHub CLI o MCPs:**

```bash
gh issue comment <número> --body "## ✅ Issue COMPLETADO
[Resumen de implementación, métricas, enlaces a documentación]"
```

**Incluir:**
- [ ] Estado final (✅ COMPLETADO)
- [ ] Fecha de cierre
- [ ] Commit hash principal
- [ ] Resumen de objetivos cumplidos
- [ ] Métricas (tiempo, objetos, archivos)
- [ ] Enlaces a documentación generada
- [ ] Beneficios del cambio

**Ejemplo**: Ver Issue #6 - https://github.com/Kavalieri/Cuentas_SiKNess/issues/6

---

### 3. 📚 Actualizar Documentación de Planificación

Si existe un documento de planificación del issue (ej: `docs/ISSUE_X_DESCRIPCION.md`):

**Actualizar:**
- [ ] Cambiar estado de "🔄 En Progreso" a "✅ COMPLETADO"
- [ ] Agregar commit hash y fecha
- [ ] Agregar sección "RESULTADO FINAL" con:
  * Logros alcanzados
  * Métricas reales vs estimadas
  * Enlaces a documentación
  * Beneficios post-implementación

**Commit:**
```bash
git add docs/ISSUE_X_DESCRIPCION.md
git commit -m "docs(issue-X): mark as completed and add final results"
git push
```

---

### 4. 📦 Organizar Archivos Generados

**Si el issue generó documentación nueva:**

- [ ] Mover documentos de resumen a `docs/releases/` (si es un release)
- [ ] O mantener en `docs/` (si es documento de análisis/implementación)
- [ ] Actualizar índices o TOC si existen

**Si el issue generó scripts:**

- [ ] Verificar que están en `scripts/` con permisos ejecutables
- [ ] Documentar en README correspondiente
- [ ] Agregar a `.vscode/tasks.json` si aplica

**Si el issue modificó migraciones:**

- [ ] Verificar que están en el directorio correcto
- [ ] Verificar que `_migrations` está actualizada
- [ ] Archivar migraciones obsoletas si aplica

---

### 5. 🔗 Actualizar Referencias Cruzadas

**Verificar y actualizar:**

- [ ] CHANGELOG.md (agregar entrada del issue)
- [ ] README.md principal (si hay cambios de setup)
- [ ] AGENTS.md (si hay nuevas reglas o herramientas)
- [ ] Documentación de arquitectura relevante

**Formato CHANGELOG.md:**

```markdown
## [v2.1.0] - 2025-10-31

### Added
- Sistema de ownership unificado PostgreSQL (#6)
- Scripts automatizados de gestión de migraciones
- Baseline limpio v2.1.0 (6474 líneas)

### Changed
- Roles PostgreSQL simplificados (3 → 2)
- Tabla _migrations mejorada con tracking completo

### Deprecated
- Roles cuentassik_dev_owner y cuentassik_prod_owner

### Removed
- 138 migraciones obsoletas (archivadas)
```

---

### 6. 🏷️ Crear Tag de Release (Si Aplica)

**Para issues que representan releases mayores:**

```bash
# Crear tag anotado
git tag -a v2.1.0 -m "Release v2.1.0: Unified Ownership System

- Unified PostgreSQL ownership to cuentassik_owner
- Reset migration system with enhanced tracking
- 138 migrations archived
- 5 automation scripts added
- Complete documentation overhaul

Closes #6"

# Push tag
git push origin v2.1.0
```

**En GitHub:**
- [ ] Crear Release desde el tag
- [ ] Agregar notas de release
- [ ] Adjuntar archivos si aplica (ej: baseline.sql)

---

### 7. 🧹 Limpieza de Ramas (Si Aplica)

**Si trabajaste en una rama feature:**

```bash
# Verificar que todo está mergeado
git branch --merged

# Eliminar rama local
git branch -d feature/issue-X

# Eliminar rama remota
git push origin --delete feature/issue-X
```

---

### 8. ✅ Verificación Final

**Checklist completo:**

- [ ] ✅ Issue cerrado en GitHub
- [ ] 💬 Comentario final agregado con resumen
- [ ] 📝 Documento de planificación actualizado
- [ ] 📚 Documentación generada organizada
- [ ] 🔗 Referencias cruzadas actualizadas
- [ ] 🏷️ Tag/Release creado (si aplica)
- [ ] 🧹 Ramas limpiadas (si aplica)
- [ ] 🔄 Todo pusheado a main

**Comando rápido de verificación:**

```bash
# Ver últimos commits
git log --oneline -5

# Ver estado remoto
git status

# Ver issues cerrados recientemente
gh issue list --state closed --limit 5
```

---

## 🎯 Próximos Pasos (Después del Cierre)

### Comunicación

- [ ] Notificar al equipo del cierre (si aplica)
- [ ] Actualizar tableros de proyecto (si aplica)
- [ ] Mencionar en standup/retrospectiva

### Planificación

- [ ] Revisar issues relacionados o bloqueados
- [ ] Priorizar siguiente issue
- [ ] Actualizar roadmap si aplica

### Mejora Continua

- [ ] Documentar lecciones aprendidas
- [ ] Actualizar procedimientos si hubo blockers
- [ ] Sugerir mejoras al workflow

---

## 📖 Ejemplo Completo: Issue #6

**Issue**: Unificar usuarios DB
**Fecha**: 31 Octubre 2025
**Resultado**: v2.1.0

### Pasos Ejecutados:

1. ✅ Implementación completa (12 fases)
2. ✅ Commit principal: `e74260c`
3. ✅ Issue cerrado automáticamente ("Closes #6")
4. ✅ Comentario final agregado con resumen
5. ✅ Documento actualizado: `docs/ISSUE_6_UNIFICAR_USUARIOS_DB.md`
6. ✅ Commit de cierre: `2d55ef9`
7. ✅ Todo pusheado a main
8. ⏭️ Listo para Issue #7

**Referencias:**
- GitHub Issue: https://github.com/Kavalieri/Cuentas_SiKNess/issues/6
- Documentación: `docs/releases/v2.1.0_OWNERSHIP_UNIFICATION.md`
- Planificación: `docs/ISSUE_6_UNIFICAR_USUARIOS_DB.md`

---

## 🛠️ Herramientas Útiles

### GitHub CLI (gh)

```bash
# Ver issues
gh issue list

# Ver issue específico
gh issue view 6

# Agregar comentario
gh issue comment 6 --body "Mensaje"

# Cerrar issue
gh issue close 6
```

### Git MCPs (en Copilot)

```typescript
// Listar issues
mcp_github_github_list_issues({ owner, repo, state: "OPEN" })

// Ver issue
mcp_github_github_issue_read({ owner, repo, issue_number: 6, method: "get" })

// Agregar comentario
mcp_github_github_add_issue_comment({ owner, repo, issue_number: 6, body: "..." })

// Cerrar issue
mcp_github_github_issue_write({
  method: "update",
  owner,
  repo,
  issue_number: 6,
  state: "closed"
})
```

---

**✅ Procedimiento Validado con Issue #6**
**Última actualización**: 31 Octubre 2025
