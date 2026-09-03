-- =========================================================
-- UWU Tracker - Lux Obscura (FFXIV)
-- Esquema de Base de Datos PostgreSQL para Supabase
-- =========================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Miembros
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_name VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    main_job VARCHAR(10) NOT NULL,
    flex_jobs TEXT[] DEFAULT '{}',
    tank_stance VARCHAR(10) CHECK (tank_stance IN ('MT', 'OT', 'BOTH') OR tank_stance IS NULL),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Progreso Actual en UWU (5 Fases)
CREATE TABLE IF NOT EXISTS member_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,
    p1_garuda_pct INT DEFAULT 0 CHECK (p1_garuda_pct BETWEEN 0 AND 100),
    p2_ifrit_pct INT DEFAULT 0 CHECK (p2_ifrit_pct BETWEEN 0 AND 100),
    p3_titan_pct INT DEFAULT 0 CHECK (p3_titan_pct BETWEEN 0 AND 100),
    p4_ultima_pct INT DEFAULT 0 CHECK (p4_ultima_pct BETWEEN 0 AND 100),
    p5_roulette_pct INT DEFAULT 0 CHECK (p5_roulette_pct BETWEEN 0 AND 100),
    overall_score INT DEFAULT 0,
    current_phase_name VARCHAR(100) DEFAULT 'Fase 1: Garuda (0%)',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Disponibilidad Semanal (Grilla 24 horas x 7 días)
CREATE TABLE IF NOT EXISTS member_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Domingo, 1 = Lunes, ...
    hour_slot INT NOT NULL CHECK (hour_slot BETWEEN 0 AND 23),    -- 0 a 23 hrs
    UNIQUE (member_id, day_of_week, hour_slot)
);

-- 4. Tabla de Registro Histórico Semanal (Snapshots de evolución)
CREATE TABLE IF NOT EXISTS progress_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    character_name VARCHAR(100) NOT NULL,
    week_number INT NOT NULL,
    year INT NOT NULL,
    p1_pct INT DEFAULT 0,
    p2_pct INT DEFAULT 0,
    p3_pct INT DEFAULT 0,
    p4_pct INT DEFAULT 0,
    p5_pct INT DEFAULT 0,
    overall_score INT DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Parties Oficiales Agendadas / Aceptadas por el Admin
CREATE TABLE IF NOT EXISTS party_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheduled_date DATE NOT NULL,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    hour_slot INT NOT NULL CHECK (hour_slot BETWEEN 0 AND 23),
    duration_hours INT DEFAULT 1,
    start_time_label VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACCEPTED' CHECK (status IN ('ACCEPTED', 'CANCELLED', 'COMPLETED', 'EXPIRED')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Integrantes de la Party Oficial
CREATE TABLE IF NOT EXISTS party_schedule_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_schedule_id UUID NOT NULL REFERENCES party_schedules(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    character_name VARCHAR(100) NOT NULL,
    assigned_job VARCHAR(10) NOT NULL,
    assigned_role VARCHAR(10) NOT NULL CHECK (assigned_role IN ('MT', 'OT', 'PH', 'SH', 'M1', 'M2', 'PR', 'C')),
    is_main_job BOOLEAN DEFAULT TRUE,
    confirmation_status VARCHAR(20) DEFAULT 'PENDING' CHECK (confirmation_status IN ('PENDING', 'CONFIRMED', 'DECLINED')),
    confirmed_at TIMESTAMP WITH TIME ZONE
);

-- 7. Tabla de Administradores
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_member_availability ON member_availability(day_of_week, hour_slot);
CREATE INDEX IF NOT EXISTS idx_progress_history_week ON progress_history(year, week_number);
CREATE INDEX IF NOT EXISTS idx_party_schedules_status ON party_schedules(status);
