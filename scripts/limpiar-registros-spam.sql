-- =========================================================
-- Limpieza del alta masiva automatizada (5 de septiembre de 2026)
--
-- Ejecutar por PASOS en el SQL Editor de Supabase. Solo el PASO 4 borra.
--
-- ---------------------------------------------------------
-- QUÉ PASÓ, SEGÚN EL ANÁLISIS DE LOS DATOS REALES
-- ---------------------------------------------------------
-- El endpoint POST /api/auth/member aceptaba `action: "register"` sin código de
-- invitación y sin límite de peticiones. De 814 filas en `members`:
--
--   · 13 son miembros reales,  del 04-09 18:26 al 05-09 13:24. TODOS con uso real.
--   · 801 son del ataque,      del 05-09 14:04 al 05-09 19:34. NINGUNO con uso.
--
-- Las 801 comparten el MISMO perfil, carácter por carácter:
--     main_job = 'SCH', flex_jobs = ARRAY['SCH','DRK'], tank_stance = 'OT'
--
-- Ritmo observado: 106, 115, 123 y 122 altas por minuto. Un script, no personas.
--
-- ---------------------------------------------------------
-- EL CRITERIO DE BORRADO, Y POR QUÉ NO SE FILTRA POR EL NOMBRE
-- ---------------------------------------------------------
-- Se borra por `main_job = ANY(flex_jobs)`: el main job dentro de sus propios flex.
-- La interfaz impide esa combinación por tres caminos (no se puede marcar el main como
-- flex, su botón ni se dibuja, y cambiar de main depura la lista), así que una fila que
-- la incumple no salió de un navegador usando la aplicación. Sobre estos datos acierta
-- las 801 filas del ataque y ninguna real.
--
-- NO se filtra por el formato del nombre. Sería un error: "Eros" y "Kami" son miembros
-- reales, con progreso y disponibilidad, y sus nombres de una sola palabra caerían en
-- ese filtro. Un criterio por nombre habría borrado cuentas legítimas.
--
-- Como segunda red, el borrado exige además que la fila no tenga NINGUNA señal de uso
-- (progreso, disponibilidad o parties). Así, aunque un miembro real llegara a tener la
-- combinación imposible, no se le borraría.
-- =========================================================


-- ---------------------------------------------------------
-- PASO 1. Panorama: altas por día y cuáles llevan la huella.
-- ---------------------------------------------------------
SELECT
    DATE(created_at)                                    AS dia,
    COUNT(*)                                            AS altas,
    COUNT(*) FILTER (WHERE main_job = ANY(flex_jobs))    AS con_huella,
    COUNT(*) FILTER (WHERE NOT main_job = ANY(flex_jobs)) AS sin_huella
FROM members
GROUP BY DATE(created_at)
ORDER BY dia;


-- ---------------------------------------------------------
-- PASO 2. Las filas que se conservarían. REVÍSALA: deben estar todos tus compañeros.
--
-- Si falta alguien, PARA y añádelo a la lista blanca del paso 4.
-- ---------------------------------------------------------
SELECT
    m.character_name,
    m.main_job,
    m.flex_jobs,
    m.created_at,
    COALESCE(p.overall_score, 0) AS progreso,
    (SELECT COUNT(*) FROM member_availability a WHERE a.member_id = m.id) AS franjas,
    (SELECT COUNT(*) FROM party_schedule_members ps WHERE ps.member_id = m.id) AS parties
FROM members m
LEFT JOIN member_progress p ON p.member_id = m.id
WHERE NOT (m.main_job = ANY(m.flex_jobs))
ORDER BY m.created_at;


-- ---------------------------------------------------------
-- PASO 3. Conteo de control antes de borrar.
--
-- Con los datos analizados debe dar: se_borrarian = 801, quedarian = 13.
-- Si tus números difieren mucho, revisa el paso 2 antes de continuar.
-- ---------------------------------------------------------
WITH a_borrar AS (
    SELECT m.id
    FROM members m
    LEFT JOIN member_progress p ON p.member_id = m.id
    WHERE m.main_job = ANY(m.flex_jobs)
      AND COALESCE(p.overall_score, 0) = 0
      AND NOT EXISTS (SELECT 1 FROM member_availability a  WHERE a.member_id = m.id)
      AND NOT EXISTS (SELECT 1 FROM party_schedule_members ps WHERE ps.member_id = m.id)
)
SELECT
    (SELECT COUNT(*) FROM a_borrar)                                   AS se_borrarian,
    (SELECT COUNT(*) FROM members)                                    AS total_actual,
    (SELECT COUNT(*) FROM members) - (SELECT COUNT(*) FROM a_borrar)  AS quedarian;


-- ---------------------------------------------------------
-- PASO 4. El borrado. Ejecutar solo tras revisar los pasos 2 y 3.
--
-- Va en cascada (ON DELETE CASCADE del esquema): con cada miembro se van sus filas de
-- member_progress, member_availability, progress_history y party_schedule_members.
--
-- Dentro de una transacción explícita: si el número de filas afectadas que reporta
-- Supabase no coincide con el paso 3, ejecuta ROLLBACK en vez de COMMIT.
-- ---------------------------------------------------------
BEGIN;

DELETE FROM members m
WHERE m.main_job = ANY(m.flex_jobs)
  -- Segunda red: nunca borrar una cuenta con señales de uso real.
  AND COALESCE((SELECT p.overall_score FROM member_progress p WHERE p.member_id = m.id), 0) = 0
  AND NOT EXISTS (SELECT 1 FROM member_availability a  WHERE a.member_id = m.id)
  AND NOT EXISTS (SELECT 1 FROM party_schedule_members ps WHERE ps.member_id = m.id)
  -- Lista blanca de emergencia. Normalmente vacía: el criterio de arriba ya es preciso.
  -- Añade aquí cualquier nombre que el paso 2 revelara como legítimo.
  AND LOWER(m.character_name) NOT IN (
        ''  -- , 'nombre de un companero'
      );

-- Filas afectadas esperadas: 801.
-- Si cuadra:    COMMIT;
-- Si no cuadra: ROLLBACK;

COMMIT;


-- ---------------------------------------------------------
-- PASO 5. Verificación posterior.
-- ---------------------------------------------------------
SELECT COUNT(*) AS miembros_restantes FROM members;

SELECT character_name, main_job, flex_jobs, created_at
FROM members
ORDER BY created_at;

-- Debe devolver 0: no queda ninguna fila con la huella del ataque.
SELECT COUNT(*) AS con_huella_restantes
FROM members
WHERE main_job = ANY(flex_jobs);

-- Debe devolver 0: sin progreso huérfano tras el borrado en cascada.
SELECT COUNT(*) AS progreso_huerfano
FROM member_progress p
LEFT JOIN members m ON m.id = p.member_id
WHERE m.id IS NULL;
