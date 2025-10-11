# Análisis de Herramientas Disponibles - CuentasSiK

## 📊 Estado Actual

- **Detectadas**: ~188 herramientas
- **Objetivo**: 128 herramientas
- **Exceso**: ~60 herramientas a revisar

## 🔧 Herramientas Built-in VS Code (PRINCIPALES)

### ✅ **Edición de Archivos**

- `create_file` - Crear archivos nuevos
- `read_file` - Leer contenido de archivos
- `replace_string_in_file` - Editar archivos existentes
- `list_dir` - Listar directorios
- `file_search` - Buscar archivos por patrón
- `grep_search` - Buscar texto en archivos

### ✅ **Gestión de Tareas y Organización**

- `manage_todo_list` - Gestión de listas de tareas
- `think` - Análisis y planificación
- `run_vscode_command` - Ejecutar comandos VS Code
- `create_and_run_task` - Crear y ejecutar tasks

### ✅ **Notebooks y Desarrollo**

- `create_new_jupyter_notebook` - Crear notebooks
- `edit_notebook_file` - Editar notebooks
- `run_notebook_cell` - Ejecutar celdas
- `copilot_getNotebookSummary` - Resumen de notebooks

### ✅ **Búsqueda y Contexto**

- `semantic_search` - Búsqueda semántica en workspace
- `list_code_usages` - Buscar usos de código
- `get_errors` - Obtener errores de compilación

## 🔄 MCPs Git (CRÍTICOS - MANTENER)

### ✅ **Git Operations**

- `mcp_git-ssh_git_status`
- `mcp_git-ssh_git_add`
- `mcp_git-ssh_git_commit`
- `mcp_git-ssh_git_push`
- `mcp_git-ssh_git_pull`
- `mcp_git-ssh_git_branch`
- `mcp_git-ssh_git_checkout`
- `mcp_git-ssh_git_diff`
- `mcp_git-ssh_git_log`
- `mcp_git-ssh_git_stash`
- `mcp_git-ssh_git_merge`
- `mcp_git-ssh_git_rebase`
- `mcp_git-ssh_git_tag`
- `mcp_git-ssh_git_reset`
- `mcp_git-ssh_git_clean`
- `mcp_git-ssh_git_cherry_pick`
- `mcp_git-ssh_git_fetch`
- `mcp_git-ssh_git_clone`
- `mcp_git-ssh_git_init`
- `mcp_git-ssh_git_remote`
- `mcp_git-ssh_git_show`
- `mcp_git-ssh_git_worktree`
- `mcp_git-ssh_git_set_working_dir`
- `mcp_git-ssh_git_clear_working_dir`
- `mcp_git-ssh_git_wrapup_instructions`

## 🐙 MCPs GitHub (ÚTILES - REVISAR)

### ✅ **GitHub Core** (MANTENER)

- `mcp_github-ssh_get_me`
- `mcp_github-ssh_web_search`
- `mcp_github-ssh_pull_request_read`
- `mcp_github-ssh_get_job_logs`
- `mcp_github-ssh_get_tag`
- `mcp_github-ssh_get_label`
- `mcp_github-ssh_list_label`
- `mcp_github-ssh_label_write`
- `mcp_github-ssh_update_project_item`
- `mcp_github-ssh_update_pull_request_branch`

### ❓ **GitHub Extensiones** (REVISAR)

- `activate_github_tools_*` (múltiples activadores)
- Muchas herramientas específicas que podrían ser redundantes

## ⚠️ MCPs Shell (DESACTIVADO)

- `mcp_shell-ssh_execute_command` - DESACTIVADO para evitar errores

## 📚 MCPs Documentación (ÚTILES)

### ✅ **Context7 & Microsoft**

- `mcp_upstash_conte_get-library-docs`
- `mcp_upstash_conte_resolve-library-id`
- `mcp_microsoft_doc_*`

### ✅ **Fetch & MarkItDown**

- `mcp_fetch-ssh_fetch_url`
- `mcp_markitdown-ss_convert_to_markdown`

## 🔍 **CANDIDATOS A ELIMINAR**

### ❌ **MCPs Prohibidos (ELIMINAR)**

- Todos los MCPs de Supabase (`mcp_supabase_*`)
- Todos los MCPs de Vercel (`mcp_vercel_*`)

### ❌ **MCPs Redundantes (REVISAR)**

- `activate_*` tools - Muchos activadores innecesarios
- `mcp_fs-ssh_*` - Redundante con built-in file tools
- GitHub tools específicos que no usamos

### ❌ **Herramientas Duplicadas**

- Terminal tools cuando tenemos built-in equivalentes
- File management tools duplicados

## 📋 **RECOMENDACIONES**

### ✅ **MANTENER** (Core - ~60 tools)

1. **Built-in VS Code** (20-25 tools)
2. **Git MCP** (25 tools)
3. **GitHub MCP básico** (10 tools)
4. **Documentation MCPs** (5 tools)

### ❌ **ELIMINAR** (~60 tools)

1. **Supabase/Vercel MCPs** (~15 tools)
2. **Activadores redundantes** (~20 tools)
3. **File system duplicados** (~10 tools)
4. **GitHub extensiones no usadas** (~15 tools)

## 🎯 **OBJETIVO FINAL**

- **Built-in tools**: Para edición, tareas, desarrollo
- **Git MCPs**: Solo para operaciones Git
- **Mínimos MCPs externos**: Solo los esenciales
- **Total**: ~128 herramientas optimizadas
