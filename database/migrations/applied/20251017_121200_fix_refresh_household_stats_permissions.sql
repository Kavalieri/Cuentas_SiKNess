-- Ejecutar REFRESH de household_stats como owner (SECURITY DEFINER) desde triggers
-- y asegurar permisos de ejecución para el rol de aplicación

CREATE OR REPLACE FUNCTION public.refresh_household_stats() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Refresco concurrente permite queries durante el refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY household_stats;
  RETURN NULL;
END;
$$;

-- Asegurar permisos para el rol de aplicación
GRANT EXECUTE ON FUNCTION public.refresh_household_stats() TO cuentassik_user;
