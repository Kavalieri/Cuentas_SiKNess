# Inventario Completo de Herramientas Activas - CuentasSiK

## 📊 HERRAMIENTAS ACTUALMENTE ACTIVAS (~188)

### 🔧 **BUILT-IN VS CODE TOOLS** (~35-40 herramientas)

#### Gestión de Archivos

1. `create_file` - Crear archivos nuevos
2. `read_file` - Leer contenido de archivos
3. `replace_string_in_file` - Editar archivos existentes
4. `list_dir` - Listar contenidos de directorio
5. `file_search` - Buscar archivos por patrón glob
6. `grep_search` - Búsqueda de texto en archivos

#### Análisis de Código

7. `semantic_search` - Búsqueda semántica en workspace
8. `list_code_usages` - Buscar usos de símbolos
9. `get_errors` - Obtener errores de compilación
10. `get_changed_files` - Ver archivos modificados en git
11. `get_search_view_results` - Resultados de vista de búsqueda

#### Terminal y Ejecución

12. `run_in_terminal` - Ejecutar comandos en terminal
13. `get_terminal_output` - Obtener salida de terminal
14. `terminal_last_command` - Último comando ejecutado
15. `terminal_selection` - Selección actual en terminal

#### Notebooks

16. `create_new_jupyter_notebook` - Crear notebook Jupyter
17. `edit_notebook_file` - Editar archivos notebook
18. `run_notebook_cell` - Ejecutar celdas de notebook
19. `copilot_getNotebookSummary` - Resumen de notebook

#### Gestión de Tareas y Organización

20. `manage_todo_list` - Gestión de listas de tareas
21. `think` - Herramienta de análisis y planificación
22. `create_and_run_task` - Crear y ejecutar tasks de VS Code

#### Workspace y Proyectos

23. `create_new_workspace` - Crear nuevo workspace
24. `get_project_setup_info` - Información de setup de proyecto
25. `install_extension` - Instalar extensiones VS Code
26. `run_vscode_command` - Ejecutar comandos VS Code

#### Web y Fetch

27. `fetch_webpage` - Obtener contenido de páginas web
28. `open_simple_browser` - Abrir navegador simple

#### Documentación y APIs

29. `get_vscode_api` - Documentación API VS Code
30. `github_repo` - Búsqueda en repositorios GitHub

#### Testing

31. `test_failure` - Información de fallos de test

---

### 🔄 **GIT MCP TOOLS** (~25 herramientas)

#### Operaciones Básicas

32. `mcp_git-ssh_git_status` - Estado del repositorio
33. `mcp_git-ssh_git_add` - Stagear archivos
34. `mcp_git-ssh_git_commit` - Crear commits
35. `mcp_git-ssh_git_push` - Push a remoto
36. `mcp_git-ssh_git_pull` - Pull desde remoto
37. `mcp_git-ssh_git_diff` - Ver diferencias
38. `mcp_git-ssh_git_log` - Ver historial

#### Gestión de Branches

39. `mcp_git-ssh_git_branch` - Gestión de ramas
40. `mcp_git-ssh_git_checkout` - Cambiar ramas/archivos
41. `mcp_git-ssh_git_merge` - Fusionar ramas
42. `mcp_git-ssh_git_rebase` - Rebase de ramas

#### Operaciones Avanzadas

43. `mcp_git-ssh_git_stash` - Gestión de stash
44. `mcp_git-ssh_git_cherry_pick` - Cherry pick commits
45. `mcp_git-ssh_git_reset` - Reset de repositorio
46. `mcp_git-ssh_git_clean` - Limpiar archivos no tracked
47. `mcp_git-ssh_git_tag` - Gestión de tags
48. `mcp_git-ssh_git_remote` - Gestión de remotos
49. `mcp_git-ssh_git_fetch` - Fetch desde remoto
50. `mcp_git-ssh_git_show` - Mostrar objetos git
51. `mcp_git-ssh_git_worktree` - Gestión de worktrees

#### Setup y Configuración

52. `mcp_git-ssh_git_init` - Inicializar repositorio
53. `mcp_git-ssh_git_clone` - Clonar repositorio
54. `mcp_git-ssh_git_set_working_dir` - Establecer directorio de trabajo
55. `mcp_git-ssh_git_clear_working_dir` - Limpiar directorio de trabajo
56. `mcp_git-ssh_git_wrapup_instructions` - Instrucciones de wrap-up

---

### 🐙 **GITHUB MCP TOOLS** (~50-60 herramientas)

#### GitHub Core

57. `mcp_github-ssh_get_me` - Información del usuario autenticado
58. `mcp_github-ssh_web_search` - Búsqueda web con IA
59. `mcp_github-ssh_pull_request_read` - Leer pull requests
60. `mcp_github-ssh_get_job_logs` - Logs de trabajos de workflow
61. `mcp_github-ssh_get_tag` - Obtener información de tags
62. `mcp_github-ssh_get_label` - Obtener etiquetas
63. `mcp_github-ssh_list_label` - Listar etiquetas
64. `mcp_github-ssh_label_write` - Escribir etiquetas
65. `mcp_github-ssh_update_project_item` - Actualizar elementos de proyecto
66. `mcp_github-ssh_update_pull_request_branch` - Actualizar rama de PR

#### Activadores de Herramientas GitHub (15 activadores)

67. `activate_github_tools_issue_management`
68. `activate_github_tools_pull_request_management`
69. `activate_github_tools_repository_management`
70. `activate_github_tools_project_management`
71. `activate_github_tools_notification_management`
72. `activate_github_tools_search_and_discovery`
73. `activate_github_tools_copilot_management`
74. `activate_github_tools_security_management`
75. `activate_github_tools_workflow_management`
76. `activate_github_tools_gist_management`
77. `activate_github_tools_discussion_management`
78. `activate_github_tools_release_management`
79. `activate_github_tools_team_management`
80. `activate_github_tools_commit_management`
81. `activate_github_tools_star_management`

#### Herramientas GitHub Específicas (activadas por los activadores)

82-116. **~35 herramientas adicionales de GitHub** que se activan con los activadores:

- Issue management tools
- Pull request management tools
- Repository management tools
- Project management tools
- Notification management tools
- Search and discovery tools
- Copilot management tools
- Security management tools
- Workflow management tools
- Gist management tools
- Discussion management tools
- Release management tools
- Team management tools
- Commit management tools
- Star management tools

---

### 📚 **DOCUMENTATION MCP TOOLS** (~15 herramientas)

#### Context7/Upstash

117. `mcp_upstash_conte_get-library-docs` - Documentación de librerías
118. `mcp_upstash_conte_resolve-library-id` - Resolver ID de librería

#### Microsoft Docs

119-123. **~5 herramientas Microsoft Docs** (mcp*microsoft_doc*\*)

#### MarkItDown

124. `mcp_markitdown-ss_convert_to_markdown` - Convertir a markdown

#### Fetch

125-129. **~5 herramientas Fetch** (mcp*fetch-ssh*\*)

---

### 🗃️ **FILE SYSTEM MCP TOOLS** (~15 herramientas) **[REDUNDANTES]**

130. `mcp_fs-ssh_create_directory` - Crear directorios
131. `mcp_fs-ssh_directory_tree` - Árbol de directorios
132. `mcp_fs-ssh_list_directory` - Listar directorios
133. `mcp_fs-ssh_list_directory_with_sizes` - Listar con tamaños
134. `mcp_fs-ssh_read_text_file` - Leer archivos de texto
135. `mcp_fs-ssh_read_media_file` - Leer archivos multimedia
136. `mcp_fs-ssh_read_multiple_files` - Leer múltiples archivos
137. `mcp_fs-ssh_edit_file` - Editar archivos
138. `mcp_fs-ssh_write_file` - Escribir archivos
139. `mcp_fs-ssh_move_file` - Mover archivos
140. `mcp_fs-ssh_get_file_info` - Información de archivos
141. `mcp_fs-ssh_search_files` - Buscar archivos
142. `mcp_fs-ssh_list_allowed_directories` - Directorios permitidos

---

### 🚫 **HERRAMIENTAS PROHIBIDAS/INNECESARIAS** (~10-15 herramientas)

#### Supabase MCP (PROHIBIDO - proyecto migrado a PostgreSQL)

143-147. **~5 herramientas Supabase** (mcp*supabase*\*)

#### Vercel MCP (PROHIBIDO - deploy en servidor propio)

148-152. **~5 herramientas Vercel** (mcp*vercel*\*)

#### Shell MCP (PROBLEMÁTICO)

153-157. **~5 herramientas Shell** (mcp*shell*\*)

---

### 🔧 **OTROS ACTIVADORES Y HERRAMIENTAS** (~20-25 herramientas)

#### Activadores Generales

158. `activate_database_management_tools`
159. `activate_github_repository_tools`
160. `activate_file_management_tools`

#### VS Code Extensions Search

161. `vscode_searchExtensions_internal`

#### Herramientas Específicas del Workspace

162-188. **~27 herramientas adicionales** incluyendo:

- Herramientas de bases de datos (activadas por activadores)
- Herramientas de workspace management
- Herramientas de extensiones
- Herramientas de debugging
- Otras herramientas específicas

---

## **TOTAL ESTIMADO: ~188 HERRAMIENTAS ACTIVAS**

**Distribución actual**:

- Built-in VS Code: ~35-40
- Git MCP: ~25
- GitHub MCP: ~50-60
- Documentation MCP: ~15
- File System MCP: ~15 (REDUNDANTES)
- Prohibidas/Innecesarias: ~15
- Otros/Activadores: ~25-30
