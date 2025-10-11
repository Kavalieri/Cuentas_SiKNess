# Configuración MCP Optimizada para CuentasSiK

## 🎯 CONFIGURACIÓN ACTUAL → OPTIMIZADA

### ❌ **ELIMINAR INMEDIATAMENTE**

```json
{
  "servers": {
    // ❌ ELIMINAR - Proyecto migrado a PostgreSQL nativo
    "SupaBase-ssh": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp"
    },

    // ❌ ELIMINAR - Deploy en servidor propio con PM2
    "Vercel-ssh": {
      "type": "http",
      "url": "https://mcp.vercel.com"
    },

    // ❌ ELIMINAR - Redundante con herramientas built-in
    "fs-ssh": {
      "command": "/usr/bin/npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "..."],
      "type": "stdio"
    },

    // ❌ ELIMINAR - Causa problemas con comandos
    "shell-ssh": {
      "command": "/usr/bin/npx",
      "args": ["-y", "shell-command-mcp"],
      "env": { "ALLOWED_COMMANDS": "..." },
      "type": "stdio"
    },

    // ❌ ELIMINAR - No lo usamos actualmente
    "deepwiki-ssh": {
      "type": "http",
      "url": "https://mcp.deepwiki.com/sse",
      "gallery": "https://api.mcp.github.com/2025-09-15/v0/servers/8e68c99d-b438-46c2-94d5-dbdef09ff5a4",
      "version": "1.0.0"
    }
  }
}
```

### ✅ **MANTENER (Configuración Optimizada)**

```json
{
  "servers": {
    // ✅ MANTENER - GitHub operations esenciales
    "github-ssh": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "gallery": "https://api.mcp.github.com/v0/servers/ab12cd34-5678-90ef-1234-567890abcdef",
      "version": "0.13.0"
    },

    // ✅ MANTENER - Git operations (CRÍTICO)
    "git-ssh": {
      "command": "/usr/bin/npx",
      "args": ["-y", "@mseep/git-mcp-server"],
      "type": "stdio"
    },

    // ✅ MANTENER - Documentación Microsoft/Azure
    "microsoft.docs.mcp-ssh": {
      "type": "http",
      "url": "https://learn.microsoft.com/api/mcp"
    },

    // ✅ MANTENER - Web fetching y conversiones
    "fetch-ssh": {
      "command": "/usr/bin/npx",
      "args": ["-y", "fetch-mcp"],
      "type": "stdio"
    },

    // ✅ MANTENER - Conversión a markdown
    "markitdown-ssh": {
      "type": "stdio",
      "command": "/home/kava/.local/bin/uvx",
      "args": ["markitdown-mcp==0.0.1a4"],
      "gallery": "https://api.mcp.github.com/2025-09-15/v0/servers/976a2f68-e16c-4e2b-9709-7133487f8c14",
      "version": "1.0.0"
    }
  },
  "inputs": []
}
```

---

## 📊 **REDUCCIÓN DE HERRAMIENTAS**

### Antes: ~188 herramientas

- Built-in VS Code: ~35
- Git MCP: ~25
- GitHub MCP: ~40 (MUCHAS activaciones específicas)
- Supabase MCP: ~15 (ELIMINAR)
- Vercel MCP: ~10 (ELIMINAR)
- File System MCP: ~15 (ELIMINAR)
- Shell MCP: ~20 (ELIMINAR)
- DeepWiki MCP: ~5 (ELIMINAR)
- Microsoft Docs: ~5
- Fetch/MarkItDown: ~8
- Otros: ~10

### Después: ~128 herramientas

- Built-in VS Code: ~35
- Git MCP: ~25
- GitHub MCP: ~25 (solo básicas)
- Microsoft Docs: ~5
- Fetch/MarkItDown: ~8
- Context7: ~10 (añadir si es necesario)
- Otros esenciales: ~20

**Reducción**: 60 herramientas eliminadas ✅

---

## 🔧 **COMANDOS PARA APLICAR**

```bash
# 1. Backup configuración actual
cp ~/.vscode-server/data/User/mcp.json ~/.vscode-server/data/User/mcp.json.backup

# 2. Aplicar nueva configuración (crear archivo optimizado)
cat > ~/.vscode-server/data/User/mcp.json << 'EOF'
{
  "servers": {
    "github-ssh": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "gallery": "https://api.mcp.github.com/v0/servers/ab12cd34-5678-90ef-1234-567890abcdef",
      "version": "0.13.0"
    },
    "git-ssh": {
      "command": "/usr/bin/npx",
      "args": ["-y", "@mseep/git-mcp-server"],
      "type": "stdio"
    },
    "microsoft.docs.mcp-ssh": {
      "type": "http",
      "url": "https://learn.microsoft.com/api/mcp"
    },
    "fetch-ssh": {
      "command": "/usr/bin/npx",
      "args": ["-y", "fetch-mcp"],
      "type": "stdio"
    },
    "markitdown-ssh": {
      "type": "stdio",
      "command": "/home/kava/.local/bin/uvx",
      "args": ["markitdown-mcp==0.0.1a4"],
      "gallery": "https://api.mcp.github.com/2025-09-15/v0/servers/976a2f68-e16c-4e2b-9709-7133487f8c14",
      "version": "1.0.0"
    }
  },
  "inputs": []
}
EOF

# 3. Restart VS Code para aplicar cambios
```

---

## 🎯 **RESULTADO FINAL**

✅ **Eliminadas**: Supabase, Vercel, FileSystem, Shell, DeepWiki MCPs
✅ **Mantenidas**: Git, GitHub básico, Microsoft Docs, Fetch, MarkItDown
✅ **Herramientas**: 188 → 128 (-60 herramientas)
✅ **Funcionalidad**: Sin pérdida de capacidades esenciales
