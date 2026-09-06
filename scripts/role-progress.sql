-- =========================================================
-- Progreso por rol
--
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- Hasta ahora cada miembro tenía un único progreso que valía igual para su main job y
-- para cualquier flex. Pero saber Titan desde el tanque no es saberlo desde el caster,
-- y el buscador de parties repartía puestos flex como si lo fuera. Con esto, quien
-- quiera puede registrar un progreso distinto por subrol y el buscador usa el del rol
-- que esa persona ocuparía en la party.
--
-- Nadie tiene que hacer nada: `progress_mode` nace en 'UNIFIED' y el comportamiento
-- por defecto es exactamente el de antes, un solo progreso para todos los roles.
-- =========================================================

ALTER TABLE member_progress
    ADD COLUMN IF NOT EXISTS progress_mode VARCHAR(10) NOT NULL DEFAULT 'UNIFIED';

-- El CHECK se añade aparte porque ADD COLUMN IF NOT EXISTS no lo repone en una tabla
-- que ya tenga la columna.
DO $$
BEGIN
    ALTER TABLE member_progress
        ADD CONSTRAINT member_progress_mode_check
        CHECK (progress_mode IN ('UNIFIED', 'PER_ROLE'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;

-- Progreso específico de un subrol. Solo existe fila para los roles que el miembro ha
-- ajustado a mano: los demás heredan `member_progress`, que sigue siendo la base viva.
CREATE TABLE IF NOT EXISTS member_role_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    subrole VARCHAR(20) NOT NULL CHECK (
        subrole IN ('TANK', 'PURE_HEALER', 'SHIELD_HEALER', 'MELEE', 'PHYS_RANGED', 'CASTER')
    ),
    p1_garuda_pct INT NOT NULL DEFAULT 0 CHECK (p1_garuda_pct BETWEEN 0 AND 100),
    p2_ifrit_pct INT NOT NULL DEFAULT 0 CHECK (p2_ifrit_pct BETWEEN 0 AND 100),
    p3_titan_pct INT NOT NULL DEFAULT 0 CHECK (p3_titan_pct BETWEEN 0 AND 100),
    p4_ultima_pct INT NOT NULL DEFAULT 0 CHECK (p4_ultima_pct BETWEEN 0 AND 100),
    p5_roulette_pct INT NOT NULL DEFAULT 0 CHECK (p5_roulette_pct BETWEEN 0 AND 100),
    -- Derivada, igual que en member_progress: nunca puede desincronizarse de su fila.
    overall_score INT GENERATED ALWAYS AS (
        p1_garuda_pct + p2_ifrit_pct + p3_titan_pct + p4_ultima_pct + p5_roulette_pct
    ) STORED,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (member_id, subrole)
);

CREATE INDEX IF NOT EXISTS idx_member_role_progress_member
    ON member_role_progress(member_id);

-- Misma política que el resto: RLS activo y sin políticas, de modo que la anon key no
-- puede leer ni escribir. Todo pasa por los route handlers con la service-role key.
ALTER TABLE member_role_progress ENABLE ROW LEVEL SECURITY;
