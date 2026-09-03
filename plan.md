# Plan de Implementación: UWU Tracker - Lux Obscura (FFXIV) [Aprobación de Reglas]

Aplicación web con diseño onírico para la Free Company **Lux Obscura** (Final Fantasy XIV), creada para monitorear el progreso de los miembros en **The Weapon's Refrain (Ultimate) / UWU**, gestionar disponibilidades semanales y calcular parties viables con restricciones estrictas de composición y prioridad de progresión.

---

## 1. Reglas de Negocio Confirmadas

### A. Autoregistro y Autenticación Ligera
- **Miembros**:
  - Los miembros pueden registrarse ellos mismos con su **Nombre de Personaje** y una **Contraseña simple**.
  - La contraseña se almacena hasheada (`bcryptjs`).
  - No requiere OAuth ni correos. Al iniciar sesión o identificarse con su contraseña, pueden editar su progreso, jobs y disponibilidad.
- **Administrador**:
  - Panel administrativo con usuario y contraseña hasheada (sin proveedores externos).
  - Permite gestionar miembros (resetear contraseñas en caso de olvido, editar datos, alternar estado activo/inactivo).

### B. Roles, Jobs y Reglas de Party
La party se compone de **8 miembros únicos sin repetir ningún job**:
1. **1 Main Tank (MT)**: Paladin, Warrior, Dark Knight o Gunbreaker (con preferencia MT o Ambos).
2. **1 Off Tank (OT)**: Paladin, Warrior, Dark Knight o Gunbreaker (con preferencia OT o Ambos). *El MT y OT no pueden tener el mismo job.*
3. **1 Pure Healer (PH)**: White Mage o Astrologian.
4. **1 Shield Healer (SH)**: Scholar o Sage.
5. **2 Melee DPS (M1, M2)**: Monk, Dragoon, Ninja, Samurai, Reaper, Viper (*dos jobs Melee distintos*).
6. **1 Physical Ranged DPS (PR)**: Bard, Machinist o Dancer.
7. **1 Magical Ranged DPS (Caster)**: Black Mage, Summoner, Red Mage o Pictomancer.

> [!IMPORTANT]
> **Flex Jobs**: Cada miembro define su **Main Job** y puede opcionalmente registrar **Flex Jobs** (jobs secundarios que domina). Los tanques indican si son **Main Tank**, **Off Tank** o **Ambos**.
> **Sin Jobs Duplicados**: El algoritmo garantiza que en una party de 8 nunca coincidan dos jugadores con el mismo job (para no penalizar la generación de Limit Break).

### C. Prioridad en el Algoritmo de Party: Asistencia al Menor Progreso
- Para evitar estancamientos, el generador de party prioriza a los jugadores que tengan **menor progreso acumulado** (fase más baja o menor porcentaje).
- Si hay más de 8 miembros disponibles en una franja horaria que cubren los roles, el algoritmo seleccionará preferentemente a aquellos que más necesiten practicar la fase correspondiente.
- **Regla estricta de lenguaje**: Queda estrictamente prohibido usar las palabras *"banca"* o *"reserva"* para referirse a cualquier miembro de la FC. Se utilizarán términos como *"Miembros listos para rotar"*, *"Compañeros disponibles"* o simplemente listarlos como opciones alternativas de configuración.

### D. Disponibilidad y Zona Horaria
- **Cuadrícula Flexible de 24 Horas**: Lunes a Domingo, de 00:00 a 23:00.
- **Condición de Party**: Mínimo 1 hora de coincidencia completa entre los 8 roles válidos.
- **Zona Horaria**:
  - Base por defecto: **Hora de Ciudad de México (America/Mexico_City / CST)**.
  - Selector interactivo en la barra superior para cambiar a cualquier zona horaria (UTC, Hora Servidor FFXIV, EST, PST, etc.) recalculando la visualización en tiempo real.

### E. Seguimiento de 5 Fases de UWU
Cada fase se registra de 0% a 100%:
1. **Fase 1: Garuda** (0% - 100%)
2. **Fase 2: Ifrit** (0% - 100%)
3. **Fase 3: Titan** (0% - 100%)
4. **Fase 4: The Ultima Weapon (Predation / Annihilation / Suppression)** (0% - 100%)
5. **Fase 5: The Ultima Weapon (Primal Roulettes / Enrage)** (0% - 100%)
- Métrica de progreso ponderada para ordenar a los miembros (ej. Fase 1 al 100% desbloquea Fase 2; puntaje de progreso total para el algoritmo de prioridad).

---

## 2. Dirección Visual: "Onírico" (Dreamlike / Astral Fantasy)

Para evocar el universo de FFXIV, el mar de estrellas y el resplandor del Éter:
- **Atmósfera**: Fondo animado de auroras astrales y partículas de éter flotantes en tonos índigo, violeta etéreo y destellos celestes (`#060814`, `#10132b`, `#3b1c6e`, `#38bdf8`, `#e879f9`).
- **Glassmorphism Cósmico**: Paneles translúcidos con bordes luminosos y desenfoque sutil (`backdrop-blur-xl`, `border-white/10`).
- **Iconografía y Jobs**: Estilo pulido con colores oficiales de FFXIV (Azul Tank, Verde Healer, Rojo DPS) con auras brillantes.
- **Efectos y Animaciones**: Transiciones de fases con barras de progreso con efecto cristalino y pulso rítmico, modal de login/registro con resplandor astral.

---

## 3. Arquitectura Técnica y Base de Datos (Supabase / Vercel)

- **Framework**: **Next.js 15 (App Router)** + **React 19** + **TypeScript**.
- **Estilos y Componentes**: **Tailwind CSS**, **Framer Motion**, **Lucide React**.
- **Base de Datos**: **PostgreSQL** (compatible con Supabase, con script SQL de inicialización `schema.sql` y seeds de prueba).
- **ORM / Querying**: Driver nativo `pg` o `@supabase/supabase-js` con pooling, más soporte de modo offline/mock para desarrollo y preview inmediata sin fricción.
- **Hashing**: `bcryptjs` para contraseñas de miembros y admin.

### Esquema SQL Relacional (`schema.sql`)
- `members`: `id`, `character_name`, `password_hash`, `tank_stance` (`'MT'`, `'OT'`, `'BOTH'`, `NULL`), `created_at`.
- `member_jobs`: `member_id`, `job_name`, `subrole`, `is_main` (`boolean`).
- `member_progress`: `member_id`, `p1_garuda`, `p2_ifrit`, `p3_titan`, `p4_ultima`, `p5_roulette`, `updated_at`.
- `member_availability`: `member_id`, `day_of_week` (0-6), `hour_slot` (0-23).
- `admins`: `username`, `password_hash`.

---

## 4. Estructura del Proyecto

```
/
├── public/                  # Assets, favicons, iconos
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/        # Login/Registro miembros y admin
│   │   │   ├── members/     # CRUD miembros y perfiles
│   │   │   ├── progress/    # Actualización de progreso de fases
│   │   │   ├── availability/# Gestión de cuadrícula 24h
│   │   │   └── party-finder/# Algoritmo de emparejamiento con prioridad
│   │   ├── admin/           # Panel de administración
│   │   ├── party/           # Vista de Parties posibles y horarios viables
│   │   ├── layout.tsx       # Layout onírico global con fondo de partículas/éter
│   │   └── page.tsx         # Dashboard principal: Progreso FC, ranking, filtros
│   ├── components/
│   │   ├── astral-canvas.tsx# Canvas de partículas y aura onírica
│   │   ├── phase-progress.tsx# Medidor de cristal de 5 fases (UWU)
│   │   ├── availability-grid.tsx # Matriz 24h x 7 días con cambio de timezone
│   │   ├── party-card.tsx   # Visualización de party 8/8 (1 MT, 1 OT, PH, SH, 2 M, PR, C)
│   │   ├── timezone-select.tsx# Selector rápido de zona horaria
│   │   └── modals/          # Modal de registro, login y edición
│   ├── lib/
│   │   ├── db.ts            # Conexión Supabase / Postgres
│   │   ├── party-matcher.ts # Solver de asignación con prioridad a menor progreso
│   │   ├── ffxiv-jobs.ts    # Catálogo de jobs, subroles y colores
│   │   └── timezones.ts     # Utilidades de conversión horaria (CDMX base)
│   └── types/               # Definiciones de TypeScript
├── schema.sql               # Script SQL para crear tablas en Supabase
└── README.md                # Instrucciones completas para despliegue en Vercel + Supabase
```

---

## 5. Plan de Ejecución

1. **Inicialización del Proyecto**:
   - Crear la aplicación Next.js con TypeScript y Tailwind CSS en el directorio de trabajo.
   - Instalar dependencias esenciales: `lucide-react`, `framer-motion`, `bcryptjs`, `@supabase/supabase-js`, `clsx`, `tailwind-merge`.
2. **Definición de Jobs y Reglas de Negocio FFXIV**:
   - Crear `ffxiv-jobs.ts` con todos los jobs de Dawntrail clasificados: Tanks (con MT/OT/Both), Pure Healer, Shield Healer, Melee, Phys Ranged, Caster.
3. **Módulo de Base de Datos y Modo Demo/Local**:
   - Generar `schema.sql` para Supabase.
   - Configurar cliente Supabase / Postgres con fallback a almacenamiento local persistente (para que la app sea inmediatamente operable y testeable localmente mientras se conecta la URL de Supabase).
4. **Algoritmo de Party Matcher**:
   - Implementar el algoritmo en `party-matcher.ts`:
     - Restricción 8/8 estricta: 1 MT, 1 OT, 1 PH, 1 SH, 2 Melee distintos, 1 Phys Ranged, 1 Caster.
     - 0 repeticiones de jobs.
     - Coincidencia mínima de 1 hora.
     - **Función de costo/prioridad**: Ordenar candidatos por menor progreso en UWU para darles preferencia absoluta en el armado de la party.
5. **Componentes UI y Estética Onírica**:
   - Crear el fondo de partículas astrales y gradiente animado en CSS/Canvas.
   - Componente interactivo de progreso de las 5 fases de UWU (Garuda, Ifrit, Titan, Ultima, Enrage).
   - Cuadrícula de disponibilidad 24/7 con selección de zona horaria dinámica.
   - Visualizador de parties encontradas con desglose de roles y suplentes.
6. **Autenticación y Paneles**:
   - Diálogo de autoregistro y login de miembro (con hash bcrypt).
   - Panel de Admin (gestión de miembros, reset de claves, borrado).
7. **Verificación y Pruebas**:
   - Probar casos del algoritmo con datos simulados de miembros de Lux Obscura.
   - Verificar la experiencia visual onírica en navegador mediante subagente de browser.
   - Entregar documentación paso a paso para desplegar en Vercel y Supabase.
