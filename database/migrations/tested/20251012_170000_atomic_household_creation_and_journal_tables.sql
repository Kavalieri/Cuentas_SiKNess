-- Migración: 20251012_170000_atomic_household_creation_and_journal_tables.sql
-- Descripción: Creación atómica de hogares + owner y tablas journal para auditoría profesional

-- 1. Función atómica para crear hogar y owner
CREATE OR REPLACE FUNCTION create_household_with_owner(
    p_name TEXT,
    p_profile_id UUID
) RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Tablas journal para auditoría
CREATE TABLE IF NOT EXISTS journal_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID,
    action TEXT NOT NULL, -- insert/update/delete
    old_data JSONB,
    new_data JSONB,
    performed_by UUID,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT
);

CREATE TABLE IF NOT EXISTS journal_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_id UUID,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_by UUID,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT
);

CREATE TABLE IF NOT EXISTS journal_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_by UUID,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT
);

CREATE TABLE IF NOT EXISTS journal_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID,
    profile_id UUID,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_by UUID,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT
);

-- 3. Trigger ejemplo para transacciones (puedes replicar para otros)
CREATE OR REPLACE FUNCTION log_transaction_journal() RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

-- Activar trigger en tabla transactions
DROP TRIGGER IF EXISTS trg_journal_transactions ON transactions;
CREATE TRIGGER trg_journal_transactions
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION log_transaction_journal();

-- Repetir triggers para ajustes, invitaciones, roles según necesidad
-- ...

-- Fin migración
