# VS Code Configuration for CuentasSiK

Este directorio contiene toda la configuración de VS Code específica para el proyecto CuentasSiK.

---

## 📁 Archivos de Configuración

### `settings.json`
Configuración de VS Code para el workspace.

**Características principales:**
- ✅ **Nested AGENTS.md** habilitado (`chat.useNestedAgentsMdFiles: true`)
- 🤖 GitHub Copilot configurado para usar contexto del workspace
- 📝 Prettier como formatter por defecto
- 🔍 ESLint con auto-fix en save
- 🗄️ SQL con formatter deshabilitado (sin formatter consistente)
- 🐚 Shell scripts con formato automático

### `extensions.json`
Lista de extensiones recomendadas para el proyecto.

**Categorías:**
- 🎯 Esenciales: Copilot, Prettier, ESLint
- 🔧 TypeScript/React: Snippets, auto-complete
- 🎨 Tailwind CSS: IntelliSense, documentación
- 🗄️ Database: SQLTools, PostgreSQL
- 🐚 Shell: Bash IDE, Shell Format
- 📝 Markdown: All-in-One, Preview Enhanced
- 🔍 Git: GitLens, Git Graph
- 🧰 Utilities: DotENV, ErrorLens, Todo Tree

### `tasks.json`
Tareas predefinidas para el proyecto (ver `TASKS_README.md`).

**16 tareas organizadas en 4 categorías:**
1. **Development** (3): Dev server, Stop, Clear caches
2. **Database** (5): Sync, Create, Apply, Promote, Status
3. **Production** (5): Build, Deploy, Restart PM2, Logs, Status
4. **Testing** (3): Tests, Lint, Type Check

### `TASKS_README.md`
Documentación completa de todas las tareas disponibles.

**Contenido:**
- Descripción de cada tarea
- Requisitos y permisos
- Variables de entorno necesarias
- Workflows completos
- Troubleshooting

### `mcp.jsonc`
Documentación de los Model Context Protocol servers disponibles.

**MCPs críticos:**
- 🔧 **git-ssh**: Operaciones Git (SIEMPRE usar en vez de CLI)
- 🐙 **github-ssh**: GitHub API (issues, PRs, releases)
- 🐚 **shell-ssh**: Comandos shell (con lista blanca)

**MCPs útiles:**
- 📚 **upstash.context7-ssh**: Documentación actualizada de librerías
- 📚 **microsoft.docs.mcp-ssh**: Microsoft documentation
- 🌐 **fetch-ssh**: Fetch URLs, YouTube transcripts
- 📄 **markitdown-ssh**: Convertir documentos a Markdown

---

## 🤖 Nested AGENTS.md Support

**Nueva característica de VS Code v1.105** habilitada en este proyecto.

### Estructura:
```
/
├── AGENTS.md              # Instrucciones generales
├── app/
│   └── AGENTS.md         # Específico para Next.js/React
└── database/
    └── AGENTS.md         # Específico para PostgreSQL/migraciones
```

### Funcionamiento:
1. Copilot lee `/AGENTS.md` (contexto general)
2. Si trabajas en `/app/`, también lee `/app/AGENTS.md`
3. Si trabajas en `/database/`, también lee `/database/AGENTS.md`
4. **Las instrucciones específicas tienen prioridad** sobre las generales

### Beneficios:
- ✅ Instrucciones más relevantes según el área de trabajo
- ✅ Contexto específico para frontend vs backend vs database
- ✅ Evita instrucciones contradictorias o irrelevantes
- ✅ Mejor separación de concerns

---

## 🔧 Cómo Usar las Tareas

### Desde VS Code:

#### Opción 1: Command Palette
```
Ctrl+Shift+P → "Tasks: Run Task" → Seleccionar tarea
```

#### Opción 2: Keyboard Shortcut
```
Ctrl+Shift+B (Build Task por defecto)
```

#### Opción 3: Terminal
```bash
# Ejecutar tarea específica por ID
code --task "🚀 Iniciar Dev Server"
```

### Desde GitHub Copilot Chat:

Simplemente menciona la tarea:
```
"Inicia el servidor de desarrollo"
→ Copilot ejecutará: task "🚀 Iniciar Dev Server"

"Aplica las migraciones a DEV"
→ Copilot ejecutará: task "🔄 Aplicar Migraciones a DEV"
```

---

## 🎯 Workflows Recomendados

### Desarrollo Local:
1. **Iniciar servidor**: `🚀 Iniciar Dev Server`
2. **Ver logs**: Terminal output
3. **Detener**: `🛑 Detener Dev Server`

### Gestión de Migraciones:
1. **Sincronizar PROD→DEV**: `📥 Sincronizar DB PROD → DEV`
2. **Crear migración**: `➕ Crear Nueva Migración`
3. **Aplicar a DEV**: `🔄 Aplicar Migraciones a DEV`
4. **Promover a tested**: `⬆️ Promover Migración a Tested`
5. **Ver estado**: `📊 Ver Estado Migraciones`

### Deployment a Producción:
1. **Build**: `🏗️ Build para Producción`
2. **Deploy**: `🚀 Deploy a Producción`
3. **Verificar**: `📊 Ver Logs PM2`
4. **Status**: `🔍 Status Aplicación (PM2)`

### Testing:
1. **Ejecutar tests**: `🧪 Ejecutar Tests`
2. **Lint**: `🔍 Ejecutar ESLint`
3. **Type check**: `🔎 Type Check (TypeScript)`

---

## 🔒 Seguridad

### Comandos Peligrosos (🔴):
Los siguientes comandos **requieren confirmación explícita** del usuario:
- `sudo reboot` (reiniciar servidor)
- `sudo systemctl stop <servicio crítico>` (apache2, mysql, ssh)
- `DROP DATABASE` (eliminar bases de datos)
- `rm -rf` (eliminar archivos/directorios)

### Shell MCP Allowlist:
El MCP shell tiene configurada una **lista blanca** de comandos permitidos:
```bash
npm, npx, node, git, gh, bash, sh, systemctl, journalctl,
ls, cat, grep, find, chmod, chown, mkdir, rm, mv, cp,
sudo, ps, df, du, free, curl, wget, psql, pg_dump
```

**Comandos NO permitidos:**
- `dd` (puede destruir discos)
- `mkfs` (formatear particiones)
- Otros comandos destructivos

---

## 📚 Referencias

- **VS Code Tasks**: https://code.visualstudio.com/docs/editor/tasks
- **VS Code Settings**: https://code.visualstudio.com/docs/getstarted/settings
- **Nested AGENTS.md**: https://code.visualstudio.com/updates/v1_105
- **MCP Documentation**: https://modelcontextprotocol.io/
- **GitHub Copilot MCP**: https://docs.github.com/copilot/using-github-copilot/using-mcp

---

## 🔄 Backups

Este directorio contiene backups de configuraciones previas:

- `tasks.json.windows.backup` - Tareas para Windows/PowerShell
- `TASKS_README.md.supabase.backup` - Docs cuando usábamos Supabase

**No eliminar** estos backups. Pueden ser útiles si necesitamos revertir cambios.

---

## 🤝 Contribuir

Al añadir nuevas tareas o cambiar configuración:

1. **Documenta los cambios** en este README
2. **Actualiza `TASKS_README.md`** si modificas `tasks.json`
3. **Prueba las tareas** antes de commitear
4. **Mantén backups** de configuraciones anteriores
5. **Usa convenciones consistentes** (emojis, formato, etc.)

---

**Última actualización**: 11 de octubre de 2025
**Versión VS Code**: 1.105+
**Mantenedor**: @Kavalieri
