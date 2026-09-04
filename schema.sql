-- =========================================================
-- UWU Tracker - Lux Obscura (FFXIV)
-- Esquema PostgreSQL para Supabase
--
-- Ejecutar en el SQL Editor del proyecto de Supabase.
-- Es idempotente: puede volver a lanzarse sin romper nada.
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Miembros
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_name VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    main_job VARCHAR(10) NOT NULL,
    flex_jobs TEXT[] NOT NULL DEFAULT '{}',
    tank_stance VARCHAR(10) CHECK (tank_stance IN ('MT', 'OT', 'BOTH') OR tank_stance IS NULL),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un mismo nombre de personaje no debe poder registrarse dos veces con distinta
-- capitalización ("Aria Thorne" vs "aria thorne").
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_name_lower
    ON members (LOWER(character_name));

-- 2. Progreso actual en las 5 fases de UWU
CREATE TABLE IF NOT EXISTS member_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
    p1_garuda_pct INT NOT NULL DEFAULT 0 CHECK (p1_garuda_pct BETWEEN 0 AND 100),
    p2_ifrit_pct INT NOT NULL DEFAULT 0 CHECK (p2_ifrit_pct BETWEEN 0 AND 100),
    p3_titan_pct INT NOT NULL DEFAULT 0 CHECK (p3_titan_pct BETWEEN 0 AND 100),
    p4_ultima_pct INT NOT NULL DEFAULT 0 CHECK (p4_ultima_pct BETWEEN 0 AND 100),
    p5_roulette_pct INT NOT NULL DEFAULT 0 CHECK (p5_roulette_pct BETWEEN 0 AND 100),
    -- Derivada, no escrita a mano: antes era una columna normal que podía quedar
    -- desincronizada de los porcentajes de la misma fila.
    overall_score INT GENERATED ALWAYS AS (
        p1_garuda_pct + p2_ifrit_pct + p3_titan_pct + p4_ultima_pct + p5_roulette_pct
    ) STORED,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Disponibilidad semanal (7 días x 24 horas)
-- Las horas se guardan SIEMPRE en la zona horaria de la Free Company
-- (NEXT_PUBLIC_GUILD_TIMEZONE); el selector de la interfaz solo cambia cómo se muestran.
CREATE TABLE IF NOT EXISTS member_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Domingo
    hour_slot INT NOT NULL CHECK (hour_slot BETWEEN 0 AND 23),
    UNIQUE (member_id, day_of_week, hour_slot)
);

-- 4. Histórico semanal (una foto por miembro y semana de raid)
CREATE TABLE IF NOT EXISTS progress_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    character_name VARCHAR(100) NOT NULL,
    week_number INT NOT NULL,
    year INT NOT NULL,
    p1_pct INT NOT NULL DEFAULT 0,
    p2_pct INT NOT NULL DEFAULT 0,
    p3_pct INT NOT NULL DEFAULT 0,
    p4_pct INT NOT NULL DEFAULT 0,
    p5_pct INT NOT NULL DEFAULT 0,
    overall_score INT NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Hace idempotente el botón "Cerrar semana": volver a pulsarlo actualiza la foto
    -- de la semana en curso en vez de crear una duplicada.
    UNIQUE (member_id, year, week_number)
);

-- 5. Parties oficiales agendadas por el Admin
CREATE TABLE IF NOT EXISTS party_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheduled_date DATE NOT NULL,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    hour_slot INT NOT NULL CHECK (hour_slot BETWEEN 0 AND 23),
    duration_hours INT NOT NULL DEFAULT 1 CHECK (duration_hours BETWEEN 1 AND 12),
    start_time_label VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACCEPTED'
        CHECK (status IN ('ACCEPTED', 'CANCELLED', 'COMPLETED', 'EXPIRED')),
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Integrantes de cada party oficial
CREATE TABLE IF NOT EXISTS party_schedule_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_schedule_id UUID NOT NULL REFERENCES party_schedules(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    character_name VARCHAR(100) NOT NULL,
    assigned_job VARCHAR(10) NOT NULL,
    assigned_role VARCHAR(10) NOT NULL
        CHECK (assigned_role IN ('MT', 'OT', 'PH', 'SH', 'M1', 'M2', 'PR', 'C')),
    is_main_job BOOLEAN NOT NULL DEFAULT TRUE,
    confirmation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (confirmation_status IN ('PENDING', 'CONFIRMED', 'DECLINED')),
    confirmed_at TIMESTAMPTZ,
    -- Nadie ocupa dos puestos en la misma party, y ningún puesto se asigna dos veces.
    UNIQUE (party_schedule_id, member_id),
    UNIQUE (party_schedule_id, assigned_role)
);

-- Índices para las consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_member_availability_slot
    ON member_availability(day_of_week, hour_slot);
CREATE INDEX IF NOT EXISTS idx_member_availability_member
    ON member_availability(member_id);
CREATE INDEX IF NOT EXISTS idx_progress_history_week
    ON progress_history(year, week_number);
CREATE INDEX IF NOT EXISTS idx_party_schedules_status_date
    ON party_schedules(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_party_schedule_members_party
    ON party_schedule_members(party_schedule_id);

-- =========================================================
-- Reemplazo atómico de la disponibilidad de un miembro.
--
-- Borrar e insertar en dos llamadas separadas deja al miembro sin horarios si la
-- segunda falla. Aquí ocurre dentro de una única transacción.
-- =========================================================
CREATE OR REPLACE FUNCTION replace_member_availability(
    p_member_id UUID,
    p_slots JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM member_availability WHERE member_id = p_member_id;

    IF jsonb_array_length(p_slots) > 0 THEN
        INSERT INTO member_availability (member_id, day_of_week, hour_slot)
        SELECT
            p_member_id,
            (slot->>'dayOfWeek')::INT,
            (slot->>'hourSlot')::INT
        FROM jsonb_array_elements(p_slots) AS slot
        ON CONFLICT (member_id, day_of_week, hour_slot) DO NOTHING;
    END IF;
END;
$$;

-- =========================================================
-- Seguridad a nivel de fila.
--
-- Toda la aplicación entra por route handlers del servidor con la service-role key,
-- que ignora RLS. Al activar RLS sin políticas públicas, la anon key (la única que
-- podría acabar en el navegador) no puede leer ni escribir absolutamente nada.
-- =========================================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_schedule_members ENABLE ROW LEVEL SECURITY;

-- Ninguna de estas tablas define políticas a propósito: sin política, RLS deniega.
