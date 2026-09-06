-- =========================================================
-- Tokens de invitación de un solo uso
--
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
--
-- Sustituye al código compartido único (MEMBER_INVITE_CODE) que se introdujo tras el
-- alta masiva del 5 de septiembre de 2026. Aquel código resolvía el problema de los
-- bots, pero era la misma contraseña para todos: no permitía saber quién la había
-- usado, ni revocarla para una sola persona, ni rotarla sin un despliegue.
-- =========================================================

CREATE TABLE IF NOT EXISTS invite_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Se guarda el SHA-256 del token, nunca el token en claro: si alguien obtuviera un
    -- volcado de la base, no se llevaría invitaciones utilizables. El valor original se
    -- muestra una sola vez, al crearlo.
    token_hash TEXT NOT NULL UNIQUE,

    -- Para quién es. Sirve para saber qué token revocar sin tener que verlo.
    label VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    -- Un token gastado conserva la fila: es el registro de quién entró con qué invitación.
    used_at TIMESTAMPTZ,
    used_by_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    used_by_name VARCHAR(100),

    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_hash ON invite_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_created ON invite_tokens (created_at DESC);

-- Misma política que el resto: RLS activo y sin políticas, de modo que la anon key no
-- puede leer ni escribir. Todo pasa por los route handlers con la service-role key.
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- Reclamar un token, de forma atómica.
--
-- El UPDATE ... WHERE used_at IS NULL es la parte que importa: si dos personas envían
-- el mismo token a la vez, PostgreSQL serializa las dos actualizaciones sobre la fila y
-- solo la primera encuentra used_at a NULL. La segunda no devuelve ninguna fila.
-- Comprobar y luego escribir en dos pasos desde la aplicación dejaría esa ventana
-- abierta y un token podría gastarse dos veces.
--
-- Devuelve el id del token reclamado, o nada si no era válido.
-- =========================================================
CREATE OR REPLACE FUNCTION claim_invite_token(p_token_hash TEXT)
RETURNS TABLE (id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE invite_tokens t
    SET used_at = NOW()
    WHERE t.token_hash = p_token_hash
      AND t.used_at IS NULL
      AND t.revoked_at IS NULL
      AND (t.expires_at IS NULL OR t.expires_at > NOW())
    RETURNING t.id;
END;
$$;


-- =========================================================
-- Devolver un token al estado disponible.
--
-- Se usa cuando el token se reclamó pero el alta falló después (por ejemplo, nombre de
-- personaje duplicado). Sin esto, un intento fallido quemaría la invitación de alguien.
-- =========================================================
CREATE OR REPLACE FUNCTION release_invite_token(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE invite_tokens
    SET used_at = NULL, used_by_member_id = NULL, used_by_name = NULL
    WHERE id = p_id AND used_by_member_id IS NULL;
END;
$$;
