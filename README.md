# UWU Tracker — Lux Obscura (Final Fantasy XIV)

Aplicación web con diseño onírico desarrollada para la Free Company **Lux Obscura**, diseñada para registrar y monitorear el progreso en **The Weapon's Refrain (Ultimate) / UWU**, gestionar la disponibilidad de los miembros y detectar automáticamente cuándo es posible formar una party estática óptima respetando las restricciones de composición de FFXIV.

---

## Características Principales

1. **Seguimiento en 5 Fases de UWU**:
   - Fase 1: Garuda (0% - 100%)
   - Fase 2: Ifrit (0% - 100%)
   - Fase 3: Titan (0% - 100%)
   - Fase 4: The Ultima Weapon (0% - 100%)
   - Fase 5: Primal Roulettes / Enrage (0% - 100%)
   - Cada jugador puede actualizar sus porcentajes con controles interactivos y visualización con barras de cristal de éter.

2. **Composición Estricta de 8 Jugadores (Sin Jobs Duplicados)**:
   - **1 Main Tank (MT)**: Paladin, Warrior, Dark Knight, Gunbreaker (postura MT o Ambos).
   - **1 Off Tank (OT)**: Paladin, Warrior, Dark Knight, Gunbreaker (postura OT o Ambos, distinto job que MT).
   - **1 Pure Healer (PH)**: White Mage, Astrologian.
   - **1 Shield Healer (SH)**: Scholar, Sage.
   - **2 Melee DPS (M1, M2)**: Monk, Dragoon, Ninja, Samurai, Reaper, Viper (dos jobs Melee diferentes).
   - **1 Physical Ranged DPS (PR)**: Bard, Machinist, Dancer.
   - **1 Magical Ranged DPS (Caster)**: Black Mage, Summoner, Red Mage, Pictomancer.
   - **Cero duplicados**: Nunca se repite un mismo job en la party de 8.

3. **Algoritmo de Party con Prioridad de Progreso y Main Jobs**:
   - **Prioridad 1 (Asistencia a Menor Progreso)**: Las parties con miembros de menor avance acumulado tienen máxima prioridad para evitar estancamientos y permitirles practicar su fase.
   - **Prioridad 2 (Más Main Jobs)**: Ante igualdad, favorece composiciones con mayor número de jugadores en su rol principal.
   - Muestra **todas las combinaciones viables** para cada horario.
   - **Regla estricta de lenguaje**: Nunca se usan términos como "banca" o "reserva"; los miembros no convocados son llamados *"Compañeros listos para rotar"* o *"Opciones alternativas"*.

4. **Gestión y Aprobación de Incursiones por el Admin**:
   - El Administrador puede explorar todas las combinaciones y hacer clic en **"Oficializar Party"** para agendar la sesión con fecha, hora y notas.
   - Los miembros ven en el inicio un **Banner Astral de Próxima Incursión Aceptada** con los 8 integrantes confirmados y sus respectivos roles.

5. **Disponibilidad Flexible de 24 Horas**:
   - Cuadrícula interactiva de 00:00 a 23:00 de Lunes a Domingo.
   - Mapa de calor en tiempo real para visualizar horas de mayor afluencia.
   - Base horaria: **Hora de Ciudad de México (America/Mexico_City / CST)**, con selector dinámico para alternar a cualquier zona horaria (UTC/Server Time, EST, PST, etc.).

6. **Registro Histórico Semanal**:
   - Captura de snapshots semanales (individual y global de la FC).
   - Monitoreo de cuántos miembros alcanzan cada fase a lo largo de las semanas.
   - Botón para el Admin: *"Cerrar semana y guardar foto histórica"*.

7. **Autenticación con Sesiones Firmadas**:
   - Autoregistro de miembros con contraseña hasheada con `bcryptjs`.
   - La sesión es un JWT firmado en una cookie `httpOnly`: el navegador no puede leerla ni falsificarla.
   - Cada ruta de la API comprueba la sesión; un miembro solo puede modificar sus propios datos.
   - Las credenciales del administrador viven en variables de entorno, nunca en el código.

---

## Ejecución Local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de configuración
cp .env.example .env.local

# 3. Generar el secreto de sesión
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Generar el hash de la contraseña de administrador
node scripts/hash-password.mjs "tu-contraseña"

# 5. Pegar ambos valores en .env.local junto con los de Supabase, y arrancar
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Para cargar el roster de ejemplo de Lux Obscura en una base de datos vacía:

```bash
node --env-file=.env.local scripts/seed.mjs
```

### Comprobaciones

```bash
npm run lint        # ESLint
npx tsc --noEmit    # Tipos
npm test            # Tests (solver de party, fechas y catálogo de jobs)
npm run test:utc    # Los mismos tests con TZ=UTC, como corre Vercel
```

---

## Zonas Horarias

Toda hora almacenada —disponibilidad y parties— se interpreta en la zona de la Free
Company (`NEXT_PUBLIC_GUILD_TIMEZONE`, por defecto `America/Mexico_City`). El selector
del navbar solo cambia **cómo se muestran**, nunca cómo se guardan.

Esto importa porque el servidor de Vercel corre en UTC: si los horarios se calcularan
con la hora local del proceso, una incursión de las 21:00 aparecería a las 03:00.

---

## Despliegue en Vercel + Supabase

### Paso 1: Base de datos

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre el **SQL Editor** y ejecuta el contenido de `schema.sql`. Crea las tablas, los
   índices, la función `replace_member_availability` y activa Row Level Security.
3. En **Project Settings > API** copia el `Project URL` y la `service_role secret key`.

> La `anon key` no se usa: la aplicación entra siempre desde el servidor con la
> service-role key. Las tablas tienen RLS activo y ninguna política pública, así que
> la anon key no puede leer ni escribir nada aunque llegara al navegador.

### Paso 2: Vercel

1. Sube el repositorio a GitHub e impórtalo en [vercel.com](https://vercel.com).
2. Añade las variables de entorno:

   | Variable | Valor |
   |---|---|
   | `SUPABASE_URL` | Project URL de Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (**nunca** con prefijo `NEXT_PUBLIC_`) |
   | `SESSION_SECRET` | 32+ caracteres aleatorios; cambiarlo cierra todas las sesiones |
   | `ADMIN_USERNAME` | Usuario del panel de administración |
   | `ADMIN_PASSWORD_HASH` | Salida de `node scripts/hash-password.mjs "<contraseña>"` |
   | `NEXT_PUBLIC_GUILD_TIMEZONE` | `America/Mexico_City` |
   | `DISCORD_WEBHOOK_URL` | *(Opcional)* URL del webhook para anunciar incursiones |
   | `DISCORD_UWU_ROLE_ID` | *(Opcional)* ID del rol @UWU a mencionar en Discord |

3. Despliega.


> **Sobre `ADMIN_PASSWORD_HASH`**: un hash bcrypt empieza por `$2b$10$`. En el panel de
> Vercel puedes pegarlo literal, pero en un archivo `.env` local el cargador interpreta
> cada `$` como una variable y lo trunca; para eso el script imprime también una
> variante en base64. La aplicación acepta ambas.
