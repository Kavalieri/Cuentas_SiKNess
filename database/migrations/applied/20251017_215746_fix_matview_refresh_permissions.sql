-- Fix permissions for materialized view refresh
-- La función debe ejecutarse como owner para poder refrescar las vistas materializadas

-- Recrear la función con SECURITY DEFINER
DROP FUNCTION IF EXISTS public.refresh_critical_matviews() CASCADE;

CREATE OR REPLACE FUNCTION public.refresh_critical_matviews()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_household_balances;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_pending_contributions;
    REFRESH MATERIALIZED VIEW CONCURRENTLY household_stats;
END;
$$;

COMMENT ON FUNCTION public.refresh_critical_matviews() IS 'Refresca todas las vistas materializadas críticas (SECURITY DEFINER para permisos)';

-- Grant EXECUTE al usuario de aplicación
GRANT EXECUTE ON FUNCTION public.refresh_critical_matviews() TO cuentassik_user;

-- Recrear la función trigger con SECURITY DEFINER
DROP FUNCTION IF EXISTS public.trigger_refresh_transaction_matviews() CASCADE;

CREATE OR REPLACE FUNCTION public.trigger_refresh_transaction_matviews()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Refresar de forma asíncrona (mejor performance)
    PERFORM refresh_critical_matviews();
    RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.trigger_refresh_transaction_matviews() IS 'Trigger para refrescar vistas materializadas tras cambios en transacciones';

-- Grant EXECUTE al usuario de aplicación (necesario para triggers)
GRANT EXECUTE ON FUNCTION public.trigger_refresh_transaction_matviews() TO cuentassik_user;

-- Recrear triggers
DROP TRIGGER IF EXISTS trigger_transaction_changes_refresh_matviews ON transactions;
CREATE TRIGGER trigger_transaction_changes_refresh_matviews
    AFTER INSERT OR DELETE OR UPDATE
    ON transactions
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_transaction_matviews();

DROP TRIGGER IF EXISTS trigger_contribution_changes_refresh_matviews ON contributions;
CREATE TRIGGER trigger_contribution_changes_refresh_matviews
    AFTER INSERT OR DELETE OR UPDATE
    ON contributions
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_transaction_matviews();
