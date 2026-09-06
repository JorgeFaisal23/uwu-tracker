-- =========================================================
-- Análisis forense del alta masiva (septiembre 2026)
--
-- Solo consultas: nada de esto modifica datos. Ejecutar en el SQL Editor de Supabase.
-- El borrado va aparte, en scripts/limpiar-registros-spam.sql.
--
-- La hipótesis que estas consultas ponen a prueba: las altas no se hicieron desde la
-- interfaz, sino con peticiones HTTP directas, usando como plantilla un perfil real
-- leído del endpoint público GET /api/members.
-- =========================================================


-- ---------------------------------------------------------
-- CONSULTA 1. La huella dura: main_job dentro de sus propios flex_jobs.
--
-- Los dos modales de la app impiden esa combinación por tres caminos (no se puede
-- marcar el main como flex, su botón ni se dibuja, y cambiar de main depura la lista).
-- Una fila que la incumple NO salió de un navegador usando la aplicación.
--
-- Es un discriminador mucho más fiable que el aspecto del nombre: identifica también
-- las altas de la fase de reconocimiento, las que llevan nombres plausibles.
-- ---------------------------------------------------------
SELECT
    character_name,
    main_job,
    flex_jobs,
    tank_stance,
    created_at
FROM members
WHERE main_job = ANY(flex_jobs)
ORDER BY created_at;


-- ---------------------------------------------------------
-- CONSULTA 2. Cruce de las dos huellas: nombre fuera de formato vs. combinación imposible.
--
-- Sirve para ver si son el mismo conjunto o si una detecta filas que la otra no.
-- Presta atención a la categoría 'solo jobs imposibles': son las altas camufladas.
-- ---------------------------------------------------------
SELECT
    CASE
        WHEN main_job = ANY(flex_jobs)
         AND character_name !~ '^[[:alpha:]][[:alpha:]''-]{1,14} [[:alpha:]][[:alpha:]''-]{1,14}$'
            THEN 'ambas huellas'
        WHEN main_job = ANY(flex_jobs)
            THEN 'solo jobs imposibles (alta camuflada)'
        WHEN character_name !~ '^[[:alpha:]][[:alpha:]''-]{1,14} [[:alpha:]][[:alpha:]''-]{1,14}$'
            THEN 'solo nombre fuera de formato'
        ELSE 'sin indicios'
    END                     AS huella,
    COUNT(*)                AS filas,
    MIN(created_at)         AS primera,
    MAX(created_at)         AS ultima
FROM members
GROUP BY huella
ORDER BY filas DESC;


-- ---------------------------------------------------------
-- CONSULTA 3. La cronología: las 40 primeras altas de la base.
--
-- Confirma (o desmiente) que las de nombre plausible preceden a las de cadena aleatoria.
-- Si el patrón es "unas pocas cuidadas, luego una ráfaga", es reconocimiento seguido de
-- automatización.
-- ---------------------------------------------------------
SELECT
    ROW_NUMBER() OVER (ORDER BY created_at) AS n,
    character_name,
    main_job,
    flex_jobs,
    tank_stance,
    created_at,
    created_at - LAG(created_at) OVER (ORDER BY created_at) AS desde_la_anterior
FROM members
ORDER BY created_at
LIMIT 40;


-- ---------------------------------------------------------
-- CONSULTA 4. Ritmo de las altas por minuto.
--
-- Un humano registra una cuenta cada varios minutos. Decenas por minuto es un script.
-- El salto entre ambos regímenes marca el momento en que se automatizó el ataque.
-- ---------------------------------------------------------
SELECT
    DATE_TRUNC('minute', created_at) AS minuto,
    COUNT(*)                         AS altas
FROM members
GROUP BY minuto
HAVING COUNT(*) > 1
ORDER BY minuto;


-- ---------------------------------------------------------
-- CONSULTA 5. ¿Cuántos perfiles distintos usó como plantilla?
--
-- Si casi todas las altas comparten una única terna (main, flex, stance), el atacante
-- copió un solo perfil del roster público y lo repitió. Varias ternas frecuentes
-- significarían que muestreó varios miembros reales.
-- ---------------------------------------------------------
SELECT
    main_job,
    flex_jobs,
    tank_stance,
    COUNT(*)        AS veces,
    MIN(created_at) AS primera,
    MAX(created_at) AS ultima
FROM members
GROUP BY main_job, flex_jobs, tank_stance
ORDER BY veces DESC
LIMIT 20;


-- ---------------------------------------------------------
-- CONSULTA 6. El caso "Shenon Black": ¿víctima copiada o fila del atacante?
--
-- Ajusta el nombre si hace falta. Lo que hay que mirar:
--   · Si su created_at es MUY anterior al resto -> es la plantilla que copiaron.
--   · Si está dentro de la misma ráfaga         -> la fila la creó el atacante.
--   · Si tiene progreso o disponibilidad propios -> alguien la ha usado de verdad;
--     un bot que solo se registra no genera esas filas.
-- ---------------------------------------------------------
SELECT
    m.character_name,
    m.created_at,
    m.updated_at,
    -- Señales de uso real: un alta automatizada las deja todas a cero.
    (SELECT COUNT(*) FROM member_availability a WHERE a.member_id = m.id) AS franjas_horarias,
    (SELECT COUNT(*) FROM party_schedule_members ps WHERE ps.member_id = m.id) AS parties,
    p.overall_score,
    p.updated_at AS progreso_actualizado
FROM members m
LEFT JOIN member_progress p ON p.member_id = m.id
WHERE m.character_name ILIKE 'Shenon Black'
   OR m.main_job = ANY(m.flex_jobs)
ORDER BY m.created_at;


-- ---------------------------------------------------------
-- CONSULTA 7. Señales de uso real en TODA la base.
--
-- La forma más robusta de separar personas de bots: una cuenta real acaba teniendo
-- disponibilidad marcada, progreso distinto de cero o participación en parties.
-- Las cuentas creadas en masa se quedan en cero en las tres columnas.
--
-- Úsala para revisar tu lista blanca antes del borrado.
-- ---------------------------------------------------------
SELECT
    m.character_name,
    m.created_at,
    m.main_job = ANY(m.flex_jobs) AS huella_no_ui,
    COALESCE(p.overall_score, 0)  AS progreso,
    (SELECT COUNT(*) FROM member_availability a WHERE a.member_id = m.id) AS franjas,
    (SELECT COUNT(*) FROM party_schedule_members ps WHERE ps.member_id = m.id) AS parties
FROM members m
LEFT JOIN member_progress p ON p.member_id = m.id
WHERE COALESCE(p.overall_score, 0) > 0
   OR EXISTS (SELECT 1 FROM member_availability a WHERE a.member_id = m.id)
   OR EXISTS (SELECT 1 FROM party_schedule_members ps WHERE ps.member_id = m.id)
ORDER BY m.created_at;
