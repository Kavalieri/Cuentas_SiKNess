# 🗄️ Database - CuentasSiK

**PostgreSQL nativo** (NO Supabase)

---

## � Setup Inicial para Nuevos Desarrolladores

### 1. Requisitos Previos

```bash
# PostgreSQL 13+ instalado
sudo apt install postgresql postgresql-contrib

# Node.js 18+ para scripts
node --version
```

### 2. Crear roles base (una sola vez)

Consulta `docs/TO-DO/DONE/POSTGRESQL_SISTEMA_COMPLETO.md` para crear los roles obligatorios:

- `cuentassik_dev_owner` (NOLOGIN, propietario de objetos en DEV)
- `cuentassik_prod_owner` (NOLOGIN, propietario de objetos en PROD)
- `cuentassik_user` (LOGIN, rol de aplicación con privilegios DML)

### 3. Restaurar baseline (DEV)

Usa la seed consolidada ubicada en `database/migrations/applied/20251014_150000_seed.sql`:

```bash
sudo -u postgres -H bash -lc "cd /tmp && psql -d postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='cuentassik_dev' AND pid <> pg_backend_pid();\""
sudo -u postgres -H bash -lc "cd /tmp && dropdb --if-exists cuentassik_dev"
sudo -u postgres -H bash -lc "cd /tmp && createdb --owner=cuentassik_dev_owner cuentassik_dev"
sudo cp database/migrations/applied/20251014_150000_seed.sql /tmp/cuentassik_seed.sql
sudo chmod 644 /tmp/cuentassik_seed.sql
sudo -u postgres -H bash -lc "cd /tmp && psql -v ON_ERROR_STOP=1 --set=SEED_OWNER=cuentassik_dev_owner -d cuentassik_dev -f /tmp/cuentassik_seed.sql"
sudo rm /tmp/cuentassik_seed.sql
```

### 4. Configurar Variables de Entorno

```bash
# Copiar plantilla
cp .env.example .env.development.local

# Editar con tus credenciales
DATABASE_URL="postgresql://cuentassik_user:tu_password@localhost:5432/cuentassik_dev"
```

### 5. Verificar Instalación

```bash
# Conectar a la base de datos
psql -U cuentassik_user -d cuentassik_dev

# Ver tablas creadas
\dt

# Salir
\q
```

---

## 📁 Estructura de Directorios

```

```

database/
├── migrations/
│ ├── development/ # 🔒 Ignorado: WIP local
│ │ └── \*.sql # No se commitea
│ ├── tested/ # ✅ EN REPO: Validadas, listas para prod
│ │ └── 2024\*.sql
│ ├── applied/ # ✅ EN REPO: Aplicadas en prod (incluye baseline seed)
│ │ ├── 20251014_150000_seed.sql
│ │ └── archive/ # 🔒 Ignorado: Históricas obsoletas (89 archivos)
├── AGENTS.md # ✅ Instrucciones para IA
└── README.md # ✅ Este archivo

```

### 🎯 Políticas de Git

**✅ Incluido en repositorio:**
- `migrations/applied/20251014_150000_seed.sql` - Snapshot completo (baseline)
- `migrations_control.sql` - Sistema de control de migraciones
- `migrations/tested/*.sql` - Validadas en DEV, listas para PROD
- `migrations/applied/*.sql` - Aplicadas en PROD (historial activo)
- Estructura de directorios (`.gitkeep`)
- Documentación (AGENTS.md, README.md)

**🔒 NO incluido (`.gitignore`):**
- `migrations/development/*.sql` - Work in progress local
- `migrations/applied/archive/*.sql` - 89 migraciones obsoletas (sincronía rota pre-v0.3.0)

**💡 Filosofía**:
- Partimos de cero desde seed v0.3.0
- Prod y dev están perfectamente sincronizadas
- Migraciones = **solo estructura**, nunca contenido
- Seguridad: nunca borrar campos con <3 meses de uso
```

### 📋 Políticas de Git

**✅ Incluido en repositorio:**

- `migrations/applied/20251014_150000_seed.sql` - Snapshot completo (baseline)
- `migrations_control.sql` - Sistema de control
- `migrations/tested/*.sql` - **Migraciones validadas para aplicar**
- `migrations/applied/*.sql` - **Migraciones aplicadas en PROD** (referencia)
- Estructura de directorios (`.gitkeep`)
- Documentación (AGENTS.md, README.md)

**🔒 NO incluido (`.gitignore`):**

- `migrations/development/*.sql` - WIP local (no validado)
- `migrations/applied/archive/*.sql` - Migraciones obsoletas pre-v0.3.0 (89 archivos)

#### 🔄 ¿Por qué compartir `tested/` y `applied/`?

**Estrategia de Actualizaciones Incrementales:**

Cuando un desarrollador hace `git pull` y obtiene cambios:

1. **Sin compartir migraciones** (❌ Estrategia incorrecta):

   ```bash
   # Cada dev necesita recrear TODA la DB desde cero
   git pull
   # ¿Cómo sé qué cambios hubo desde v0.3.0?
   # → Imposible mantener sincronía con PROD
   ```

2. **Compartiendo migraciones** (✅ Estrategia correcta):
   ```bash
   # Actualización incremental desde donde estabas
   git pull                              # Obtienes nuevas migraciones
   ./scripts/apply_migrations_dev.sh     # Aplicas solo las nuevas
   # → Tu DEV ahora tiene la misma estructura que PROD
   ```

**Ejemplo Real:**

```
Estado inicial:  seed v0.3.0 (todos empiezan aquí)
Semana 1:        + migration_001 en tested/ (nuevo campo)
Semana 2:        + migration_002 en tested/ (nuevo índice)
                 migration_001 → applied/ (ya en PROD)

Desarrollador hace git pull:
  - Ve migration_001 en applied/ (ya está en PROD)
  - Ve migration_002 en tested/ (debe aplicarla)
  - Ejecuta script → migration_002 aplicada
  - ✅ Su DEV = PROD
```

**Sin compartir**: Cada dev reconstruye DB manualmente (inviable en equipo).
**Compartiendo**: Actualizaciones automáticas desde scripts (escalable).

---

## 📊 Sistema de Control de Migraciones

### Tabla `schema_migrations`

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT
);
```

Esta tabla registra qué migraciones se han aplicado, permitiendo:

- ✅ Evitar aplicar la misma migración dos veces
- ✅ Sincronización entre dev y prod
- ✅ Historial de cambios de schema
- ✅ Rollback seguro

### Workflow de Migraciones

#### 1️⃣ Desarrollo Local (DEV)

```bash
# Crear nueva migración
cd database/migrations/development/
touch $(date +%Y%m%d_%H%M%S)_add_new_feature.sql

# Editar SQL
nano $(ls -t | head -1)

# Aplicar en DEV
sudo -u postgres psql -d cuentassik_dev -f $(ls -t | head -1)

# Verificar que funcionó
psql -U cuentassik_user -d cuentassik_dev -c "SELECT * FROM nueva_tabla LIMIT 1;"

# Si funciona, mover a tested/
mv $(ls -t | head -1) ../tested/
```

#### 2️⃣ Testing (TESTED)

```bash
# Las migraciones en tested/ están listas para producción
# Han sido probadas en DEV y verificadas

# Listar migraciones pendientes
ls -1 database/migrations/tested/*.sql

# Verificar que no rompan nada
sudo -u postgres psql -d cuentassik_dev -c "\d+ tabla_afectada"
```

#### 3️⃣ Aplicar a Producción (PROD)

```bash
# Script automatizado con backups
cd /home/kava/workspace/proyectos/CuentasSiK/repo
./scripts/deploy_to_prod.sh

# O manual con máximo cuidado
sudo -u postgres psql -d cuentassik_prod -f database/migrations/tested/20241011_*.sql

# Registrar en tabla de control
sudo -u postgres psql -d cuentassik_prod << 'EOF'
INSERT INTO schema_migrations (version, description)
VALUES ('20241011_123456', 'Descripción del cambio')
ON CONFLICT (version) DO NOTHING;
EOF

# Mover a applied (histórico local)
mv database/migrations/tested/20241011_*.sql database/migrations/applied/archive/
```

---

## 🔧 Comandos Útiles

### Ver migraciones aplicadas

```bash
sudo -u postgres psql -d cuentassik_prod -c \
  "SELECT version, applied_at, description FROM schema_migrations ORDER BY applied_at DESC LIMIT 10;"
```

### Verificar diferencias entre DEV y PROD

```bash
# Schema de DEV
sudo -u postgres pg_dump -d cuentassik_dev --schema-only > /tmp/dev_schema.sql

# Schema de PROD
sudo -u postgres pg_dump -d cuentassik_prod --schema-only > /tmp/prod_schema.sql

# Comparar
diff /tmp/dev_schema.sql /tmp/prod_schema.sql
```

### Backup rápido antes de cambios

```bash
# DEV
sudo -u postgres pg_dump -d cuentassik_dev > ~/backups/dev_$(date +%Y%m%d_%H%M%S).sql

# PROD (OBLIGATORIO antes de cualquier cambio)
sudo -u postgres pg_dump -d cuentassik_prod > ~/backups/prod_$(date +%Y%m%d_%H%M%S).sql
```

---

## ⚠️ Reglas Críticas

### ✅ DO:

- Siempre crear backup antes de aplicar migraciones en PROD
- Probar migraciones en DEV primero
- Usar nombres descriptivos: `20241011_145030_add_user_preferences.sql`
- Registrar en `schema_migrations` table
- Documentar cambios en el archivo SQL (comentarios)

### ❌ DON'T:

- NUNCA aplicar migraciones no probadas en PROD
- NUNCA modificar datos de usuarios en migraciones (usar scripts aparte)
- NUNCA aplicar migraciones sin backup
- NUNCA mezclar cambios de estructura con cambios de datos
- NUNCA commitear archivos de `migrations/applied/` a Git

---

## 🆘 Troubleshooting

### "Migration already applied"

```sql
-- Verificar si existe
SELECT * FROM schema_migrations WHERE version = '20241011_123456';

-- Si es error, eliminar registro (con cuidado)
DELETE FROM schema_migrations WHERE version = '20241011_123456';
```

### "Rollback needed"

```bash
# 1. Restaurar desde backup
sudo -u postgres psql -d cuentassik_prod < ~/backups/prod_20241011_140000.sql

# 2. Eliminar registro de migración fallida
sudo -u postgres psql -d cuentassik_prod -c \
  "DELETE FROM schema_migrations WHERE version = '20241011_145030';"

# 3. Corregir migración en development/
# 4. Re-probar en DEV
# 5. Volver a aplicar cuando esté lista
```

git commit -m "chore(db): update schema baseline to $(date +%Y%m%d)"

### "Schema out of sync"

```bash
# Regenerar seed baseline completa desde PROD actual
NEW_SEED="database/migrations/applied/$(date +%Y%m%d_%H%M%S)_seed.sql"
sudo -u postgres pg_dump -d cuentassik_prod \
  --no-owner \
  --no-privileges \
  --format=plain \
  > "$NEW_SEED"

# Commitear nueva versión (mueve la anterior a archive/ si ya no aplica)
git add "$NEW_SEED"
git commit -m "chore(db): update seed baseline to $(date +%Y%m%d)"
```

---

## 📚 Referencias

- **AGENTS.md**: Instrucciones detalladas para IA agents
- **20251014_150000_seed.sql**: Seed baseline dual-flow (prod = dev sincronizadas)
- **migrations_control.sql**: Sistema de control de migraciones

---

## 🛡️ Principios de Seguridad

### Reglas de Oro

1. **Migraciones = Solo Estructura**

   - ✅ CREATE TABLE, ALTER TABLE, CREATE INDEX
   - ❌ INSERT, UPDATE, DELETE de datos de usuarios
   - ❌ Modificar datos existentes en producción

2. **Nunca Borrar Campos**

   - ⏳ Mínimo 3 meses sin uso antes de considerar eliminación
   - 📊 Analizar uso real en logs antes de deprecar
   - 🔒 Seguridad ante todo: mejor campo obsoleto que datos perdidos

3. **Backups Obligatorios**

   - 💾 SIEMPRE backup antes de aplicar en PROD
   - ✅ Verificar backup existe y tiene tamaño razonable
   - 🔄 Tener plan de rollback listo

4. **Testing Exhaustivo**
   - 🧪 Probar en DEV primero
   - ✅ Verificar en datos reales de prueba
   - 📋 Documentar casos de uso probados

---

**Última actualización:** 11 Octubre 2025
**Versión Schema Base:** 0.3.0
**PostgreSQL:** 15.14

### **Fase 2: Desarrollo de Migración**

```bash
# 2. Crear nueva migración
Tarea: "➕ Crear Nueva Migración"
# Esto crea: database/migrations/development/YYYYMMDDHHMMSS_descripcion.sql

# 3. Editar el archivo SQL con tus cambios de estructura
# IMPORTANTE: Solo cambios de estructura, nunca DELETE/UPDATE de datos
```

**Ejemplo de migración segura:**

```sql
-- ✅ CORRECTO: Agregar columna con valor por defecto
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS created_by_profile_id UUID
REFERENCES profiles(id);

-- ✅ CORRECTO: Índice para performance
CREATE INDEX IF NOT EXISTS idx_transactions_created_by
ON transactions(created_by_profile_id);

-- ❌ INCORRECTO: No modificar datos en migraciones
-- DELETE FROM transactions WHERE amount = 0;
```

### **Fase 3: Aplicación y Prueba en DEV**

```bash
# 4. Aplicar migración a DEV
Tarea: "🔄 Aplicar Migraciones a DEV"

# 5. Probar con datos reales
# - Verifica que la estructura cambió correctamente
# - Prueba las funciones de la app
# - Confirma que no hay errores
```

### **Fase 4: Promoción a Tested**

```bash
# 6. Si todo funciona, promover la migración
Tarea: "⬆️ Promover Migración (dev → tested)"
# O manualmente:
/home/kava/workspace/scripts/db_promote_migration.sh
```

### **Fase 5: Despliegue a Producción**

```bash
# 7. Cuando estés listo, desplegar a PROD
Tarea: "🚀 ESCENARIO 2: Desplegar a PRODUCCIÓN"

# El script:
# - Hace backup automático
# - Aplica las migraciones de tested/
# - Mueve las migraciones a applied/
# - Ofrece reiniciar PM2
```

---

## 🛡️ Reglas de Seguridad

### ✅ **SIEMPRE:**

1. Trabajar con datos reales (sincronizar PROD → DEV antes de desarrollar)
2. Usar `IF NOT EXISTS` / `IF EXISTS` en tus DDL
3. Agregar valores por defecto a columnas nuevas
4. Hacer migraciones **reversibles** (comentar rollback)
5. Probar en DEV antes de promover
6. Deprecar en vez de eliminar (compatibilidad)

### ❌ **NUNCA:**

1. Modificar datos en migraciones (no DELETE/UPDATE/TRUNCATE)
2. Aplicar migraciones no probadas a PROD
3. Eliminar columnas/tablas que estén en uso
4. Dejar migraciones sueltas en `database/migrations/`
5. Saltarse el backup (el script lo hace automático)

---

## 📊 Ver Estado Actual

```bash
# Tarea: "📊 Ver Estado Migraciones"
# O manualmente:
/home/kava/workspace/scripts/db_migration_status.sh
```

**Output esperado:**

```
📁 ARCHIVOS DE MIGRACIÓN
📝 En development/: 2     ← En desarrollo
✅ En tested/: 81         ← Listas para PROD
📦 En applied/: 0         ← Aplicadas en PROD

🔵 DESARROLLO (cuentassik_dev)
total_aplicadas: 83       ← Todas aplicadas

🔴 PRODUCCIÓN (cuentassik_prod)
total_aplicadas: 0        ← Pendiente de aplicar
```

---

## 🗃️ Sistema de Control `_migrations`

Cada migración aplicada se registra en la tabla `_migrations`:

```sql
-- Ver todas las migraciones aplicadas
SELECT * FROM _migrations ORDER BY applied_at DESC;

-- Ver si una migración específica está aplicada
SELECT * FROM _migrations
WHERE migration_name = '20251010120000_add_audit_fields.sql';

-- Ver migraciones aplicadas hoy
SELECT * FROM _migrations
WHERE applied_at::date = CURRENT_DATE;
```

---

## 🔧 Comandos Útiles

### Crear Migración Manual

```bash
cd /home/kava/workspace/proyectos/CuentasSiK/repo/database/migrations/development
touch $(date +%Y%m%d%H%M%S)_descripcion.sql
```

### Aplicar Migración Específica (DEV)

```bash
sudo -u postgres psql -d cuentassik_dev \
  -f database/migrations/development/20251010120000_ejemplo.sql
```

### Ver Diferencias de Estructura entre DEV y PROD

```bash
# Exportar esquemas
sudo -u postgres pg_dump -s cuentassik_dev > /tmp/dev_schema.sql
sudo -u postgres pg_dump -s cuentassik_prod > /tmp/prod_schema.sql

# Comparar
diff /tmp/dev_schema.sql /tmp/prod_schema.sql
```

---

## 🚨 Solución de Problemas

### Migración falla en DEV

```bash
# 1. Ver el error en detalle
sudo -u postgres psql -d cuentassik_dev \
  -f database/migrations/development/ARCHIVO.sql

# 2. Corregir el SQL

# 3. Volver a aplicar
Tarea: "🔄 Aplicar Migraciones a DEV"
```

### Migración falla en PROD

```bash
# ¡NO ENTRES EN PÁNICO!
# El script ya hizo backup automático

# 1. Ver el backup creado
ls -lh /home/kava/workspace/backups/cuentassik_prod_pre_deploy_*.sql

# 2. Restaurar desde backup
sudo -u postgres psql -d cuentassik_prod < /home/kava/workspace/backups/cuentassik_prod_pre_deploy_TIMESTAMP.sql

# 3. Corregir la migración en development/

# 4. Re-probar en DEV

# 5. Promover de nuevo cuando esté corregida
```

### Verificar Integridad Post-Migración

```sql
-- Contar registros clave
SELECT
  'profiles' as tabla, COUNT(*) as registros FROM profiles
UNION ALL
SELECT 'households', COUNT(*) FROM households
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions;

-- Ver últimas transacciones (datos intactos)
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5;
```

---

## 📚 Documentación Adicional

- **Flujo completo:** `docs/FLUJO_DESARROLLO_PRODUCCION.md`
- **Cambios recientes:** `docs/CAMBIOS_20251010.md`
- **Scripts disponibles:** `/home/kava/workspace/scripts/`

---

## 💡 Tips Profesionales

1. **Nomenclatura:** `YYYYMMDDHHMMSS_descripcion_clara.sql`
2. **Comentarios:** Documenta QUÉ hace y POR QUÉ en cada migración
3. **Rollback:** Comenta cómo revertir cada cambio
4. **Atomic:** Una migración = un concepto
5. **Testeable:** Si no puedes probarlo, no lo apliques
6. **Deprecación:** Marca columnas obsoletas con comentarios
7. **Compatibilidad:** Mantén código antiguo funcionando mientras migras

---

**Última actualización:** 10 de octubre de 2025
