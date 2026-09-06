-- =========================================================
-- Sistema de Voluntarios / Suplentes y Convocatorias de Parties
--
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
-- =========================================================

-- 1. Voluntarios y suplentes para parties oficiales o franjas horarias
CREATE TABLE IF NOT EXISTS party_volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_schedule_id UUID REFERENCES party_schedules(id) ON DELETE CASCADE,
    slot_key VARCHAR(50),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    character_name VARCHAR(100) NOT NULL,
    assigned_job VARCHAR(10) NOT NULL,
    assigned_role VARCHAR(50) NOT NULL,
    availability_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Un miembro solo se ofrece una vez por party oficial o franja horaria
    CONSTRAINT unique_party_volunteer UNIQUE NULLS NOT DISTINCT (party_schedule_id, member_id),
    CONSTRAINT unique_slot_volunteer UNIQUE NULLS NOT DISTINCT (slot_key, member_id)
);

CREATE INDEX IF NOT EXISTS idx_party_volunteers_party ON party_volunteers(party_schedule_id);
CREATE INDEX IF NOT EXISTS idx_party_volunteers_slot ON party_volunteers(slot_key);
CREATE INDEX IF NOT EXISTS idx_party_volunteers_member ON party_volunteers(member_id);

ALTER TABLE party_volunteers ENABLE ROW LEVEL SECURITY;

-- 2. Convocatorias abiertas / Promociones de franjas por parte del Administrador
CREATE TABLE IF NOT EXISTS promoted_recruitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_key VARCHAR(50) NOT NULL UNIQUE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    hour_slot INT NOT NULL CHECK (hour_slot BETWEEN 0 AND 23),
    notes TEXT,
    missing_slots TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promoted_recruitments_slot ON promoted_recruitments(slot_key);
CREATE INDEX IF NOT EXISTS idx_promoted_recruitments_status ON promoted_recruitments(status);

ALTER TABLE promoted_recruitments ENABLE ROW LEVEL SECURITY;
