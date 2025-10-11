--
-- PostgreSQL database dump
--

\restrict z8iJyJuWNhIi41TbMC3cItbZ6qW8ylNyu9ccLN0dtYa9BvdXrlsC6QCejgmYATH

-- Dumped from database version 15.14 (Ubuntu 15.14-1.pgdg22.04+1)
-- Dumped by pg_dump version 15.14 (Ubuntu 15.14-1.pgdg22.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ensure_last_member_is_owner(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_last_member_is_owner() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_remaining_members INTEGER;
  v_remaining_owners INTEGER;
  v_last_member_id UUID;
  v_last_member_role TEXT;
BEGIN
  -- Solo ejecutar AFTER DELETE de un miembro
  -- OLD.household_id = hogar del cual se eliminó el miembro

  -- Contar miembros restantes del hogar
  SELECT COUNT(*) INTO v_remaining_members
  FROM household_members
  WHERE household_id = OLD.household_id;

  -- Si no quedan miembros, no hacer nada (el hogar quedará vacío)
  IF v_remaining_members = 0 THEN
    RETURN OLD;
  END IF;

  -- Contar owners restantes del hogar
  SELECT COUNT(*) INTO v_remaining_owners
  FROM household_members
  WHERE household_id = OLD.household_id
    AND role = 'owner';

  -- Si aún hay al menos un owner, no hacer nada
  IF v_remaining_owners > 0 THEN
    RETURN OLD;
  END IF;

  -- Si llegamos aquí:
  -- - Queda al menos 1 miembro
  -- - Pero NO queda ningún owner
  -- → Promocionar al último miembro como owner

  -- Obtener el último miembro (el más antiguo)
  SELECT profile_id, role
  INTO v_last_member_id, v_last_member_role
  FROM household_members
  WHERE household_id = OLD.household_id
  ORDER BY created_at ASC
  LIMIT 1;

  -- Solo actualizar si no es owner ya (por si acaso)
  IF v_last_member_role != 'owner' THEN
    UPDATE household_members
    SET role = 'owner',
        updated_at = NOW()
    WHERE household_id = OLD.household_id
      AND profile_id = v_last_member_id;

    -- Log opcional (descomentar si quieres registrar las promociones)
    -- RAISE NOTICE 'Auto-promoted member % to owner in household %',
    --   v_last_member_id, OLD.household_id;
  END IF;

  RETURN OLD;
END;
$$;


--
-- Name: FUNCTION ensure_last_member_is_owner(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ensure_last_member_is_owner() IS 'Función de trigger que garantiza Regla #1: Siempre hay al menos un owner. Si el último owner abandona, promociona automáticamente al miembro más antiguo.';


--
-- Name: ensure_monthly_period(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_monthly_period(p_household_id uuid, p_year integer, p_month integer) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_period_id UUID;
  v_previous_period RECORD;
  v_previous_year INTEGER;
  v_previous_month INTEGER;
  v_opening_balance NUMERIC := 0;
  v_status TEXT;
  v_current_year INTEGER;
  v_current_month INTEGER;
BEGIN
  -- Buscar período existente
  SELECT id INTO v_period_id
  FROM monthly_periods
  WHERE household_id = p_household_id
    AND year = p_year
    AND month = p_month;
  
  -- Si existe, retornar su ID
  IF FOUND THEN
    RETURN v_period_id;
  END IF;
  
  -- Calcular mes anterior
  IF p_month = 1 THEN
    v_previous_year := p_year - 1;
    v_previous_month := 12;
  ELSE
    v_previous_year := p_year;
    v_previous_month := p_month - 1;
  END IF;
  
  -- Obtener balance de cierre del mes anterior (si existe)
  SELECT closing_balance INTO v_opening_balance
  FROM monthly_periods
  WHERE household_id = p_household_id
    AND year = v_previous_year
    AND month = v_previous_month;
  
  -- Si no hay mes anterior, opening_balance = 0 (por defecto ya asignado)
  
  -- Determinar estado inicial basado en fecha actual
  SELECT 
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
  INTO v_current_year, v_current_month;
  
  IF p_year = v_current_year AND p_month = v_current_month THEN
    v_status := 'active';
  ELSIF (p_year < v_current_year) OR (p_year = v_current_year AND p_month < v_current_month) THEN
    v_status := 'active'; -- Meses pasados también activos hasta cierre manual
  ELSE
    v_status := 'future'; -- Meses futuros
  END IF;
  
  -- Crear nuevo período (solo columnas year, month, status, balances)
  INSERT INTO monthly_periods (
    household_id,
    year,
    month,
    status,
    opening_balance,
    closing_balance
  ) VALUES (
    p_household_id,
    p_year,
    p_month,
    v_status,
    COALESCE(v_opening_balance, 0),
    COALESCE(v_opening_balance, 0) -- Inicialmente igual al opening
  ) RETURNING id INTO v_period_id;
  
  RETURN v_period_id;
END;
$$;


--
-- Name: FUNCTION ensure_monthly_period(p_household_id uuid, p_year integer, p_month integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ensure_monthly_period(p_household_id uuid, p_year integer, p_month integer) IS 'Obtiene/crea período mensual usando solo year, month (sin start_date/end_date)';


--
-- Name: get_household_members(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_household_members(p_household_id uuid) RETURNS TABLE(id uuid, profile_id uuid, email text, role text, household_id uuid)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT 
    hm.household_id AS id,
    hm.profile_id,
    p.email,
    hm.role,
    hm.household_id
  FROM household_members hm
  INNER JOIN profiles p ON p.id = hm.profile_id
  WHERE hm.household_id = p_household_id
  ORDER BY 
    CASE WHEN hm.role = 'owner' THEN 0 ELSE 1 END,
    p.email;
$$;


--
-- Name: get_household_members_optimized(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_household_members_optimized(p_household_id uuid) RETURNS TABLE(profile_id uuid, email text, role text, joined_at timestamp with time zone, current_income numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    hm.profile_id,
    p.email,
    hm.role,
    hm.joined_at,
    COALESCE(
      (SELECT get_member_income(p_household_id, hm.profile_id)),
      0
    ) as current_income
  FROM household_members hm
  INNER JOIN profiles p
    ON p.id = hm.profile_id
  WHERE hm.household_id = p_household_id
  ORDER BY
    CASE WHEN hm.role = 'owner' THEN 0 ELSE 1 END,
    hm.joined_at ASC;
END;
$$;


--
-- Name: FUNCTION get_household_members_optimized(p_household_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_household_members_optimized(p_household_id uuid) IS 'RPC optimizada que devuelve todos los miembros de un hogar con su email, rol e ingreso actual. Ordena owners primero, luego por antigüedad.';


--
-- Name: get_member_income(uuid, uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_member_income(p_household_id uuid, p_profile_id uuid, p_date date DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_income NUMERIC;
  v_exists BOOLEAN;
BEGIN
  -- Verificar si existe al menos un registro de income para este miembro
  SELECT EXISTS (
    SELECT 1 
    FROM member_incomes
    WHERE household_id = p_household_id
      AND profile_id = p_profile_id
  ) INTO v_exists;

  -- Si NO existe ningún registro, retornar NULL (sin configurar)
  IF NOT v_exists THEN
    RETURN NULL;
  END IF;

  -- Si existe, buscar el income vigente en la fecha
  SELECT monthly_income
  INTO v_income
  FROM member_incomes
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND effective_from <= p_date
  ORDER BY effective_from DESC
  LIMIT 1;
  
  -- Retornar el income encontrado (puede ser 0, que es válido)
  -- Si no hay income vigente en la fecha pero SÍ hay registros, retornar 0
  RETURN COALESCE(v_income, 0);
END;
$$;


--
-- Name: get_user_active_household(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_active_household(p_profile_id uuid) RETURNS uuid
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_household_id UUID;
BEGIN
  -- Intentar obtener de user_active_household
  SELECT household_id INTO v_household_id
  FROM user_active_household
  WHERE profile_id = p_profile_id;

  -- Si no existe, retornar el primer hogar del usuario
  IF v_household_id IS NULL THEN
    SELECT hm.household_id INTO v_household_id
    FROM household_members hm
    INNER JOIN households h ON h.id = hm.household_id
    WHERE hm.profile_id = p_profile_id
      AND h.deleted_at IS NULL
    ORDER BY hm.joined_at ASC
    LIMIT 1;
  END IF;

  RETURN v_household_id;
END;
$$;


--
-- Name: FUNCTION get_user_active_household(p_profile_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_active_household(p_profile_id uuid) IS 'Obtiene el household_id activo del usuario. Si no tiene uno configurado, retorna el primer hogar al que pertenece.';


--
-- Name: get_user_households_optimized(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_households_optimized(p_profile_id uuid) RETURNS TABLE(household_id uuid, household_name text, user_role text, household_created_at timestamp with time zone, is_active boolean, member_count integer, owner_count integer)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id as household_id,
    h.name as household_name,
    hm.role as user_role,
    h.created_at as household_created_at,
    (uah.household_id = h.id) as is_active,
    COALESCE(hs.member_count, 0)::INTEGER as member_count,
    COALESCE(hs.owner_count, 0)::INTEGER as owner_count
  FROM households h
  INNER JOIN household_members hm
    ON h.id = hm.household_id
  LEFT JOIN user_active_household uah
    ON uah.profile_id = p_profile_id
  LEFT JOIN household_stats hs
    ON hs.household_id = h.id
  WHERE hm.profile_id = p_profile_id
    AND h.deleted_at IS NULL
  ORDER BY is_active DESC, h.created_at DESC;
END;
$$;


--
-- Name: FUNCTION get_user_households_optimized(p_profile_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_households_optimized(p_profile_id uuid) IS 'RPC optimizada que devuelve TODOS los hogares de un usuario con stats pre-calculadas. Evita múltiples queries y JOINs complejos en aplicación.';


--
-- Name: is_user_household_owner(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_user_household_owner(p_profile_id uuid, p_household_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM household_members
    WHERE profile_id = p_profile_id
      AND household_id = p_household_id
      AND role = 'owner'
  );
END;
$$;


--
-- Name: FUNCTION is_user_household_owner(p_profile_id uuid, p_household_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_user_household_owner(p_profile_id uuid, p_household_id uuid) IS 'Validación rápida de permisos: devuelve TRUE si el usuario es owner del hogar especificado.';


--
-- Name: refresh_household_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_household_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Refresco concurrente permite queries durante el refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY household_stats;
  RETURN NULL;
END;
$$;


--
-- Name: update_category_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_category_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  
  IF NEW.updated_by_profile_id IS NULL AND OLD.updated_by_profile_id IS NOT NULL THEN
    NEW.updated_by_profile_id = OLD.updated_by_profile_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_contribution_adjustments_total(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_contribution_adjustments_total() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_contribution_id UUID;
  v_adjustments_total NUMERIC;
  v_adjustments_paid NUMERIC;
  v_contribution RECORD;
  v_base_amount NUMERIC;
BEGIN
  v_contribution_id := COALESCE(NEW.contribution_id, OLD.contribution_id);

  -- Calcular suma de todos los ajustes (positivos y negativos)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_adjustments_total
  FROM contribution_adjustments
  WHERE contribution_id = v_contribution_id;

  -- Calcular suma de ajustes con movimiento vinculado (en valor absoluto)
  -- Estos representan gastos/ingresos ya realizados (prepagos)
  SELECT COALESCE(SUM(ABS(amount)), 0)
  INTO v_adjustments_paid
  FROM contribution_adjustments
  WHERE contribution_id = v_contribution_id
  AND movement_id IS NOT NULL;

  -- Obtener datos actuales de la contribución
  SELECT * INTO v_contribution
  FROM contributions
  WHERE id = v_contribution_id;

  -- El base_amount original es expected_amount - adjustments_total anterior
  v_base_amount := v_contribution.expected_amount - COALESCE(v_contribution.adjustments_total, 0);

  -- Actualizar contribución
  UPDATE contributions
  SET
    adjustments_total = v_adjustments_total,
    adjustments_paid_amount = v_adjustments_paid,
    expected_amount = v_base_amount + v_adjustments_total,
    updated_at = NOW()
  WHERE id = v_contribution_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: FUNCTION update_contribution_adjustments_total(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_contribution_adjustments_total() IS 'Actualiza adjustments_total, adjustments_paid_amount y recalcula expected_amount';


--
-- Name: update_contribution_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_contribution_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  
  IF NEW.updated_by_profile_id IS NULL AND OLD.updated_by_profile_id IS NOT NULL THEN
    NEW.updated_by_profile_id = OLD.updated_by_profile_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_household_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_household_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  
  IF NEW.updated_by_profile_id IS NULL AND OLD.updated_by_profile_id IS NOT NULL THEN
    NEW.updated_by_profile_id = OLD.updated_by_profile_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_member_credit_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_member_credit_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  
  IF NEW.updated_by_profile_id IS NULL AND OLD.updated_by_profile_id IS NOT NULL THEN
    NEW.updated_by_profile_id = OLD.updated_by_profile_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_transaction_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_transaction_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Actualizar timestamp automáticamente
  NEW.updated_at = now();
  
  -- Si viene updated_by, registrarlo
  -- (debe venir desde la aplicación)
  IF NEW.updated_by_profile_id IS NULL AND OLD.updated_by_profile_id IS NOT NULL THEN
    -- Preservar el valor anterior si no se proporciona uno nuevo
    NEW.updated_by_profile_id = OLD.updated_by_profile_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_user_active_household_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_active_household_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: validate_household_has_owner(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_household_has_owner(p_household_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_owner_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_owner_count
  FROM household_members
  WHERE household_id = p_household_id
    AND role = 'owner';

  RETURN v_owner_count > 0;
END;
$$;


--
-- Name: FUNCTION validate_household_has_owner(p_household_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_household_has_owner(p_household_id uuid) IS 'Valida que un hogar específico tenga al menos un owner. Retorna TRUE si cumple la regla.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._migrations (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    applied_by character varying(100) DEFAULT CURRENT_USER,
    checksum character varying(64),
    execution_time_ms integer,
    description text
);


--
-- Name: TABLE _migrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public._migrations IS 'Control de migraciones aplicadas al esquema de base de datos';


--
-- Name: COLUMN _migrations.migration_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public._migrations.migration_name IS 'Nombre del archivo de migración (ej: 20251010000001_add_system_admin.sql)';


--
-- Name: COLUMN _migrations.applied_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public._migrations.applied_at IS 'Timestamp de cuándo se aplicó la migración';


--
-- Name: COLUMN _migrations.applied_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public._migrations.applied_by IS 'Usuario de PostgreSQL que aplicó la migración';


--
-- Name: COLUMN _migrations.checksum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public._migrations.checksum IS 'Hash MD5 del contenido del archivo para validación';


--
-- Name: COLUMN _migrations.execution_time_ms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public._migrations.execution_time_ms IS 'Tiempo de ejecución en milisegundos';


--
-- Name: _migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public._migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: _migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public._migrations_id_seq OWNED BY public._migrations.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid,
    name text,
    icon text,
    type text,
    created_by_profile_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_by_profile_id uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: COLUMN categories.created_by_profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.categories.created_by_profile_id IS 'ID del usuario que CREÓ esta categoría en el hogar.';


--
-- Name: COLUMN categories.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.categories.created_at IS 'Fecha de creación de la categoría.';


--
-- Name: COLUMN categories.updated_by_profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.categories.updated_by_profile_id IS 'ID del usuario que MODIFICÓ esta categoría por última vez.';


--
-- Name: COLUMN categories.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.categories.updated_at IS 'Fecha de la última modificación de la categoría.';


--
-- Name: contribution_adjustment_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contribution_adjustment_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    category_id uuid,
    default_amount numeric(10,2),
    last_used_amount numeric(10,2),
    last_used_at timestamp with time zone,
    is_default boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    icon text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: contribution_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contribution_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contribution_id uuid,
    amount numeric,
    reason text,
    created_by uuid,
    created_at timestamp with time zone,
    type text,
    category_id uuid,
    movement_id uuid,
    updated_at timestamp with time zone,
    status text,
    approved_by uuid,
    approved_at timestamp with time zone,
    template_id uuid,
    expense_category_id uuid,
    income_description text,
    expense_description text,
    income_movement_id uuid,
    rejected_by uuid,
    rejected_at timestamp with time zone
);


--
-- Name: contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid,
    year integer,
    month integer,
    expected_amount numeric,
    paid_amount numeric,
    status text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    profile_id uuid,
    adjustments_total numeric,
    calculation_method text,
    created_by_profile_id uuid,
    updated_by_profile_id uuid,
    adjustments_paid_amount numeric(10,2) DEFAULT 0
);


--
-- Name: COLUMN contributions.created_by_profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contributions.created_by_profile_id IS 'ID del usuario que CALCULÓ/CREÓ este registro de contribución. Puede ser diferente de profile_id (a quien pertenece).';


--
-- Name: COLUMN contributions.updated_by_profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contributions.updated_by_profile_id IS 'ID del usuario que MODIFICÓ esta contribución por última vez.';


--
-- Name: COLUMN contributions.adjustments_paid_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contributions.adjustments_paid_amount IS 'Suma absoluta de ajustes que tienen movimiento vinculado (prepagos ya realizados)';


--
-- Name: household_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.household_members (
    household_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    role text,
    is_owner boolean DEFAULT false NOT NULL,
    invited_by_profile_id uuid,
    joined_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_household_member_role CHECK ((role = ANY (ARRAY['owner'::text, 'member'::text])))
);


--
-- Name: COLUMN household_members.is_owner; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.household_members.is_owner IS 'Indica si el usuario es propietario del hogar. Puede gestionar configuración, invitar miembros, etc.';


--
-- Name: COLUMN household_members.invited_by_profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.household_members.invited_by_profile_id IS 'ID del usuario que invitó a este miembro al hogar. NULL si fue el creador del hogar.';


--
-- Name: COLUMN household_members.joined_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.household_members.joined_at IS 'Fecha en que el usuario se unió al hogar (aceptó la invitación).';


--
-- Name: CONSTRAINT chk_household_member_role ON household_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT chk_household_member_role ON public.household_members IS 'Valida que el rol sea exactamente ''owner'' o ''member''. Previene valores incorrectos.';


--
-- Name: household_savings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.household_savings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid,
    current_balance numeric,
    currency text,
    goal_amount numeric,
    goal_description text,
    goal_deadline date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: household_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.household_settings (
    household_id uuid NOT NULL,
    monthly_contribution_goal numeric,
    currency text,
    calculation_type text,
    updated_at timestamp with time zone,
    updated_by uuid
);


--
-- Name: households; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.households (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    status text,
    settings jsonb,
    created_by_profile_id uuid,
    updated_by_profile_id uuid,
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: COLUMN households.created_by_profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.households.created_by_profile_id IS 'ID del usuario que CREÓ este hogar. Por defecto es owner del mismo.';


--
-- Name: COLUMN households.updated_by_profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.households.updated_by_profile_id IS 'ID del usuario que MODIFICÓ la configuración del hogar por última vez.';


--
-- Name: COLUMN households.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.households.updated_at IS 'Fecha de la última modificación del hogar.';


--
-- Name: COLUMN households.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.households.deleted_at IS 'Timestamp de eliminación lógica (soft delete). NULL = hogar activo. Permite auditoría y recuperación.';


--
-- Name: household_stats; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.household_stats AS
 SELECT h.id AS household_id,
    h.name AS household_name,
    count(hm.profile_id) AS member_count,
    count(hm.profile_id) FILTER (WHERE (hm.role = 'owner'::text)) AS owner_count,
    count(hm.profile_id) FILTER (WHERE (hm.role = 'member'::text)) AS member_only_count,
    min(hm.joined_at) AS oldest_member_joined,
    max(hm.joined_at) AS newest_member_joined,
    h.created_at AS household_created_at
   FROM (public.households h
     LEFT JOIN public.household_members hm ON ((hm.household_id = h.id)))
  WHERE (h.deleted_at IS NULL)
  GROUP BY h.id, h.name, h.created_at
  WITH NO DATA;


--
-- Name: MATERIALIZED VIEW household_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON MATERIALIZED VIEW public.household_stats IS 'Vista materializada con estadísticas pre-calculadas de hogares. Optimiza queries de conteo de miembros y roles.';


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    invited_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    type text DEFAULT 'household'::text NOT NULL,
    max_uses integer DEFAULT 1,
    current_uses integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    accepted_by uuid,
    invited_by_profile_id uuid,
    CONSTRAINT invitations_current_uses_check CHECK ((current_uses >= 0)),
    CONSTRAINT invitations_max_uses_check CHECK (((max_uses IS NULL) OR (max_uses > 0))),
    CONSTRAINT invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'cancelled'::text]))),
    CONSTRAINT invitations_type_check CHECK ((type = ANY (ARRAY['household'::text, 'app'::text])))
);


--
-- Name: COLUMN invitations.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invitations.created_at IS 'Fecha en que se creó/envió la invitación.';


--
-- Name: COLUMN invitations.invited_by_profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invitations.invited_by_profile_id IS 'ID del usuario que ENVIÓ esta invitación (owner del hogar).';


--
-- Name: member_credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_credits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid,
    profile_id uuid,
    amount numeric,
    currency text,
    source_period_id uuid,
    source_month integer,
    source_year integer,
    status text,
    applied_to_period_id uuid,
    applied_to_contribution_id uuid,
    applied_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    monthly_decision text,
    reserved_at timestamp with time zone,
    created_by_profile_id uuid,
    updated_by_profile_id uuid,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT member_credits_monthly_decision_check CHECK ((monthly_decision = ANY (ARRAY['apply_to_month'::text, 'keep_active'::text, 'transfer_to_savings'::text])))
);


--
-- Name: COLUMN member_credits.reserved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.member_credits.reserved_at IS 'Timestamp cuando el crédito fue reservado para aplicar al mes siguiente.
NULL = crédito activo (puede gastarse, forma parte del balance principal)
NOT NULL = crédito reservado (bloqueado para próximo mes, NO disponible para gastos)

Cuando un miembro decide "aplicar al mes siguiente" su crédito, se marca reserved_at.
Esto retira el crédito del balance principal disponible inmediatamente.';


--
-- Name: COLUMN member_credits.created_by_profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.member_credits.created_by_profile_id IS 'ID del usuario que OTORGÓ este crédito al miembro.';


--
-- Name: COLUMN member_credits.updated_by_profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.member_credits.updated_by_profile_id IS 'ID del usuario que MODIFICÓ este crédito por última vez.';


--
-- Name: COLUMN member_credits.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.member_credits.updated_at IS 'Fecha de la última modificación del crédito.';


--
-- Name: member_incomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_incomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid,
    profile_id uuid,
    monthly_income numeric,
    effective_from date,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: monthly_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid,
    year integer,
    month integer,
    status text,
    opening_balance numeric,
    total_income numeric,
    total_expenses numeric,
    closing_balance numeric,
    closed_at timestamp with time zone,
    closed_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE monthly_periods; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.monthly_periods IS 'Períodos mensuales con balance de apertura/cierre para contabilidad profesional';


--
-- Name: COLUMN monthly_periods.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.monthly_periods.status IS 'Estado: open (actual), pending_close (pasado sin cerrar), closed (cerrado)';


--
-- Name: COLUMN monthly_periods.opening_balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.monthly_periods.opening_balance IS 'Balance al inicio del mes (heredado del mes anterior)';


--
-- Name: COLUMN monthly_periods.closing_balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.monthly_periods.closing_balance IS 'Balance al final del mes (se convierte en opening_balance del siguiente)';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    auth_user_id uuid,
    display_name text,
    email text,
    avatar_url text,
    bio text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    is_system_admin boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN profiles.is_system_admin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.is_system_admin IS 'Indica si el usuario es administrador de la aplicación (acceso a /admin). Campo global, no depende de hogares.';


--
-- Name: system_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_admins (
    user_id uuid NOT NULL,
    granted_by uuid,
    created_at timestamp with time zone,
    notes text,
    profile_id uuid
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid,
    category_id uuid,
    type text,
    amount numeric,
    currency text,
    description text,
    occurred_at date,
    created_at timestamp with time zone DEFAULT now(),
    period_id uuid,
    profile_id uuid,
    updated_at timestamp with time zone DEFAULT now(),
    paid_by uuid,
    created_by_profile_id uuid,
    updated_by_profile_id uuid
);


--
-- Name: TABLE transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.transactions IS 'Tabla mejorada con defaults automáticos para id y timestamps';


--
-- Name: COLUMN transactions.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transactions.id IS 'UUID generado automáticamente por PostgreSQL';


--
-- Name: COLUMN transactions.created_by_profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transactions.created_by_profile_id IS 'ID del usuario que REGISTRÓ esta transacción en el sistema. Diferente de paid_by (quien pagó).';


--
-- Name: COLUMN transactions.updated_by_profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transactions.updated_by_profile_id IS 'ID del usuario que MODIFICÓ esta transacción por última vez.';


--
-- Name: user_active_household; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_active_household (
    profile_id uuid NOT NULL,
    household_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE user_active_household; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_active_household IS 'Tabla de tracking del hogar activo por usuario. Permite multi-hogar con selección rápida del contexto actual.';


--
-- Name: COLUMN user_active_household.profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_active_household.profile_id IS 'ID del perfil del usuario (profiles.id).';


--
-- Name: COLUMN user_active_household.household_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_active_household.household_id IS 'ID del hogar actualmente activo para este usuario.';


--
-- Name: COLUMN user_active_household.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_active_household.updated_at IS 'Última vez que el usuario cambió su hogar activo.';


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_settings (
    profile_id uuid NOT NULL,
    active_household_id uuid,
    preferences jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: v_migrations_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_migrations_summary AS
 SELECT _migrations.migration_name,
    _migrations.applied_at,
    _migrations.applied_by,
    _migrations.execution_time_ms,
    _migrations.description
   FROM public._migrations
  ORDER BY _migrations.applied_at DESC;


--
-- Name: VIEW v_migrations_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_migrations_summary IS 'Vista resumen de migraciones aplicadas';


--
-- Name: _migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations ALTER COLUMN id SET DEFAULT nextval('public._migrations_id_seq'::regclass);


--
-- Name: _migrations _migrations_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_migration_name_key UNIQUE (migration_name);


--
-- Name: _migrations _migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: contribution_adjustment_templates contribution_adjustment_templates_household_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_adjustment_templates
    ADD CONSTRAINT contribution_adjustment_templates_household_id_name_key UNIQUE (household_id, name);


--
-- Name: contribution_adjustment_templates contribution_adjustment_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_adjustment_templates
    ADD CONSTRAINT contribution_adjustment_templates_pkey PRIMARY KEY (id);


--
-- Name: contribution_adjustments contribution_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_adjustments
    ADD CONSTRAINT contribution_adjustments_pkey PRIMARY KEY (id);


--
-- Name: contributions contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_pkey PRIMARY KEY (id);


--
-- Name: household_members household_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT household_members_pkey PRIMARY KEY (household_id, profile_id);


--
-- Name: household_savings household_savings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.household_savings
    ADD CONSTRAINT household_savings_pkey PRIMARY KEY (id);


--
-- Name: household_settings household_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.household_settings
    ADD CONSTRAINT household_settings_pkey PRIMARY KEY (household_id);


--
-- Name: households households_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_token_key UNIQUE (token);


--
-- Name: member_credits member_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_credits
    ADD CONSTRAINT member_credits_pkey PRIMARY KEY (id);


--
-- Name: member_incomes member_incomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_incomes
    ADD CONSTRAINT member_incomes_pkey PRIMARY KEY (id);


--
-- Name: monthly_periods monthly_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_periods
    ADD CONSTRAINT monthly_periods_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: system_admins system_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_admins
    ADD CONSTRAINT system_admins_pkey PRIMARY KEY (user_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_active_household user_active_household_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_active_household
    ADD CONSTRAINT user_active_household_pkey PRIMARY KEY (profile_id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (profile_id);


--
-- Name: idx_adjustments_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adjustments_template ON public.contribution_adjustments USING btree (template_id) WHERE (template_id IS NOT NULL);


--
-- Name: idx_categories_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_created_by ON public.categories USING btree (created_by_profile_id) WHERE (created_by_profile_id IS NOT NULL);


--
-- Name: idx_categories_household_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_household_creator ON public.categories USING btree (household_id, created_by_profile_id);


--
-- Name: idx_categories_updated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_updated_by ON public.categories USING btree (updated_by_profile_id) WHERE (updated_by_profile_id IS NOT NULL);


--
-- Name: idx_contributions_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributions_created_by ON public.contributions USING btree (created_by_profile_id) WHERE (created_by_profile_id IS NOT NULL);


--
-- Name: idx_contributions_household_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributions_household_creator ON public.contributions USING btree (household_id, created_by_profile_id);


--
-- Name: idx_contributions_updated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributions_updated_by ON public.contributions USING btree (updated_by_profile_id) WHERE (updated_by_profile_id IS NOT NULL);


--
-- Name: idx_household_members_household_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_household_members_household_role ON public.household_members USING btree (household_id, role);


--
-- Name: idx_household_members_invited_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_household_members_invited_by ON public.household_members USING btree (invited_by_profile_id) WHERE (invited_by_profile_id IS NOT NULL);


--
-- Name: idx_household_members_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_household_members_owner ON public.household_members USING btree (household_id, is_owner) WHERE (is_owner = true);


--
-- Name: idx_household_members_owners; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_household_members_owners ON public.household_members USING btree (household_id, profile_id) WHERE (role = 'owner'::text);


--
-- Name: idx_household_members_profile_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_household_members_profile_role ON public.household_members USING btree (profile_id, role);


--
-- Name: idx_household_stats_household_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_household_stats_household_id ON public.household_stats USING btree (household_id);


--
-- Name: idx_household_stats_member_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_household_stats_member_count ON public.household_stats USING btree (member_count);


--
-- Name: idx_household_stats_single_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_household_stats_single_owner ON public.household_stats USING btree (household_id) WHERE (owner_count = 1);


--
-- Name: idx_households_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_households_created_by ON public.households USING btree (created_by_profile_id) WHERE (created_by_profile_id IS NOT NULL);


--
-- Name: idx_households_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_households_deleted_at ON public.households USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_households_deleted_at_not_null; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_households_deleted_at_not_null ON public.households USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_households_updated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_households_updated_by ON public.households USING btree (updated_by_profile_id) WHERE (updated_by_profile_id IS NOT NULL);


--
-- Name: idx_invitations_email_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_email_status ON public.invitations USING btree (email, status);


--
-- Name: idx_invitations_household_inviter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_household_inviter ON public.invitations USING btree (household_id, invited_by_profile_id);


--
-- Name: idx_invitations_household_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_household_status ON public.invitations USING btree (household_id, status);


--
-- Name: idx_invitations_invited_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_invited_by ON public.invitations USING btree (invited_by_profile_id) WHERE (invited_by_profile_id IS NOT NULL);


--
-- Name: idx_invitations_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_status_created ON public.invitations USING btree (status, created_at) WHERE (status = 'pending'::text);


--
-- Name: idx_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_token ON public.invitations USING btree (token);


--
-- Name: idx_member_credits_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_credits_created_by ON public.member_credits USING btree (created_by_profile_id) WHERE (created_by_profile_id IS NOT NULL);


--
-- Name: idx_member_credits_household_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_credits_household_creator ON public.member_credits USING btree (household_id, created_by_profile_id);


--
-- Name: idx_member_credits_updated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_member_credits_updated_by ON public.member_credits USING btree (updated_by_profile_id) WHERE (updated_by_profile_id IS NOT NULL);


--
-- Name: idx_migrations_applied_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migrations_applied_at ON public._migrations USING btree (applied_at DESC);


--
-- Name: idx_migrations_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migrations_name ON public._migrations USING btree (migration_name);


--
-- Name: idx_profiles_system_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_system_admin ON public.profiles USING btree (is_system_admin) WHERE (is_system_admin = true);


--
-- Name: idx_templates_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_default ON public.contribution_adjustment_templates USING btree (is_default) WHERE (is_default = true);


--
-- Name: idx_templates_household; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_household ON public.contribution_adjustment_templates USING btree (household_id);


--
-- Name: idx_transactions_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_created_by ON public.transactions USING btree (created_by_profile_id) WHERE (created_by_profile_id IS NOT NULL);


--
-- Name: idx_transactions_household_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_household_creator ON public.transactions USING btree (household_id, created_by_profile_id);


--
-- Name: idx_transactions_updated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_updated_by ON public.transactions USING btree (updated_by_profile_id) WHERE (updated_by_profile_id IS NOT NULL);


--
-- Name: idx_user_active_household_household_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_active_household_household_id ON public.user_active_household USING btree (household_id);


--
-- Name: idx_user_active_household_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_active_household_updated_at ON public.user_active_household USING btree (updated_at DESC);


--
-- Name: household_members trigger_ensure_last_member_owner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_ensure_last_member_owner AFTER DELETE ON public.household_members FOR EACH ROW EXECUTE FUNCTION public.ensure_last_member_is_owner();


--
-- Name: TRIGGER trigger_ensure_last_member_owner ON household_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER trigger_ensure_last_member_owner ON public.household_members IS 'Trigger que garantiza que siempre haya al menos un owner por hogar. Se ejecuta después de eliminar un miembro.';


--
-- Name: households trigger_refresh_household_stats_on_household_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_refresh_household_stats_on_household_change AFTER INSERT OR DELETE OR UPDATE ON public.households FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_household_stats();


--
-- Name: household_members trigger_refresh_household_stats_on_member_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_refresh_household_stats_on_member_change AFTER INSERT OR DELETE OR UPDATE ON public.household_members FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_household_stats();


--
-- Name: categories trigger_update_category_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_category_audit BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_category_audit();


--
-- Name: contributions trigger_update_contribution_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_contribution_audit BEFORE UPDATE ON public.contributions FOR EACH ROW EXECUTE FUNCTION public.update_contribution_audit();


--
-- Name: households trigger_update_household_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_household_audit BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION public.update_household_audit();


--
-- Name: member_credits trigger_update_member_credit_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_member_credit_audit BEFORE UPDATE ON public.member_credits FOR EACH ROW EXECUTE FUNCTION public.update_member_credit_audit();


--
-- Name: transactions trigger_update_transaction_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_transaction_audit BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_transaction_audit();


--
-- Name: user_active_household trigger_update_user_active_household_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_user_active_household_timestamp BEFORE UPDATE ON public.user_active_household FOR EACH ROW EXECUTE FUNCTION public.update_user_active_household_timestamp();


--
-- Name: categories categories_created_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: categories categories_updated_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_updated_by_profile_id_fkey FOREIGN KEY (updated_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: contribution_adjustment_templates contribution_adjustment_templates_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_adjustment_templates
    ADD CONSTRAINT contribution_adjustment_templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: contribution_adjustment_templates contribution_adjustment_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_adjustment_templates
    ADD CONSTRAINT contribution_adjustment_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: contribution_adjustment_templates contribution_adjustment_templates_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_adjustment_templates
    ADD CONSTRAINT contribution_adjustment_templates_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: contribution_adjustments contribution_adjustments_expense_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_adjustments
    ADD CONSTRAINT contribution_adjustments_expense_category_id_fkey FOREIGN KEY (expense_category_id) REFERENCES public.categories(id);


--
-- Name: contribution_adjustments contribution_adjustments_income_movement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_adjustments
    ADD CONSTRAINT contribution_adjustments_income_movement_id_fkey FOREIGN KEY (income_movement_id) REFERENCES public.transactions(id);


--
-- Name: contribution_adjustments contribution_adjustments_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_adjustments
    ADD CONSTRAINT contribution_adjustments_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.contribution_adjustment_templates(id) ON DELETE SET NULL;


--
-- Name: contributions contributions_created_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: contributions contributions_updated_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_updated_by_profile_id_fkey FOREIGN KEY (updated_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: household_members household_members_invited_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT household_members_invited_by_profile_id_fkey FOREIGN KEY (invited_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: households households_created_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: households households_updated_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_updated_by_profile_id_fkey FOREIGN KEY (updated_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: invitations invitations_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_invited_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_invited_by_profile_id_fkey FOREIGN KEY (invited_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: member_credits member_credits_created_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_credits
    ADD CONSTRAINT member_credits_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: member_credits member_credits_updated_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_credits
    ADD CONSTRAINT member_credits_updated_by_profile_id_fkey FOREIGN KEY (updated_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: system_admins system_admins_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_admins
    ADD CONSTRAINT system_admins_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);


--
-- Name: transactions transactions_created_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: transactions transactions_updated_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_updated_by_profile_id_fkey FOREIGN KEY (updated_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: user_active_household user_active_household_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_active_household
    ADD CONSTRAINT user_active_household_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: user_active_household user_active_household_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_active_household
    ADD CONSTRAINT user_active_household_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: monthly_periods No one can delete periods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No one can delete periods" ON public.monthly_periods FOR DELETE USING (false);


--
-- Name: monthly_periods Only system can create periods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only system can create periods" ON public.monthly_periods FOR INSERT WITH CHECK (false);


--
-- Name: monthly_periods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monthly_periods ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict z8iJyJuWNhIi41TbMC3cItbZ6qW8ylNyu9ccLN0dtYa9BvdXrlsC6QCejgmYATH

