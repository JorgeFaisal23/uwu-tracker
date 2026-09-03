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

7. **Autenticación Ligera con Hashing Criptográfico**:
   - Autoregistro directo de miembros con contraseña simple hasheada con `bcryptjs`.
   - Login de administrador con credenciales seguras (usuario: `admin`, contraseña por defecto: `luxobscura2026`).

---

## Ejecución Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Despliegue en Vercel + Supabase

### Paso 1: Configurar Base de Datos en Supabase
1. Ingresa a [supabase.com](https://supabase.com) y crea un nuevo proyecto.
2. Abre el **SQL Editor** en el panel de Supabase.
3. Copia y pega el contenido del archivo [`schema.sql`](file:///c:/Users/Xenon/OneDrive/Desktop/UWU%20tracker/schema.sql) y ejecuta el script para crear las tablas e índices.
4. En la configuración de tu proyecto de Supabase (**Project Settings > API**), copia:
   - `Project URL`
   - `anon public key`
   - `service_role secret key`

### Paso 2: Despliegue en Vercel
1. Sube este repositorio a GitHub.
2. Importa el proyecto en [vercel.com](https://vercel.com).
3. Agrega las siguientes variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Tu Project URL de Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Tu anon public key)
   - `SUPABASE_SERVICE_ROLE_KEY` = (Tu service_role key)
4. Haz clic en **Deploy**. ¡Tu aplicación estará en línea y lista para la Free Company!
