# 🛠️ VS Code Tasks para Supabase

## Propósito

Estas tasks son **wrappers simples** de los comandos de Supabase CLI para evitar tener que escribir `npx` cada vez.

## Tareas Disponibles

Presiona `Ctrl+Shift+P` → **"Tasks: Run Task"** para ver todas las tareas.

### ⚡ Tareas Principales

#### **supabase db push**
- **Comando**: `npx supabase db push`
- Aplica las migraciones locales a la base de datos remota

#### **supabase gen types**
- **Comando**: `npx supabase gen types typescript --project-id fizxvvtakvmmeflmbwud | Out-File types/database.ts`
- Regenera los tipos TypeScript y los guarda en `types/database.ts`

#### **supabase db push + gen types** ⭐
- Ejecuta las dos tareas anteriores en secuencia
- **Workflow típico**: Crear migración → Aplicar esta task → Listo

---

### 🔧 Tareas de Migración

#### **supabase migration new**
- **Comando**: `npx supabase migration new <nombre>`
- Crea un nuevo archivo de migración vacío
- Te pedirá el nombre (ej: `add_user_field`)

#### **supabase db pull**
- **Comando**: `npx supabase db pull`
- Descarga los cambios del esquema remoto a local

---

### � Tareas de Configuración

#### **supabase link**
- **Comando**: `npx supabase link --project-ref fizxvvtakvmmeflmbwud`
- Vincula el proyecto local con el remoto (primera vez)

---

### 🧪 Tareas de Desarrollo Local

#### **supabase db reset**
- **Comando**: `npx supabase db reset`
- Resetea la base de datos LOCAL (no la remota)

#### **supabase start**
- **Comando**: `npx supabase start`
- Inicia Supabase local (Docker)

#### **supabase stop**
- **Comando**: `npx supabase stop`
- Detiene Supabase local

#### **supabase status**
- **Comando**: `npx supabase status`
- Muestra el estado de Supabase local

---

## 🚀 Workflow Típico

1. **Crear migración**:
   - `Ctrl+Shift+P` → **"supabase migration new"**
   - Nombre: `add_new_field`

2. **Editar SQL**:
   ```sql
   ALTER TABLE users ADD COLUMN preferences JSONB;
   ```

3. **Aplicar y regenerar tipos**:
   - `Ctrl+Shift+P` → **"supabase db push + gen types"** ⭐

4. **Listo**: Usar los nuevos tipos en TypeScript

---

## 📝 Equivalencias

| Task | Comando Manual |
|------|----------------|
| `supabase db push` | `npx supabase db push` |
| `supabase gen types` | `npx supabase gen types typescript --project-id fizxvvtakvmmeflmbwud \| Out-File types/database.ts` |
| `supabase migration new` | `npx supabase migration new <nombre>` |
| `supabase db pull` | `npx supabase db pull` |
| `supabase link` | `npx supabase link --project-ref fizxvvtakvmmeflmbwud` |
| `supabase db reset` | `npx supabase db reset` |
| `supabase start` | `npx supabase start` |
| `supabase stop` | `npx supabase stop` |
| `supabase status` | `npx supabase status` |

---

## ⚙️ Personalización

Si necesitas agregar más comandos, edita `.vscode/tasks.json`:

```json
{
  "label": "supabase <comando>",
  "type": "shell",
  "command": "npx supabase <comando> <args>"
}
```
npx supabase gen types typescript --project-id fizxvvtakvmmeflmbwud > types/database.ts

# Crear migración
npx supabase migration new nombre_de_migracion

# Pull cambios remotos
npx supabase db pull

# Link proyecto
npx supabase link --project-ref fizxvvtakvmmeflmbwud
```

---

## ❓ Solución de Problemas

### "Supabase CLI not found"
```bash
npm install -D supabase
```

### "Project not linked"
Ejecutar tarea: **"Supabase: Link Project"**

### "Types not updating"
1. Verificar que la migración se aplicó: **"Supabase: Push DB"**
2. Regenerar tipos manualmente: **"Supabase: Update TypeScript Types"**

---

## 🎯 Tip Pro

**Usa la tarea combinada** `Supabase: Push DB + Update Types` para aplicar migraciones. Es la forma más rápida y no olvidas regenerar los tipos.
