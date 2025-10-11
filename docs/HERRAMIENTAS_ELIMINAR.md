# Herramientas a Eliminar - Análisis Detallado

## 🎯 OBJETIVO: 188 → 128 herramientas (-60)

---

## ❌ **CATEGORÍA 1: MCPs PROHIBIDOS** (~15-20 herramientas)

### Supabase MCPs (ELIMINAR TODOS)

- `activate_supabase_*`
- `mcp_supabase_*`
- Cualquier herramienta relacionada con Supabase

**Razón**: Proyecto migrado a PostgreSQL nativo

### Vercel MCPs (ELIMINAR TODOS)

- `activate_vercel_*`
- `mcp_vercel_*`
- Cualquier herramienta relacionada con Vercel

**Razón**: Deploy en servidor propio con PM2

---

## ❌ **CATEGORÍA 2: ACTIVADORES REDUNDANTES** (~20-25 herramientas)

### GitHub Activadores Específicos (REVISAR Y ELIMINAR)

- `activate_github_tools_issue_management`
- `activate_github_tools_pull_request_management`
- `activate_github_tools_repository_management`
- `activate_github_tools_project_management`
- `activate_github_tools_notification_management`
- `activate_github_tools_search_and_discovery`
- `activate_github_tools_copilot_management`
- `activate_github_tools_security_management`
- `activate_github_tools_workflow_management`
- `activate_github_tools_gist_management`
- `activate_github_tools_discussion_management`
- `activate_github_tools_release_management`
- `activate_github_tools_team_management`
- `activate_github_tools_commit_management`
- `activate_github_tools_star_management`

**Razón**: Solo usamos funciones básicas de GitHub, no necesitamos todas estas especializaciones

### Otros Activadores

- `activate_database_management_tools`
- `activate_github_repository_tools`
- `activate_file_management_tools`

**Razón**: Usamos herramientas built-in para estas funciones

---

## ❌ **CATEGORÍA 3: FILE SYSTEM DUPLICADOS** (~10-15 herramientas)

### MCP File System (ELIMINAR - usar built-in)

- `mcp_fs-ssh_create_directory`
- `mcp_fs-ssh_directory_tree`
- `mcp_fs-ssh_list_directory`
- `mcp_fs-ssh_list_directory_with_sizes`
- `mcp_fs-ssh_read_text_file`
- `mcp_fs-ssh_read_media_file`
- `mcp_fs-ssh_read_multiple_files`
- `mcp_fs-ssh_edit_file`
- `mcp_fs-ssh_write_file`
- `mcp_fs-ssh_move_file`
- `mcp_fs-ssh_get_file_info`
- `mcp_fs-ssh_search_files`
- `mcp_fs-ssh_list_allowed_directories`

**Razón**: Duplican funcionalidad de herramientas built-in de VS Code

---

## ❌ **CATEGORÍA 4: SHELL TOOLS PROBLEMÁTICOS** (~5 herramientas)

### Shell MCPs Desactivados

- `mcp_shell-ssh_execute_command` (ya desactivado)
- Cualquier shell tool que cause problemas

**Razón**: Causan errores, usar `run_in_terminal` built-in

---

## ❌ **CATEGORÍA 5: GITHUB TOOLS ESPECÍFICOS** (~15-20 herramientas)

### GitHub Funciones Avanzadas (REVISAR)

- Herramientas de security management específicas
- Herramientas de workflow management avanzadas
- Herramientas de notification management
- Herramientas de discussion management
- Herramientas de team management específicas

**Razón**: Solo necesitamos funciones básicas de GitHub para nuestro proyecto

---

## ✅ **MANTENER** (Core - ~128 herramientas)

### Built-in VS Code (~30-35 tools)

- `create_file`, `read_file`, `replace_string_in_file`
- `list_dir`, `file_search`, `grep_search`
- `semantic_search`, `list_code_usages`
- `manage_todo_list`, `think`
- `run_in_terminal`, `get_terminal_output`
- Notebook tools (create, edit, run)
- VS Code commands y tasks

### Git MCP (~25 tools)

- Todas las herramientas `mcp_git-ssh_*`
- Son esenciales y funcionan correctamente

### GitHub MCP Básico (~10-15 tools)

- `mcp_github-ssh_get_me`
- `mcp_github-ssh_web_search`
- `mcp_github-ssh_pull_request_read`
- `mcp_github-ssh_get_job_logs`
- `mcp_github-ssh_get_tag`
- Herramientas básicas de labels y PRs

### Documentation MCPs (~10 tools)

- `mcp_upstash_conte_*` (Context7)
- `mcp_markitdown-ss_*`
- `fetch_webpage`

### Workspace Management (~10 tools)

- `create_new_workspace`
- `install_extension`
- Herramientas de proyecto específicas

---

## 📝 **PLAN DE ELIMINACIÓN**

### Paso 1: Identificar en configuración MCP

- Revisar `~/.vscode-server/data/User/mcp.json`
- Identificar qué MCPs están realmente activos

### Paso 2: Desactivar MCPs específicos

- Comentar o eliminar servidores no necesarios
- Mantener solo los esenciales

### Paso 3: Verificar funcionalidad

- Comprobar que herramientas esenciales siguen funcionando
- Confirmar reducción de herramientas disponibles

---

## 🎯 **RESULTADO ESPERADO**

**Antes**: ~188 herramientas
**Después**: ~128 herramientas

**Distribución objetivo**:

- Built-in VS Code: 35 tools
- Git MCP: 25 tools
- GitHub MCP básico: 15 tools
- Documentation: 10 tools
- Workspace: 10 tools
- Otros esenciales: 33 tools

**Total**: 128 herramientas optimizadas
