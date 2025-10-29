--
-- PostgreSQL database dump
--

\restrict R0NVEwE8YLg0GOvyXeKYwP6pHKx9vN0BSeJvY9MdJ2R3yKeUZaAKZSnxeHK2Au9

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

SET ROLE :'SEED_OWNER';

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: dual_flow_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dual_flow_status AS ENUM (
    'pending_review',
    'approved',
    'auto_paired',
    'rejected',
    'completed'
);


--
-- Name: TYPE dual_flow_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.dual_flow_status IS 'Estados del workflow: pending_review, approved, auto_paired, rejected, completed';


--
-- Name: dual_flow_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dual_flow_type AS ENUM (
    'personal_to_common',
    'common_to_personal',
    'common_fund'
);


--
-- Name: TYPE dual_flow_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.dual_flow_type IS 'Tipos de flujo: personal_to_common, common_to_personal, common_fund';


--
-- Name: flow_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.flow_type_enum AS ENUM (
    'common',
    'direct'
);


--
-- Name: TYPE flow_type_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.flow_type_enum IS 'Tipo de flujo: common (cuenta común) o direct (gastos directos de miembros)';


--
-- Name: household_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.household_role_enum AS ENUM (
    'owner',
    'member'
);


--
-- Name: invitation_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invitation_status_enum AS ENUM (
    'pending',
    'accepted',
    'expired',
    'cancelled'
);


--
-- Name: period_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.period_status_enum AS ENUM (
    'SETUP',
    'LOCKED',
    'CLOSED'
);


--
-- Name: TYPE period_status_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.period_status_enum IS 'Estado del período de contribución: SETUP, LOCKED, CLOSED';


--
-- Name: transaction_type_dual_flow; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type_dual_flow AS ENUM (
    'gasto',
    'gasto_directo',
    'ingreso',
    'ingreso_directo'
);


--
-- Name: TYPE transaction_type_dual_flow; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.transaction_type_dual_flow IS 'Tipos de transacción: gasto (común), gasto_directo (out-of-pocket), ingreso (común), ingreso_directo (reembolso)';


--
-- Name: transaction_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type_enum AS ENUM (
    'income',
    'expense'
);


--
-- Name: TYPE transaction_type_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.transaction_type_enum IS 'Tipo de transacción: income (ingreso) o expense (gasto)';


--
-- Name: calculate_member_net_contribution(uuid, uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_member_net_contribution(p_household_id uuid, p_profile_id uuid, p_year integer, p_month integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_expected_amount NUMERIC;
    v_paid_amount NUMERIC;
    v_direct_expenses NUMERIC;
    v_net_contribution NUMERIC;
BEGIN
    -- Obtener contribución esperada y pagada
    SELECT
        COALESCE(expected_amount, 0),
        COALESCE(paid_amount, 0)
    INTO v_expected_amount, v_paid_amount
    FROM contributions
    WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND year = p_year
    AND month = p_month;

    -- Si no hay registro, contribución esperada es 0
    v_expected_amount := COALESCE(v_expected_amount, 0);
    v_paid_amount := COALESCE(v_paid_amount, 0);

    -- Calcular gastos directos del mes
    SELECT COALESCE(SUM(amount), 0)
    INTO v_direct_expenses
    FROM transactions
    WHERE household_id = p_household_id
    AND real_payer_id = p_profile_id
    AND flow_type = 'direct'
    AND type = 'expense'
    AND EXTRACT(YEAR FROM occurred_at) = p_year
    AND EXTRACT(MONTH FROM occurred_at) = p_month;

    -- Calcular contribución neta pendiente
    v_net_contribution := GREATEST(
        v_expected_amount - v_paid_amount - v_direct_expenses,
        0
    );

    RETURN v_net_contribution;
END;
$$;


--
-- Name: FUNCTION calculate_member_net_contribution(p_household_id uuid, p_profile_id uuid, p_year integer, p_month integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_member_net_contribution(p_household_id uuid, p_profile_id uuid, p_year integer, p_month integer) IS 'Calcula contribución neta pendiente considerando gastos directos';


--
-- Name: create_default_dual_flow_config(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_dual_flow_config() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO dual_flow_config (household_id)
    VALUES (NEW.id)
    ON CONFLICT (household_id) DO NOTHING;
    RETURN NEW;
END;
$$;


--
-- Name: create_direct_expense_pair(uuid, uuid, numeric, text, uuid, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_direct_expense_pair(p_household_id uuid, p_category_id uuid, p_amount numeric, p_description text, p_real_payer_id uuid, p_occurred_at date, p_created_by_email text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_pair_id UUID;
    v_expense_id UUID;
    v_income_id UUID;
BEGIN
    -- Generar UUID único para el par
    v_pair_id := gen_random_uuid();

    -- Crear la transacción de gasto directo
    INSERT INTO transactions (
        household_id, category_id, type, amount, currency, description,
        occurred_at, flow_type, transaction_pair_id, real_payer_id,
        created_by_email, performed_by_email, performed_at,
        profile_id, paid_by
    ) VALUES (
        p_household_id, p_category_id, 'expense', p_amount, 'EUR', p_description,
        p_occurred_at, 'direct', v_pair_id, p_real_payer_id,
        p_created_by_email, p_created_by_email, p_occurred_at,
        p_real_payer_id, p_real_payer_id
    ) RETURNING id INTO v_expense_id;

    -- Crear la transacción de ingreso automático correspondiente
    INSERT INTO transactions (
        household_id, type, amount, currency,
        description, occurred_at, flow_type, transaction_pair_id,
        created_by_email, performed_by_email, performed_at,
        profile_id
    ) VALUES (
        p_household_id, 'income', p_amount, 'EUR',
        'Ingreso automático por gasto directo: ' || p_description,
        p_occurred_at, 'direct', v_pair_id,
        'system@cuentassik.com', p_created_by_email, p_occurred_at,
        p_real_payer_id
    ) RETURNING id INTO v_income_id;

    RETURN v_pair_id;
END;
$$;


--
-- Name: FUNCTION create_direct_expense_pair(p_household_id uuid, p_category_id uuid, p_amount numeric, p_description text, p_real_payer_id uuid, p_occurred_at date, p_created_by_email text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_direct_expense_pair(p_household_id uuid, p_category_id uuid, p_amount numeric, p_description text, p_real_payer_id uuid, p_occurred_at date, p_created_by_email text) IS 'Crea automáticamente el par gasto directo + ingreso automático';


--
-- Name: create_household_with_owner(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_household_with_owner(p_name text, p_profile_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_household_id UUID;
BEGIN
    -- Iniciar transacción implícita
    INSERT INTO households (name, created_by_profile_id)
    VALUES (p_name, p_profile_id)
    RETURNING id INTO v_household_id;

    INSERT INTO household_members (household_id, profile_id, role, is_owner, joined_at, invited_by_profile_id)
    VALUES (v_household_id, p_profile_id, 'owner', TRUE, NOW(), p_profile_id);

    RETURN v_household_id;
END;
$$;


--
-- Name: ensure_household_owner(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_household_owner() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Solo ejecutar si es una inserción o si el role cambió a 'member'
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.role = 'member' AND OLD.role = 'owner') THEN
        -- Verificar si hay al menos un owner en el hogar
        IF NOT EXISTS (
            SELECT 1
            FROM household_members
            WHERE household_id = NEW.household_id
            AND role = 'owner'
            AND (TG_OP = 'INSERT' OR id != NEW.id)  -- Excluir el registro actual en UPDATE
        ) THEN
            -- Si no hay owners, promover al miembro más antiguo
            UPDATE household_members
            SET role = 'owner',
                updated_at = NOW()
            WHERE household_id = NEW.household_id
            AND id = (
                SELECT id
                FROM household_members
                WHERE household_id = NEW.household_id
                ORDER BY joined_at ASC
                LIMIT 1
            );
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;


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
-- Name: execute_auto_pairing(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.execute_auto_pairing(p_transaction_id uuid, p_candidate_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_pairing_id uuid;
BEGIN
    -- Generar UUID único para el emparejamiento
    v_pairing_id := gen_random_uuid();

    -- Actualizar ambas transacciones
    UPDATE dual_flow_transactions
    SET
        transaccion_pareja = p_candidate_id,
        auto_paired = true,
        estado = 'auto_paired',
        updated_at = NOW()
    WHERE id = p_transaction_id;

    UPDATE dual_flow_transactions
    SET
        transaccion_pareja = p_transaction_id,
        auto_paired = true,
        estado = 'auto_paired',
        updated_at = NOW()
    WHERE id = p_candidate_id;

    -- Verificar que ambas actualizaciones fueron exitosas
    IF FOUND THEN
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$;


--
-- Name: find_pairing_candidates(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_pairing_candidates(p_household_id uuid, p_transaction_id uuid, p_umbral numeric DEFAULT 5.00) RETURNS TABLE(candidate_id uuid, diferencia_importe numeric, diferencia_dias integer, score numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH transaction_data AS (
        SELECT tipo, importe, fecha, categoria
        FROM dual_flow_transactions
        WHERE id = p_transaction_id
    ),
    candidates AS (
        SELECT
            t.id as candidate_id,
            ABS(t.importe - td.importe) as diferencia_importe,
            ABS(EXTRACT(days FROM t.fecha - td.fecha))::integer as diferencia_dias,
            -- Score: menor diferencia de importe y tiempo = mejor score
            (ABS(t.importe - td.importe) * 0.7 +
             ABS(EXTRACT(days FROM t.fecha - td.fecha)) * 0.3) as score
        FROM dual_flow_transactions t, transaction_data td
        WHERE t.household_id = p_household_id
          AND t.id != p_transaction_id
          AND t.transaccion_pareja IS NULL
          AND t.auto_paired = false
          AND t.estado = 'approved'
          -- Lógica de emparejamiento: gasto_directo ↔ ingreso_directo
          AND ((td.tipo = 'gasto_directo' AND t.tipo = 'ingreso_directo') OR
               (td.tipo = 'ingreso_directo' AND t.tipo = 'gasto_directo'))
          -- Misma categoría (opcional, puede relajarse)
          AND t.categoria = td.categoria
          -- Dentro del umbral de importe
          AND ABS(t.importe - td.importe) <= p_umbral
          -- Dentro de 30 días de diferencia
          AND ABS(EXTRACT(days FROM t.fecha - td.fecha)) <= 30
    )
    SELECT
        c.candidate_id,
        c.diferencia_importe,
        c.diferencia_dias,
        c.score
    FROM candidates c
    ORDER BY c.score ASC
    LIMIT 5; -- Top 5 candidatos
END;
$$;


--
-- Name: generate_pair_reference(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_pair_reference(p_household_id uuid) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_household_code TEXT;
    v_sequence_num INTEGER;
BEGIN
    -- Obtener código corto del hogar (primeras 8 letras del nombre)
    SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'), 4))
    INTO v_household_code
    FROM households
    WHERE id = p_household_id;

    -- Obtener siguiente número de secuencia
    v_sequence_num := nextval('seq_transaction_pair_ref');

    -- Generar referencia: HOGAR-YYYY-SEQUENCE
    RETURN COALESCE(v_household_code, 'HOUS') || '-' ||
           EXTRACT(YEAR FROM CURRENT_DATE) || '-' ||
           LPAD(v_sequence_num::TEXT, 4, '0');
END;
$$;


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
-- Name: log_transaction_journal(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_transaction_journal() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO journal_transactions (transaction_id, action, new_data, performed_by)
        VALUES (NEW.id, 'insert', to_jsonb(NEW), NEW.updated_by_profile_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO journal_transactions (transaction_id, action, old_data, new_data, performed_by)
        VALUES (NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), NEW.updated_by_profile_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO journal_transactions (transaction_id, action, old_data, performed_by)
        VALUES (OLD.id, 'delete', to_jsonb(OLD), OLD.updated_by_profile_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: refresh_critical_matviews(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_critical_matviews() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_household_balances;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_pending_contributions;
    REFRESH MATERIALIZED VIEW CONCURRENTLY household_stats;
END;
$$;


--
-- Name: FUNCTION refresh_critical_matviews(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.refresh_critical_matviews() IS 'Refresca todas las vistas materializadas críticas';


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
-- Name: trigger_auto_pairing(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_auto_pairing() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_candidate_record RECORD;
BEGIN
    -- Solo ejecutar si la transacción fue aprobada y no está ya emparejada
    IF NEW.estado = 'approved' AND OLD.estado != 'approved'
       AND NEW.auto_paired = false AND NEW.transaccion_pareja IS NULL
       AND NEW.tipo IN ('gasto_directo', 'ingreso_directo') THEN

        -- Buscar el mejor candidato
        SELECT * INTO v_candidate_record
        FROM find_pairing_candidates(NEW.household_id, NEW.id, NEW.umbral_emparejamiento)
        ORDER BY score ASC
        LIMIT 1;

        -- Si encontramos un candidato, ejecutar emparejamiento
        IF FOUND THEN
            PERFORM execute_auto_pairing(NEW.id, v_candidate_record.candidate_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: trigger_refresh_transaction_matviews(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_refresh_transaction_matviews() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Refrescar de forma asíncrona (mejor performance)
    PERFORM refresh_critical_matviews();
    RETURN COALESCE(NEW, OLD);
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
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
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
-- Name: TABLE contribution_adjustment_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contribution_adjustment_templates IS 'DEPRECATED: Será reemplazado por sistema de doble flujo (flow_type en transactions)';


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
-- Name: TABLE contribution_adjustments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contribution_adjustments IS 'DEPRECATED: Será reemplazado por sistema de doble flujo (flow_type en transactions)';


--
-- Name: contribution_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contribution_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    status text DEFAULT 'SETUP'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    locked_at timestamp with time zone,
    locked_by uuid,
    closed_at timestamp with time zone,
    closed_by uuid,
    CONSTRAINT contribution_periods_month_check CHECK (((month >= 1) AND (month <= 12))),
    CONSTRAINT contribution_periods_status_check CHECK ((status = ANY (ARRAY['SETUP'::text, 'LOCKED'::text, 'CLOSED'::text])))
);


--
-- Name: TABLE contribution_periods; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contribution_periods IS 'Períodos de contribución con estados SETUP→LOCKED→CLOSED para controlar flujos de transacciones';


--
-- Name: COLUMN contribution_periods.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contribution_periods.status IS 'SETUP: solo gastos directos, LOCKED: ambos flujos, CLOSED: período cerrado';


--
-- Name: COLUMN contribution_periods.locked_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contribution_periods.locked_by IS 'Owner que bloqueó el período y calculó contribuciones';


--
-- Name: COLUMN contribution_periods.closed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contribution_periods.closed_by IS 'Owner que cerró el período';


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
-- Name: dual_flow_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dual_flow_config (
    household_id uuid NOT NULL,
    emparejamiento_automatico boolean DEFAULT true,
    umbral_emparejamiento_default numeric(5,2) DEFAULT 5.00,
    tiempo_revision_default integer DEFAULT 7,
    limite_gasto_personal numeric(8,2) DEFAULT 200.00,
    requiere_aprobacion_default boolean DEFAULT false,
    liquidacion_automatica boolean DEFAULT true,
    dias_liquidacion integer DEFAULT 30,
    notificaciones_activas boolean DEFAULT true,
    notificar_nuevos_gastos boolean DEFAULT true,
    notificar_emparejamientos boolean DEFAULT true,
    notificar_limites boolean DEFAULT true,
    notificar_liquidaciones boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE dual_flow_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dual_flow_config IS 'Configuración personalizable del sistema dual-flow por hogar';


--
-- Name: dual_flow_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dual_flow_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    concepto text NOT NULL,
    categoria text NOT NULL,
    importe numeric(10,2) NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    tipo public.transaction_type_dual_flow NOT NULL,
    estado public.dual_flow_status DEFAULT 'pending_review'::public.dual_flow_status NOT NULL,
    tipo_flujo public.dual_flow_type NOT NULL,
    creado_por uuid NOT NULL,
    pagado_por uuid,
    transaccion_pareja uuid,
    auto_paired boolean DEFAULT false,
    requiere_aprobacion boolean DEFAULT true,
    umbral_emparejamiento numeric(5,2) DEFAULT 5.00,
    dias_revision integer DEFAULT 7,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    approved_by uuid,
    CONSTRAINT dual_flow_transactions_importe_check CHECK ((importe > (0)::numeric)),
    CONSTRAINT valid_auto_pairing CHECK ((((auto_paired = true) AND (transaccion_pareja IS NOT NULL)) OR (auto_paired = false))),
    CONSTRAINT valid_pairing CHECK ((((tipo = 'gasto_directo'::public.transaction_type_dual_flow) AND (tipo_flujo = 'personal_to_common'::public.dual_flow_type)) OR ((tipo = 'ingreso_directo'::public.transaction_type_dual_flow) AND (tipo_flujo = 'common_to_personal'::public.dual_flow_type)) OR ((tipo = 'gasto'::public.transaction_type_dual_flow) AND (tipo_flujo = 'common_fund'::public.dual_flow_type)) OR ((tipo = 'ingreso'::public.transaction_type_dual_flow) AND (tipo_flujo = 'common_fund'::public.dual_flow_type))))
);


--
-- Name: TABLE dual_flow_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dual_flow_transactions IS 'Tabla principal del sistema dual-flow con 4 tipos de transacciones y auto-pairing';


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
-- Name: journal_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    adjustment_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT now(),
    reason text
);


--
-- Name: TABLE journal_adjustments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.journal_adjustments IS 'DEPRECATED: Será reemplazado por sistema de doble flujo (flow_type en transactions)';


--
-- Name: journal_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invitation_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT now(),
    reason text
);


--
-- Name: journal_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid,
    profile_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT now(),
    reason text
);


--
-- Name: journal_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT now(),
    reason text
);


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
    updated_by_profile_id uuid,
    flow_type text DEFAULT 'common'::text NOT NULL,
    transaction_pair_id uuid,
    created_by_member_id uuid,
    real_payer_id uuid,
    created_by_email text,
    performed_by_email text,
    performed_at timestamp with time zone,
    CONSTRAINT check_direct_expenses_have_payer CHECK ((((flow_type = 'direct'::text) AND (type = 'expense'::text) AND (real_payer_id IS NOT NULL)) OR ((flow_type <> 'direct'::text) OR (type <> 'expense'::text)))),
    CONSTRAINT check_direct_income_paired CHECK ((((flow_type = 'direct'::text) AND (type = 'income'::text) AND (transaction_pair_id IS NOT NULL)) OR ((flow_type <> 'direct'::text) OR (type <> 'income'::text)))),
    CONSTRAINT check_flow_type CHECK ((flow_type = ANY (ARRAY['common'::text, 'direct'::text]))),
    CONSTRAINT check_transaction_pair_consistency CHECK ((((flow_type = 'direct'::text) AND (transaction_pair_id IS NOT NULL)) OR ((flow_type = 'common'::text) AND (transaction_pair_id IS NULL)))),
    CONSTRAINT transactions_flow_type_check CHECK ((flow_type = ANY (ARRAY['common'::text, 'direct'::text]))),
    CONSTRAINT transactions_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text, 'income_direct'::text, 'expense_direct'::text])))
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
-- Name: COLUMN transactions.flow_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transactions.flow_type IS 'Tipo de flujo: common (cuenta común) o direct (gastos directos de miembros)';


--
-- Name: COLUMN transactions.transaction_pair_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transactions.transaction_pair_id IS 'UUID que vincula gastos directos con sus ingresos automáticos correspondientes';


--
-- Name: COLUMN transactions.created_by_member_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transactions.created_by_member_id IS 'Miembro que creó la transacción (puede diferir de quien pagó)';


--
-- Name: COLUMN transactions.real_payer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transactions.real_payer_id IS 'ID del miembro que realmente pagó en gastos directos (de su bolsillo)';


--
-- Name: COLUMN transactions.created_by_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transactions.created_by_email IS 'Email del usuario que creó el registro en el sistema';


--
-- Name: COLUMN transactions.performed_by_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transactions.performed_by_email IS 'Email del usuario que realmente realizó la transacción';


--
-- Name: COLUMN transactions.performed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transactions.performed_at IS 'Fecha/hora real cuando se realizó la transacción (diferente de created_at que es cuando se registró en el sistema)';


--
-- Name: mv_household_balances; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_household_balances AS
 SELECT h.id AS household_id,
    h.name AS household_name,
    COALESCE(sum(
        CASE
            WHEN (t.type = 'income'::text) THEN t.amount
            WHEN (t.type = 'expense'::text) THEN (- t.amount)
            ELSE (0)::numeric
        END), (0)::numeric) AS total_balance,
    COALESCE(sum(
        CASE
            WHEN (t.type = 'income'::text) THEN t.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS total_income,
    COALESCE(sum(
        CASE
            WHEN (t.type = 'expense'::text) THEN t.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS total_expenses,
    COALESCE(sum(
        CASE
            WHEN ((t.flow_type = 'common'::text) AND (t.type = 'income'::text)) THEN t.amount
            WHEN ((t.flow_type = 'common'::text) AND (t.type = 'expense'::text)) THEN (- t.amount)
            ELSE (0)::numeric
        END), (0)::numeric) AS common_flow_balance,
    COALESCE(sum(
        CASE
            WHEN ((t.flow_type = 'direct'::text) AND (t.type = 'expense'::text)) THEN t.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS direct_expenses_total,
    count(t.id) AS transaction_count,
    now() AS last_updated
   FROM (public.households h
     LEFT JOIN public.transactions t ON ((h.id = t.household_id)))
  WHERE (h.deleted_at IS NULL)
  GROUP BY h.id, h.name
  WITH NO DATA;


--
-- Name: MATERIALIZED VIEW mv_household_balances; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON MATERIALIZED VIEW public.mv_household_balances IS 'Balance agregado por hogar - REFRESH cada cambio en transacciones';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
-- Name: COLUMN profiles.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.id IS 'UUID único del perfil, generado automáticamente';


--
-- Name: COLUMN profiles.is_system_admin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.is_system_admin IS 'Indica si el usuario es administrador de la aplicación (acceso a /admin). Campo global, no depende de hogares.';


--
-- Name: mv_member_pending_contributions; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_member_pending_contributions AS
 SELECT hm.household_id,
    hm.profile_id,
    p.email,
    COALESCE(c.expected_amount, (0)::numeric) AS expected_contribution,
    COALESCE(c.paid_amount, (0)::numeric) AS paid_contribution,
    (COALESCE(c.expected_amount, (0)::numeric) - COALESCE(c.paid_amount, (0)::numeric)) AS pending_amount,
    COALESCE(sum(
        CASE
            WHEN ((t.flow_type = 'direct'::text) AND (t.type = 'expense'::text) AND (t.real_payer_id = hm.profile_id) AND (EXTRACT(year FROM t.occurred_at) = EXTRACT(year FROM CURRENT_DATE)) AND (EXTRACT(month FROM t.occurred_at) = EXTRACT(month FROM CURRENT_DATE))) THEN t.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS direct_expenses_current_month,
    GREATEST(((COALESCE(c.expected_amount, (0)::numeric) - COALESCE(c.paid_amount, (0)::numeric)) - COALESCE(sum(
        CASE
            WHEN ((t.flow_type = 'direct'::text) AND (t.type = 'expense'::text) AND (t.real_payer_id = hm.profile_id) AND (EXTRACT(year FROM t.occurred_at) = EXTRACT(year FROM CURRENT_DATE)) AND (EXTRACT(month FROM t.occurred_at) = EXTRACT(month FROM CURRENT_DATE))) THEN t.amount
            ELSE (0)::numeric
        END), (0)::numeric)), (0)::numeric) AS net_pending_amount,
    now() AS last_updated
   FROM (((public.household_members hm
     JOIN public.profiles p ON ((hm.profile_id = p.id)))
     LEFT JOIN public.contributions c ON (((hm.household_id = c.household_id) AND (hm.profile_id = c.profile_id) AND ((c.year)::numeric = EXTRACT(year FROM CURRENT_DATE)) AND ((c.month)::numeric = EXTRACT(month FROM CURRENT_DATE)))))
     LEFT JOIN public.transactions t ON ((hm.household_id = t.household_id)))
  WHERE ((hm.role = 'member'::text) OR (hm.role = 'owner'::text))
  GROUP BY hm.household_id, hm.profile_id, p.email, c.expected_amount, c.paid_amount
  WITH NO DATA;


--
-- Name: MATERIALIZED VIEW mv_member_pending_contributions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON MATERIALIZED VIEW public.mv_member_pending_contributions IS 'Contribuciones pendientes por miembro considerando gastos directos';


--
-- Name: seq_transaction_pair_ref; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seq_transaction_pair_ref
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


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
-- Name: v_dual_flow_balance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_dual_flow_balance AS
 SELECT dual_flow_transactions.household_id,
    sum(
        CASE
            WHEN ((dual_flow_transactions.tipo_flujo = 'common_fund'::public.dual_flow_type) AND (dual_flow_transactions.tipo = 'ingreso'::public.transaction_type_dual_flow)) THEN dual_flow_transactions.importe
            WHEN ((dual_flow_transactions.tipo_flujo = 'common_fund'::public.dual_flow_type) AND (dual_flow_transactions.tipo = 'gasto'::public.transaction_type_dual_flow)) THEN (- dual_flow_transactions.importe)
            ELSE (0)::numeric
        END) AS fondo_comun,
    sum(
        CASE
            WHEN ((dual_flow_transactions.tipo_flujo = 'personal_to_common'::public.dual_flow_type) AND (dual_flow_transactions.estado <> 'auto_paired'::public.dual_flow_status)) THEN dual_flow_transactions.importe
            ELSE (0)::numeric
        END) AS gastos_personales_pendientes,
    sum(
        CASE
            WHEN ((dual_flow_transactions.tipo_flujo = 'common_to_personal'::public.dual_flow_type) AND (dual_flow_transactions.estado <> 'auto_paired'::public.dual_flow_status)) THEN dual_flow_transactions.importe
            ELSE (0)::numeric
        END) AS reembolsos_pendientes,
    sum(
        CASE
            WHEN (dual_flow_transactions.tipo_flujo = 'personal_to_common'::public.dual_flow_type) THEN dual_flow_transactions.importe
            ELSE (0)::numeric
        END) AS total_personal_to_common,
    sum(
        CASE
            WHEN (dual_flow_transactions.tipo_flujo = 'common_to_personal'::public.dual_flow_type) THEN dual_flow_transactions.importe
            ELSE (0)::numeric
        END) AS total_common_to_personal,
    count(*) AS total_transacciones,
    count(*) FILTER (WHERE (dual_flow_transactions.estado = 'pending_review'::public.dual_flow_status)) AS pendientes_revision,
    count(*) FILTER (WHERE (dual_flow_transactions.auto_paired = true)) AS auto_emparejadas
   FROM public.dual_flow_transactions
  WHERE (dual_flow_transactions.fecha >= (CURRENT_DATE - '90 days'::interval))
  GROUP BY dual_flow_transactions.household_id;


--
-- Name: v_dual_flow_metrics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_dual_flow_metrics AS
 SELECT 'system_wide'::text AS scope,
    count(*) AS total_transacciones,
    count(DISTINCT dual_flow_transactions.household_id) AS hogares_activos,
    count(*) FILTER (WHERE (dual_flow_transactions.tipo = 'gasto_directo'::public.transaction_type_dual_flow)) AS gastos_directos,
    count(*) FILTER (WHERE (dual_flow_transactions.tipo = 'gasto'::public.transaction_type_dual_flow)) AS gastos_comunes,
    count(*) FILTER (WHERE (dual_flow_transactions.tipo = 'ingreso_directo'::public.transaction_type_dual_flow)) AS ingresos_directos,
    count(*) FILTER (WHERE (dual_flow_transactions.tipo = 'ingreso'::public.transaction_type_dual_flow)) AS ingresos_comunes,
    count(*) FILTER (WHERE (dual_flow_transactions.estado = 'pending_review'::public.dual_flow_status)) AS pendientes_revision,
    count(*) FILTER (WHERE (dual_flow_transactions.estado = 'auto_paired'::public.dual_flow_status)) AS auto_emparejadas,
    count(*) FILTER (WHERE (dual_flow_transactions.estado = 'approved'::public.dual_flow_status)) AS aprobadas,
    count(*) FILTER (WHERE (dual_flow_transactions.estado = 'completed'::public.dual_flow_status)) AS completadas,
    round((((count(*) FILTER (WHERE (dual_flow_transactions.auto_paired = true)))::numeric / (NULLIF(count(*), 0))::numeric) * (100)::numeric), 2) AS porcentaje_auto_pairing,
    round(avg(dual_flow_transactions.importe), 2) AS importe_promedio,
    round(avg(EXTRACT(days FROM (dual_flow_transactions.updated_at - dual_flow_transactions.created_at))), 1) AS dias_promedio_procesamiento
   FROM public.dual_flow_transactions
  WHERE (dual_flow_transactions.fecha >= (CURRENT_DATE - '30 days'::interval));


--
-- Name: v_dual_flow_workflow; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_dual_flow_workflow AS
 SELECT t.id,
    t.household_id,
    t.concepto,
    t.categoria,
    t.importe,
    t.fecha,
    t.tipo,
    t.estado,
    t.tipo_flujo,
    t.creado_por,
    t.pagado_por,
    t.transaccion_pareja,
    t.auto_paired,
    t.requiere_aprobacion,
    t.umbral_emparejamiento,
    t.dias_revision,
    t.created_at,
    t.updated_at,
    t.approved_at,
    t.approved_by,
    p.concepto AS pareja_concepto,
    p.importe AS pareja_importe,
    p.tipo AS pareja_tipo,
    creador.display_name AS creado_por_nombre,
    pagador.display_name AS pagado_por_nombre,
    (EXTRACT(days FROM (now() - t.created_at)))::integer AS dias_desde_creacion,
    (t.dias_revision - (EXTRACT(days FROM (now() - t.created_at)))::integer) AS dias_restantes_revision
   FROM (((public.dual_flow_transactions t
     LEFT JOIN public.dual_flow_transactions p ON ((t.transaccion_pareja = p.id)))
     LEFT JOIN public.profiles creador ON ((t.creado_por = creador.id)))
     LEFT JOIN public.profiles pagador ON ((t.pagado_por = pagador.id)))
  ORDER BY t.created_at DESC;


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
-- Name: v_transaction_pairs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_transaction_pairs AS
 SELECT t1.id AS expense_id,
    t1.amount AS expense_amount,
    t1.description AS expense_description,
    t1.category_id AS expense_category_id,
    t1.real_payer_id,
    t1.occurred_at,
    t2.id AS income_id,
    t2.amount AS income_amount,
    t2.description AS income_description,
    t1.household_id,
    t1.transaction_pair_id
   FROM (public.transactions t1
     LEFT JOIN public.transactions t2 ON (((t1.transaction_pair_id = t2.transaction_pair_id) AND (t1.id <> t2.id))))
  WHERE ((t1.flow_type = 'direct'::text) AND (t1.type = 'expense'::text));


--
-- Name: VIEW v_transaction_pairs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_transaction_pairs IS 'Vista que muestra pares de transacciones del flujo directo (gasto + ingreso automático)';


--
-- Name: _migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations ALTER COLUMN id SET DEFAULT nextval('public._migrations_id_seq'::regclass);


--
-- Data for Name: _migrations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public._migrations (id, migration_name, applied_at, applied_by, checksum, execution_time_ms, description)
VALUES (1, '20251014_150000_seed.sql', '2025-10-14 15:00:00+02', 'cuentassik_user', NULL, 0, 'Baseline dual-flow consolidada');


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('a98773a7-a0ae-49a0-84de-519ec4548c79', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Vivienda', '🏠', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('3a0210a2-f0d8-4560-a8b4-e92e1dcd2666', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Supermercado', '🛒', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('b02bc7b5-1af0-4238-9e91-e623fd1c55ab', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Transporte', '🚗', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('64bbeb0a-3e6d-427a-99ce-baa6786ab822', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Restaurantes', '🍽️', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('b0f81e1a-9386-4135-a26f-147d8175db6f', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Ocio', '🎭', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('c3542f5e-03cc-4c24-adb0-efbb908602ce', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Salud', '🏥', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('0ee85348-7091-4d6a-a402-09e9b5cc57f1', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Educación', '📚', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('00cf0984-4823-468d-a2b6-0930aa14815d', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Menaje', '🪑', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('2d737820-03c7-4141-b041-1a50516de2ca', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Ropa', '👕', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('fb36c9de-a9c2-4053-a47a-6eee2d7af077', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Mascotas', '🐶', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('cb1b29ea-eebd-4aea-9d3c-377875d48523', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Regalos', '🎁', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('f897df5e-a0e0-4ff4-a320-81187d3e652b', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Suscripciones', '📱', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('c3ead387-edf3-4c10-8929-9d1a4be921ed', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Deportes', '⚽', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('c2289f47-9ad0-4442-afc3-c4e5dfccefaf', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Belleza', '💄', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('cbb14998-3893-4525-a3d5-ed02ecddc801', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Varios', '➕', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('e7681cac-49c1-4585-abf8-7ab396c21c16', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Nómina', '💰', 'income', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('0af1843e-3ee0-4975-89ed-891402d87e00', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Freelance', '💼', 'income', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('f47f9c8f-d5d9-4333-8b81-d1e33926bfd2', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Inversiones', '📈', 'income', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('b3bbf07d-fd99-4c8f-a9f0-74f3ba7b8f5e', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Ventas', '🏷️', 'income', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('c17bce85-5c09-48d9-89af-7097a7c6cf34', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Devoluciones', '↩️', 'income', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('9fa72930-5aa5-450a-b4ec-e9723be29695', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Aportación Cuenta Conjunta', '🏦', 'income', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('ab63f069-9f91-4976-9f52-14c42fb31a99', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Bonus', '🎉', 'income', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('943e3dd9-f192-4b4c-bf47-f66c0df91029', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Varios', '➕', 'income', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('1bebfdbf-f6ce-453f-a609-9af2d3528cbf', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Internet', '📡', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('88f540c2-1fba-46b3-a181-8d26db624579', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Luz', '💡', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('8a6943f9-56e0-4852-99af-17cd878289f7', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Agua', '💧', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('5d4afcf2-c9a6-4569-826f-6b72940fdb32', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Gas/Butano', '🔥', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('9d04ebf1-6a6b-44bd-b3ac-d645d77d181c', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Teléfono', '📞', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('f98afe61-10c7-47b6-afe3-e6120da19674', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Comunidad', '🏢', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('99cd65be-5596-449b-95b9-88723e80a268', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Seguros', '🛡️', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('a4bc1b9f-290c-4320-8d2a-49e9dab30248', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Impuestos', '📋', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('4d6a1cd3-642e-4cef-9454-63d41bd387f9', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Limpieza', '🧹', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');
INSERT INTO public.categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at) VALUES ('59a1bd78-5148-44cb-849b-2d544470d923', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Mantenimiento', '🔧', 'expense', NULL, '2025-10-10 01:13:52.77866+02', NULL, '2025-10-10 01:13:52.77866+02');


--
-- Data for Name: contribution_adjustment_templates; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: contribution_adjustments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: contribution_periods; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: contributions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: dual_flow_config; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: dual_flow_transactions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: household_members; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.household_members (household_id, profile_id, role, is_owner, invited_by_profile_id, joined_at) VALUES ('d0c3fe46-f19e-4d60-bc13-fd8b2f7be228', '5a27b943-84fb-453d-83fb-bf850883e767', 'owner', true, NULL, '2025-10-10 01:13:52.566112+02');


--
-- Data for Name: household_savings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: household_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.household_settings (household_id, monthly_contribution_goal, currency, calculation_type, updated_at, updated_by) VALUES ('d0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 1200, 'EUR', 'equal', '2025-10-14 03:20:29.969+02', NULL);


--
-- Data for Name: households; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.households (id, name, created_at, status, settings, created_by_profile_id, updated_by_profile_id, updated_at, deleted_at) VALUES ('d0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 'Casa Test', '2025-10-06 18:50:58.715981+02', 'active', '{"currency": "EUR"}', '5a27b943-84fb-453d-83fb-bf850883e767', NULL, '2025-10-10 01:13:52.83481+02', NULL);


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: journal_adjustments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: journal_invitations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: journal_roles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: journal_transactions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: member_credits; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: member_incomes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: monthly_periods; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('d75003e1-e8f1-49fd-858a-f099f951fdae', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2024, 10, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:01:34.303987+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('a28ada68-db18-47d9-bef3-1af34d215b68', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2025, 10, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:11:06.940551+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('132d4d1c-e23e-4aa9-90b7-ba4fdc0fbd6a', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2025, 10, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:11:06.940295+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('3eb0cd80-960a-4431-8c15-903e0ebc6d5f', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2025, 9, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:11:21.334022+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('b8fe8024-4fbc-4c25-9b06-f41d37581386', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2025, 8, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:18:05.182897+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('99c03ef0-eeb2-4586-ad79-4a1368076f5c', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2025, 7, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:18:06.483444+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('8fb32e44-0a9c-4e0d-87e7-543d2c676904', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2025, 6, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:18:07.731193+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('e420a4cd-5d94-424d-95ce-a751f68c07ed', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2025, 5, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:18:08.673989+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('6a1fc2c6-8f8c-4097-835b-6424f1606409', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2025, 4, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:18:09.480505+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('da4e1abe-c1b3-4b87-b2da-a7464f5dc3e2', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2025, 3, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:18:10.294675+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('829629fd-21ad-4dc4-a375-ec4b82e5417d', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2025, 2, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:18:11.124444+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('a2b4df37-4d2c-4f54-8824-f0845cbe16ae', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2025, 1, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:18:11.907725+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('95cda434-9e9e-49df-b96c-c0954c052dc1', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2024, 12, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:18:12.579457+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('77fd4796-4364-444a-b1db-b9b9052b99ee', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2024, 11, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:18:13.308662+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('59073cfa-1997-4783-87c8-12340ee18c83', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2024, 9, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:18:14.846532+02');
INSERT INTO public.monthly_periods (id, household_id, year, month, status, opening_balance, total_income, total_expenses, closing_balance, closed_at, closed_by, notes, created_at) VALUES ('04cbe6af-0df6-49fc-8d18-871e7d1efd6f', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', 2024, 8, 'active', 0, NULL, NULL, 0, NULL, NULL, NULL, '2025-10-14 02:18:15.625971+02');


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

-- NOTE: Replace with your actual admin user data
-- INSERT INTO public.profiles (id, auth_user_id, display_name, email, avatar_url, bio, created_at, updated_at, is_system_admin) 
-- VALUES ('your-uuid', 'your-auth-uuid', 'Your Name', 'your-email@example.com', NULL, NULL, NOW(), NOW(), true);


--
-- Data for Name: system_admins; Type: TABLE DATA; Schema: public; Owner: -
--

-- NOTE: Replace with your actual admin user ID
-- INSERT INTO public.system_admins (user_id, granted_by, created_at, notes, profile_id) 
-- VALUES ('your-auth-uuid', NULL, NOW(), 'System administrator', 'your-uuid');


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_active_household; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_settings (profile_id, active_household_id, preferences, created_at, updated_at) VALUES ('5a27b943-84fb-453d-83fb-bf850883e767', 'd0c3fe46-f19e-4d60-bc13-fd8b2f7be228', NULL, '2025-10-14 00:04:43.569607+02', '2025-10-14 01:59:45.269361+02');


--
-- Name: _migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public._migrations_id_seq', 1, true);


--
-- Name: seq_transaction_pair_ref; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.seq_transaction_pair_ref', 1000, false);


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
-- Name: contribution_periods contribution_periods_household_id_year_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_periods
    ADD CONSTRAINT contribution_periods_household_id_year_month_key UNIQUE (household_id, year, month);


--
-- Name: contribution_periods contribution_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_periods
    ADD CONSTRAINT contribution_periods_pkey PRIMARY KEY (id);


--
-- Name: contributions contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_pkey PRIMARY KEY (id);


--
-- Name: dual_flow_config dual_flow_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dual_flow_config
    ADD CONSTRAINT dual_flow_config_pkey PRIMARY KEY (household_id);


--
-- Name: dual_flow_transactions dual_flow_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dual_flow_transactions
    ADD CONSTRAINT dual_flow_transactions_pkey PRIMARY KEY (id);


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
-- Name: journal_adjustments journal_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_adjustments
    ADD CONSTRAINT journal_adjustments_pkey PRIMARY KEY (id);


--
-- Name: journal_invitations journal_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_invitations
    ADD CONSTRAINT journal_invitations_pkey PRIMARY KEY (id);


--
-- Name: journal_roles journal_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_roles
    ADD CONSTRAINT journal_roles_pkey PRIMARY KEY (id);


--
-- Name: journal_transactions journal_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_transactions
    ADD CONSTRAINT journal_transactions_pkey PRIMARY KEY (id);


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
-- Name: household_savings unique_household_savings_household_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.household_savings
    ADD CONSTRAINT unique_household_savings_household_id UNIQUE (household_id);


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
-- Name: idx_contribution_periods_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contribution_periods_date ON public.contribution_periods USING btree (year, month);


--
-- Name: idx_contribution_periods_household; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contribution_periods_household ON public.contribution_periods USING btree (household_id);


--
-- Name: idx_contribution_periods_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contribution_periods_status ON public.contribution_periods USING btree (status);


--
-- Name: idx_contributions_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributions_created_by ON public.contributions USING btree (created_by_profile_id) WHERE (created_by_profile_id IS NOT NULL);


--
-- Name: idx_contributions_household_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributions_household_creator ON public.contributions USING btree (household_id, created_by_profile_id);


--
-- Name: idx_contributions_household_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributions_household_profile ON public.contributions USING btree (household_id, profile_id);


--
-- Name: idx_contributions_period_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributions_period_status ON public.contributions USING btree (household_id, year, month, status) WHERE (status IS NOT NULL);


--
-- Name: idx_contributions_updated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contributions_updated_by ON public.contributions USING btree (updated_by_profile_id) WHERE (updated_by_profile_id IS NOT NULL);


--
-- Name: idx_dual_flow_auto_pairing_candidates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dual_flow_auto_pairing_candidates ON public.dual_flow_transactions USING btree (household_id, tipo, importe, fecha) WHERE ((auto_paired = false) AND (estado = 'approved'::public.dual_flow_status));


--
-- Name: idx_dual_flow_estado_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dual_flow_estado_tipo ON public.dual_flow_transactions USING btree (estado, tipo);


--
-- Name: idx_dual_flow_household_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dual_flow_household_fecha ON public.dual_flow_transactions USING btree (household_id, fecha DESC);


--
-- Name: idx_dual_flow_pairing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dual_flow_pairing ON public.dual_flow_transactions USING btree (transaccion_pareja, auto_paired) WHERE (transaccion_pareja IS NOT NULL);


--
-- Name: idx_dual_flow_pending_approval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dual_flow_pending_approval ON public.dual_flow_transactions USING btree (household_id, estado, created_at) WHERE (estado = 'pending_review'::public.dual_flow_status);


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
-- Name: idx_household_savings_household; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_household_savings_household ON public.household_savings USING btree (household_id);


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
-- Name: idx_mv_household_balances_household_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_mv_household_balances_household_id ON public.mv_household_balances USING btree (household_id);


--
-- Name: idx_mv_member_pending_contributions_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_mv_member_pending_contributions_unique ON public.mv_member_pending_contributions USING btree (household_id, profile_id);


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
-- Name: idx_transactions_date_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_date_range ON public.transactions USING btree (household_id, occurred_at DESC, amount) WHERE (occurred_at IS NOT NULL);


--
-- Name: idx_transactions_direct_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_direct_pending ON public.transactions USING btree (household_id, real_payer_id, occurred_at) WHERE ((flow_type = 'direct'::text) AND (type = 'expense'::text));


--
-- Name: idx_transactions_flow_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_flow_type ON public.transactions USING btree (flow_type);


--
-- Name: idx_transactions_household_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_household_creator ON public.transactions USING btree (household_id, created_by_profile_id);


--
-- Name: idx_transactions_household_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_household_date ON public.transactions USING btree (household_id, occurred_at) WHERE (occurred_at IS NOT NULL);


--
-- Name: idx_transactions_household_flow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_household_flow ON public.transactions USING btree (household_id, flow_type);


--
-- Name: idx_transactions_household_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_household_profile ON public.transactions USING btree (household_id, profile_id) WHERE (profile_id IS NOT NULL);


--
-- Name: idx_transactions_pair_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_pair_id ON public.transactions USING btree (transaction_pair_id);


--
-- Name: idx_transactions_real_payer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_real_payer ON public.transactions USING btree (real_payer_id);


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
-- Name: transactions trg_journal_transactions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_journal_transactions AFTER INSERT OR DELETE OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.log_transaction_journal();


--
-- Name: contributions trigger_contribution_changes_refresh_matviews; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_contribution_changes_refresh_matviews AFTER INSERT OR DELETE OR UPDATE ON public.contributions FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_transaction_matviews();


--
-- Name: households trigger_create_dual_flow_config; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_dual_flow_config AFTER INSERT ON public.households FOR EACH ROW EXECUTE FUNCTION public.create_default_dual_flow_config();


--
-- Name: dual_flow_transactions trigger_dual_flow_auto_pairing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_dual_flow_auto_pairing AFTER UPDATE ON public.dual_flow_transactions FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_pairing();


--
-- Name: dual_flow_transactions trigger_dual_flow_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_dual_flow_updated_at BEFORE UPDATE ON public.dual_flow_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: household_members trigger_ensure_last_member_owner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_ensure_last_member_owner AFTER DELETE ON public.household_members FOR EACH ROW EXECUTE FUNCTION public.ensure_last_member_is_owner();


--
-- Name: TRIGGER trigger_ensure_last_member_owner ON household_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER trigger_ensure_last_member_owner ON public.household_members IS 'Trigger que garantiza que siempre haya al menos un owner por hogar. Se ejecuta después de eliminar un miembro.';


--
-- Name: household_members trigger_ensure_owner; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_ensure_owner AFTER INSERT OR UPDATE OF role ON public.household_members FOR EACH ROW EXECUTE FUNCTION public.ensure_household_owner();


--
-- Name: households trigger_refresh_household_stats_on_household_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_refresh_household_stats_on_household_change AFTER INSERT OR DELETE OR UPDATE ON public.households FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_household_stats();


--
-- Name: household_members trigger_refresh_household_stats_on_member_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_refresh_household_stats_on_member_change AFTER INSERT OR DELETE OR UPDATE ON public.household_members FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_household_stats();


--
-- Name: transactions trigger_transaction_changes_refresh_matviews; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_transaction_changes_refresh_matviews AFTER INSERT OR DELETE OR UPDATE ON public.transactions FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_transaction_matviews();


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
-- Name: contribution_periods contribution_periods_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_periods
    ADD CONSTRAINT contribution_periods_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.profiles(id);


--
-- Name: contribution_periods contribution_periods_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_periods
    ADD CONSTRAINT contribution_periods_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: contribution_periods contribution_periods_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribution_periods
    ADD CONSTRAINT contribution_periods_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.profiles(id);


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
-- Name: dual_flow_config dual_flow_config_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dual_flow_config
    ADD CONSTRAINT dual_flow_config_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: dual_flow_transactions dual_flow_transactions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dual_flow_transactions
    ADD CONSTRAINT dual_flow_transactions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: dual_flow_transactions dual_flow_transactions_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dual_flow_transactions
    ADD CONSTRAINT dual_flow_transactions_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.profiles(id);


--
-- Name: dual_flow_transactions dual_flow_transactions_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dual_flow_transactions
    ADD CONSTRAINT dual_flow_transactions_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: dual_flow_transactions dual_flow_transactions_pagado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dual_flow_transactions
    ADD CONSTRAINT dual_flow_transactions_pagado_por_fkey FOREIGN KEY (pagado_por) REFERENCES public.profiles(id);


--
-- Name: dual_flow_transactions dual_flow_transactions_transaccion_pareja_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dual_flow_transactions
    ADD CONSTRAINT dual_flow_transactions_transaccion_pareja_fkey FOREIGN KEY (transaccion_pareja) REFERENCES public.dual_flow_transactions(id);


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
-- Name: transactions transactions_created_by_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_created_by_member_id_fkey FOREIGN KEY (created_by_member_id) REFERENCES public.profiles(id);


--
-- Name: transactions transactions_created_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: transactions transactions_real_payer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_real_payer_id_fkey FOREIGN KEY (real_payer_id) REFERENCES public.profiles(id);


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
-- Name: household_stats; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: -
--

REFRESH MATERIALIZED VIEW public.household_stats;


--
-- Name: mv_household_balances; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: -
--

REFRESH MATERIALIZED VIEW public.mv_household_balances;


--
-- Name: mv_member_pending_contributions; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: -
--

REFRESH MATERIALIZED VIEW public.mv_member_pending_contributions;

GRANT USAGE ON SCHEMA public TO cuentassik_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cuentassik_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cuentassik_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO cuentassik_user;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO cuentassik_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cuentassik_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO cuentassik_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO cuentassik_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO cuentassik_user;

RESET ROLE;


--
-- PostgreSQL database dump complete
--

\unrestrict R0NVEwE8YLg0GOvyXeKYwP6pHKx9vN0BSeJvY9MdJ2R3yKeUZaAKZSnxeHK2Au9
