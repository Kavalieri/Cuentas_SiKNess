# 🗄️ Scripts SQL de Base de Datos

## ⚠️ IMPORTANTE - Seguridad

Los scripts en esta carpeta contienen **información sensible** y son de uso **interno únicamente**.

- **NO compartir** estos scripts públicamente
- Los emails y datos en estos scripts son solo **para desarrollo/testing**
- En producción, reemplazar con datos apropiados

## Scripts Disponibles

### Core Schema
- `schema.sql` - Schema completo de la base de datos
- `seed.sql` - Datos iniciales (categorías por defecto)
- `contributions-schema.sql` - Sistema de contribuciones proporcionales

### Migrations (en `../supabase/migrations/`)
- Aplicar con: `npx supabase db push`

### Utilidades (One-time fixes)
- `fix_missing_member.sql` - Corregir miembro faltante en household
- `fix-rls-policies.sql` - Corregir políticas RLS
- `insert_permanent_admin.sql` - Insertar admin permanente

## Uso

### Aplicar Schema Completo (Primera vez)
```bash
# En Supabase SQL Editor
# 1. Ejecutar schema.sql
# 2. Ejecutar seed.sql
# 3. Ejecutar contributions-schema.sql
```

### Aplicar Migraciones
```bash
# Desde terminal
npx supabase db push
```

### Scripts de Reparación
⚠️ Usar solo cuando sea necesario. Verificar antes de ejecutar.

```sql
-- En Supabase SQL Editor
-- Copiar contenido del script correspondiente
```

## Generar Tipos TypeScript

Después de cambios en la base de datos:

```bash
npm run types:supabase
```

## Documentación Relacionada

- `docs/SUPABASE_CLI.md` - Guía completa de Supabase CLI
- `docs/ENVIRONMENT_SETUP.md` - Configuración de entorno
- `docs/CONTRIBUTIONS_SYSTEM.md` - Sistema de contribuciones

---

**Última actualización**: Octubre 2025
