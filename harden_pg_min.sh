#!/usr/bin/env bash
set -euo pipefail

# ===== PARÁMETROS (ajusta nombres si cambian) =====
DBS=(cuentassik_prod cuentassik_dev)
OWNERS=(cuentassik_prod_owner cuentassik_dev_owner)
APP_ROLE="cuentassik_user"

# ===== PASSWORD APP (UNA VEZ) =====
read -r -s -p "Nueva contraseña para ${APP_ROLE} (prod+dev): " APP_PW; echo
[[ -z "$APP_PW" ]] && { echo "Contraseña vacía. Abortando."; exit 1; }
APP_PW_SQL=${APP_PW//\'/\'\'}   # escapa comilla simple -> ''

# Helper: ejecutar psql como postgres sin el warning de PWD
psql_root() {
  # uso: psql_root -d DB  (lee SQL por stdin si hay heredoc)
  ( cd / && sudo -u postgres -H psql -v ON_ERROR_STOP=1 "$@" )
}

# 0) Asegurar rol de app con LOGIN (si no existe)
psql_root -d postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${APP_ROLE}') THEN
    CREATE ROLE ${APP_ROLE} LOGIN;
  END IF;
END
\$\$;
SQL

# 0.1) Fijar contraseña (literal seguro)
psql_root -d postgres -c "ALTER ROLE ${APP_ROLE} PASSWORD '${APP_PW_SQL}';"

prep_db() {
  local db="$1" owner="$2"

  # 1) Owner NOLOGIN (idempotente)
  psql_root -d "$db" <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${owner}') THEN
    CREATE ROLE ${owner} NOLOGIN;
  END IF;
END
\$\$;
SQL

  # 2) BD + esquema public al owner
  psql_root -d "$db" -c "ALTER DATABASE ${db} OWNER TO ${owner};"
  psql_root -d "$db" -c "ALTER SCHEMA public OWNER TO ${owner};" || true

  # 3) Reasignar SOLO objetos de 'public' que aún sean de postgres
  psql_root -d "$db" <<SQL
BEGIN;

DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT format('%I.%I', n.nspname, c.relname) AS fq, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles o ON o.oid = c.relowner
    WHERE n.nspname='public' AND o.rolname='postgres'
      AND c.relkind IN ('r','p','v','m','f')
  LOOP
    IF r.relkind='v' THEN
      EXECUTE format('ALTER VIEW %s OWNER TO ${owner}', r.fq);
    ELSIF r.relkind='m' THEN
      EXECUTE format('ALTER MATERIALIZED VIEW %s OWNER TO ${owner}', r.fq);
    ELSIF r.relkind='f' THEN
      EXECUTE format('ALTER FOREIGN TABLE %s OWNER TO ${owner}', r.fq);
    ELSE
      EXECUTE format('ALTER TABLE %s OWNER TO ${owner}', r.fq);
    END IF;
  END LOOP;
END\$\$;

DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT format('%I.%I', n.nspname, c.relname) AS fq
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles o ON o.oid = c.relowner
    WHERE n.nspname='public' AND o.rolname='postgres' AND c.relkind='S'
  LOOP
    EXECUTE format('ALTER SEQUENCE %s OWNER TO ${owner}', r.fq);
  END LOOP;
END\$\$;

DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS rp
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_roles o ON o.oid = p.proowner
    WHERE n.nspname='public' AND o.rolname='postgres'
  LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO ${owner}', r.rp);
  END LOOP;
END\$\$;

DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT format('%I.%I', n.nspname, t.typname) AS fq
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_roles o ON o.oid = t.typowner
    WHERE n.nspname='public' AND o.rolname='postgres' AND t.typtype IN ('c','d','e')
  LOOP
    EXECUTE format('ALTER TYPE %s OWNER TO ${owner}', r.fq);
  END LOOP;
END\$\$;

COMMIT;
SQL

  # 4) GRANTs mínimos + DEFAULT PRIVILEGES
  psql_root -d "$db" <<SQL
ALTER ROLE ${APP_ROLE} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

GRANT CONNECT ON DATABASE ${db}  TO ${APP_ROLE};
GRANT USAGE   ON SCHEMA public   TO ${APP_ROLE};
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES    IN SCHEMA public TO ${APP_ROLE};
GRANT USAGE,SELECT               ON ALL SEQUENCES IN SCHEMA public TO ${APP_ROLE};

ALTER DEFAULT PRIVILEGES FOR ROLE ${owner} IN SCHEMA public
  GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO ${APP_ROLE};
ALTER DEFAULT PRIVILEGES FOR ROLE ${owner} IN SCHEMA public
  GRANT USAGE,SELECT ON SEQUENCES TO ${APP_ROLE};
SQL
}

# Ejecutar para PROD y DEV
for i in "${!DBS[@]}"; do
  prep_db "${DBS[$i]}" "${OWNERS[$i]}"
done

# ~/.pgpass para CLI sin contraseña (solo localhost)
touch ~/.pgpass
chmod 600 ~/.pgpass
for db in "${DBS[@]}"; do
  line="127.0.0.1:5432:${db}:${APP_ROLE}:${APP_PW}"
  grep -qxF "$line" ~/.pgpass || echo "$line" >> ~/.pgpass
done

# Smoke tests (no debe pedir password)
for db in "${DBS[@]}"; do
  psql -h 127.0.0.1 -U "${APP_ROLE}" -d "${db}" -XAt -c "select current_user, current_database();" >/dev/null \
    || { echo "❌ Fallo test en ${db}"; exit 2; }
done

echo "✅ Hecho. Owners sin login, permisos mínimos y defaults listos. ~/.pgpass configurado."
