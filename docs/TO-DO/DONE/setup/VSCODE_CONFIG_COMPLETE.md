# ✅ VS Code Configuration Complete

## 📋 Resumen de Configuración

### Archivos Creados/Actualizados:

#### 1. `.vscode/settings.json.example` (NUEVO)
Configuración recomendada para todos los desarrolladores.

**Características clave:**
- ✅ **`chat.useNestedAgentsMdFiles: true`** (VS Code v1.105+)
- 🤖 Copilot configurado con contexto de workspace
- 📝 Formatters automáticos (Prettier, ESLint)
- 🗄️ SQL tools configurados
- 🐚 Shell scripts con formato
- 🔍 Búsqueda optimizada (excluye .next, node_modules, .archive)

**Nota**: `settings.json` está en `.gitignore` (configuración personal).
Los desarrolladores deben copiar `settings.json.example` → `settings.json`.

#### 2. `.vscode/extensions.json` (NUEVO)
Lista de 30+ extensiones recomendadas:
- GitHub Copilot + Chat
- Prettier + ESLint
- Tailwind CSS IntelliSense
- SQLTools + PostgreSQL Driver
- Shell Format + Bash IDE
- GitLens + Git Graph
- Markdown tools
- Error Lens, Todo Tree, etc.

#### 3. `.vscode/mcp.jsonc` (NUEVO)
Documentación de MCPs disponibles:
- 🔧 **git-ssh** (CRÍTICO - operaciones Git)
- 🐙 **github-ssh** (CRÍTICO - releases, PRs)
- 🐚 **shell-ssh** (CRÍTICO - comandos bash)
- 📚 **upstash.context7-ssh** (documentación actualizada)
- 📚 **microsoft.docs.mcp-ssh** (Microsoft docs)
- 🌐 **fetch-ssh** (URLs, YouTube)
- 📄 **markitdown-ssh** (convertir documentos)

#### 4. `.vscode/README.md` (NUEVO)
Documentación completa de la configuración:
- Descripción de cada archivo
- Cómo usar nested AGENTS.md
- Workflows recomendados
- Seguridad y comandos peligrosos
- Referencias y contribución

#### 5. `.vscode/tasks.json` (ACTUALIZADO)
16 tareas para Linux (ya existía, sin cambios adicionales).

#### 6. `.vscode/TASKS_README.md` (ACTUALIZADO)
Documentación de tareas (sin cambios adicionales).

#### 7. Backups creados:
- `TASKS_README.md.supabase.backup` (versión Supabase)
- `tasks.json.windows.backup` (versión PowerShell)

#### 8. `AGENTS.md` (ACTUALIZADO - RAÍZ)
Añadida sección sobre nested AGENTS.md:
```markdown
## 📁 Instrucciones Específicas por Carpeta (Nested AGENTS.md)

Este proyecto usa **nested AGENTS.md files** (VS Code v1.105+):

- **`/AGENTS.md`** (este archivo) - Instrucciones generales
- **`/app/AGENTS.md`** - Específico para Next.js/React
- **`/database/AGENTS.md`** - Específico para PostgreSQL/migraciones
```

---

## 🎯 Nested AGENTS.md - Cómo Funciona

### Estructura Actual:
```
/home/kava/workspace/proyectos/CuentasSiK/repo/
├── AGENTS.md                    # ✅ Instrucciones generales
├── app/
│   └── AGENTS.md               # ✅ Específico para Next.js/React
└── database/
    └── AGENTS.md               # ✅ Específico para PostgreSQL
```

### Comportamiento:
1. **Trabajando en `/`**: Copilot lee solo `/AGENTS.md`
2. **Trabajando en `/app/page.tsx`**: Lee `/AGENTS.md` + `/app/AGENTS.md`
3. **Trabajando en `/database/migrations/`**: Lee `/AGENTS.md` + `/database/AGENTS.md`

**Prioridad**: Las instrucciones específicas (nested) tienen mayor peso que las generales.

### Beneficios:
- ✅ **Contexto relevante** según área de trabajo
- ✅ **Menos ruido** (no recibe instrucciones de DB cuando trabaja en React)
- ✅ **Mejor separación** de concerns
- ✅ **Escalable** (puedes añadir más AGENTS.md en subdirectorios)

---

## 🔌 Model Context Protocol (MCP) - Configuración

### Ubicación:
Los MCPs se configuran **globalmente** en:
```
~/.vscode-server/data/User/mcp.json
```

### MCPs Activos:
```json
{
  "servers": {
    "git-ssh": { "command": "npx -y @mseep/git-mcp-server" },
    "github-ssh": { "url": "https://api.githubcopilot.com/mcp/" },
    "shell-ssh": { "command": "npx -y shell-command-mcp" },
    "fetch-ssh": { "command": "npx -y fetch-mcp" },
    "markitdown-ssh": { "command": "uvx markitdown-mcp==0.0.1a4" },
    // ... otros
  }
}
```

### Archivo de Documentación:
`.vscode/mcp.jsonc` documenta:
- Qué MCPs están disponibles
- Para qué se usa cada uno
- Casos de uso
- Comandos permitidos (allowlist)
- Notas de seguridad

**Importante**: Este archivo es **documentación**, no configuración activa.

---

## 📦 Extensiones Recomendadas

Al abrir el proyecto en VS Code, se mostrará un prompt:
> "This workspace recommends installing the following extensions"

**Extensiones críticas** (instalar sí o sí):
1. GitHub Copilot + Chat
2. Prettier (formatter)
3. ESLint (linter)
4. Tailwind CSS IntelliSense
5. SQLTools + PostgreSQL Driver

**Extensiones útiles** (recomendadas):
- GitLens (Git supercharged)
- Error Lens (errores inline)
- Better Comments
- Todo Tree
- Markdown All in One

---

## 🚀 Siguiente Paso: Workspace File

El usuario mencionó que se encargará de crear el workspace file.

### Recomendaciones para el Workspace:

#### Opción 1: Workspace Multi-Root (recomendado)
```json
{
  "folders": [
    {
      "path": "/home/kava/workspace/proyectos/CuentasSiK/repo",
      "name": "🏠 CuentasSiK (Main)"
    },
    {
      "path": "/home/kava/workspace/scripts",
      "name": "🔧 Scripts (Servidor)"
    },
    {
      "path": "/home/kava/workspace/docs",
      "name": "📚 Documentación"
    }
  ],
  "settings": {
    "chat.useNestedAgentsMdFiles": true
  }
}
```

#### Opción 2: Workspace Single-Root
```json
{
  "folders": [
    {
      "path": "/home/kava/workspace/proyectos/CuentasSiK/repo"
    }
  ],
  "settings": {
    "chat.useNestedAgentsMdFiles": true
  }
}
```

**Guardar como**: `CuentasSiK.code-workspace` en `/home/kava/workspace/`

---

## 🔐 Seguridad y Permisos

### Archivos en .gitignore:
- ✅ `.vscode/settings.json` - Configuración personal (ignorado)
- ❌ `.vscode/settings.json.example` - Plantilla (en repo)
- ❌ `.vscode/tasks.json` - Tareas del proyecto (en repo)
- ❌ `.vscode/extensions.json` - Extensiones recomendadas (en repo)

### Comandos Shell Permitidos:
El MCP shell tiene allowlist. Ver `mcp.jsonc` para lista completa.

**Comandos peligrosos bloqueados:**
- `dd` (puede destruir discos)
- `mkfs` (formatear particiones)
- Otros comandos destructivos

---

## 📊 Estado del Repositorio

### Archivos staged para commit:
```bash
A  .vscode/README.md                          # Documentación
A  .vscode/extensions.json                     # Extensiones recomendadas
A  .vscode/mcp.jsonc                           # Documentación MCPs
A  .vscode/settings.json.example               # Plantilla de settings
A  .vscode/TASKS_README.md.supabase.backup     # Backup
A  .vscode/tasks.json.windows.backup           # Backup
M  .vscode/TASKS_README.md                     # Actualizado
M  .vscode/tasks.json                          # Actualizado
D  .vscode/mcp.json                            # Eliminado (ahora .jsonc)
M  AGENTS.md                                   # Nested AGENTS.md support
```

### Archivos NO en repo (correcto):
```bash
.vscode/settings.json                          # Personal, no compartir
```

---

## ✅ Checklist Final

- [x] `settings.json.example` creado con nested AGENTS.md habilitado
- [x] `extensions.json` con 30+ extensiones recomendadas
- [x] `mcp.jsonc` documenta todos los MCPs disponibles
- [x] `.vscode/README.md` documenta toda la configuración
- [x] `AGENTS.md` actualizado con sección de nested files
- [x] Backups preservados (Windows, Supabase versions)
- [x] `.gitignore` mantiene `settings.json` excluido (correcto)
- [x] Archivos staged listos para commit
- [ ] Usuario creará workspace file (próximo paso)
- [ ] Commit final de configuración
- [ ] Push y release v0.3.0

---

## 🎓 Para Nuevos Desarrolladores

### Setup Inicial:
1. **Clonar repo**: `git clone https://github.com/Kavalieri/CuentasSiK.git`
2. **Copiar settings**: `cp .vscode/settings.json.example .vscode/settings.json`
3. **Instalar extensiones**: VS Code mostrará prompt automáticamente
4. **Verificar MCPs**: Comprobar que los MCPs funcionen en Copilot Chat
5. **Ejecutar setup**: Ver `database/README.md` para setup inicial de DB

### Verificación:
```bash
# 1. Extensiones instaladas
code --list-extensions | grep -i copilot
code --list-extensions | grep -i prettier
code --list-extensions | grep -i eslint

# 2. MCPs disponibles
# En Copilot Chat: "@workspace list available MCPs"

# 3. Nested AGENTS.md funcionando
# Abrir archivo en /app/ y verificar que Copilot reconoce contexto específico
```

---

**Configuración completada**: 11 de octubre de 2025
**VS Code versión requerida**: v1.105+
**Mantenedor**: @Kavalieri
