# Sistema de Instrucciones para Agentes IA - CuentasSiK

## 📋 Estrategia de Instrucciones

Este proyecto utiliza un **sistema híbrido** para maximizar la compatibilidad con diferentes agentes IA:

### 🎯 **AGENTS.md** (Principal - Sistema Moderno)

**Ubicación**: Archivos `AGENTS.md` anidados (nested)
**Uso**: Agentes autónomos de codificación, VS Code Copilot Agent (v1.105+)
**Características**:

- ✅ **Moderno**: Soportado por múltiples agentes IA
- ✅ **Anidado**: Instrucciones específicas por carpeta
- ✅ **Completo**: Control total del comportamiento del agente
- ✅ **Priorizado**: Las instrucciones específicas tienen prioridad sobre las generales

**Estructura en este proyecto**:

```
/AGENTS.md              → Instrucciones generales del proyecto
/app/AGENTS.md          → Específico para código Next.js/React
/database/AGENTS.md     → Específico para migraciones PostgreSQL
```

### 🔧 **copilot-instructions.md** (Fallback - GitHub Copilot)

**Ubicación**: `/.github/copilot-instructions.md`
**Uso**: GitHub Copilot Chat clásico, code completion
**Características**:

- ⚠️ **Legacy**: Sistema más antiguo, específico de GitHub Copilot
- 📝 **Simple**: Instrucciones en lenguaje natural
- 🎯 **Específico**: Solo para funcionalidades de chat y completion
- 🔄 **Backup**: Garantiza compatibilidad con versiones anteriores

## 🎯 **Estrategia Implementada**

### **Contenido por Archivo**

1. **AGENTS.md (Principal)**:

   - ✅ Instrucciones técnicas completas
   - ✅ Reglas de MCPs y prohibiciones
   - ✅ Stack tecnológico detallado
   - ✅ Convenciones de código
   - ✅ Sistema de migraciones
   - ✅ Configuración PM2
   - ✅ Workflows de desarrollo

2. **copilot-instructions.md (Resumen)**:
   - ✅ Reglas críticas (MCPs, prohibiciones)
   - ✅ Stack básico
   - ✅ Enlaces de referencia a AGENTS.md
   - ✅ Configuración mínima necesaria

### **Eliminación de Redundancia**

- ❌ **NO duplicar** instrucciones completas
- ✅ **SÍ referenciar** desde copilot-instructions.md hacia AGENTS.md
- ✅ **SÍ mantener** reglas críticas en ambos (MCPs, stack básico)
- ✅ **SÍ usar** el archivo apropiado según el agente

## ⚙️ **Configuración Requerida**

En `.vscode/settings.json`:

```json
{
  "chat.useNestedAgentsMdFiles": true
}
```

## 📚 **Referencias**

- [VS Code Custom Instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [GitHub Copilot Agent AGENTS.md Support](https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions/)

---

**🎯 Resultado**: Sistema robusto que funciona con agentes modernos (AGENTS.md) y mantiene compatibilidad con GitHub Copilot clásico (copilot-instructions.md) sin duplicación innecesaria.
