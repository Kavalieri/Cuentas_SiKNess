--
-- PostgreSQL database dump
--

\restrict q7fMzLCELvUjtFGhj6gbNFvJgOflseAlpKfwe4tfVEq46YEgD2g7SQejp4amb8x

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: cuentassik_owner
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO cuentassik_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: cuentassik_owner
--

COMMENT ON SCHEMA public IS '';


--
-- Name: dual_flow_status; Type: TYPE; Schema: public; Owner: cuentassik_owner
--

CREATE TYPE public.dual_flow_status AS ENUM (
    'pending_review',
    'approved',
    'auto_paired',
    'rejected',
    'completed'
);


ALTER TYPE public.dual_flow_status OWNER TO cuentassik_owner;

--
-- Name: TYPE dual_flow_status; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TYPE public.dual_flow_status IS 'Estados del workflow: pending_review, approved, auto_paired, rejected, completed';


--
-- Name: dual_flow_type; Type: TYPE; Schema: public; Owner: cuentassik_owner
--

CREATE TYPE public.dual_flow_type AS ENUM (
    'personal_to_common',
    'common_to_personal',
    'common_fund'
);


ALTER TYPE public.dual_flow_type OWNER TO cuentassik_owner;

--
-- Name: TYPE dual_flow_type; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TYPE public.dual_flow_type IS 'Tipos de flujo: personal_to_common, common_to_personal, common_fund';


--
-- Name: flow_type_enum; Type: TYPE; Schema: public; Owner: cuentassik_owner
--

CREATE TYPE public.flow_type_enum AS ENUM (
    'common',
    'direct'
);


ALTER TYPE public.flow_type_enum OWNER TO cuentassik_owner;

--
-- Name: TYPE flow_type_enum; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TYPE public.flow_type_enum IS 'Tipo de flujo: common (cuenta común) o direct (gastos directos de miembros)';


--
-- Name: household_role_enum; Type: TYPE; Schema: public; Owner: cuentassik_owner
--

CREATE TYPE public.household_role_enum AS ENUM (
    'owner',
    'member'
);


ALTER TYPE public.household_role_enum OWNER TO cuentassik_owner;

--
-- Name: invitation_status_enum; Type: TYPE; Schema: public; Owner: cuentassik_owner
--

CREATE TYPE public.invitation_status_enum AS ENUM (
    'pending',
    'accepted',
    'expired',
    'cancelled'
);


ALTER TYPE public.invitation_status_enum OWNER TO cuentassik_owner;

--
-- Name: period_phase_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.period_phase_enum AS ENUM (
    'preparing',
    'validation',
    'active',
    'closing',
    'closed'
);


ALTER TYPE public.period_phase_enum OWNER TO postgres;

--
-- Name: TYPE period_phase_enum; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TYPE public.period_phase_enum IS 'Fases del workflow mensual: preparing, validation, active, closing y closed';


--
-- Name: period_status_enum; Type: TYPE; Schema: public; Owner: cuentassik_owner
--

CREATE TYPE public.period_status_enum AS ENUM (
    'SETUP',
    'LOCKED',
    'CLOSED'
);


ALTER TYPE public.period_status_enum OWNER TO cuentassik_owner;

--
-- Name: TYPE period_status_enum; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TYPE public.period_status_enum IS 'Estado del período de contribución: SETUP, LOCKED, CLOSED';


--
-- Name: transaction_type_dual_flow; Type: TYPE; Schema: public; Owner: cuentassik_owner
--

CREATE TYPE public.transaction_type_dual_flow AS ENUM (
    'gasto',
    'gasto_directo',
    'ingreso',
    'ingreso_directo'
);


ALTER TYPE public.transaction_type_dual_flow OWNER TO cuentassik_owner;

--
-- Name: TYPE transaction_type_dual_flow; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TYPE public.transaction_type_dual_flow IS 'Tipos de transacción: gasto (común), gasto_directo (out-of-pocket), ingreso (común), ingreso_directo (reembolso)';


--
-- Name: transaction_type_enum; Type: TYPE; Schema: public; Owner: cuentassik_owner
--

CREATE TYPE public.transaction_type_enum AS ENUM (
    'income',
    'expense'
);


ALTER TYPE public.transaction_type_enum OWNER TO cuentassik_owner;

--
-- Name: TYPE transaction_type_enum; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TYPE public.transaction_type_enum IS 'Tipo de transacción: income (ingreso) o expense (gasto)';


--
-- Name: _phase_to_status(text); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public._phase_to_status(p_phase text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  CASE p_phase
    WHEN 'preparing' THEN RETURN 'open';
    WHEN 'validation' THEN RETURN 'open';
    WHEN 'active' THEN RETURN 'open';
    WHEN 'closing' THEN RETURN 'pending_close';
    WHEN 'closed' THEN RETURN 'closed';
    ELSE RETURN 'open';
  END CASE;
END;
$$;


ALTER FUNCTION public._phase_to_status(p_phase text) OWNER TO cuentassik_owner;

--
-- Name: assign_transaction_number(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.assign_transaction_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.transaction_number IS NULL THEN
    SELECT COALESCE(MAX(transaction_number), 0) + 1
    INTO NEW.transaction_number
    FROM transactions
    WHERE household_id = NEW.household_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.assign_transaction_number() OWNER TO cuentassik_owner;

--
-- Name: FUNCTION assign_transaction_number(); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.assign_transaction_number() IS 'Trigger function: Asigna automáticamente el siguiente transaction_number para el household_id de la transacción insertada. Solo asigna si NEW.transaction_number es NULL.';


--
-- Name: calculate_member_net_contribution(uuid, uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.calculate_member_net_contribution(p_household_id uuid, p_profile_id uuid, p_year integer, p_month integer) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION calculate_member_net_contribution(p_household_id uuid, p_profile_id uuid, p_year integer, p_month integer); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.calculate_member_net_contribution(p_household_id uuid, p_profile_id uuid, p_year integer, p_month integer) IS 'Calcula contribución neta pendiente considerando gastos directos';


--
-- Name: close_monthly_period(uuid, uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.close_monthly_period(p_household_id uuid, p_period_id uuid, p_closed_by uuid, p_reason text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
    DECLARE
      v_period RECORD;
      v_total_income numeric := 0;
      v_total_expenses numeric := 0;
      v_closing_balance numeric := 0;
    BEGIN
      SELECT id, household_id, year, month, phase, opening_balance
      INTO v_period
      FROM public.monthly_periods
      WHERE id = p_period_id
        AND household_id = p_household_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Período % no pertenece al hogar %', p_period_id, p_household_id;
      END IF;

      IF v_period.phase = 'closed' THEN
        RETURN p_period_id;
      END IF;

      IF v_period.phase <> 'closing' THEN
        RAISE EXCEPTION 'Solo se puede cerrar un período que esté en fase closing (fase actual: %)', v_period.phase;
      END IF;

      -- Reconciliar todas las contribuciones del período (idempotente)
      PERFORM public.reconcile_contribution_balance(c.id)
      FROM public.contributions c
      WHERE c.household_id = p_household_id
        AND c.year = v_period.year
        AND c.month = v_period.month;

      SELECT
        COALESCE(SUM(CASE WHEN t.type IN ('income', 'income_direct') THEN t.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN t.type IN ('expense', 'expense_direct') THEN t.amount ELSE 0 END), 0)
      INTO v_total_income, v_total_expenses
      FROM public.transactions t
      WHERE t.household_id = p_household_id
        AND (
          t.period_id = p_period_id
          OR (
            t.period_id IS NULL
            AND t.occurred_at IS NOT NULL
            AND EXTRACT(YEAR FROM t.occurred_at) = v_period.year
            AND EXTRACT(MONTH FROM t.occurred_at) = v_period.month
          )
        );

      v_closing_balance := COALESCE(v_period.opening_balance, 0) + v_total_income - v_total_expenses;

      UPDATE public.monthly_periods
      SET
        phase = 'closed',
        status = 'closed',
        closed_at = NOW(),
        closed_by = p_closed_by,
        closing_started_at = COALESCE(closing_started_at, NOW()),
        closing_started_by = COALESCE(closing_started_by, p_closed_by),
        total_income = v_total_income,
        total_expenses = v_total_expenses,
        closing_balance = v_closing_balance,
        notes = CASE WHEN p_reason IS NOT NULL THEN p_reason ELSE notes END,
        updated_at = NOW()
      WHERE id = p_period_id;

      PERFORM public.log_dual_flow_event(
        p_household_id,
        p_period_id,
        'period.closed',
        jsonb_build_object(
          'closed_by', p_closed_by,
          'total_income', v_total_income,
          'total_expenses', v_total_expenses,
          'closing_balance', v_closing_balance,
          'reason', p_reason
        )
      );

      RETURN p_period_id;
    END;
    $$;


ALTER FUNCTION public.close_monthly_period(p_household_id uuid, p_period_id uuid, p_closed_by uuid, p_reason text) OWNER TO cuentassik_owner;

--
-- Name: create_default_dual_flow_config(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.create_default_dual_flow_config() OWNER TO cuentassik_owner;

--
-- Name: create_default_household_categories(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.create_default_household_categories() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  -- IDs de parents (9 grupos)
  v_parent_ingresos_laborales uuid;
  v_parent_hogar uuid;
  v_parent_suministros uuid;
  v_parent_otros_ingresos uuid;
  v_parent_alimentacion uuid;
  v_parent_transporte uuid;
  v_parent_personal uuid;
  v_parent_estilo_vida uuid;
  v_parent_finanzas uuid;

  -- IDs de categorías (50 categorías organizadas por padre)
  -- Hogar (6 categorías)
  v_cat_vivienda uuid;
  v_cat_menaje uuid;
  v_cat_limpieza uuid;
  v_cat_lavanderia uuid;
  v_cat_mantenimiento uuid;
  v_cat_comunidad uuid;

  -- Ingresos Laborales (3 categorías)
  v_cat_nomina uuid;
  v_cat_freelance uuid;
  v_cat_bonus uuid;

  -- Suministros (7 categorías)
  v_cat_luz uuid;
  v_cat_agua uuid;
  v_cat_gas_butano uuid;
  v_cat_internet uuid;
  v_cat_telefono uuid;
  v_cat_seguros_suministros uuid;
  v_cat_impuestos_suministros uuid;

  -- Otros Ingresos (6 categorías)
  v_cat_inversiones uuid;
  v_cat_ventas uuid;
  v_cat_devoluciones uuid;
  v_cat_aportacion_cuenta_conjunta uuid;
  v_cat_pago_prestamo uuid;
  v_cat_varios_otros_ingresos uuid;

  -- Alimentación (7 categorías)
  v_cat_supermercado uuid;
  v_cat_carniceria uuid;
  v_cat_restaurantes uuid;
  v_cat_pescaderia uuid;
  v_cat_fruteria uuid;
  v_cat_panaderia uuid;
  v_cat_otros_alimentos uuid;

  -- Transporte (4 categorías)
  v_cat_transporte uuid;
  v_cat_combustible uuid;
  v_cat_parking uuid;
  v_cat_peajes uuid;

  -- Personal (7 categorías)
  v_cat_ropa uuid;
  v_cat_farmacia uuid;
  v_cat_belleza uuid;
  v_cat_gimnasio uuid;
  v_cat_salud uuid;
  v_cat_mascotas uuid;
  v_cat_calzado uuid;

  -- Estilo de Vida (5 categorías)
  v_cat_ocio uuid;
  v_cat_deportes uuid;
  v_cat_educacion uuid;
  v_cat_suscripciones uuid;
  v_cat_regalos uuid;

  -- Finanzas (5 categorías)
  v_cat_seguros_finanzas uuid;
  v_cat_impuestos_finanzas uuid;
  v_cat_prestamo_personal uuid;
  v_cat_reembolso_saldo uuid;
  v_cat_varios_finanzas uuid;

BEGIN
  -- ========================================================================
  -- PASO 1: CREAR CATEGORY_PARENTS (9 padres)
  -- ========================================================================

  -- 1. Ingresos Laborales (income, order 1)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Ingresos Laborales', '💰', 'income', 1)
  RETURNING id INTO v_parent_ingresos_laborales;

  -- 2. Hogar (expense, order 1)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Hogar', '🏠', 'expense', 1)
  RETURNING id INTO v_parent_hogar;

  -- 3. Suministros (expense, order 2)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Suministros', '⚡', 'expense', 2)
  RETURNING id INTO v_parent_suministros;

  -- 4. Otros Ingresos (income, order 2)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Otros Ingresos', '💸', 'income', 2)
  RETURNING id INTO v_parent_otros_ingresos;

  -- 5. Alimentación (expense, order 3)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Alimentación', '🛒', 'expense', 3)
  RETURNING id INTO v_parent_alimentacion;

  -- 6. Transporte (expense, order 4)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Transporte', '🚗', 'expense', 4)
  RETURNING id INTO v_parent_transporte;

  -- 7. Personal (expense, order 5)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Personal', '👤', 'expense', 5)
  RETURNING id INTO v_parent_personal;

  -- 8. Estilo de Vida (expense, order 6)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Estilo de Vida', '🎯', 'expense', 6)
  RETURNING id INTO v_parent_estilo_vida;

  -- 9. Finanzas (expense, order 7)
  INSERT INTO category_parents (household_id, name, icon, type, display_order)
  VALUES (NEW.id, 'Finanzas', '💼', 'expense', 7)
  RETURNING id INTO v_parent_finanzas;

  -- ========================================================================
  -- PASO 2: CREAR CATEGORIES (50 categorías)
  -- ========================================================================

  -- ========== HOGAR (6 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_hogar, 'Vivienda', '🏠', 1)
  RETURNING id INTO v_cat_vivienda;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_hogar, 'Menaje', '🪑', 2)
  RETURNING id INTO v_cat_menaje;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_hogar, 'Limpieza', '🧹', 3)
  RETURNING id INTO v_cat_limpieza;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_hogar, 'Lavandería', '🧺', 4)
  RETURNING id INTO v_cat_lavanderia;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_hogar, 'Mantenimiento', '🔧', 5)
  RETURNING id INTO v_cat_mantenimiento;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_hogar, 'Comunidad', '🏢', 6)
  RETURNING id INTO v_cat_comunidad;

  -- ========== INGRESOS LABORALES (3 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_ingresos_laborales, 'Nómina', '💰', 1)
  RETURNING id INTO v_cat_nomina;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_ingresos_laborales, 'Freelance', '💼', 2)
  RETURNING id INTO v_cat_freelance;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_ingresos_laborales, 'Bonus', '🎉', 3)
  RETURNING id INTO v_cat_bonus;

  -- ========== SUMINISTROS (7 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_suministros, 'Luz', '💡', 1)
  RETURNING id INTO v_cat_luz;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_suministros, 'Agua', '💧', 2)
  RETURNING id INTO v_cat_agua;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_suministros, 'Gas/Butano', '🔥', 3)
  RETURNING id INTO v_cat_gas_butano;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_suministros, 'Internet', '📡', 4)
  RETURNING id INTO v_cat_internet;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_suministros, 'Teléfono', '📞', 5)
  RETURNING id INTO v_cat_telefono;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_suministros, 'Seguros', '🛡️', 6)
  RETURNING id INTO v_cat_seguros_suministros;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_suministros, 'Impuestos', '📋', 7)
  RETURNING id INTO v_cat_impuestos_suministros;

  -- ========== OTROS INGRESOS (6 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_otros_ingresos, 'Inversiones', '📈', 1)
  RETURNING id INTO v_cat_inversiones;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_otros_ingresos, 'Ventas', '🏷️', 2)
  RETURNING id INTO v_cat_ventas;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_otros_ingresos, 'Devoluciones', '↩️', 3)
  RETURNING id INTO v_cat_devoluciones;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_otros_ingresos, 'Aportación Cuenta Conjunta', '🏦', 4)
  RETURNING id INTO v_cat_aportacion_cuenta_conjunta;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_otros_ingresos, 'Pago Préstamo', '💳', 5)
  RETURNING id INTO v_cat_pago_prestamo;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_otros_ingresos, 'Varios', '➕', 99)
  RETURNING id INTO v_cat_varios_otros_ingresos;

  -- ========== ALIMENTACIÓN (7 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_alimentacion, 'Supermercado', '🛒', 1)
  RETURNING id INTO v_cat_supermercado;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_alimentacion, 'Carnicería', '🥩', 2)
  RETURNING id INTO v_cat_carniceria;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_alimentacion, 'Restaurantes', '🍽️', 2)
  RETURNING id INTO v_cat_restaurantes;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_alimentacion, 'Pescadería', '🐟', 3)
  RETURNING id INTO v_cat_pescaderia;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_alimentacion, 'Frutería', '🍎', 4)
  RETURNING id INTO v_cat_fruteria;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_alimentacion, 'Panadería', '🥖', 5)
  RETURNING id INTO v_cat_panaderia;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_alimentacion, 'Otros Alimentos', '🍱', 6)
  RETURNING id INTO v_cat_otros_alimentos;

  -- ========== TRANSPORTE (4 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_transporte, 'Transporte', '🚗', 1)
  RETURNING id INTO v_cat_transporte;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_transporte, 'Combustible', '⛽', 2)
  RETURNING id INTO v_cat_combustible;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_transporte, 'Parking', '🅿️', 3)
  RETURNING id INTO v_cat_parking;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_transporte, 'Peajes', '🛣️', 4)
  RETURNING id INTO v_cat_peajes;

  -- ========== PERSONAL (7 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_personal, 'Ropa', '👕', 1)
  RETURNING id INTO v_cat_ropa;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_personal, 'Farmacia', '💊', 2)
  RETURNING id INTO v_cat_farmacia;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_personal, 'Belleza', '💄', 2)
  RETURNING id INTO v_cat_belleza;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_personal, 'Gimnasio', '🏋️', 3)
  RETURNING id INTO v_cat_gimnasio;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_personal, 'Salud', '🏥', 3)
  RETURNING id INTO v_cat_salud;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_personal, 'Mascotas', '🐶', 4)
  RETURNING id INTO v_cat_mascotas;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_personal, 'Calzado', '👟', 5)
  RETURNING id INTO v_cat_calzado;

  -- ========== ESTILO DE VIDA (5 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_estilo_vida, 'Ocio', '🎭', 1)
  RETURNING id INTO v_cat_ocio;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_estilo_vida, 'Deportes', '⚽', 2)
  RETURNING id INTO v_cat_deportes;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_estilo_vida, 'Educación', '📚', 3)
  RETURNING id INTO v_cat_educacion;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_estilo_vida, 'Suscripciones', '📱', 4)
  RETURNING id INTO v_cat_suscripciones;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_estilo_vida, 'Regalos', '🎁', 5)
  RETURNING id INTO v_cat_regalos;

  -- ========== FINANZAS (5 categorías) ==========
  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_finanzas, 'Seguros', '🛡️', 1)
  RETURNING id INTO v_cat_seguros_finanzas;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_finanzas, 'Impuestos', '📋', 2)
  RETURNING id INTO v_cat_impuestos_finanzas;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_finanzas, 'Préstamo Personal', '💰', 3)
  RETURNING id INTO v_cat_prestamo_personal;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_finanzas, 'Reembolso Saldo a Favor', '↩️', 4)
  RETURNING id INTO v_cat_reembolso_saldo;

  INSERT INTO categories (household_id, parent_id, name, icon, display_order)
  VALUES (NEW.id, v_parent_finanzas, 'Varios', '➕', 99)
  RETURNING id INTO v_cat_varios_finanzas;

  -- ========================================================================
  -- PASO 3: CREAR SUBCATEGORIES (95 subcategorías)
  -- ========================================================================
  -- Estructura completa extraída de PROD el 5 Nov 2025

  -- ========== HOGAR ==========
  -- Vivienda (3 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_vivienda, 'Alquiler', 1),
    (v_cat_vivienda, 'Hipoteca', 2),
    (v_cat_vivienda, 'Varios', 99);

  -- Menaje (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_menaje, 'Varios', 99);

  -- Limpieza (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_limpieza, 'Varios', 99);

  -- Lavandería (3 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_lavanderia, 'Tintorería', 1),
    (v_cat_lavanderia, 'Lavandería', 2),
    (v_cat_lavanderia, 'Varios', 99);

  -- Mantenimiento (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_mantenimiento, 'Varios', 99);

  -- Comunidad (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_comunidad, 'Varios', 99);

  -- ========== INGRESOS LABORALES ==========
  -- Nómina (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_nomina, 'Varios', 99);

  -- Freelance (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_freelance, 'Varios', 99);

  -- Bonus (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_bonus, 'Varios', 99);

  -- ========== SUMINISTROS ==========
  -- Luz (5 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_luz, 'Luz Hogar', 1),
    (v_cat_luz, 'Luz Otro', 2),
    (v_cat_luz, 'Luz Vacaciones', 3),
    (v_cat_luz, 'Luz Varios', 4),
    (v_cat_luz, 'Varios', 99);

  -- Agua (3 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_agua, 'Agua Hogar', 1),
    (v_cat_agua, 'Agua Vacaciones', 2),
    (v_cat_agua, 'Varios', 99);

  -- Gas/Butano (3 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_gas_butano, 'Gas Hogar', 1),
    (v_cat_gas_butano, 'Gas Vacaciones', 2),
    (v_cat_gas_butano, 'Varios', 99);

  -- Internet (6 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_internet, 'Internet Hogar', 1),
    (v_cat_internet, 'Internet Fibra', 2),
    (v_cat_internet, 'Internet Vacaciones', 3),
    (v_cat_internet, 'Internet Móvil', 4),
    (v_cat_internet, 'Internet Varios', 5),
    (v_cat_internet, 'Varios', 99);

  -- Teléfono (5 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_telefono, 'Teléfono Hogar', 1),
    (v_cat_telefono, 'Teléfono Móvil', 2),
    (v_cat_telefono, 'Teléfono Vacaciones', 3),
    (v_cat_telefono, 'Teléfono Varios', 4),
    (v_cat_telefono, 'Varios', 99);

  -- Seguros Suministros (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_seguros_suministros, 'Varios', 99);

  -- Impuestos Suministros (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_impuestos_suministros, 'Varios', 99);

  -- ========== OTROS INGRESOS ==========
  -- Inversiones (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_inversiones, 'Varios', 99);

  -- Ventas (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_ventas, 'Varios', 99);

  -- Devoluciones (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_devoluciones, 'Varios', 99);

  -- Aportación Cuenta Conjunta (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_aportacion_cuenta_conjunta, 'Varios', 99);

  -- Pago Préstamo (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_pago_prestamo, 'Varios', 99);

  -- Varios Otros Ingresos (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_varios_otros_ingresos, 'Varios', 99);

  -- ========== ALIMENTACIÓN ==========
  -- Supermercado (9 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_supermercado, 'Supermercado Hogar', 1),
    (v_cat_supermercado, 'Supermercado DIA', 2),
    (v_cat_supermercado, 'Supermercado Mercadona', 3),
    (v_cat_supermercado, 'Supermercado Lidl', 4),
    (v_cat_supermercado, 'Supermercado Consum', 5),
    (v_cat_supermercado, 'Supermercado Carrefour', 6),
    (v_cat_supermercado, 'Supermercado Varios', 7),
    (v_cat_supermercado, 'Supermercado Limpieza', 8),
    (v_cat_supermercado, 'Varios', 99);

  -- Carnicería (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_carniceria, 'Varios', 99);

  -- Restaurantes (6 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_restaurantes, 'Restaurante', 1),
    (v_cat_restaurantes, 'Bar/Cafetería', 2),
    (v_cat_restaurantes, 'Comida a Domicilio', 3),
    (v_cat_restaurantes, 'Pizzería', 4),
    (v_cat_restaurantes, 'Comida Rápida', 5),
    (v_cat_restaurantes, 'Varios', 99);

  -- Pescadería (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_pescaderia, 'Varios', 99);

  -- Frutería (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_fruteria, 'Varios', 99);

  -- Panadería (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_panaderia, 'Varios', 99);

  -- Otros Alimentos (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_otros_alimentos, 'Varios', 99);

  -- ========== TRANSPORTE ==========
  -- Transporte (12 subcats)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES 
    (v_cat_transporte, 'Coche', 1),
    (v_cat_transporte, 'Moto', 2),
    (v_cat_transporte, 'Autobús', 3),
    (v_cat_transporte, 'Metro', 4),
    (v_cat_transporte, 'Tren', 5),
    (v_cat_transporte, 'Tranvía', 6),
    (v_cat_transporte, 'Avión', 7),
    (v_cat_transporte, 'Taxi', 8),
    (v_cat_transporte, 'VTC', 9),
    (v_cat_transporte, 'Bici', 10),
    (v_cat_transporte, 'Patinete', 11),
    (v_cat_transporte, 'Varios', 99);

  -- Combustible (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_combustible, 'Varios', 99);

  -- Parking (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_parking, 'Varios', 99);

  -- Peajes (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_peajes, 'Varios', 99);

  -- ========== PERSONAL ==========
  -- Ropa (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_ropa, 'Varios', 99);

  -- Farmacia (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_farmacia, 'Varios', 99);

  -- Belleza (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_belleza, 'Varios', 99);

  -- Gimnasio (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_gimnasio, 'Varios', 99);

  -- Salud (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_salud, 'Varios', 99);

  -- Mascotas (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_mascotas, 'Varios', 99);

  -- Calzado (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_calzado, 'Varios', 99);

  -- ========== ESTILO DE VIDA ==========
  -- Ocio (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_ocio, 'Varios', 99);

  -- Deportes (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_deportes, 'Varios', 99);

  -- Educación (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_educacion, 'Varios', 99);

  -- Suscripciones (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_suscripciones, 'Varios', 99);

  -- Regalos (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_regalos, 'Varios', 99);

  -- ========== FINANZAS ==========
  -- Seguros Finanzas (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_seguros_finanzas, 'Varios', 99);

  -- Impuestos Finanzas (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_impuestos_finanzas, 'Varios', 99);

  -- Préstamo Personal (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_prestamo_personal, 'Varios', 99);

  -- Reembolso Saldo a Favor (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_reembolso_saldo, 'Varios', 99);

  -- Varios Finanzas (1 subcat)
  INSERT INTO subcategories (category_id, name, display_order)
  VALUES (v_cat_varios_finanzas, 'Varios', 99);

  -- ========================================================================
  -- FIN: Función completada
  -- ========================================================================
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_default_household_categories() OWNER TO cuentassik_owner;

--
-- Name: FUNCTION create_default_household_categories(); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.create_default_household_categories() IS 'Función trigger que crea automáticamente la estructura completa de categorías 
para nuevos hogares. Genera 9 category_parents, 50 categories y 95 subcategories.
Versión única consolidada (5 Nov 2025) que reemplaza las 2 versiones duplicadas anteriores.
Estructura extraída de producción real (8 meses de uso).';


--
-- Name: create_direct_expense_pair(uuid, uuid, numeric, text, uuid, date, text); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.create_direct_expense_pair(p_household_id uuid, p_category_id uuid, p_amount numeric, p_description text, p_real_payer_id uuid, p_occurred_at date, p_created_by_email text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_pair_id UUID;
    v_expense_id UUID;
    v_income_id UUID;
    v_income_category_id UUID;
BEGIN
    -- Generate unique UUID for the pair
    v_pair_id := gen_random_uuid();

    -- Get "Aportación Cuenta Conjunta" category for income compensation
    SELECT id INTO v_income_category_id
    FROM public.categories
    WHERE household_id = p_household_id
      AND type = 'income'
      AND name = 'Aportación Cuenta Conjunta'
    LIMIT 1;

    -- Create direct expense transaction
    INSERT INTO public.transactions (
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

    -- Create matching automatic income (compensatory) with standardized description
    INSERT INTO public.transactions (
        household_id, category_id, type, amount, currency,
        description, occurred_at, flow_type, transaction_pair_id,
        created_by_email, performed_by_email, performed_at,
        profile_id
    ) VALUES (
        p_household_id, v_income_category_id, 'income', p_amount, 'EUR',
        'Equilibrio: ' || COALESCE(p_description, 'Gasto directo'),
        p_occurred_at, 'direct', v_pair_id,
        'system@cuentassik.com', p_created_by_email, p_occurred_at,
        p_real_payer_id
    ) RETURNING id INTO v_income_id;

    RETURN v_pair_id;
END;
$$;


ALTER FUNCTION public.create_direct_expense_pair(p_household_id uuid, p_category_id uuid, p_amount numeric, p_description text, p_real_payer_id uuid, p_occurred_at date, p_created_by_email text) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION create_direct_expense_pair(p_household_id uuid, p_category_id uuid, p_amount numeric, p_description text, p_real_payer_id uuid, p_occurred_at date, p_created_by_email text); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.create_direct_expense_pair(p_household_id uuid, p_category_id uuid, p_amount numeric, p_description text, p_real_payer_id uuid, p_occurred_at date, p_created_by_email text) IS 'Crea automáticamente el par gasto directo + ingreso compensatorio con descripción estandarizada "Equilibrio:"';


--
-- Name: create_household_with_owner(text, uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.create_household_with_owner(p_name text, p_profile_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_household_id UUID;
    v_category_id UUID;
BEGIN
    -- Crear hogar
    INSERT INTO households (name, created_by_profile_id)
    VALUES (p_name, p_profile_id)
    RETURNING id INTO v_household_id;

    -- Crear miembro owner
    INSERT INTO household_members (household_id, profile_id, role, is_owner, joined_at, invited_by_profile_id)
    VALUES (v_household_id, p_profile_id, 'owner', TRUE, NOW(), p_profile_id);

    -- Crear categoría por defecto 'Aportación Cuenta Conjunta'
    v_category_id := gen_random_uuid();
    INSERT INTO categories (id, household_id, name, icon, type, created_by_profile_id, created_at, updated_by_profile_id, updated_at)
    VALUES (
        v_category_id,
        v_household_id,
        'Aportación Cuenta Conjunta',
        '🏦',
        'income',
        p_profile_id,
        NOW(),
        p_profile_id,
        NOW()
    );

    RETURN v_household_id;
END;
$$;


ALTER FUNCTION public.create_household_with_owner(p_name text, p_profile_id uuid) OWNER TO cuentassik_owner;

--
-- Name: create_joint_account_for_household(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.create_joint_account_for_household() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO joint_accounts (household_id, display_name)
  VALUES (NEW.id, 'Cuenta Común');

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_joint_account_for_household() OWNER TO cuentassik_owner;

--
-- Name: ensure_household_owner(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.ensure_household_owner() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.role = 'member' AND OLD.role = 'owner') THEN
    -- ¿Queda algún owner (excluyendo el propio NEW en caso de UPDATE)?
    IF NOT EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = NEW.household_id
        AND hm.role = 'owner'
        AND (TG_OP = 'INSERT' OR hm.profile_id <> NEW.profile_id)
    ) THEN
      -- Promocionar al miembro más antiguo (por joined_at)
      UPDATE household_members hm
      SET role = 'owner',
          is_owner = TRUE
      WHERE hm.household_id = NEW.household_id
        AND hm.profile_id = (
          SELECT profile_id
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


ALTER FUNCTION public.ensure_household_owner() OWNER TO cuentassik_owner;

--
-- Name: ensure_last_member_is_owner(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.ensure_last_member_is_owner() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_remaining_members INTEGER;
  v_remaining_owners INTEGER;
  v_last_profile UUID;
  v_last_role TEXT;
BEGIN
  -- Miembros restantes
  SELECT COUNT(*) INTO v_remaining_members
  FROM household_members
  WHERE household_id = OLD.household_id;

  IF v_remaining_members = 0 THEN
    RETURN OLD;
  END IF;

  -- Owners restantes
  SELECT COUNT(*) INTO v_remaining_owners
  FROM household_members
  WHERE household_id = OLD.household_id
    AND role = 'owner';

  IF v_remaining_owners > 0 THEN
    RETURN OLD;
  END IF;

  -- Promocionar al miembro más antiguo por joined_at
  SELECT profile_id, role
  INTO v_last_profile, v_last_role
  FROM household_members
  WHERE household_id = OLD.household_id
  ORDER BY joined_at ASC
  LIMIT 1;

  IF v_last_role IS DISTINCT FROM 'owner' THEN
    UPDATE household_members
    SET role = 'owner',
        is_owner = TRUE
    WHERE household_id = OLD.household_id
      AND profile_id = v_last_profile;
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION public.ensure_last_member_is_owner() OWNER TO cuentassik_owner;

--
-- Name: FUNCTION ensure_last_member_is_owner(); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.ensure_last_member_is_owner() IS 'Función de trigger que garantiza Regla #1: Siempre hay al menos un owner. Si el último owner abandona, promociona automáticamente al miembro más antiguo.';


--
-- Name: ensure_monthly_period(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.ensure_monthly_period(p_household_id uuid, p_year integer, p_month integer) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_period_id uuid;
  v_previous_year integer;
  v_previous_month integer;
  v_opening_balance numeric := 0;
  v_status text;
  v_phase public.period_phase_enum;
  v_current_year integer;
  v_current_month integer;
BEGIN
  SELECT id INTO v_period_id
  FROM public.monthly_periods
  WHERE household_id = p_household_id
    AND year = p_year
    AND month = p_month;

  IF FOUND THEN
    RETURN v_period_id;
  END IF;

  IF p_month = 1 THEN
    v_previous_year := p_year - 1;
    v_previous_month := 12;
  ELSE
    v_previous_year := p_year;
    v_previous_month := p_month - 1;
  END IF;

  SELECT closing_balance
  INTO v_opening_balance
  FROM public.monthly_periods
  WHERE household_id = p_household_id
    AND year = v_previous_year
    AND month = v_previous_month;

  SELECT
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
  INTO v_current_year, v_current_month;

  IF p_year < v_current_year OR (p_year = v_current_year AND p_month < v_current_month) THEN
    v_status := 'pending_close';
    v_phase := 'closing';
  ELSE
    v_status := 'open';
    v_phase := 'preparing';
  END IF;

  INSERT INTO public.monthly_periods (
    household_id,
    year,
    month,
    status,
    phase,
    opening_balance,
    closing_balance,
    opened_at
  ) VALUES (
    p_household_id,
    p_year,
    p_month,
    v_status,
    v_phase,
    COALESCE(v_opening_balance, 0),
    COALESCE(v_opening_balance, 0),
    NOW()
  )
  RETURNING id INTO v_period_id;

  PERFORM public.log_dual_flow_event(
    p_household_id,
    v_period_id,
    'period.created',
    jsonb_build_object('year', p_year, 'month', p_month)
  );

  RETURN v_period_id;
END;
$$;


ALTER FUNCTION public.ensure_monthly_period(p_household_id uuid, p_year integer, p_month integer) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION ensure_monthly_period(p_household_id uuid, p_year integer, p_month integer); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.ensure_monthly_period(p_household_id uuid, p_year integer, p_month integer) IS 'Obtiene/crea período mensual usando solo year, month (sin start_date/end_date)';


--
-- Name: ensure_single_primary_email(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.ensure_single_primary_email() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Si se está marcando como primary
  IF NEW.is_primary = true THEN
    -- Desmarcar otros emails del mismo perfil
    UPDATE profile_emails
    SET is_primary = false
    WHERE profile_id = NEW.profile_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.ensure_single_primary_email() OWNER TO cuentassik_owner;

--
-- Name: execute_auto_pairing(uuid, uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.execute_auto_pairing(p_transaction_id uuid, p_candidate_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_pair_id uuid;
  v_household_id uuid;
  v_candidate_household uuid;
  v_rows integer;
BEGIN
  SELECT household_id INTO v_household_id
  FROM public.transactions
  WHERE id = p_transaction_id
    AND flow_type = 'direct';

  IF v_household_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT household_id INTO v_candidate_household
  FROM public.transactions
  WHERE id = p_candidate_id
    AND flow_type = 'direct';

  IF v_candidate_household IS NULL OR v_candidate_household <> v_household_id THEN
    RETURN FALSE;
  END IF;

  v_pair_id := gen_random_uuid();

  UPDATE public.transactions
  SET
    transaction_pair_id = v_pair_id,
    auto_paired = true,
    dual_flow_status = 'auto_paired',
    updated_at = NOW()
  WHERE id = p_transaction_id
    AND flow_type = 'direct'
    AND transaction_pair_id IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.transactions
  SET
    transaction_pair_id = v_pair_id,
    auto_paired = true,
    dual_flow_status = 'auto_paired',
    updated_at = NOW()
  WHERE id = p_candidate_id
    AND flow_type = 'direct'
    AND transaction_pair_id IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'No se pudo emparejar la transacción candidata %', p_candidate_id;
  END IF;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION public.execute_auto_pairing(p_transaction_id uuid, p_candidate_id uuid) OWNER TO cuentassik_owner;

--
-- Name: find_pairing_candidates(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.find_pairing_candidates(p_household_id uuid, p_transaction_id uuid, p_umbral numeric DEFAULT 5.00) RETURNS TABLE(candidate_id uuid, diferencia_importe numeric, diferencia_dias integer, score numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  WITH transaction_data AS (
    SELECT
      type,
      amount,
      occurred_at::date AS fecha,
      category_id,
      COALESCE(pairing_threshold, p_umbral) AS threshold
    FROM public.transactions
    WHERE id = p_transaction_id
      AND household_id = p_household_id
      AND flow_type = 'direct'
      AND transaction_pair_id IS NULL
  )
  SELECT
    t.id AS candidate_id,
    ABS(t.amount - td.amount) AS diferencia_importe,
    ABS(EXTRACT(DAY FROM (t.occurred_at::date - td.fecha)))::integer AS diferencia_dias,
    (ABS(t.amount - td.amount) * 0.7 + ABS(EXTRACT(DAY FROM (t.occurred_at::date - td.fecha))) * 0.3) AS score
  FROM public.transactions t
  CROSS JOIN transaction_data td
  WHERE t.household_id = p_household_id
    AND t.id <> p_transaction_id
    AND t.flow_type = 'direct'
    AND t.transaction_pair_id IS NULL
    AND t.auto_paired = false
    AND t.dual_flow_status = 'approved'
    AND ((td.type = 'expense_direct' AND t.type = 'income_direct')
      OR (td.type = 'income_direct' AND t.type = 'expense_direct'))
    AND (t.category_id IS NULL OR t.category_id = td.category_id)
    AND ABS(t.amount - td.amount) <= td.threshold
    AND ABS(EXTRACT(DAY FROM (t.occurred_at::date - td.fecha))) <= 30
  ORDER BY score ASC
  LIMIT 5;
END;
$$;


ALTER FUNCTION public.find_pairing_candidates(p_household_id uuid, p_transaction_id uuid, p_umbral numeric) OWNER TO cuentassik_owner;

--
-- Name: generate_contributions_for_period(uuid, uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.generate_contributions_for_period(p_household_id uuid, p_period_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_period RECORD;
  v_member_count INTEGER;
  v_contribution_count INTEGER;
BEGIN
  -- 1. Obtener información del período
  SELECT
    id,
    household_id,
    year,
    month
  INTO v_period
  FROM public.monthly_periods
  WHERE id = p_period_id
    AND household_id = p_household_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período % no encontrado en hogar %', p_period_id, p_household_id;
  END IF;

  -- 2. Contar miembros activos
  SELECT COUNT(*)
  INTO v_member_count
  FROM public.household_members
  WHERE household_id = p_household_id;

  IF v_member_count = 0 THEN
    RAISE EXCEPTION 'No hay miembros en el hogar %', p_household_id;
  END IF;

  -- 3. Contar contribuciones existentes para este período
  SELECT COUNT(*)
  INTO v_contribution_count
  FROM public.contributions
  WHERE household_id = p_household_id
    AND year = v_period.year
    AND month = v_period.month;

  -- 4. Validar que existen contribuciones
  IF v_contribution_count = 0 THEN
    RAISE NOTICE 'No hay contribuciones definidas para el período % %. Las contribuciones deben configurarse antes de bloquear.',
      v_period.month, v_period.year;
  ELSE
    RAISE NOTICE 'Validación OK: % contribuciones encontradas para % miembros en período % %',
      v_contribution_count, v_member_count, v_period.month, v_period.year;
  END IF;

  -- La función NO crea ni calcula nada, solo valida
  -- Las contribuciones ya están calculadas en tiempo real desde la UI

END;
$$;


ALTER FUNCTION public.generate_contributions_for_period(p_household_id uuid, p_period_id uuid) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION generate_contributions_for_period(p_household_id uuid, p_period_id uuid); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.generate_contributions_for_period(p_household_id uuid, p_period_id uuid) IS 'Genera o actualiza registros de contribución para todos los miembros activos de un hogar en un período específico, basándose en el método de cálculo configurado (equal, proportional, custom).';


--
-- Name: generate_pair_reference(uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.generate_pair_reference(p_household_id uuid) OWNER TO cuentassik_owner;

--
-- Name: get_approved_refunds(uuid, uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.get_approved_refunds(p_household_id uuid, p_profile_id uuid) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(SUM(rc.refund_amount), 0)
  FROM public.refund_claims rc
  WHERE rc.household_id = p_household_id
    AND rc.profile_id = p_profile_id
    AND rc.status = 'approved';
$$;


ALTER FUNCTION public.get_approved_refunds(p_household_id uuid, p_profile_id uuid) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION get_approved_refunds(p_household_id uuid, p_profile_id uuid); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.get_approved_refunds(p_household_id uuid, p_profile_id uuid) IS 'Suma de reembolsos aprobados para un miembro en un hogar.
   Se usa en el cálculo de balance pendiente para descontar reembolsos ya validados.';


--
-- Name: get_household_balances_overview(uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.get_household_balances_overview(p_household_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_members JSONB;
  v_total_credits NUMERIC := 0;
  v_total_debts NUMERIC := 0;
  v_pending_loans INTEGER := 0;
BEGIN
  -- Obtener balance de cada miembro
  SELECT jsonb_agg(
    jsonb_build_object(
      'profile_id', hm.profile_id,
      'email', p.email,
      'display_name', p.display_name,
      'balance', COALESCE(mb.current_balance, 0),
      'status', get_member_balance_status(p_household_id, hm.profile_id)
    )
    ORDER BY p.email
  ) INTO v_members
  FROM household_members hm
  INNER JOIN profiles p ON p.id = hm.profile_id
  LEFT JOIN member_balances mb ON mb.household_id = hm.household_id 
    AND mb.profile_id = hm.profile_id
  WHERE hm.household_id = p_household_id;

  -- Totales del hogar
  SELECT 
    COALESCE(SUM(GREATEST(current_balance, 0)), 0),
    COALESCE(SUM(ABS(LEAST(current_balance, 0))), 0)
  INTO v_total_credits, v_total_debts
  FROM member_balances
  WHERE household_id = p_household_id;

  -- Préstamos pendientes de aprobación
  SELECT COUNT(*) INTO v_pending_loans
  FROM personal_loans
  WHERE household_id = p_household_id
    AND status = 'pending';

  RETURN jsonb_build_object(
    'household_id', p_household_id,
    'members', v_members,
    'totals', jsonb_build_object(
      'credits_owed', v_total_credits,
      'debts_owed', v_total_debts,
      'net_balance', v_total_debts - v_total_credits
    ),
    'pending_loans', v_pending_loans,
    'generated_at', NOW()
  );
END;
$$;


ALTER FUNCTION public.get_household_balances_overview(p_household_id uuid) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION get_household_balances_overview(p_household_id uuid); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.get_household_balances_overview(p_household_id uuid) IS 'Vista consolidada de balances de todos los miembros del hogar (para owner).';


--
-- Name: get_household_members(uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.get_household_members(p_household_id uuid) OWNER TO cuentassik_owner;

--
-- Name: get_household_members_optimized(uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.get_household_members_optimized(p_household_id uuid) RETURNS TABLE(profile_id uuid, email text, display_name text, role text, joined_at timestamp with time zone, current_income numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    hm.profile_id,
    p.email,
    p.display_name,
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


ALTER FUNCTION public.get_household_members_optimized(p_household_id uuid) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION get_household_members_optimized(p_household_id uuid); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.get_household_members_optimized(p_household_id uuid) IS 'RPC optimizada que devuelve todos los miembros de un hogar con su email, display_name, rol e ingreso actual. Ordena owners primero, luego por antigüedad.';


--
-- Name: get_joint_account_id(uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.get_joint_account_id(p_household_id uuid) RETURNS uuid
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_joint_account_id UUID;
BEGIN
  SELECT id INTO v_joint_account_id
  FROM joint_accounts
  WHERE household_id = p_household_id;

  IF v_joint_account_id IS NULL THEN
    RAISE EXCEPTION 'No joint account found for household %', p_household_id;
  END IF;

  RETURN v_joint_account_id;
END;
$$;


ALTER FUNCTION public.get_joint_account_id(p_household_id uuid) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION get_joint_account_id(p_household_id uuid); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.get_joint_account_id(p_household_id uuid) IS 'Obtiene el UUID de la Cuenta Común de un hogar. Lanza excepción si no existe.';


--
-- Name: get_member_balance_status(uuid, uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.get_member_balance_status(p_household_id uuid, p_profile_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_balance NUMERIC;
  v_active_loans_amount NUMERIC;
  v_active_loans_count INTEGER;
  v_total_debt NUMERIC;
  v_credit NUMERIC;
  v_status TEXT;
BEGIN
  -- Balance actual
  SELECT COALESCE(current_balance, 0) INTO v_balance
  FROM member_balances
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id;

  -- Préstamos activos (aprobados pero no liquidados)
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_active_loans_amount, v_active_loans_count
  FROM personal_loans
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND status = 'approved'
    AND settled_at IS NULL;

  -- Cálculos
  v_credit := GREATEST(v_balance, 0);
  v_total_debt := ABS(LEAST(v_balance, 0)) + v_active_loans_amount;
  
  -- Determinar status
  IF v_total_debt > 0 THEN
    v_status := 'debt';
  ELSIF v_credit > 0 THEN
    v_status := 'credit';
  ELSE
    v_status := 'settled';
  END IF;

  RETURN jsonb_build_object(
    'household_id', p_household_id,
    'profile_id', p_profile_id,
    'balance', v_balance,
    'credit', v_credit,
    'total_debt', v_total_debt,
    'status', v_status,
    'breakdown', jsonb_build_object(
      'contribution_balance', v_balance,
      'active_loans', jsonb_build_object(
        'amount', v_active_loans_amount,
        'count', v_active_loans_count
      )
    ),
    'summary', CASE
      WHEN v_status = 'credit' THEN 'El hogar te debe ' || v_credit || '€'
      WHEN v_status = 'debt' THEN 'Debes al hogar ' || v_total_debt || '€'
      ELSE 'Saldado'
    END
  );
END;
$$;


ALTER FUNCTION public.get_member_balance_status(p_household_id uuid, p_profile_id uuid) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION get_member_balance_status(p_household_id uuid, p_profile_id uuid); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.get_member_balance_status(p_household_id uuid, p_profile_id uuid) IS 'Retorna estado completo de crédito/deuda de un miembro en formato JSON.';


--
-- Name: get_member_balance_status_v2(uuid, uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.get_member_balance_status_v2(p_household_id uuid, p_profile_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_historical_balance NUMERIC;
  v_pending_contributions NUMERIC;
  v_current_direct_expenses NUMERIC;
  v_total_balance NUMERIC;
  v_active_loans_amount NUMERIC;
  v_active_loans_count INTEGER;
  v_total_debt NUMERIC;
  v_credit NUMERIC;
  v_status TEXT;
  v_last_closed_year INTEGER;
  v_last_closed_month INTEGER;
BEGIN
  -- 1. Obtener balance HISTÓRICO (períodos ya cerrados)
  -- member_balances solo contiene balances de períodos liquidados
  SELECT COALESCE(current_balance, 0) INTO v_historical_balance
  FROM member_balances
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id;

  -- 2. Encontrar el último período cerrado
  -- Cualquier contribución/período después de esto está ABIERTO
  SELECT MAX(COALESCE(year, 0)), MAX(COALESCE(month, 0))
  INTO v_last_closed_year, v_last_closed_month
  FROM monthly_periods
  WHERE household_id = p_household_id
    AND status IN ('closed', 'CLOSED')
    AND closed_at IS NOT NULL;

  -- Si no hay períodos cerrados, inicializar como 0,0
  IF v_last_closed_year IS NULL THEN
    v_last_closed_year := 0;
    v_last_closed_month := 0;
  END IF;

  -- 3. Sumar CONTRIBUCIONES PENDIENTES (períodos aún abiertos/activos)
  -- Estos son (expected_amount - paid_amount) de períodos NO cerrados
  SELECT COALESCE(SUM(COALESCE(expected_amount, 0) - COALESCE(paid_amount, 0)), 0)
  INTO v_pending_contributions
  FROM contributions
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND (
      -- Período está abierto (más reciente que el último cerrado)
      (year > v_last_closed_year)
      OR (year = v_last_closed_year AND month > v_last_closed_month)
    );

  -- 4. Sumar GASTOS DIRECTOS DEL MES ACTUAL
  -- Estos se descuentan del balance (ya fueron pagados de bolsillo)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_current_direct_expenses
  FROM transactions
  WHERE household_id = p_household_id
    AND real_payer_id = p_profile_id
    AND flow_type = 'direct'
    AND type = 'expense'
    AND EXTRACT(YEAR FROM occurred_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM occurred_at) = EXTRACT(MONTH FROM CURRENT_DATE);

  -- 5. Calcular BALANCE TOTAL EN VIVO
  -- = Histórico (cerrado) + Pendiente (abierto) - Gastos directos (mes actual)
  v_total_balance := v_historical_balance + v_pending_contributions - v_current_direct_expenses;

  -- 6. Sumar PRÉSTAMOS PERSONALES ACTIVOS
  SELECT
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_active_loans_amount, v_active_loans_count
  FROM personal_loans
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND status = 'approved'
    AND settled_at IS NULL;

  -- 7. Calcular crédito y deuda totales
  v_credit := GREATEST(v_total_balance, 0);
  v_total_debt := ABS(LEAST(v_total_balance, 0)) + v_active_loans_amount;

  -- 8. Determinar status
  IF v_total_debt > 0 THEN
    v_status := 'debt';
  ELSIF v_credit > 0 THEN
    v_status := 'credit';
  ELSE
    v_status := 'settled';
  END IF;

  -- 9. Retornar resultado JSON
  RETURN jsonb_build_object(
    'household_id', p_household_id,
    'profile_id', p_profile_id,
    'balance', v_total_balance,
    'credit', v_credit,
    'total_debt', v_total_debt,
    'status', v_status,
    'breakdown', jsonb_build_object(
      'historical_balance', v_historical_balance,
      'pending_contributions', v_pending_contributions,
      'current_direct_expenses', v_current_direct_expenses,
      'active_loans', jsonb_build_object(
        'amount', v_active_loans_amount,
        'count', v_active_loans_count
      ),
      'calculation', 'histórico: ' || ROUND(v_historical_balance::numeric, 2) || '€ + pendiente: ' || ROUND(v_pending_contributions::numeric, 2) || '€ - directo: ' || ROUND(v_current_direct_expenses::numeric, 2) || '€ = total: ' || ROUND(v_total_balance::numeric, 2) || '€'
    ),
    'summary', CASE
      WHEN v_status = 'credit' THEN 'El hogar te debe ' || ROUND(v_credit::numeric, 2) || '€'
      WHEN v_status = 'debt' THEN 'Debes al hogar ' || ROUND(v_total_debt::numeric, 2) || '€'
      ELSE 'Saldado'
    END
  );
END;
$$;


ALTER FUNCTION public.get_member_balance_status_v2(p_household_id uuid, p_profile_id uuid) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION get_member_balance_status_v2(p_household_id uuid, p_profile_id uuid); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.get_member_balance_status_v2(p_household_id uuid, p_profile_id uuid) IS 'Calcula balance EN VIVO (incluyendo períodos abiertos) sin esperar cierre del período. 
   Fórmula: balance_histórico + contribuciones_pendientes - gastos_directos_mes + préstamos_activos.
   Permite solicitar reembolsos/préstamos en cualquier fase (SETUP/LOCKED/CLOSED).';


--
-- Name: get_member_income(uuid, uuid, date); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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

  -- Si existe, buscar el income vigente en la fecha, desempate por created_at DESC
  SELECT monthly_income
  INTO v_income
  FROM member_incomes
  WHERE household_id = p_household_id
    AND profile_id = p_profile_id
    AND effective_from <= p_date
  ORDER BY effective_from DESC, created_at DESC
  LIMIT 1;

  -- Retornar el income encontrado (puede ser 0, que es válido)
  -- Si no hay income vigente en la fecha pero SÍ hay registros, retornar 0
  RETURN COALESCE(v_income, 0);
END;
$$;


ALTER FUNCTION public.get_member_income(p_household_id uuid, p_profile_id uuid, p_date date) OWNER TO cuentassik_owner;

--
-- Name: get_profile_emails(uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.get_profile_emails(p_profile_id uuid) RETURNS TABLE(email text, is_primary boolean, verified boolean, added_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.email,
    pe.is_primary,
    pe.verified,
    pe.added_at
  FROM profile_emails pe
  WHERE pe.profile_id = p_profile_id
  ORDER BY pe.is_primary DESC, pe.added_at ASC;
END;
$$;


ALTER FUNCTION public.get_profile_emails(p_profile_id uuid) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION get_profile_emails(p_profile_id uuid); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.get_profile_emails(p_profile_id uuid) IS 'Retorna todos los emails de un perfil, ordenados por primario primero y luego por antigüedad.';


--
-- Name: get_user_active_household(uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.get_user_active_household(p_profile_id uuid) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION get_user_active_household(p_profile_id uuid); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.get_user_active_household(p_profile_id uuid) IS 'Obtiene el household_id activo del usuario. Si no tiene uno configurado, retorna el primer hogar al que pertenece.';


--
-- Name: get_user_households_optimized(uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.get_user_households_optimized(p_profile_id uuid) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION get_user_households_optimized(p_profile_id uuid); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.get_user_households_optimized(p_profile_id uuid) IS 'RPC optimizada que devuelve TODOS los hogares de un usuario con stats pre-calculadas. Evita múltiples queries y JOINs complejos en aplicación.';


--
-- Name: is_user_household_owner(uuid, uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.is_user_household_owner(p_profile_id uuid, p_household_id uuid) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION is_user_household_owner(p_profile_id uuid, p_household_id uuid); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.is_user_household_owner(p_profile_id uuid, p_household_id uuid) IS 'Validación rápida de permisos: devuelve TRUE si el usuario es owner del hogar especificado.';


--
-- Name: lock_contributions_period(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.lock_contributions_period(p_household_id uuid, p_period_id uuid, p_locked_by uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_period RECORD;
BEGIN
  SELECT
    id,
    household_id,
    phase
  INTO v_period
  FROM public.monthly_periods
  WHERE id = p_period_id
    AND household_id = p_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período % no pertenece al hogar %', p_period_id, p_household_id;
  END IF;

  IF v_period.phase = 'closed' THEN
    RAISE EXCEPTION 'El período ya está cerrado';
  END IF;

  IF v_period.phase NOT IN ('preparing', 'validation') THEN
    RAISE EXCEPTION 'Solo se puede validar un período en fases preparing o validation (fase actual: %)', v_period.phase;
  END IF;

  -- Generar contribuciones para todos los miembros
  PERFORM public.generate_contributions_for_period(p_household_id, p_period_id);

  UPDATE public.monthly_periods
  SET
    phase = 'validation',
    status = 'open',
    validated_at = COALESCE(validated_at, NOW()),
    validated_by = COALESCE(validated_by, p_locked_by),
    locked_at = NOW(),
    locked_by = p_locked_by,
    updated_at = NOW()
  WHERE id = p_period_id;

  PERFORM public.log_dual_flow_event(
    p_household_id,
    p_period_id,
    'period.validated',
    jsonb_build_object('locked_by', p_locked_by)
  );

  RETURN p_period_id;
END;
$$;


ALTER FUNCTION public.lock_contributions_period(p_household_id uuid, p_period_id uuid, p_locked_by uuid) OWNER TO cuentassik_owner;

--
-- Name: log_dual_flow_event(uuid, uuid, text, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.log_dual_flow_event(p_household_id uuid, p_period_id uuid, p_event_type text, p_payload jsonb DEFAULT '{}'::jsonb, p_created_by uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.dual_flow_events (
    household_id,
    period_id,
    event_type,
    payload,
    created_by
  ) VALUES (
    p_household_id,
    p_period_id,
    p_event_type,
    COALESCE(p_payload, '{}'::jsonb),
    p_created_by
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;


ALTER FUNCTION public.log_dual_flow_event(p_household_id uuid, p_period_id uuid, p_event_type text, p_payload jsonb, p_created_by uuid) OWNER TO cuentassik_owner;

--
-- Name: log_transaction_journal(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.log_transaction_journal() OWNER TO cuentassik_owner;

--
-- Name: open_monthly_period(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.open_monthly_period(p_household_id uuid, p_period_id uuid, p_opened_by uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_period RECORD;
BEGIN
  SELECT
    id,
    household_id,
    phase
  INTO v_period
  FROM public.monthly_periods
  WHERE id = p_period_id
    AND household_id = p_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período % no pertenece al hogar %', p_period_id, p_household_id;
  END IF;

  IF v_period.phase = 'closed' THEN
    RAISE EXCEPTION 'El período ya está cerrado';
  END IF;

  IF v_period.phase <> 'validation' THEN
    RAISE EXCEPTION 'Solo se puede abrir un período que esté en fase validation (fase actual: %)', v_period.phase;
  END IF;

  UPDATE public.monthly_periods
  SET
    phase = 'active',
    status = 'open',
    opened_at = NOW(),
    opened_by = p_opened_by,
    updated_at = NOW()
  WHERE id = p_period_id;

  PERFORM public.log_dual_flow_event(
    p_household_id,
    p_period_id,
    'period.opened',
    jsonb_build_object('opened_by', p_opened_by)
  );

  RETURN p_period_id;
END;
$$;


ALTER FUNCTION public.open_monthly_period(p_household_id uuid, p_period_id uuid, p_opened_by uuid) OWNER TO cuentassik_owner;

--
-- Name: reconcile_contribution_balance(uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.reconcile_contribution_balance(p_contribution_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_contribution RECORD;
  v_previous_balance NUMERIC;
  v_delta NUMERIC;
  v_final_balance NUMERIC;
  v_applied_credit NUMERIC := 0;
  v_last JSONB;
BEGIN
  -- Load contribution
  SELECT * INTO v_contribution
  FROM public.contributions
  WHERE id = p_contribution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribution not found: %', p_contribution_id;
  END IF;

  -- Compute current delta
  v_delta := COALESCE(v_contribution.paid_amount, 0) - COALESCE(v_contribution.expected_amount, 0);

  -- If we already reconciled with same delta, short-circuit
  SELECT last_result INTO v_last
  FROM public.contribution_reconciliations
  WHERE contribution_id = p_contribution_id;

  IF v_last IS NOT NULL AND (v_last->>'delta')::numeric = v_delta THEN
    -- Update timestamp and return previous result (idempotent)
    UPDATE public.contribution_reconciliations
    SET last_reconciled_at = NOW()
    WHERE contribution_id = p_contribution_id;
    RETURN v_last || jsonb_build_object('idempotent', true, 'timestamp', NOW());
  END IF;

  -- Compute previous balance
  SELECT COALESCE(current_balance, 0) INTO v_previous_balance
  FROM public.member_balances
  WHERE household_id = v_contribution.household_id
    AND profile_id = v_contribution.profile_id;

  -- Apply reconciliation
  IF v_previous_balance > 0 AND v_delta < 0 THEN
    v_applied_credit := LEAST(v_previous_balance, ABS(v_delta));
    v_final_balance := v_previous_balance + v_delta;

    UPDATE public.member_balances
    SET current_balance = v_final_balance,
        last_updated_at = NOW(),
        notes = 'Auto-reconciled: applied ' || v_applied_credit || '€ credit to cover debt from period ' || v_contribution.year || '-' || v_contribution.month
    WHERE household_id = v_contribution.household_id
      AND profile_id = v_contribution.profile_id;
  ELSE
    v_final_balance := public.update_member_balance(
      v_contribution.household_id,
      v_contribution.profile_id,
      v_delta,
      'Contribution balance from period ' || v_contribution.year || '-' || v_contribution.month
    );
  END IF;

  -- Persist reconciliation record
  INSERT INTO public.contribution_reconciliations (contribution_id, last_reconciled_at, last_result)
  VALUES (p_contribution_id, NOW(), jsonb_build_object(
    'contribution_id', p_contribution_id,
    'period', v_contribution.year || '-' || LPAD(v_contribution.month::TEXT, 2, '0'),
    'expected', v_contribution.expected_amount,
    'paid', v_contribution.paid_amount,
    'delta', v_delta,
    'previous_balance', v_previous_balance,
    'applied_credit', v_applied_credit,
    'final_balance', v_final_balance,
    'reconciled', true
  ))
  ON CONFLICT (contribution_id)
  DO UPDATE SET
    last_reconciled_at = EXCLUDED.last_reconciled_at,
    last_result = EXCLUDED.last_result;

  RETURN (
    SELECT last_result FROM public.contribution_reconciliations WHERE contribution_id = p_contribution_id
  ) || jsonb_build_object('timestamp', NOW());
END;
$$;


ALTER FUNCTION public.reconcile_contribution_balance(p_contribution_id uuid) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION reconcile_contribution_balance(p_contribution_id uuid); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.reconcile_contribution_balance(p_contribution_id uuid) IS 'Idempotent reconciliation for contribution → member_balances with tracking table.';


--
-- Name: refresh_critical_matviews(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.refresh_critical_matviews() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_household_balances;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_pending_contributions;
    REFRESH MATERIALIZED VIEW CONCURRENTLY household_stats;
END;
$$;


ALTER FUNCTION public.refresh_critical_matviews() OWNER TO cuentassik_owner;

--
-- Name: FUNCTION refresh_critical_matviews(); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.refresh_critical_matviews() IS 'Refresca todas las vistas materializadas críticas (SECURITY DEFINER para permisos)';


--
-- Name: refresh_household_stats(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.refresh_household_stats() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Refresco concurrente permite queries durante el refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY household_stats;
  RETURN NULL;
END;
$$;


ALTER FUNCTION public.refresh_household_stats() OWNER TO cuentassik_owner;

--
-- Name: reopen_monthly_period(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.reopen_monthly_period(p_period_id uuid, p_reopened_by uuid, p_reason text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_household_id uuid;
BEGIN
  SELECT household_id INTO v_household_id FROM public.monthly_periods WHERE id = p_period_id;
  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'Período % no encontrado', p_period_id;
  END IF;
  RETURN public.reopen_monthly_period(v_household_id, p_period_id, p_reopened_by, p_reason);
END;
$$;


ALTER FUNCTION public.reopen_monthly_period(p_period_id uuid, p_reopened_by uuid, p_reason text) OWNER TO cuentassik_owner;

--
-- Name: reopen_monthly_period(uuid, uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.reopen_monthly_period(p_household_id uuid, p_period_id uuid, p_reopened_by uuid, p_reason text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_period RECORD;
  v_new_phase text;
  v_new_status text;
  v_prev_phase text;
  v_is_owner boolean;
BEGIN
  -- Cargar período con lock de fila
  SELECT id, household_id, phase
  INTO v_period
  FROM public.monthly_periods
  WHERE id = p_period_id
    AND household_id = p_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período % no pertenece al hogar %', p_period_id, p_household_id;
  END IF;

  -- Permisos: solo owners del hogar
  SELECT public.is_user_household_owner(p_reopened_by, p_household_id)
  INTO v_is_owner;
  IF NOT COALESCE(v_is_owner, false) THEN
    RAISE EXCEPTION 'Solo los owners del hogar pueden revertir fases';
  END IF;

  v_prev_phase := v_period.phase;

  -- Determinar fase anterior válida
  IF v_prev_phase = 'validation' THEN
    v_new_phase := 'preparing';
  ELSIF v_prev_phase = 'active' THEN
    v_new_phase := 'validation';
  ELSIF v_prev_phase = 'closing' THEN
    v_new_phase := 'active';
  ELSIF v_prev_phase = 'closed' THEN
    v_new_phase := 'closing';
  ELSE
    RAISE EXCEPTION 'La fase % no permite retroceso', v_prev_phase;
  END IF;

  v_new_status := public._phase_to_status(v_new_phase);

  UPDATE public.monthly_periods
  SET
    phase = v_new_phase::period_phase_enum,
    status = v_new_status,
    last_reopened_at = NOW(),
    last_reopened_by = p_reopened_by,
    reopened_count = COALESCE(reopened_count, 0) + 1,
    -- Guardar motivo si se proporciona (no sobrescribe si es NULL)
    notes = CASE WHEN p_reason IS NOT NULL THEN p_reason ELSE notes END,
    updated_at = NOW()
  WHERE id = p_period_id;

  -- Audit log
  PERFORM public.log_dual_flow_event(
    p_household_id,
    p_period_id,
    'period.reopened',
    jsonb_build_object('from', v_prev_phase, 'to', v_new_phase, 'reason', p_reason, 'reopened_by', p_reopened_by)
  );

  RETURN p_period_id;
END;
$$;


ALTER FUNCTION public.reopen_monthly_period(p_household_id uuid, p_period_id uuid, p_reopened_by uuid, p_reason text) OWNER TO cuentassik_owner;

--
-- Name: start_monthly_closing(uuid, uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.start_monthly_closing(p_household_id uuid, p_period_id uuid, p_started_by uuid, p_reason text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_period RECORD;
BEGIN
  SELECT
    id,
    household_id,
    phase
  INTO v_period
  FROM public.monthly_periods
  WHERE id = p_period_id
    AND household_id = p_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período % no pertenece al hogar %', p_period_id, p_household_id;
  END IF;

  IF v_period.phase = 'closed' THEN
    RAISE EXCEPTION 'El período ya está cerrado';
  END IF;

  IF v_period.phase <> 'active' THEN
    RAISE EXCEPTION 'Solo se puede iniciar el cierre de un período activo (fase actual: %)', v_period.phase;
  END IF;

  UPDATE public.monthly_periods
  SET
    phase = 'closing',
    status = 'pending_close',
    closing_started_at = NOW(),
    closing_started_by = p_started_by,
    notes = CASE WHEN p_reason IS NOT NULL THEN p_reason ELSE notes END,
    updated_at = NOW()
  WHERE id = p_period_id;

  PERFORM public.log_dual_flow_event(
    p_household_id,
    p_period_id,
    'period.closing_started',
    jsonb_build_object('started_by', p_started_by, 'reason', p_reason)
  );

  RETURN p_period_id;
END;
$$;


ALTER FUNCTION public.start_monthly_closing(p_household_id uuid, p_period_id uuid, p_started_by uuid, p_reason text) OWNER TO cuentassik_owner;

--
-- Name: trigger_auto_pairing(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.trigger_auto_pairing() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_candidate_record RECORD;
  v_threshold numeric(5,2);
BEGIN
  IF NEW.dual_flow_status = 'approved'
     AND (OLD.dual_flow_status IS DISTINCT FROM 'approved')
     AND NEW.auto_paired = false
     AND NEW.transaction_pair_id IS NULL
     AND NEW.flow_type = 'direct'
     AND NEW.type IN ('expense_direct', 'income_direct') THEN

    v_threshold := COALESCE(NEW.pairing_threshold, 5.00);

    SELECT candidate_id, diferencia_importe, diferencia_dias, score
    INTO v_candidate_record
    FROM public.find_pairing_candidates(NEW.household_id, NEW.id, v_threshold)
    ORDER BY score ASC
    LIMIT 1;

    IF FOUND THEN
      PERFORM public.execute_auto_pairing(NEW.id, v_candidate_record.candidate_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_auto_pairing() OWNER TO cuentassik_owner;

--
-- Name: trigger_refresh_transaction_matviews(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.trigger_refresh_transaction_matviews() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Refresar de forma asíncrona (mejor performance)
    PERFORM refresh_critical_matviews();
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.trigger_refresh_transaction_matviews() OWNER TO cuentassik_owner;

--
-- Name: FUNCTION trigger_refresh_transaction_matviews(); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.trigger_refresh_transaction_matviews() IS 'Trigger para refrescar vistas materializadas tras cambios en transacciones';


--
-- Name: update_category_audit(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.update_category_audit() OWNER TO cuentassik_owner;

--
-- Name: update_category_parent_timestamp(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.update_category_parent_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_category_parent_timestamp() OWNER TO cuentassik_owner;

--
-- Name: update_contribution_adjustments_total(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.update_contribution_adjustments_total() OWNER TO cuentassik_owner;

--
-- Name: FUNCTION update_contribution_adjustments_total(); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.update_contribution_adjustments_total() IS 'Actualiza adjustments_total, adjustments_paid_amount y recalcula expected_amount';


--
-- Name: update_contribution_audit(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.update_contribution_audit() OWNER TO cuentassik_owner;

--
-- Name: update_household_audit(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.update_household_audit() OWNER TO cuentassik_owner;

--
-- Name: update_member_balance(uuid, uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.update_member_balance(p_household_id uuid, p_profile_id uuid, p_delta_amount numeric, p_notes text DEFAULT NULL::text) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  INSERT INTO member_balances (household_id, profile_id, current_balance, last_updated_at, notes)
  VALUES (p_household_id, p_profile_id, p_delta_amount, NOW(), p_notes)
  ON CONFLICT (household_id, profile_id) 
  DO UPDATE SET 
    current_balance = member_balances.current_balance + p_delta_amount,
    last_updated_at = NOW(),
    notes = COALESCE(p_notes, member_balances.notes)
  RETURNING current_balance INTO v_new_balance;
  
  RETURN v_new_balance;
END;
$$;


ALTER FUNCTION public.update_member_balance(p_household_id uuid, p_profile_id uuid, p_delta_amount numeric, p_notes text) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION update_member_balance(p_household_id uuid, p_profile_id uuid, p_delta_amount numeric, p_notes text); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.update_member_balance(p_household_id uuid, p_profile_id uuid, p_delta_amount numeric, p_notes text) IS 'Actualiza balance de miembro sumando delta. Retorna nuevo balance.';


--
-- Name: update_member_credit_audit(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.update_member_credit_audit() OWNER TO cuentassik_owner;

--
-- Name: update_personal_loans_timestamp(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.update_personal_loans_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_personal_loans_timestamp() OWNER TO cuentassik_owner;

--
-- Name: update_profile_emails_updated_at(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.update_profile_emails_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_profile_emails_updated_at() OWNER TO cuentassik_owner;

--
-- Name: update_refund_claims_updated_at(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.update_refund_claims_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_refund_claims_updated_at() OWNER TO cuentassik_owner;

--
-- Name: update_subcategory_timestamp(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.update_subcategory_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_subcategory_timestamp() OWNER TO cuentassik_owner;

--
-- Name: update_transaction_audit(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.update_transaction_audit() OWNER TO cuentassik_owner;

--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at() OWNER TO cuentassik_owner;

--
-- Name: update_user_active_household_timestamp(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.update_user_active_household_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_active_household_timestamp() OWNER TO cuentassik_owner;

--
-- Name: validate_household_has_owner(uuid); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
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


ALTER FUNCTION public.validate_household_has_owner(p_household_id uuid) OWNER TO cuentassik_owner;

--
-- Name: FUNCTION validate_household_has_owner(p_household_id uuid); Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON FUNCTION public.validate_household_has_owner(p_household_id uuid) IS 'Valida que un hogar específico tenga al menos un owner. Retorna TRUE si cumple la regla.';


--
-- Name: validate_primary_email_exists(); Type: FUNCTION; Schema: public; Owner: cuentassik_owner
--

CREATE FUNCTION public.validate_primary_email_exists() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_primary_count INTEGER;
BEGIN
  -- Después de DELETE o UPDATE que quite el primary
  SELECT COUNT(*) INTO v_primary_count
  FROM profile_emails
  WHERE profile_id = COALESCE(OLD.profile_id, NEW.profile_id)
    AND is_primary = true;

  -- Si no hay ningún primary, promover el más antiguo
  IF v_primary_count = 0 THEN
    UPDATE profile_emails
    SET is_primary = true
    WHERE id = (
      SELECT id
      FROM profile_emails
      WHERE profile_id = COALESCE(OLD.profile_id, NEW.profile_id)
      ORDER BY added_at ASC, id ASC
      LIMIT 1
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.validate_primary_email_exists() OWNER TO cuentassik_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _migrations; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public._migrations (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    applied_by character varying(100) DEFAULT CURRENT_USER NOT NULL,
    execution_time_ms integer,
    status character varying(20) DEFAULT 'success'::character varying,
    output_log text,
    error_log text,
    checksum character varying(64),
    description text,
    CONSTRAINT _migrations_status_check CHECK (((status)::text = ANY ((ARRAY['success'::character varying, 'failed'::character varying, 'rolled_back'::character varying])::text[])))
);


ALTER TABLE public._migrations OWNER TO cuentassik_owner;

--
-- Name: TABLE _migrations; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public._migrations IS 'Tabla de control de migraciones del sistema v2.1.0+';


--
-- Name: COLUMN _migrations.migration_name; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public._migrations.migration_name IS 'Nombre del archivo de migración';


--
-- Name: COLUMN _migrations.applied_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public._migrations.applied_at IS 'Timestamp de aplicación';


--
-- Name: COLUMN _migrations.applied_by; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public._migrations.applied_by IS 'Usuario PostgreSQL que aplicó la migración';


--
-- Name: COLUMN _migrations.execution_time_ms; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public._migrations.execution_time_ms IS 'Tiempo de ejecución en milisegundos';


--
-- Name: COLUMN _migrations.status; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public._migrations.status IS 'Estado: success, failed, rolled_back';


--
-- Name: COLUMN _migrations.checksum; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public._migrations.checksum IS 'Hash MD5 del contenido del archivo';


--
-- Name: _migrations_backup_pre_v2_1_0; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._migrations_backup_pre_v2_1_0 (
    id integer,
    migration_name character varying(255),
    applied_at timestamp with time zone,
    applied_by character varying(100),
    checksum character varying(64),
    execution_time_ms integer,
    description text
);


ALTER TABLE public._migrations_backup_pre_v2_1_0 OWNER TO postgres;

--
-- Name: _migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: cuentassik_owner
--

CREATE SEQUENCE public._migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public._migrations_id_seq OWNER TO cuentassik_owner;

--
-- Name: _migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cuentassik_owner
--

ALTER SEQUENCE public._migrations_id_seq OWNED BY public._migrations.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: cuentassik_owner
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
    updated_at timestamp with time zone DEFAULT now(),
    parent_id uuid,
    display_order integer DEFAULT 0
);


ALTER TABLE public.categories OWNER TO cuentassik_owner;

--
-- Name: TABLE categories; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.categories IS 'Tabla de categorías de transacciones. Actualizada con categoría Lavandería para gastos domésticos.';


--
-- Name: COLUMN categories.created_by_profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.categories.created_by_profile_id IS 'ID del usuario que CREÓ esta categoría en el hogar.';


--
-- Name: COLUMN categories.created_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.categories.created_at IS 'Fecha de creación de la categoría.';


--
-- Name: COLUMN categories.updated_by_profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.categories.updated_by_profile_id IS 'ID del usuario que MODIFICÓ esta categoría por última vez.';


--
-- Name: COLUMN categories.updated_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.categories.updated_at IS 'Fecha de la última modificación de la categoría.';


--
-- Name: COLUMN categories.parent_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.categories.parent_id IS 'Reference to parent category group (NULL = legacy/ungrouped)';


--
-- Name: category_parents; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.category_parents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid,
    name text NOT NULL,
    icon text NOT NULL,
    type text NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT category_parents_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])))
);


ALTER TABLE public.category_parents OWNER TO cuentassik_owner;

--
-- Name: TABLE category_parents; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.category_parents IS 'Top-level category groups (e.g., Hogar, Suministros, Alimentación)';


--
-- Name: contribution_adjustment_templates; Type: TABLE; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.contribution_adjustment_templates OWNER TO cuentassik_owner;

--
-- Name: TABLE contribution_adjustment_templates; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.contribution_adjustment_templates IS 'DEPRECATED: Será reemplazado por sistema de doble flujo (flow_type en transactions)';


--
-- Name: contribution_adjustments; Type: TABLE; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.contribution_adjustments OWNER TO cuentassik_owner;

--
-- Name: TABLE contribution_adjustments; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.contribution_adjustments IS 'DEPRECATED: Será reemplazado por sistema de doble flujo (flow_type en transactions)';


--
-- Name: contribution_periods; Type: TABLE; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.contribution_periods OWNER TO cuentassik_owner;

--
-- Name: TABLE contribution_periods; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.contribution_periods IS 'Períodos de contribución con estados SETUP→LOCKED→CLOSED para controlar flujos de transacciones';


--
-- Name: COLUMN contribution_periods.status; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.contribution_periods.status IS 'SETUP: solo gastos directos, LOCKED: ambos flujos, CLOSED: período cerrado';


--
-- Name: COLUMN contribution_periods.locked_by; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.contribution_periods.locked_by IS 'Owner que bloqueó el período y calculó contribuciones';


--
-- Name: COLUMN contribution_periods.closed_by; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.contribution_periods.closed_by IS 'Owner que cerró el período';


--
-- Name: contribution_reconciliations; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.contribution_reconciliations (
    contribution_id uuid NOT NULL,
    last_reconciled_at timestamp with time zone DEFAULT now() NOT NULL,
    last_result jsonb,
    reconciled_by uuid,
    notes text
);


ALTER TABLE public.contribution_reconciliations OWNER TO cuentassik_owner;

--
-- Name: TABLE contribution_reconciliations; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.contribution_reconciliations IS 'Registro idempotente de reconciliaciones por contribución.';


--
-- Name: contributions; Type: TABLE; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.contributions OWNER TO cuentassik_owner;

--
-- Name: COLUMN contributions.created_by_profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.contributions.created_by_profile_id IS 'ID del usuario que CALCULÓ/CREÓ este registro de contribución. Puede ser diferente de profile_id (a quien pertenece).';


--
-- Name: COLUMN contributions.updated_by_profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.contributions.updated_by_profile_id IS 'ID del usuario que MODIFICÓ esta contribución por última vez.';


--
-- Name: COLUMN contributions.adjustments_paid_amount; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.contributions.adjustments_paid_amount IS 'Suma absoluta de ajustes que tienen movimiento vinculado (prepagos ya realizados)';


--
-- Name: credit_refund_requests; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.credit_refund_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    notes text,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_by uuid NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    refund_transaction_id uuid,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    refund_type text DEFAULT 'balance'::text,
    CONSTRAINT credit_refund_requests_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT credit_refund_requests_refund_type_check CHECK ((refund_type = ANY (ARRAY['balance'::text, 'transaction'::text]))),
    CONSTRAINT credit_refund_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.credit_refund_requests OWNER TO cuentassik_owner;

--
-- Name: COLUMN credit_refund_requests.refund_transaction_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.credit_refund_requests.refund_transaction_id IS 'Si refund_type=transaction: ID de la transacción de gasto vinculada que justifica el reembolso';


--
-- Name: COLUMN credit_refund_requests.refund_type; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.credit_refund_requests.refund_type IS 'Tipo de reembolso: 
   - balance: Reembolso de saldo acumulado a favor (requiere validación de owner, genera movimiento)
   - transaction: Reembolso asociado a transacción existente (sin cálculos extra, solo resta saldo)';


--
-- Name: dual_flow_config; Type: TABLE; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.dual_flow_config OWNER TO cuentassik_owner;

--
-- Name: TABLE dual_flow_config; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.dual_flow_config IS 'Configuración personalizable del sistema dual-flow por hogar';


--
-- Name: dual_flow_events; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.dual_flow_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    period_id uuid,
    event_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


ALTER TABLE public.dual_flow_events OWNER TO cuentassik_owner;

--
-- Name: TABLE dual_flow_events; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.dual_flow_events IS 'Bitácora de eventos del sistema dual-flow (periodos, contribuciones y transacciones)';


--
-- Name: COLUMN dual_flow_events.event_type; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.dual_flow_events.event_type IS 'Identificador canónico del evento (ej. period.validated, period.closed)';


--
-- Name: COLUMN dual_flow_events.payload; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.dual_flow_events.payload IS 'Información adicional del evento en formato JSON';


--
-- Name: dual_flow_transactions; Type: TABLE; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.dual_flow_transactions OWNER TO cuentassik_owner;

--
-- Name: TABLE dual_flow_transactions; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.dual_flow_transactions IS 'Tabla principal del sistema dual-flow con 4 tipos de transacciones y auto-pairing';


--
-- Name: email_invitations; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.email_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    invited_email text NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    accepted_by_profile_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT email_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'cancelled'::text])))
);


ALTER TABLE public.email_invitations OWNER TO cuentassik_owner;

--
-- Name: TABLE email_invitations; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.email_invitations IS 'Invitaciones para compartir acceso a perfil mediante email secundario. Permisos: cuentassik_user tiene SELECT, INSERT, UPDATE, DELETE';


--
-- Name: COLUMN email_invitations.profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.email_invitations.profile_id IS 'Perfil que genera la invitación (el que comparte su cuenta)';


--
-- Name: COLUMN email_invitations.invited_email; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.email_invitations.invited_email IS 'Email invitado a ser alias del perfil';


--
-- Name: COLUMN email_invitations.token; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.email_invitations.token IS 'Token único para validar la invitación (UUID)';


--
-- Name: COLUMN email_invitations.expires_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.email_invitations.expires_at IS 'Fecha de expiración de la invitación (default: 7 días)';


--
-- Name: COLUMN email_invitations.accepted_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.email_invitations.accepted_at IS 'Timestamp cuando se aceptó la invitación';


--
-- Name: COLUMN email_invitations.accepted_by_profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.email_invitations.accepted_by_profile_id IS 'Perfil temporal que aceptó (antes de merge). NULL si aún no aceptada o si perfil fue eliminado';


--
-- Name: COLUMN email_invitations.status; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.email_invitations.status IS 'Estado: pending (activa), accepted (aceptada), expired (vencida), cancelled (cancelada por invitador)';


--
-- Name: COLUMN email_invitations.metadata; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.email_invitations.metadata IS 'Datos adicionales: IP, user agent, etc.';


--
-- Name: household_members; Type: TABLE; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.household_members OWNER TO cuentassik_owner;

--
-- Name: COLUMN household_members.is_owner; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.household_members.is_owner IS 'Indica si el usuario es propietario del hogar. Puede gestionar configuración, invitar miembros, etc.';


--
-- Name: COLUMN household_members.invited_by_profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.household_members.invited_by_profile_id IS 'ID del usuario que invitó a este miembro al hogar. NULL si fue el creador del hogar.';


--
-- Name: COLUMN household_members.joined_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.household_members.joined_at IS 'Fecha en que el usuario se unió al hogar (aceptó la invitación).';


--
-- Name: CONSTRAINT chk_household_member_role ON household_members; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON CONSTRAINT chk_household_member_role ON public.household_members IS 'Valida que el rol sea exactamente ''owner'' o ''member''. Previene valores incorrectos.';


--
-- Name: household_savings; Type: TABLE; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.household_savings OWNER TO cuentassik_owner;

--
-- Name: household_settings; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.household_settings (
    household_id uuid NOT NULL,
    monthly_contribution_goal numeric,
    currency text,
    calculation_type text,
    updated_at timestamp with time zone,
    updated_by uuid
);


ALTER TABLE public.household_settings OWNER TO cuentassik_owner;

--
-- Name: households; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.households (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    status text,
    settings_archivo jsonb,
    created_by_profile_id uuid,
    updated_by_profile_id uuid,
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


ALTER TABLE public.households OWNER TO cuentassik_owner;

--
-- Name: COLUMN households.settings_archivo; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.households.settings_archivo IS 'LEGACY: Campo jsonb de configuración antigua, archivado. No usar en lógica actual.';


--
-- Name: COLUMN households.created_by_profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.households.created_by_profile_id IS 'ID del usuario que CREÓ este hogar. Por defecto es owner del mismo.';


--
-- Name: COLUMN households.updated_by_profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.households.updated_by_profile_id IS 'ID del usuario que MODIFICÓ la configuración del hogar por última vez.';


--
-- Name: COLUMN households.updated_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.households.updated_at IS 'Fecha de la última modificación del hogar.';


--
-- Name: COLUMN households.deleted_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.households.deleted_at IS 'Timestamp de eliminación lógica (soft delete). NULL = hogar activo. Permite auditoría y recuperación.';


--
-- Name: household_stats; Type: MATERIALIZED VIEW; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.household_stats OWNER TO cuentassik_owner;

--
-- Name: MATERIALIZED VIEW household_stats; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON MATERIALIZED VIEW public.household_stats IS 'Vista materializada con estadísticas pre-calculadas de hogares. Optimiza queries de conteo de miembros y roles.';


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.invitations OWNER TO cuentassik_owner;

--
-- Name: COLUMN invitations.created_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.invitations.created_at IS 'Fecha en que se creó/envió la invitación.';


--
-- Name: COLUMN invitations.invited_by_profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.invitations.invited_by_profile_id IS 'ID del usuario que ENVIÓ esta invitación (owner del hogar).';


--
-- Name: joint_accounts; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.joint_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    display_name character varying(100) DEFAULT 'Cuenta Común'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.joint_accounts OWNER TO cuentassik_owner;

--
-- Name: TABLE joint_accounts; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.joint_accounts IS 'Cuenta conjunta/común de cada hogar. Miembro virtual permanente del sistema.';


--
-- Name: COLUMN joint_accounts.household_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.joint_accounts.household_id IS 'Hogar al que pertenece esta cuenta común (uno por hogar).';


--
-- Name: COLUMN joint_accounts.display_name; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.joint_accounts.display_name IS 'Nombre visible de la cuenta común. Default: "Cuenta Común".';


--
-- Name: journal_adjustments; Type: TABLE; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.journal_adjustments OWNER TO cuentassik_owner;

--
-- Name: TABLE journal_adjustments; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.journal_adjustments IS 'DEPRECATED: Será reemplazado por sistema de doble flujo (flow_type en transactions)';


--
-- Name: journal_invitations; Type: TABLE; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.journal_invitations OWNER TO cuentassik_owner;

--
-- Name: journal_roles; Type: TABLE; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.journal_roles OWNER TO cuentassik_owner;

--
-- Name: journal_transactions; Type: TABLE; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.journal_transactions OWNER TO cuentassik_owner;

--
-- Name: member_balances; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.member_balances (
    household_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    current_balance numeric(10,2) DEFAULT 0 NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);


ALTER TABLE public.member_balances OWNER TO cuentassik_owner;

--
-- Name: TABLE member_balances; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.member_balances IS 'Balance global de crédito/deuda por miembro. Positivo = hogar debe, negativo = miembro debe.';


--
-- Name: COLUMN member_balances.current_balance; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.member_balances.current_balance IS 'Balance actual: (+) hogar debe a miembro, (-) miembro debe al hogar, (0) saldado';


--
-- Name: member_credits; Type: TABLE; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.member_credits OWNER TO cuentassik_owner;

--
-- Name: COLUMN member_credits.reserved_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.member_credits.reserved_at IS 'Timestamp cuando el crédito fue reservado para aplicar al mes siguiente.
NULL = crédito activo (puede gastarse, forma parte del balance principal)
NOT NULL = crédito reservado (bloqueado para próximo mes, NO disponible para gastos)

Cuando un miembro decide "aplicar al mes siguiente" su crédito, se marca reserved_at.
Esto retira el crédito del balance principal disponible inmediatamente.';


--
-- Name: COLUMN member_credits.created_by_profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.member_credits.created_by_profile_id IS 'ID del usuario que OTORGÓ este crédito al miembro.';


--
-- Name: COLUMN member_credits.updated_by_profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.member_credits.updated_by_profile_id IS 'ID del usuario que MODIFICÓ este crédito por última vez.';


--
-- Name: COLUMN member_credits.updated_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.member_credits.updated_at IS 'Fecha de la última modificación del crédito.';


--
-- Name: member_incomes; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.member_incomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid,
    profile_id uuid,
    monthly_income numeric,
    effective_from date,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.member_incomes OWNER TO cuentassik_owner;

--
-- Name: monthly_periods; Type: TABLE; Schema: public; Owner: cuentassik_owner
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
    created_at timestamp with time zone DEFAULT now(),
    phase public.period_phase_enum DEFAULT 'preparing'::public.period_phase_enum NOT NULL,
    validated_at timestamp with time zone,
    validated_by uuid,
    locked_at timestamp with time zone,
    locked_by uuid,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    opened_by uuid,
    closing_started_at timestamp with time zone,
    closing_started_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reopened_count integer DEFAULT 0 NOT NULL,
    last_reopened_at timestamp with time zone,
    last_reopened_by uuid,
    contribution_disabled boolean DEFAULT false NOT NULL,
    snapshot_contribution_goal numeric(10,2) DEFAULT NULL::numeric,
    CONSTRAINT monthly_periods_status_check CHECK ((status = ANY (ARRAY['open'::text, 'pending_close'::text, 'closed'::text])))
);


ALTER TABLE public.monthly_periods OWNER TO cuentassik_owner;

--
-- Name: TABLE monthly_periods; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.monthly_periods IS 'Períodos mensuales con balance de apertura/cierre para contabilidad profesional';


--
-- Name: COLUMN monthly_periods.status; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.status IS 'Estado: open (actual), pending_close (pasado sin cerrar), closed (cerrado)';


--
-- Name: COLUMN monthly_periods.opening_balance; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.opening_balance IS 'Balance al inicio del mes (heredado del mes anterior)';


--
-- Name: COLUMN monthly_periods.closing_balance; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.closing_balance IS 'Balance al final del mes (se convierte en opening_balance del siguiente)';


--
-- Name: COLUMN monthly_periods.phase; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.phase IS 'Fase operativa del período mensual (preparing, validation, active, closing o closed)';


--
-- Name: COLUMN monthly_periods.validated_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.validated_at IS 'Momento en el que el período fue validado para activar contribuciones';


--
-- Name: COLUMN monthly_periods.validated_by; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.validated_by IS 'Perfil que validó el período para activar contribuciones';


--
-- Name: COLUMN monthly_periods.locked_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.locked_at IS 'Marca temporal de cierre de aportaciones manuales en el período';


--
-- Name: COLUMN monthly_periods.locked_by; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.locked_by IS 'Perfil que ejecutó el cierre manual de aportaciones';


--
-- Name: COLUMN monthly_periods.opened_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.opened_at IS 'Fecha y hora en la que el período pasó a fase activa';


--
-- Name: COLUMN monthly_periods.opened_by; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.opened_by IS 'Perfil que activó el período';


--
-- Name: COLUMN monthly_periods.closing_started_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.closing_started_at IS 'Fecha y hora en la que se inició el cierre del período';


--
-- Name: COLUMN monthly_periods.closing_started_by; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.closing_started_by IS 'Perfil que inició el cierre del período';


--
-- Name: COLUMN monthly_periods.updated_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.updated_at IS 'Marca de tiempo de la última actualización del período mensual';


--
-- Name: COLUMN monthly_periods.reopened_count; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.reopened_count IS 'Número de veces que el período ha retrocedido de fase (reaperturas).';


--
-- Name: COLUMN monthly_periods.last_reopened_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.last_reopened_at IS 'Última fecha/hora de retroceso de fase.';


--
-- Name: COLUMN monthly_periods.last_reopened_by; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.last_reopened_by IS 'Perfil que ejecutó el último retroceso de fase.';


--
-- Name: COLUMN monthly_periods.contribution_disabled; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.contribution_disabled IS 'Si TRUE, este período ignora el sistema de contribuciones.
Útil para meses pasados donde no se hizo ingreso común y todo se manejó con gastos directos.
Cuando TRUE, las contribuciones se establecen a 0€ para todos los miembros.';


--
-- Name: COLUMN monthly_periods.snapshot_contribution_goal; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.monthly_periods.snapshot_contribution_goal IS 'Snapshot del objetivo de contribución al momento de bloquear el período.
   NULL = período en preparing (usa valor actual de household_settings).
   NOT NULL = período bloqueado/cerrado (usa este valor histórico).
   Se guarda automáticamente al ejecutar lockPeriod() o lock_contributions_period().';


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: cuentassik_owner
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
    performed_by_email_deprecated text,
    performed_at timestamp with time zone,
    dual_flow_status public.dual_flow_status DEFAULT 'completed'::public.dual_flow_status NOT NULL,
    requires_approval boolean DEFAULT false NOT NULL,
    auto_paired boolean DEFAULT false NOT NULL,
    review_days integer DEFAULT 7,
    pairing_threshold numeric(5,2) DEFAULT 5.00,
    approved_at timestamp with time zone,
    approved_by uuid,
    refund_claim_id uuid,
    subcategory_id uuid,
    performed_by_profile_id uuid,
    is_compensatory_income boolean DEFAULT false NOT NULL,
    transaction_number integer,
    CONSTRAINT check_direct_expenses_have_payer CHECK ((((flow_type = 'direct'::text) AND (type = 'expense'::text) AND (real_payer_id IS NOT NULL)) OR ((flow_type <> 'direct'::text) OR (type <> 'expense'::text)))),
    CONSTRAINT check_direct_income_paired CHECK ((((flow_type = 'direct'::text) AND (type = 'income'::text) AND (transaction_pair_id IS NOT NULL)) OR ((flow_type <> 'direct'::text) OR (type <> 'income'::text)))),
    CONSTRAINT check_flow_type CHECK ((flow_type = ANY (ARRAY['common'::text, 'direct'::text]))),
    CONSTRAINT check_transaction_pair_consistency CHECK ((((flow_type = 'direct'::text) AND (transaction_pair_id IS NOT NULL)) OR ((flow_type = 'common'::text) AND (transaction_pair_id IS NULL)))),
    CONSTRAINT transactions_flow_type_check CHECK ((flow_type = ANY (ARRAY['common'::text, 'direct'::text]))),
    CONSTRAINT transactions_pairing_threshold_positive CHECK (((pairing_threshold IS NULL) OR (pairing_threshold >= (0)::numeric))),
    CONSTRAINT transactions_review_days_positive CHECK (((review_days IS NULL) OR (review_days >= 0))),
    CONSTRAINT transactions_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text, 'income_direct'::text, 'expense_direct'::text])))
);


ALTER TABLE public.transactions OWNER TO cuentassik_owner;

--
-- Name: TABLE transactions; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.transactions IS 'Tabla mejorada con defaults automáticos para id y timestamps';


--
-- Name: COLUMN transactions.id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.id IS 'UUID generado automáticamente por PostgreSQL';


--
-- Name: COLUMN transactions.paid_by; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.paid_by IS '⚠️ DEPRECATED (Issue #33): Campo calculado dinámicamente.
   
   REGLAS DE CÁLCULO:
   - Gastos (expense, expense_direct): paid_by = joint_account_id (Cuenta Común)
   - Ingresos (income, income_direct): paid_by = performed_by_profile_id (Miembro)
   
   Usar performed_by_profile_id como fuente única de verdad.
   Este campo almacenado será eliminado físicamente en una migración futura.
   Deprecado: 02 November 2025';


--
-- Name: COLUMN transactions.created_by_profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.created_by_profile_id IS '⚠️ DEPRECATED (Issue #31): Duplica 100% profile_id.
   Usar profile_id en su lugar para auditoría.
   Este campo será eliminado físicamente en una migración futura.
   Deprecado: 02 November 2025';


--
-- Name: COLUMN transactions.updated_by_profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.updated_by_profile_id IS 'ID del usuario que MODIFICÓ esta transacción por última vez.';


--
-- Name: COLUMN transactions.flow_type; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.flow_type IS 'Tipo de flujo: common (cuenta común) o direct (gastos directos de miembros)';


--
-- Name: COLUMN transactions.transaction_pair_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.transaction_pair_id IS 'UUID que vincula gastos directos con sus ingresos automáticos correspondientes';


--
-- Name: COLUMN transactions.created_by_member_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.created_by_member_id IS 'Miembro que creó la transacción (puede diferir de quien pagó)';


--
-- Name: COLUMN transactions.real_payer_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.real_payer_id IS '⚠️ DEPRECATED (Issue #30): Campo redundante con performed_by_profile_id.

   USAR EN SU LUGAR: performed_by_profile_id

   REGLA DE NEGOCIO (transacciones directas):
   - performed_by_profile_id = quien pagó de su bolsillo (CAMPO ÚNICO DE VERDAD)
   - real_payer_id = MISMO VALOR (redundante, mantenido por compatibilidad)
   - profile_id = quien registró en el sistema (auditoría)

   NOTA: Para transacciones no directas (common), real_payer_id = NULL siempre.

   Deprecado: 02 November 2025
   Eliminar en: v3.0.0 (tras periodo de gracia de 6 meses)';


--
-- Name: COLUMN transactions.created_by_email; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.created_by_email IS 'Email del usuario que creó el registro en el sistema';


--
-- Name: COLUMN transactions.performed_by_email_deprecated; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.performed_by_email_deprecated IS '⚠️ DEPRECADO: Reemplazado por performed_by_profile_id (UUID fuerte).

   Mantener temporalmente para:
   - Auditoría de la migración
   - Rollback si fuera necesario
   - Verificación de datos históricos

   ELIMINAR EN FUTURO: Una vez verificada estabilidad del nuevo campo.

   Historial:
   - Creado: [fecha original]
   - Deprecado: 2025-11-01 (Issue #19, #20)
   - Reemplazado por: performed_by_profile_id';


--
-- Name: COLUMN transactions.performed_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.performed_at IS 'Fecha/hora real cuando se realizó la transacción (diferente de created_at que es cuando se registró en el sistema)';


--
-- Name: COLUMN transactions.dual_flow_status; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.dual_flow_status IS 'Estado operativo dual-flow de la transacción';


--
-- Name: COLUMN transactions.requires_approval; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.requires_approval IS 'Indica si la transacción necesita aprobación manual';


--
-- Name: COLUMN transactions.auto_paired; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.auto_paired IS 'Marca si la transacción fue emparejada automáticamente';


--
-- Name: COLUMN transactions.review_days; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.review_days IS 'Días límite para revisión antes de la auto-aprobación';


--
-- Name: COLUMN transactions.pairing_threshold; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.pairing_threshold IS 'Umbral de importe para emparejamiento automático (diferencia aceptada)';


--
-- Name: COLUMN transactions.approved_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.approved_at IS 'Fecha/hora en la que la transacción fue aprobada';


--
-- Name: COLUMN transactions.approved_by; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.approved_by IS 'Perfil que aprobó la transacción dual-flow';


--
-- Name: COLUMN transactions.refund_claim_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.refund_claim_id IS 'UUID que vincula un reembolso DECLARADO a su gasto directo correspondiente. 
   Permite saber: "Este gasto directo incluye un reembolso de X euros".
   NULL = sin vinculación de reembolso (gasto directo normal o reembolso activo independiente).
   Self-referencing: refund_claim_id apunta a otra fila en transactions (el gasto directo que respalda el reembolso).';


--
-- Name: COLUMN transactions.subcategory_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.subcategory_id IS 'Optional detailed subcategory (migrated from description field)';


--
-- Name: COLUMN transactions.performed_by_profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.performed_by_profile_id IS 'UUID del miembro que FÍSICAMENTE ejecutó la transacción (pasó tarjeta, hizo ingreso).

   Semántica:
   - Gastos comunes: quien pasó la tarjeta (diferente de paid_by = Cuenta Común)
   - Ingresos comunes: quien hizo el ingreso (normalmente coincide con paid_by)
   - Gastos directos: quien realizó el gasto (coincide con real_payer_id)
   - Ingresos compensatorios: NULL (automático del sistema, no hay ejecutor físico)

   Complementa a paid_by (origen del dinero) para tracking dual completo.';


--
-- Name: COLUMN transactions.is_compensatory_income; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.is_compensatory_income IS 'TRUE si es un ingreso compensatorio creado automáticamente al registrar un gasto directo. Estos ingresos NO deben editarse directamente, solo desde el gasto asociado.';


--
-- Name: COLUMN transactions.transaction_number; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.transactions.transaction_number IS 'Número secuencial único por household. Asignado automáticamente por trigger en nuevas inserciones.';


--
-- Name: mv_household_balances; Type: MATERIALIZED VIEW; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.mv_household_balances OWNER TO cuentassik_owner;

--
-- Name: MATERIALIZED VIEW mv_household_balances; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON MATERIALIZED VIEW public.mv_household_balances IS 'Balance agregado por hogar - REFRESH cada cambio en transacciones';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: cuentassik_owner
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
    is_system_admin boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.profiles OWNER TO cuentassik_owner;

--
-- Name: COLUMN profiles.id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.profiles.id IS 'UUID único del perfil, generado automáticamente';


--
-- Name: COLUMN profiles.is_system_admin; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.profiles.is_system_admin IS 'Indica si el usuario es administrador de la aplicación (acceso a /admin). Campo global, no depende de hogares.';


--
-- Name: COLUMN profiles.deleted_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.profiles.deleted_at IS 'Timestamp de borrado lógico. NULL = perfil activo, NOT NULL = perfil eliminado';


--
-- Name: mv_member_pending_contributions; Type: MATERIALIZED VIEW; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.mv_member_pending_contributions OWNER TO cuentassik_owner;

--
-- Name: MATERIALIZED VIEW mv_member_pending_contributions; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON MATERIALIZED VIEW public.mv_member_pending_contributions IS 'Contribuciones pendientes por miembro considerando gastos directos';


--
-- Name: personal_loans; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.personal_loans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    requested_by uuid NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    withdrawal_transaction_id uuid,
    settled_at timestamp with time zone,
    settled_by uuid,
    settlement_transaction_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT personal_loans_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT personal_loans_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'settled'::text])))
);


ALTER TABLE public.personal_loans OWNER TO cuentassik_owner;

--
-- Name: TABLE personal_loans; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.personal_loans IS 'Préstamos personales solicitados por miembros con aprobación del owner.';


--
-- Name: COLUMN personal_loans.status; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.personal_loans.status IS 'Estado: pending (pendiente aprobación), approved (aprobado y retirado), rejected (rechazado), settled (liquidado)';


--
-- Name: profile_emails; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.profile_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    email text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    verified_at timestamp with time zone,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    added_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profile_emails_email_valid CHECK ((email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))
);


ALTER TABLE public.profile_emails OWNER TO cuentassik_owner;

--
-- Name: TABLE profile_emails; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.profile_emails IS 'Emails aliases para perfiles. Permite múltiples emails por usuario con gestión de email principal.';


--
-- Name: COLUMN profile_emails.profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.profile_emails.profile_id IS 'Referencia al perfil propietario de este email';


--
-- Name: COLUMN profile_emails.email; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.profile_emails.email IS 'Dirección de email. Debe ser única en todo el sistema.';


--
-- Name: COLUMN profile_emails.is_primary; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.profile_emails.is_primary IS 'Indica si este es el email principal del usuario. Solo puede haber uno por perfil.';


--
-- Name: COLUMN profile_emails.verified; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.profile_emails.verified IS 'Indica si el email ha sido verificado por el usuario';


--
-- Name: COLUMN profile_emails.verified_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.profile_emails.verified_at IS 'Timestamp de cuándo se verificó el email';


--
-- Name: COLUMN profile_emails.added_by; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.profile_emails.added_by IS 'Referencia al usuario que agregó este email (normalmente el mismo profile_id)';


--
-- Name: refund_claims; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.refund_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    household_id uuid NOT NULL,
    expense_transaction_id uuid NOT NULL,
    refund_transaction_id uuid,
    profile_id uuid NOT NULL,
    refund_amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    created_by_profile_id uuid,
    approved_at timestamp with time zone,
    approved_by_profile_id uuid,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT expense_must_be_direct CHECK (true),
    CONSTRAINT refund_claims_refund_amount_check CHECK ((refund_amount > (0)::numeric)),
    CONSTRAINT refund_claims_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.refund_claims OWNER TO cuentassik_owner;

--
-- Name: TABLE refund_claims; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.refund_claims IS 'Reclamos de reembolso: cuando un gasto directo (expense_direct) incluye un reembolso de la aportación.
   Ejemplo: "El gasto de vivienda de 300€ incluye un reembolso de 50€"
   Permite que el owner apruebe o rechace el reclamo antes de descuento.';


--
-- Name: COLUMN refund_claims.status; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.refund_claims.status IS 'pending: Reclamo en espera de aprobación del owner. 
   approved: Owner aprobó, se cuenta el reembolso en el balance.
   rejected: Owner rechazó, no se cuenta el reembolso.';


--
-- Name: seq_transaction_pair_ref; Type: SEQUENCE; Schema: public; Owner: cuentassik_owner
--

CREATE SEQUENCE public.seq_transaction_pair_ref
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.seq_transaction_pair_ref OWNER TO cuentassik_owner;

--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.subcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    name text NOT NULL,
    icon text,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.subcategories OWNER TO cuentassik_owner;

--
-- Name: TABLE subcategories; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.subcategories IS 'Detailed subcategories (e.g., Mercadona, Vodafone, Iberdrola)';


--
-- Name: system_admins; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.system_admins (
    user_id uuid NOT NULL,
    granted_by uuid,
    created_at timestamp with time zone,
    notes text,
    profile_id uuid
);


ALTER TABLE public.system_admins OWNER TO cuentassik_owner;

--
-- Name: user_active_household; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.user_active_household (
    profile_id uuid NOT NULL,
    household_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_active_household OWNER TO cuentassik_owner;

--
-- Name: TABLE user_active_household; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TABLE public.user_active_household IS 'Tabla de tracking del hogar activo por usuario. Permite multi-hogar con selección rápida del contexto actual.';


--
-- Name: COLUMN user_active_household.profile_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.user_active_household.profile_id IS 'ID del perfil del usuario (profiles.id).';


--
-- Name: COLUMN user_active_household.household_id; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.user_active_household.household_id IS 'ID del hogar actualmente activo para este usuario.';


--
-- Name: COLUMN user_active_household.updated_at; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON COLUMN public.user_active_household.updated_at IS 'Última vez que el usuario cambió su hogar activo.';


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: cuentassik_owner
--

CREATE TABLE public.user_settings (
    profile_id uuid NOT NULL,
    active_household_id uuid,
    preferences jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.user_settings OWNER TO cuentassik_owner;

--
-- Name: v_dual_flow_balance; Type: VIEW; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.v_dual_flow_balance OWNER TO cuentassik_owner;

--
-- Name: v_dual_flow_metrics; Type: VIEW; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.v_dual_flow_metrics OWNER TO cuentassik_owner;

--
-- Name: v_dual_flow_transactions_unified; Type: VIEW; Schema: public; Owner: cuentassik_owner
--

CREATE VIEW public.v_dual_flow_transactions_unified AS
 SELECT t.id,
    t.household_id,
    COALESCE(NULLIF(t.description, ''::text), cat.name, 'Movimiento sin descripción'::text) AS concepto,
    COALESCE(cat.name, 'Sin categoría'::text) AS categoria,
    t.amount AS importe,
    t.occurred_at AS fecha,
        CASE
            WHEN (t.type = 'expense_direct'::text) THEN 'gasto_directo'::public.transaction_type_dual_flow
            WHEN (t.type = 'income_direct'::text) THEN 'ingreso_directo'::public.transaction_type_dual_flow
            WHEN (t.type = 'expense'::text) THEN 'gasto'::public.transaction_type_dual_flow
            ELSE 'ingreso'::public.transaction_type_dual_flow
        END AS tipo,
    t.dual_flow_status AS estado,
        CASE
            WHEN ((t.flow_type = 'direct'::text) AND (t.type ~~ 'expense%'::text)) THEN 'personal_to_common'::public.dual_flow_type
            WHEN ((t.flow_type = 'direct'::text) AND (t.type ~~ 'income%'::text)) THEN 'common_to_personal'::public.dual_flow_type
            ELSE 'common_fund'::public.dual_flow_type
        END AS tipo_flujo,
    t.created_by_profile_id AS creado_por,
    COALESCE(t.real_payer_id, t.paid_by) AS pagado_por,
    t.transaction_pair_id AS transaccion_pareja,
    t.auto_paired,
    t.requires_approval AS requiere_aprobacion,
    COALESCE(t.pairing_threshold, 5.00::numeric(5,2)) AS umbral_emparejamiento,
    COALESCE(t.review_days, 7) AS dias_revision,
    t.created_at,
    t.updated_at,
    t.approved_at,
    t.approved_by
   FROM (public.transactions t
     LEFT JOIN public.categories cat ON ((cat.id = t.category_id)));


ALTER TABLE public.v_dual_flow_transactions_unified OWNER TO cuentassik_owner;

--
-- Name: VIEW v_dual_flow_transactions_unified; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON VIEW public.v_dual_flow_transactions_unified IS 'Proyección de transactions con metadatos dual-flow equivalentes a la tabla dual_flow_transactions.';


--
-- Name: v_dual_flow_workflow; Type: VIEW; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.v_dual_flow_workflow OWNER TO cuentassik_owner;

--
-- Name: v_pending_refund_claims; Type: VIEW; Schema: public; Owner: cuentassik_owner
--

CREATE VIEW public.v_pending_refund_claims AS
 SELECT rc.id,
    rc.household_id,
    rc.profile_id,
    p.email,
    p.display_name,
    rc.refund_amount,
    rc.reason,
    t_expense.amount AS expense_amount,
    c.name AS expense_category,
    c.icon AS category_icon,
    t_expense.description AS expense_description,
    t_expense.occurred_at AS expense_date,
    rc.created_at AS claimed_at,
    rc.status
   FROM (((public.refund_claims rc
     JOIN public.profiles p ON ((p.id = rc.profile_id)))
     JOIN public.transactions t_expense ON ((t_expense.id = rc.expense_transaction_id)))
     LEFT JOIN public.categories c ON ((c.id = t_expense.category_id)))
  WHERE (rc.status = 'pending'::text)
  ORDER BY rc.created_at;


ALTER TABLE public.v_pending_refund_claims OWNER TO cuentassik_owner;

--
-- Name: VIEW v_pending_refund_claims; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON VIEW public.v_pending_refund_claims IS 'Vista para listar reclamos de reembolso pendientes de aprobación (solo owner).
   Muestra detalles del gasto directo y el reembolso reclamado.';


--
-- Name: v_profile_primary_email; Type: VIEW; Schema: public; Owner: cuentassik_owner
--

CREATE VIEW public.v_profile_primary_email AS
 SELECT p.id AS profile_id,
    p.display_name,
    COALESCE(pe.email, p.email) AS primary_email,
    pe.verified AS email_verified,
    pe.verified_at AS email_verified_at
   FROM (public.profiles p
     LEFT JOIN public.profile_emails pe ON (((pe.profile_id = p.id) AND (pe.is_primary = true))));


ALTER TABLE public.v_profile_primary_email OWNER TO cuentassik_owner;

--
-- Name: VIEW v_profile_primary_email; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON VIEW public.v_profile_primary_email IS 'Vista helper que retorna el email principal de cada perfil. Fallback a profiles.email si no existe en profile_emails.';


--
-- Name: v_transaction_pairs; Type: VIEW; Schema: public; Owner: cuentassik_owner
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


ALTER TABLE public.v_transaction_pairs OWNER TO cuentassik_owner;

--
-- Name: VIEW v_transaction_pairs; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON VIEW public.v_transaction_pairs IS 'Vista que muestra pares de transacciones del flujo directo (gasto + ingreso automático)';


--
-- Name: _migrations id; Type: DEFAULT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public._migrations ALTER COLUMN id SET DEFAULT nextval('public._migrations_id_seq'::regclass);


--
-- Name: _migrations _migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: category_parents category_parents_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.category_parents
    ADD CONSTRAINT category_parents_pkey PRIMARY KEY (id);


--
-- Name: contribution_adjustment_templates contribution_adjustment_templates_household_id_name_key; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_adjustment_templates
    ADD CONSTRAINT contribution_adjustment_templates_household_id_name_key UNIQUE (household_id, name);


--
-- Name: contribution_adjustment_templates contribution_adjustment_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_adjustment_templates
    ADD CONSTRAINT contribution_adjustment_templates_pkey PRIMARY KEY (id);


--
-- Name: contribution_adjustments contribution_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_adjustments
    ADD CONSTRAINT contribution_adjustments_pkey PRIMARY KEY (id);


--
-- Name: contribution_periods contribution_periods_household_id_year_month_key; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_periods
    ADD CONSTRAINT contribution_periods_household_id_year_month_key UNIQUE (household_id, year, month);


--
-- Name: contribution_periods contribution_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_periods
    ADD CONSTRAINT contribution_periods_pkey PRIMARY KEY (id);


--
-- Name: contribution_reconciliations contribution_reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_reconciliations
    ADD CONSTRAINT contribution_reconciliations_pkey PRIMARY KEY (contribution_id);


--
-- Name: contributions contributions_household_profile_period_key; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_household_profile_period_key UNIQUE (household_id, profile_id, year, month);


--
-- Name: contributions contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_pkey PRIMARY KEY (id);


--
-- Name: credit_refund_requests credit_refund_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.credit_refund_requests
    ADD CONSTRAINT credit_refund_requests_pkey PRIMARY KEY (id);


--
-- Name: dual_flow_config dual_flow_config_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.dual_flow_config
    ADD CONSTRAINT dual_flow_config_pkey PRIMARY KEY (household_id);


--
-- Name: dual_flow_events dual_flow_events_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.dual_flow_events
    ADD CONSTRAINT dual_flow_events_pkey PRIMARY KEY (id);


--
-- Name: dual_flow_transactions dual_flow_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.dual_flow_transactions
    ADD CONSTRAINT dual_flow_transactions_pkey PRIMARY KEY (id);


--
-- Name: email_invitations email_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.email_invitations
    ADD CONSTRAINT email_invitations_pkey PRIMARY KEY (id);


--
-- Name: email_invitations email_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.email_invitations
    ADD CONSTRAINT email_invitations_token_key UNIQUE (token);


--
-- Name: household_members household_members_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT household_members_pkey PRIMARY KEY (household_id, profile_id);


--
-- Name: household_savings household_savings_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.household_savings
    ADD CONSTRAINT household_savings_pkey PRIMARY KEY (id);


--
-- Name: household_settings household_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.household_settings
    ADD CONSTRAINT household_settings_pkey PRIMARY KEY (household_id);


--
-- Name: households households_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_token_key UNIQUE (token);


--
-- Name: joint_accounts joint_accounts_household_id_key; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.joint_accounts
    ADD CONSTRAINT joint_accounts_household_id_key UNIQUE (household_id);


--
-- Name: joint_accounts joint_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.joint_accounts
    ADD CONSTRAINT joint_accounts_pkey PRIMARY KEY (id);


--
-- Name: journal_adjustments journal_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.journal_adjustments
    ADD CONSTRAINT journal_adjustments_pkey PRIMARY KEY (id);


--
-- Name: journal_invitations journal_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.journal_invitations
    ADD CONSTRAINT journal_invitations_pkey PRIMARY KEY (id);


--
-- Name: journal_roles journal_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.journal_roles
    ADD CONSTRAINT journal_roles_pkey PRIMARY KEY (id);


--
-- Name: journal_transactions journal_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.journal_transactions
    ADD CONSTRAINT journal_transactions_pkey PRIMARY KEY (id);


--
-- Name: member_balances member_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.member_balances
    ADD CONSTRAINT member_balances_pkey PRIMARY KEY (household_id, profile_id);


--
-- Name: member_credits member_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.member_credits
    ADD CONSTRAINT member_credits_pkey PRIMARY KEY (id);


--
-- Name: member_incomes member_incomes_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.member_incomes
    ADD CONSTRAINT member_incomes_pkey PRIMARY KEY (id);


--
-- Name: monthly_periods monthly_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.monthly_periods
    ADD CONSTRAINT monthly_periods_pkey PRIMARY KEY (id);


--
-- Name: personal_loans personal_loans_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.personal_loans
    ADD CONSTRAINT personal_loans_pkey PRIMARY KEY (id);


--
-- Name: profile_emails profile_emails_email_unique; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.profile_emails
    ADD CONSTRAINT profile_emails_email_unique UNIQUE (email);


--
-- Name: profile_emails profile_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.profile_emails
    ADD CONSTRAINT profile_emails_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: refund_claims refund_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.refund_claims
    ADD CONSTRAINT refund_claims_pkey PRIMARY KEY (id);


--
-- Name: subcategories subcategories_category_id_name_key; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_name_key UNIQUE (category_id, name);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: system_admins system_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.system_admins
    ADD CONSTRAINT system_admins_pkey PRIMARY KEY (user_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: household_savings unique_household_savings_household_id; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.household_savings
    ADD CONSTRAINT unique_household_savings_household_id UNIQUE (household_id);


--
-- Name: user_active_household user_active_household_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.user_active_household
    ADD CONSTRAINT user_active_household_pkey PRIMARY KEY (profile_id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (profile_id);


--
-- Name: idx_adjustments_template; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_adjustments_template ON public.contribution_adjustments USING btree (template_id) WHERE (template_id IS NOT NULL);


--
-- Name: idx_categories_created_by; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_categories_created_by ON public.categories USING btree (created_by_profile_id) WHERE (created_by_profile_id IS NOT NULL);


--
-- Name: idx_categories_household_creator; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_categories_household_creator ON public.categories USING btree (household_id, created_by_profile_id);


--
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id, display_order) WHERE (parent_id IS NOT NULL);


--
-- Name: idx_categories_updated_by; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_categories_updated_by ON public.categories USING btree (updated_by_profile_id) WHERE (updated_by_profile_id IS NOT NULL);


--
-- Name: idx_category_parents_household; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_category_parents_household ON public.category_parents USING btree (household_id, type, display_order);


--
-- Name: idx_contribution_periods_date; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_contribution_periods_date ON public.contribution_periods USING btree (year, month);


--
-- Name: idx_contribution_periods_household; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_contribution_periods_household ON public.contribution_periods USING btree (household_id);


--
-- Name: idx_contribution_periods_status; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_contribution_periods_status ON public.contribution_periods USING btree (status);


--
-- Name: idx_contributions_created_by; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_contributions_created_by ON public.contributions USING btree (created_by_profile_id) WHERE (created_by_profile_id IS NOT NULL);


--
-- Name: idx_contributions_household_creator; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_contributions_household_creator ON public.contributions USING btree (household_id, created_by_profile_id);


--
-- Name: idx_contributions_household_profile; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_contributions_household_profile ON public.contributions USING btree (household_id, profile_id);


--
-- Name: idx_contributions_period; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_contributions_period ON public.contributions USING btree (household_id, year, month);


--
-- Name: idx_contributions_period_status; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_contributions_period_status ON public.contributions USING btree (household_id, year, month, status) WHERE (status IS NOT NULL);


--
-- Name: idx_contributions_updated_by; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_contributions_updated_by ON public.contributions USING btree (updated_by_profile_id) WHERE (updated_by_profile_id IS NOT NULL);


--
-- Name: idx_credit_refunds_household_status; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_credit_refunds_household_status ON public.credit_refund_requests USING btree (household_id, status);


--
-- Name: idx_credit_refunds_profile; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_credit_refunds_profile ON public.credit_refund_requests USING btree (profile_id);


--
-- Name: idx_dual_flow_auto_pairing_candidates; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_dual_flow_auto_pairing_candidates ON public.dual_flow_transactions USING btree (household_id, tipo, importe, fecha) WHERE ((auto_paired = false) AND (estado = 'approved'::public.dual_flow_status));


--
-- Name: idx_dual_flow_estado_tipo; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_dual_flow_estado_tipo ON public.dual_flow_transactions USING btree (estado, tipo);


--
-- Name: idx_dual_flow_events_household_created_at; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_dual_flow_events_household_created_at ON public.dual_flow_events USING btree (household_id, created_at DESC);


--
-- Name: idx_dual_flow_events_period; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_dual_flow_events_period ON public.dual_flow_events USING btree (period_id, created_at DESC);


--
-- Name: idx_dual_flow_household_fecha; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_dual_flow_household_fecha ON public.dual_flow_transactions USING btree (household_id, fecha DESC);


--
-- Name: idx_dual_flow_pairing; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_dual_flow_pairing ON public.dual_flow_transactions USING btree (transaccion_pareja, auto_paired) WHERE (transaccion_pareja IS NOT NULL);


--
-- Name: idx_dual_flow_pending_approval; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_dual_flow_pending_approval ON public.dual_flow_transactions USING btree (household_id, estado, created_at) WHERE (estado = 'pending_review'::public.dual_flow_status);


--
-- Name: idx_email_invitations_expires_at; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_email_invitations_expires_at ON public.email_invitations USING btree (expires_at) WHERE (status = 'pending'::text);


--
-- Name: idx_email_invitations_invited_email; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_email_invitations_invited_email ON public.email_invitations USING btree (invited_email);


--
-- Name: idx_email_invitations_profile_id; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_email_invitations_profile_id ON public.email_invitations USING btree (profile_id);


--
-- Name: idx_email_invitations_status; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_email_invitations_status ON public.email_invitations USING btree (status);


--
-- Name: idx_email_invitations_token; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_email_invitations_token ON public.email_invitations USING btree (token);


--
-- Name: idx_email_invitations_unique_pending; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE UNIQUE INDEX idx_email_invitations_unique_pending ON public.email_invitations USING btree (profile_id, invited_email) WHERE (status = 'pending'::text);


--
-- Name: idx_household_members_household_role; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_household_members_household_role ON public.household_members USING btree (household_id, role);


--
-- Name: idx_household_members_invited_by; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_household_members_invited_by ON public.household_members USING btree (invited_by_profile_id) WHERE (invited_by_profile_id IS NOT NULL);


--
-- Name: idx_household_members_owner; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_household_members_owner ON public.household_members USING btree (household_id, is_owner) WHERE (is_owner = true);


--
-- Name: idx_household_members_owners; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_household_members_owners ON public.household_members USING btree (household_id, profile_id) WHERE (role = 'owner'::text);


--
-- Name: idx_household_members_profile_role; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_household_members_profile_role ON public.household_members USING btree (profile_id, role);


--
-- Name: idx_household_savings_household; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_household_savings_household ON public.household_savings USING btree (household_id);


--
-- Name: idx_household_stats_household_id; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE UNIQUE INDEX idx_household_stats_household_id ON public.household_stats USING btree (household_id);


--
-- Name: idx_household_stats_member_count; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_household_stats_member_count ON public.household_stats USING btree (member_count);


--
-- Name: idx_household_stats_single_owner; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_household_stats_single_owner ON public.household_stats USING btree (household_id) WHERE (owner_count = 1);


--
-- Name: idx_households_created_by; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_households_created_by ON public.households USING btree (created_by_profile_id) WHERE (created_by_profile_id IS NOT NULL);


--
-- Name: idx_households_deleted_at; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_households_deleted_at ON public.households USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_households_deleted_at_not_null; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_households_deleted_at_not_null ON public.households USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_households_updated_by; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_households_updated_by ON public.households USING btree (updated_by_profile_id) WHERE (updated_by_profile_id IS NOT NULL);


--
-- Name: idx_invitations_email_status; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_invitations_email_status ON public.invitations USING btree (email, status);


--
-- Name: idx_invitations_household_inviter; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_invitations_household_inviter ON public.invitations USING btree (household_id, invited_by_profile_id);


--
-- Name: idx_invitations_household_status; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_invitations_household_status ON public.invitations USING btree (household_id, status);


--
-- Name: idx_invitations_invited_by; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_invitations_invited_by ON public.invitations USING btree (invited_by_profile_id) WHERE (invited_by_profile_id IS NOT NULL);


--
-- Name: idx_invitations_status_created; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_invitations_status_created ON public.invitations USING btree (status, created_at) WHERE (status = 'pending'::text);


--
-- Name: idx_invitations_token; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_invitations_token ON public.invitations USING btree (token);


--
-- Name: idx_member_balances_household; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_member_balances_household ON public.member_balances USING btree (household_id);


--
-- Name: idx_member_balances_negative; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_member_balances_negative ON public.member_balances USING btree (household_id, profile_id) WHERE (current_balance < (0)::numeric);


--
-- Name: idx_member_balances_positive; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_member_balances_positive ON public.member_balances USING btree (household_id, profile_id) WHERE (current_balance > (0)::numeric);


--
-- Name: idx_member_credits_created_by; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_member_credits_created_by ON public.member_credits USING btree (created_by_profile_id) WHERE (created_by_profile_id IS NOT NULL);


--
-- Name: idx_member_credits_household_creator; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_member_credits_household_creator ON public.member_credits USING btree (household_id, created_by_profile_id);


--
-- Name: idx_member_credits_updated_by; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_member_credits_updated_by ON public.member_credits USING btree (updated_by_profile_id) WHERE (updated_by_profile_id IS NOT NULL);


--
-- Name: idx_monthly_periods_household_phase; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_monthly_periods_household_phase ON public.monthly_periods USING btree (household_id, phase);


--
-- Name: idx_mv_household_balances_household_id; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE UNIQUE INDEX idx_mv_household_balances_household_id ON public.mv_household_balances USING btree (household_id);


--
-- Name: idx_mv_member_pending_contributions_unique; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE UNIQUE INDEX idx_mv_member_pending_contributions_unique ON public.mv_member_pending_contributions USING btree (household_id, profile_id);


--
-- Name: idx_personal_loans_active; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_personal_loans_active ON public.personal_loans USING btree (household_id, profile_id, status) WHERE ((status = 'approved'::text) AND (settled_at IS NULL));


--
-- Name: idx_personal_loans_household; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_personal_loans_household ON public.personal_loans USING btree (household_id);


--
-- Name: idx_personal_loans_pending; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_personal_loans_pending ON public.personal_loans USING btree (household_id, status) WHERE (status = 'pending'::text);


--
-- Name: idx_personal_loans_profile; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_personal_loans_profile ON public.personal_loans USING btree (profile_id);


--
-- Name: idx_personal_loans_status; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_personal_loans_status ON public.personal_loans USING btree (status) WHERE (status = ANY (ARRAY['pending'::text, 'approved'::text]));


--
-- Name: idx_profile_emails_email; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_profile_emails_email ON public.profile_emails USING btree (email);


--
-- Name: idx_profile_emails_primary; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE UNIQUE INDEX idx_profile_emails_primary ON public.profile_emails USING btree (profile_id) WHERE (is_primary = true);


--
-- Name: idx_profile_emails_profile_id; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_profile_emails_profile_id ON public.profile_emails USING btree (profile_id);


--
-- Name: idx_profiles_deleted_at; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_profiles_deleted_at ON public.profiles USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_profiles_system_admin; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_profiles_system_admin ON public.profiles USING btree (is_system_admin) WHERE (is_system_admin = true);


--
-- Name: idx_refund_claims_expense_tx; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_refund_claims_expense_tx ON public.refund_claims USING btree (expense_transaction_id);


--
-- Name: idx_refund_claims_household; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_refund_claims_household ON public.refund_claims USING btree (household_id);


--
-- Name: idx_refund_claims_profile; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_refund_claims_profile ON public.refund_claims USING btree (profile_id);


--
-- Name: idx_refund_claims_status; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_refund_claims_status ON public.refund_claims USING btree (status);


--
-- Name: idx_subcategories_category; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_subcategories_category ON public.subcategories USING btree (category_id, display_order);


--
-- Name: idx_templates_default; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_templates_default ON public.contribution_adjustment_templates USING btree (is_default) WHERE (is_default = true);


--
-- Name: idx_templates_household; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_templates_household ON public.contribution_adjustment_templates USING btree (household_id);


--
-- Name: idx_transactions_auto_paired; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_auto_paired ON public.transactions USING btree (auto_paired) WHERE (auto_paired IS TRUE);


--
-- Name: idx_transactions_compensatory_income; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_compensatory_income ON public.transactions USING btree (household_id, is_compensatory_income) WHERE (is_compensatory_income = true);


--
-- Name: INDEX idx_transactions_compensatory_income; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON INDEX public.idx_transactions_compensatory_income IS 'Índice parcial para filtrar ingresos compensatorios en queries de UI';


--
-- Name: idx_transactions_created_by; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_created_by ON public.transactions USING btree (created_by_profile_id) WHERE (created_by_profile_id IS NOT NULL);


--
-- Name: idx_transactions_date_range; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_date_range ON public.transactions USING btree (household_id, occurred_at DESC, amount) WHERE (occurred_at IS NOT NULL);


--
-- Name: idx_transactions_direct_pending; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_direct_pending ON public.transactions USING btree (household_id, real_payer_id, occurred_at) WHERE ((flow_type = 'direct'::text) AND (type = 'expense'::text));


--
-- Name: idx_transactions_dual_flow_status; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_dual_flow_status ON public.transactions USING btree (dual_flow_status);


--
-- Name: idx_transactions_flow_type; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_flow_type ON public.transactions USING btree (flow_type);


--
-- Name: idx_transactions_household_creator; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_household_creator ON public.transactions USING btree (household_id, created_by_profile_id);


--
-- Name: idx_transactions_household_date; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_household_date ON public.transactions USING btree (household_id, occurred_at) WHERE (occurred_at IS NOT NULL);


--
-- Name: idx_transactions_household_flow; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_household_flow ON public.transactions USING btree (household_id, flow_type);


--
-- Name: idx_transactions_household_number; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_household_number ON public.transactions USING btree (household_id, transaction_number);


--
-- Name: INDEX idx_transactions_household_number; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON INDEX public.idx_transactions_household_number IS 'Índice para consultas rápidas de transacciones por número dentro de un household.';


--
-- Name: idx_transactions_household_profile; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_household_profile ON public.transactions USING btree (household_id, profile_id) WHERE (profile_id IS NOT NULL);


--
-- Name: idx_transactions_pair_id; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_pair_id ON public.transactions USING btree (transaction_pair_id);


--
-- Name: idx_transactions_real_payer; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_real_payer ON public.transactions USING btree (real_payer_id);


--
-- Name: idx_transactions_requires_approval; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_requires_approval ON public.transactions USING btree (requires_approval) WHERE (requires_approval IS TRUE);


--
-- Name: idx_transactions_subcategory; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_subcategory ON public.transactions USING btree (subcategory_id) WHERE (subcategory_id IS NOT NULL);


--
-- Name: idx_transactions_updated_by; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_transactions_updated_by ON public.transactions USING btree (updated_by_profile_id) WHERE (updated_by_profile_id IS NOT NULL);


--
-- Name: idx_user_active_household_household_id; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_user_active_household_household_id ON public.user_active_household USING btree (household_id);


--
-- Name: idx_user_active_household_updated_at; Type: INDEX; Schema: public; Owner: cuentassik_owner
--

CREATE INDEX idx_user_active_household_updated_at ON public.user_active_household USING btree (updated_at DESC);


--
-- Name: transactions before_insert_transaction_number; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER before_insert_transaction_number BEFORE INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.assign_transaction_number();


--
-- Name: TRIGGER before_insert_transaction_number ON transactions; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TRIGGER before_insert_transaction_number ON public.transactions IS 'Asigna automáticamente transaction_number antes de insertar una nueva transacción.';


--
-- Name: transactions trg_journal_transactions; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trg_journal_transactions AFTER INSERT OR DELETE OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.log_transaction_journal();


--
-- Name: refund_claims trg_update_refund_claims_updated_at; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trg_update_refund_claims_updated_at BEFORE UPDATE ON public.refund_claims FOR EACH ROW EXECUTE FUNCTION public.update_refund_claims_updated_at();


--
-- Name: category_parents trigger_category_parents_updated_at; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_category_parents_updated_at BEFORE UPDATE ON public.category_parents FOR EACH ROW EXECUTE FUNCTION public.update_category_parent_timestamp();


--
-- Name: contributions trigger_contribution_changes_refresh_matviews; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_contribution_changes_refresh_matviews AFTER INSERT OR DELETE OR UPDATE ON public.contributions FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_transaction_matviews();


--
-- Name: households trigger_create_default_categories; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_create_default_categories AFTER INSERT ON public.households FOR EACH ROW EXECUTE FUNCTION public.create_default_household_categories();


--
-- Name: households trigger_create_dual_flow_config; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_create_dual_flow_config AFTER INSERT ON public.households FOR EACH ROW EXECUTE FUNCTION public.create_default_dual_flow_config();


--
-- Name: households trigger_create_joint_account; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_create_joint_account AFTER INSERT ON public.households FOR EACH ROW EXECUTE FUNCTION public.create_joint_account_for_household();


--
-- Name: TRIGGER trigger_create_joint_account ON households; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TRIGGER trigger_create_joint_account ON public.households IS 'Auto-crea Cuenta Común cuando se crea un nuevo hogar.';


--
-- Name: transactions trigger_dual_flow_auto_pairing; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_dual_flow_auto_pairing AFTER UPDATE ON public.transactions FOR EACH ROW WHEN (((new.flow_type = 'direct'::text) AND (new.type = ANY (ARRAY['expense_direct'::text, 'income_direct'::text])))) EXECUTE FUNCTION public.trigger_auto_pairing();


--
-- Name: dual_flow_transactions trigger_dual_flow_updated_at; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_dual_flow_updated_at BEFORE UPDATE ON public.dual_flow_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: household_members trigger_ensure_last_member_owner; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_ensure_last_member_owner AFTER DELETE ON public.household_members FOR EACH ROW EXECUTE FUNCTION public.ensure_last_member_is_owner();


--
-- Name: TRIGGER trigger_ensure_last_member_owner ON household_members; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON TRIGGER trigger_ensure_last_member_owner ON public.household_members IS 'Trigger que garantiza que siempre haya al menos un owner por hogar. Se ejecuta después de eliminar un miembro.';


--
-- Name: household_members trigger_ensure_owner; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_ensure_owner AFTER INSERT OR UPDATE OF role ON public.household_members FOR EACH ROW EXECUTE FUNCTION public.ensure_household_owner();


--
-- Name: profile_emails trigger_ensure_single_primary_email; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_ensure_single_primary_email BEFORE INSERT OR UPDATE OF is_primary ON public.profile_emails FOR EACH ROW WHEN ((new.is_primary = true)) EXECUTE FUNCTION public.ensure_single_primary_email();


--
-- Name: households trigger_refresh_household_stats_on_household_change; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_refresh_household_stats_on_household_change AFTER INSERT OR DELETE OR UPDATE ON public.households FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_household_stats();


--
-- Name: household_members trigger_refresh_household_stats_on_member_change; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_refresh_household_stats_on_member_change AFTER INSERT OR DELETE OR UPDATE ON public.household_members FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_household_stats();


--
-- Name: subcategories trigger_subcategories_updated_at; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_subcategories_updated_at BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.update_subcategory_timestamp();


--
-- Name: transactions trigger_transaction_changes_refresh_matviews; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_transaction_changes_refresh_matviews AFTER INSERT OR DELETE OR UPDATE ON public.transactions FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_transaction_matviews();


--
-- Name: categories trigger_update_category_audit; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_update_category_audit BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_category_audit();


--
-- Name: contributions trigger_update_contribution_audit; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_update_contribution_audit BEFORE UPDATE ON public.contributions FOR EACH ROW EXECUTE FUNCTION public.update_contribution_audit();


--
-- Name: households trigger_update_household_audit; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_update_household_audit BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION public.update_household_audit();


--
-- Name: member_credits trigger_update_member_credit_audit; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_update_member_credit_audit BEFORE UPDATE ON public.member_credits FOR EACH ROW EXECUTE FUNCTION public.update_member_credit_audit();


--
-- Name: monthly_periods trigger_update_monthly_periods_timestamp; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_update_monthly_periods_timestamp BEFORE UPDATE ON public.monthly_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: personal_loans trigger_update_personal_loans_timestamp; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_update_personal_loans_timestamp BEFORE UPDATE ON public.personal_loans FOR EACH ROW EXECUTE FUNCTION public.update_personal_loans_timestamp();


--
-- Name: profile_emails trigger_update_profile_emails_updated_at; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_update_profile_emails_updated_at BEFORE UPDATE ON public.profile_emails FOR EACH ROW EXECUTE FUNCTION public.update_profile_emails_updated_at();


--
-- Name: transactions trigger_update_transaction_audit; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_update_transaction_audit BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_transaction_audit();


--
-- Name: user_active_household trigger_update_user_active_household_timestamp; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_update_user_active_household_timestamp BEFORE UPDATE ON public.user_active_household FOR EACH ROW EXECUTE FUNCTION public.update_user_active_household_timestamp();


--
-- Name: profile_emails trigger_validate_primary_email_exists; Type: TRIGGER; Schema: public; Owner: cuentassik_owner
--

CREATE TRIGGER trigger_validate_primary_email_exists AFTER DELETE OR UPDATE OF is_primary ON public.profile_emails FOR EACH ROW EXECUTE FUNCTION public.validate_primary_email_exists();


--
-- Name: categories categories_created_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.category_parents(id) ON DELETE SET NULL;


--
-- Name: categories categories_updated_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_updated_by_profile_id_fkey FOREIGN KEY (updated_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: category_parents category_parents_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.category_parents
    ADD CONSTRAINT category_parents_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: contribution_adjustment_templates contribution_adjustment_templates_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_adjustment_templates
    ADD CONSTRAINT contribution_adjustment_templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: contribution_adjustment_templates contribution_adjustment_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_adjustment_templates
    ADD CONSTRAINT contribution_adjustment_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: contribution_adjustment_templates contribution_adjustment_templates_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_adjustment_templates
    ADD CONSTRAINT contribution_adjustment_templates_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: contribution_adjustments contribution_adjustments_expense_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_adjustments
    ADD CONSTRAINT contribution_adjustments_expense_category_id_fkey FOREIGN KEY (expense_category_id) REFERENCES public.categories(id);


--
-- Name: contribution_adjustments contribution_adjustments_income_movement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_adjustments
    ADD CONSTRAINT contribution_adjustments_income_movement_id_fkey FOREIGN KEY (income_movement_id) REFERENCES public.transactions(id);


--
-- Name: contribution_adjustments contribution_adjustments_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_adjustments
    ADD CONSTRAINT contribution_adjustments_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.contribution_adjustment_templates(id) ON DELETE SET NULL;


--
-- Name: contribution_periods contribution_periods_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_periods
    ADD CONSTRAINT contribution_periods_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.profiles(id);


--
-- Name: contribution_periods contribution_periods_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_periods
    ADD CONSTRAINT contribution_periods_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: contribution_periods contribution_periods_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_periods
    ADD CONSTRAINT contribution_periods_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.profiles(id);


--
-- Name: contribution_reconciliations contribution_reconciliations_contribution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_reconciliations
    ADD CONSTRAINT contribution_reconciliations_contribution_id_fkey FOREIGN KEY (contribution_id) REFERENCES public.contributions(id) ON DELETE CASCADE;


--
-- Name: contribution_reconciliations contribution_reconciliations_reconciled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contribution_reconciliations
    ADD CONSTRAINT contribution_reconciliations_reconciled_by_fkey FOREIGN KEY (reconciled_by) REFERENCES public.profiles(id);


--
-- Name: contributions contributions_created_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: contributions contributions_updated_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_updated_by_profile_id_fkey FOREIGN KEY (updated_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: credit_refund_requests credit_refund_requests_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.credit_refund_requests
    ADD CONSTRAINT credit_refund_requests_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: credit_refund_requests credit_refund_requests_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.credit_refund_requests
    ADD CONSTRAINT credit_refund_requests_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);


--
-- Name: credit_refund_requests credit_refund_requests_refund_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.credit_refund_requests
    ADD CONSTRAINT credit_refund_requests_refund_transaction_id_fkey FOREIGN KEY (refund_transaction_id) REFERENCES public.transactions(id);


--
-- Name: credit_refund_requests credit_refund_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.credit_refund_requests
    ADD CONSTRAINT credit_refund_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id);


--
-- Name: dual_flow_config dual_flow_config_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.dual_flow_config
    ADD CONSTRAINT dual_flow_config_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: dual_flow_events dual_flow_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.dual_flow_events
    ADD CONSTRAINT dual_flow_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: dual_flow_events dual_flow_events_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.dual_flow_events
    ADD CONSTRAINT dual_flow_events_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: dual_flow_events dual_flow_events_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.dual_flow_events
    ADD CONSTRAINT dual_flow_events_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.monthly_periods(id) ON DELETE SET NULL;


--
-- Name: dual_flow_transactions dual_flow_transactions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.dual_flow_transactions
    ADD CONSTRAINT dual_flow_transactions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: dual_flow_transactions dual_flow_transactions_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.dual_flow_transactions
    ADD CONSTRAINT dual_flow_transactions_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.profiles(id);


--
-- Name: dual_flow_transactions dual_flow_transactions_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.dual_flow_transactions
    ADD CONSTRAINT dual_flow_transactions_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: dual_flow_transactions dual_flow_transactions_pagado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.dual_flow_transactions
    ADD CONSTRAINT dual_flow_transactions_pagado_por_fkey FOREIGN KEY (pagado_por) REFERENCES public.profiles(id);


--
-- Name: dual_flow_transactions dual_flow_transactions_transaccion_pareja_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.dual_flow_transactions
    ADD CONSTRAINT dual_flow_transactions_transaccion_pareja_fkey FOREIGN KEY (transaccion_pareja) REFERENCES public.dual_flow_transactions(id);


--
-- Name: email_invitations email_invitations_accepted_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.email_invitations
    ADD CONSTRAINT email_invitations_accepted_by_profile_id_fkey FOREIGN KEY (accepted_by_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: email_invitations email_invitations_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.email_invitations
    ADD CONSTRAINT email_invitations_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: transactions fk_refund_claim; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_refund_claim FOREIGN KEY (refund_claim_id) REFERENCES public.transactions(id) ON DELETE SET NULL;


--
-- Name: household_members household_members_invited_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.household_members
    ADD CONSTRAINT household_members_invited_by_profile_id_fkey FOREIGN KEY (invited_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: households households_created_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: households households_updated_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_updated_by_profile_id_fkey FOREIGN KEY (updated_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: invitations invitations_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_invited_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_invited_by_profile_id_fkey FOREIGN KEY (invited_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: joint_accounts joint_accounts_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.joint_accounts
    ADD CONSTRAINT joint_accounts_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: member_balances member_balances_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.member_balances
    ADD CONSTRAINT member_balances_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: member_balances member_balances_household_member_fk; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.member_balances
    ADD CONSTRAINT member_balances_household_member_fk FOREIGN KEY (household_id, profile_id) REFERENCES public.household_members(household_id, profile_id) ON DELETE CASCADE;


--
-- Name: member_balances member_balances_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.member_balances
    ADD CONSTRAINT member_balances_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: member_credits member_credits_created_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.member_credits
    ADD CONSTRAINT member_credits_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: member_credits member_credits_updated_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.member_credits
    ADD CONSTRAINT member_credits_updated_by_profile_id_fkey FOREIGN KEY (updated_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: monthly_periods monthly_periods_closing_started_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.monthly_periods
    ADD CONSTRAINT monthly_periods_closing_started_by_fkey FOREIGN KEY (closing_started_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: monthly_periods monthly_periods_last_reopened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.monthly_periods
    ADD CONSTRAINT monthly_periods_last_reopened_by_fkey FOREIGN KEY (last_reopened_by) REFERENCES public.profiles(id);


--
-- Name: monthly_periods monthly_periods_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.monthly_periods
    ADD CONSTRAINT monthly_periods_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: monthly_periods monthly_periods_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.monthly_periods
    ADD CONSTRAINT monthly_periods_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: monthly_periods monthly_periods_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.monthly_periods
    ADD CONSTRAINT monthly_periods_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: personal_loans personal_loans_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.personal_loans
    ADD CONSTRAINT personal_loans_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: personal_loans personal_loans_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.personal_loans
    ADD CONSTRAINT personal_loans_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: personal_loans personal_loans_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.personal_loans
    ADD CONSTRAINT personal_loans_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: personal_loans personal_loans_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.personal_loans
    ADD CONSTRAINT personal_loans_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id);


--
-- Name: personal_loans personal_loans_settled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.personal_loans
    ADD CONSTRAINT personal_loans_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES public.profiles(id);


--
-- Name: personal_loans personal_loans_settlement_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.personal_loans
    ADD CONSTRAINT personal_loans_settlement_transaction_id_fkey FOREIGN KEY (settlement_transaction_id) REFERENCES public.transactions(id);


--
-- Name: personal_loans personal_loans_withdrawal_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.personal_loans
    ADD CONSTRAINT personal_loans_withdrawal_transaction_id_fkey FOREIGN KEY (withdrawal_transaction_id) REFERENCES public.transactions(id);


--
-- Name: profile_emails profile_emails_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.profile_emails
    ADD CONSTRAINT profile_emails_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.profiles(id);


--
-- Name: profile_emails profile_emails_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.profile_emails
    ADD CONSTRAINT profile_emails_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT profile_emails_profile_id_fkey ON profile_emails; Type: COMMENT; Schema: public; Owner: cuentassik_owner
--

COMMENT ON CONSTRAINT profile_emails_profile_id_fkey ON public.profile_emails IS 'FK con CASCADE: cuando se elimina un perfil (incluso soft delete manual), sus emails secundarios se eliminan automáticamente';


--
-- Name: refund_claims refund_claims_approved_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.refund_claims
    ADD CONSTRAINT refund_claims_approved_by_profile_id_fkey FOREIGN KEY (approved_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: refund_claims refund_claims_created_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.refund_claims
    ADD CONSTRAINT refund_claims_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: refund_claims refund_claims_expense_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.refund_claims
    ADD CONSTRAINT refund_claims_expense_transaction_id_fkey FOREIGN KEY (expense_transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: refund_claims refund_claims_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.refund_claims
    ADD CONSTRAINT refund_claims_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: refund_claims refund_claims_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.refund_claims
    ADD CONSTRAINT refund_claims_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: refund_claims refund_claims_refund_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.refund_claims
    ADD CONSTRAINT refund_claims_refund_transaction_id_fkey FOREIGN KEY (refund_transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;


--
-- Name: subcategories subcategories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: system_admins system_admins_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.system_admins
    ADD CONSTRAINT system_admins_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);


--
-- Name: transactions transactions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: transactions transactions_created_by_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_created_by_member_id_fkey FOREIGN KEY (created_by_member_id) REFERENCES public.profiles(id);


--
-- Name: transactions transactions_created_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: transactions transactions_performed_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_performed_by_profile_id_fkey FOREIGN KEY (performed_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: transactions transactions_real_payer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_real_payer_id_fkey FOREIGN KEY (real_payer_id) REFERENCES public.profiles(id);


--
-- Name: transactions transactions_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_updated_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_updated_by_profile_id_fkey FOREIGN KEY (updated_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: user_active_household user_active_household_household_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.user_active_household
    ADD CONSTRAINT user_active_household_household_id_fkey FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;


--
-- Name: user_active_household user_active_household_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cuentassik_owner
--

ALTER TABLE ONLY public.user_active_household
    ADD CONSTRAINT user_active_household_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: monthly_periods No one can delete periods; Type: POLICY; Schema: public; Owner: cuentassik_owner
--

CREATE POLICY "No one can delete periods" ON public.monthly_periods FOR DELETE USING (false);


--
-- Name: monthly_periods Only system can create periods; Type: POLICY; Schema: public; Owner: cuentassik_owner
--

CREATE POLICY "Only system can create periods" ON public.monthly_periods FOR INSERT WITH CHECK (false);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: cuentassik_owner
--

GRANT USAGE ON SCHEMA public TO cuentassik_user;


--
-- Name: FUNCTION _phase_to_status(p_phase text); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public._phase_to_status(p_phase text) TO cuentassik_user;


--
-- Name: FUNCTION assign_transaction_number(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.assign_transaction_number() TO cuentassik_user;


--
-- Name: FUNCTION calculate_member_net_contribution(p_household_id uuid, p_profile_id uuid, p_year integer, p_month integer); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.calculate_member_net_contribution(p_household_id uuid, p_profile_id uuid, p_year integer, p_month integer) TO cuentassik_user;


--
-- Name: FUNCTION close_monthly_period(p_household_id uuid, p_period_id uuid, p_closed_by uuid, p_reason text); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.close_monthly_period(p_household_id uuid, p_period_id uuid, p_closed_by uuid, p_reason text) TO cuentassik_user;


--
-- Name: FUNCTION create_default_dual_flow_config(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.create_default_dual_flow_config() TO cuentassik_user;


--
-- Name: FUNCTION create_default_household_categories(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.create_default_household_categories() TO cuentassik_user;


--
-- Name: FUNCTION create_direct_expense_pair(p_household_id uuid, p_category_id uuid, p_amount numeric, p_description text, p_real_payer_id uuid, p_occurred_at date, p_created_by_email text); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.create_direct_expense_pair(p_household_id uuid, p_category_id uuid, p_amount numeric, p_description text, p_real_payer_id uuid, p_occurred_at date, p_created_by_email text) TO cuentassik_user;


--
-- Name: FUNCTION create_household_with_owner(p_name text, p_profile_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.create_household_with_owner(p_name text, p_profile_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION create_joint_account_for_household(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.create_joint_account_for_household() TO cuentassik_user;


--
-- Name: FUNCTION ensure_household_owner(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.ensure_household_owner() TO cuentassik_user;


--
-- Name: FUNCTION ensure_last_member_is_owner(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.ensure_last_member_is_owner() TO cuentassik_user;


--
-- Name: FUNCTION ensure_monthly_period(p_household_id uuid, p_year integer, p_month integer); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.ensure_monthly_period(p_household_id uuid, p_year integer, p_month integer) TO cuentassik_user;


--
-- Name: FUNCTION ensure_single_primary_email(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.ensure_single_primary_email() TO cuentassik_user;


--
-- Name: FUNCTION execute_auto_pairing(p_transaction_id uuid, p_candidate_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.execute_auto_pairing(p_transaction_id uuid, p_candidate_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION find_pairing_candidates(p_household_id uuid, p_transaction_id uuid, p_umbral numeric); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.find_pairing_candidates(p_household_id uuid, p_transaction_id uuid, p_umbral numeric) TO cuentassik_user;


--
-- Name: FUNCTION generate_contributions_for_period(p_household_id uuid, p_period_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.generate_contributions_for_period(p_household_id uuid, p_period_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION generate_pair_reference(p_household_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.generate_pair_reference(p_household_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION get_approved_refunds(p_household_id uuid, p_profile_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.get_approved_refunds(p_household_id uuid, p_profile_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION get_household_balances_overview(p_household_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.get_household_balances_overview(p_household_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION get_household_members(p_household_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.get_household_members(p_household_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION get_household_members_optimized(p_household_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.get_household_members_optimized(p_household_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION get_joint_account_id(p_household_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.get_joint_account_id(p_household_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION get_member_balance_status(p_household_id uuid, p_profile_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.get_member_balance_status(p_household_id uuid, p_profile_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION get_member_balance_status_v2(p_household_id uuid, p_profile_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.get_member_balance_status_v2(p_household_id uuid, p_profile_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION get_member_income(p_household_id uuid, p_profile_id uuid, p_date date); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.get_member_income(p_household_id uuid, p_profile_id uuid, p_date date) TO cuentassik_user;


--
-- Name: FUNCTION get_profile_emails(p_profile_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.get_profile_emails(p_profile_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION get_user_active_household(p_profile_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.get_user_active_household(p_profile_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION get_user_households_optimized(p_profile_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.get_user_households_optimized(p_profile_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION is_user_household_owner(p_profile_id uuid, p_household_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.is_user_household_owner(p_profile_id uuid, p_household_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION lock_contributions_period(p_household_id uuid, p_period_id uuid, p_locked_by uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.lock_contributions_period(p_household_id uuid, p_period_id uuid, p_locked_by uuid) TO cuentassik_user;


--
-- Name: FUNCTION log_dual_flow_event(p_household_id uuid, p_period_id uuid, p_event_type text, p_payload jsonb, p_created_by uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.log_dual_flow_event(p_household_id uuid, p_period_id uuid, p_event_type text, p_payload jsonb, p_created_by uuid) TO cuentassik_user;


--
-- Name: FUNCTION log_transaction_journal(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.log_transaction_journal() TO cuentassik_user;


--
-- Name: FUNCTION open_monthly_period(p_household_id uuid, p_period_id uuid, p_opened_by uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.open_monthly_period(p_household_id uuid, p_period_id uuid, p_opened_by uuid) TO cuentassik_user;


--
-- Name: FUNCTION reconcile_contribution_balance(p_contribution_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.reconcile_contribution_balance(p_contribution_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION refresh_critical_matviews(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.refresh_critical_matviews() TO cuentassik_user;


--
-- Name: FUNCTION refresh_household_stats(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.refresh_household_stats() TO cuentassik_user;


--
-- Name: FUNCTION reopen_monthly_period(p_period_id uuid, p_reopened_by uuid, p_reason text); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.reopen_monthly_period(p_period_id uuid, p_reopened_by uuid, p_reason text) TO cuentassik_user;


--
-- Name: FUNCTION reopen_monthly_period(p_household_id uuid, p_period_id uuid, p_reopened_by uuid, p_reason text); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.reopen_monthly_period(p_household_id uuid, p_period_id uuid, p_reopened_by uuid, p_reason text) TO cuentassik_user;


--
-- Name: FUNCTION start_monthly_closing(p_household_id uuid, p_period_id uuid, p_started_by uuid, p_reason text); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.start_monthly_closing(p_household_id uuid, p_period_id uuid, p_started_by uuid, p_reason text) TO cuentassik_user;


--
-- Name: FUNCTION trigger_auto_pairing(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.trigger_auto_pairing() TO cuentassik_user;


--
-- Name: FUNCTION trigger_refresh_transaction_matviews(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.trigger_refresh_transaction_matviews() TO cuentassik_user;


--
-- Name: FUNCTION update_category_audit(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.update_category_audit() TO cuentassik_user;


--
-- Name: FUNCTION update_category_parent_timestamp(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.update_category_parent_timestamp() TO cuentassik_user;


--
-- Name: FUNCTION update_contribution_adjustments_total(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.update_contribution_adjustments_total() TO cuentassik_user;


--
-- Name: FUNCTION update_contribution_audit(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.update_contribution_audit() TO cuentassik_user;


--
-- Name: FUNCTION update_household_audit(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.update_household_audit() TO cuentassik_user;


--
-- Name: FUNCTION update_member_balance(p_household_id uuid, p_profile_id uuid, p_delta_amount numeric, p_notes text); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.update_member_balance(p_household_id uuid, p_profile_id uuid, p_delta_amount numeric, p_notes text) TO cuentassik_user;


--
-- Name: FUNCTION update_member_credit_audit(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.update_member_credit_audit() TO cuentassik_user;


--
-- Name: FUNCTION update_personal_loans_timestamp(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.update_personal_loans_timestamp() TO cuentassik_user;


--
-- Name: FUNCTION update_profile_emails_updated_at(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.update_profile_emails_updated_at() TO cuentassik_user;


--
-- Name: FUNCTION update_refund_claims_updated_at(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.update_refund_claims_updated_at() TO cuentassik_user;


--
-- Name: FUNCTION update_subcategory_timestamp(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.update_subcategory_timestamp() TO cuentassik_user;


--
-- Name: FUNCTION update_transaction_audit(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.update_transaction_audit() TO cuentassik_user;


--
-- Name: FUNCTION update_updated_at(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.update_updated_at() TO cuentassik_user;


--
-- Name: FUNCTION update_user_active_household_timestamp(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.update_user_active_household_timestamp() TO cuentassik_user;


--
-- Name: FUNCTION validate_household_has_owner(p_household_id uuid); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.validate_household_has_owner(p_household_id uuid) TO cuentassik_user;


--
-- Name: FUNCTION validate_primary_email_exists(); Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT ALL ON FUNCTION public.validate_primary_email_exists() TO cuentassik_user;


--
-- Name: TABLE _migrations; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public._migrations TO cuentassik_user;


--
-- Name: SEQUENCE _migrations_id_seq; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,USAGE ON SEQUENCE public._migrations_id_seq TO cuentassik_user;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.categories TO cuentassik_user;


--
-- Name: TABLE category_parents; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.category_parents TO cuentassik_user;


--
-- Name: TABLE contribution_adjustment_templates; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.contribution_adjustment_templates TO cuentassik_user;


--
-- Name: TABLE contribution_adjustments; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.contribution_adjustments TO cuentassik_user;


--
-- Name: TABLE contribution_periods; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.contribution_periods TO cuentassik_user;


--
-- Name: TABLE contribution_reconciliations; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.contribution_reconciliations TO cuentassik_user;


--
-- Name: TABLE contributions; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.contributions TO cuentassik_user;


--
-- Name: TABLE credit_refund_requests; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.credit_refund_requests TO cuentassik_user;


--
-- Name: TABLE dual_flow_config; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.dual_flow_config TO cuentassik_user;


--
-- Name: TABLE dual_flow_events; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.dual_flow_events TO cuentassik_user;


--
-- Name: TABLE dual_flow_transactions; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.dual_flow_transactions TO cuentassik_user;


--
-- Name: TABLE email_invitations; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.email_invitations TO cuentassik_user;


--
-- Name: TABLE household_members; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.household_members TO cuentassik_user;


--
-- Name: TABLE household_savings; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.household_savings TO cuentassik_user;


--
-- Name: TABLE household_settings; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.household_settings TO cuentassik_user;


--
-- Name: TABLE households; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.households TO cuentassik_user;


--
-- Name: TABLE household_stats; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.household_stats TO cuentassik_user;


--
-- Name: TABLE invitations; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.invitations TO cuentassik_user;


--
-- Name: TABLE joint_accounts; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.joint_accounts TO cuentassik_user;


--
-- Name: TABLE journal_adjustments; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.journal_adjustments TO cuentassik_user;


--
-- Name: TABLE journal_invitations; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.journal_invitations TO cuentassik_user;


--
-- Name: TABLE journal_roles; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.journal_roles TO cuentassik_user;


--
-- Name: TABLE journal_transactions; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.journal_transactions TO cuentassik_user;


--
-- Name: TABLE member_balances; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.member_balances TO cuentassik_user;


--
-- Name: TABLE member_credits; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.member_credits TO cuentassik_user;


--
-- Name: TABLE member_incomes; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.member_incomes TO cuentassik_user;


--
-- Name: TABLE monthly_periods; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.monthly_periods TO cuentassik_user;


--
-- Name: TABLE transactions; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.transactions TO cuentassik_user;


--
-- Name: TABLE mv_household_balances; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.mv_household_balances TO cuentassik_user;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.profiles TO cuentassik_user;


--
-- Name: TABLE mv_member_pending_contributions; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.mv_member_pending_contributions TO cuentassik_user;


--
-- Name: TABLE personal_loans; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.personal_loans TO cuentassik_user;


--
-- Name: TABLE profile_emails; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.profile_emails TO cuentassik_user;


--
-- Name: TABLE refund_claims; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.refund_claims TO cuentassik_user;


--
-- Name: SEQUENCE seq_transaction_pair_ref; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,USAGE ON SEQUENCE public.seq_transaction_pair_ref TO cuentassik_user;


--
-- Name: TABLE subcategories; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.subcategories TO cuentassik_user;


--
-- Name: TABLE system_admins; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.system_admins TO cuentassik_user;


--
-- Name: TABLE user_active_household; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_active_household TO cuentassik_user;


--
-- Name: TABLE user_settings; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_settings TO cuentassik_user;


--
-- Name: TABLE v_dual_flow_balance; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.v_dual_flow_balance TO cuentassik_user;


--
-- Name: TABLE v_dual_flow_metrics; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.v_dual_flow_metrics TO cuentassik_user;


--
-- Name: TABLE v_dual_flow_transactions_unified; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.v_dual_flow_transactions_unified TO cuentassik_user;


--
-- Name: TABLE v_dual_flow_workflow; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.v_dual_flow_workflow TO cuentassik_user;


--
-- Name: TABLE v_pending_refund_claims; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.v_pending_refund_claims TO cuentassik_user;


--
-- Name: TABLE v_profile_primary_email; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.v_profile_primary_email TO cuentassik_user;


--
-- Name: TABLE v_transaction_pairs; Type: ACL; Schema: public; Owner: cuentassik_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.v_transaction_pairs TO cuentassik_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cuentassik_owner
--

ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_owner IN SCHEMA public GRANT SELECT,USAGE ON SEQUENCES  TO cuentassik_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: cuentassik_owner
--

ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_owner IN SCHEMA public GRANT ALL ON FUNCTIONS  TO cuentassik_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cuentassik_owner
--

ALTER DEFAULT PRIVILEGES FOR ROLE cuentassik_owner IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES  TO cuentassik_user;


--
-- PostgreSQL database dump complete
--

\unrestrict q7fMzLCELvUjtFGhj6gbNFvJgOflseAlpKfwe4tfVEq46YEgD2g7SQejp4amb8x

