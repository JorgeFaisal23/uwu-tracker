# Plan: Fase 5 — Mejoras de producto del UWU Tracker

## Contexto

Las fases 1 a 4 del plan anterior ya están hechas y verificadas: persistencia en Supabase,
sesiones firmadas en cookie `httpOnly` con autorización por ruta, un único marco horario
(la zona de la FC), solver con branch and bound, y 58 tests que pasan también con `TZ=UTC`.

Lo que queda es la capa que la Fase 1-4 no tocó: **la app es correcta pero todavía no
empuja a nadie a usarla**. Tres huecos concretos:

- Una franja donde faltan personas o un rol simplemente **desaparece** de la vista. Nadie
  sabe qué ajustar en su disponibilidad para desbloquear una incursión.
- Una party oficializada **solo existe dentro de la app**. La FC vive en Discord y en el
  calendario del teléfono; hay que ir a buscarla.
- La cuadrícula de disponibilidad son 168 celdas con `min-w-[850px]`: en un teléfono es un
  scroll horizontal de casillas diminutas, y es justo donde la gente la llenaría.

**Resultado buscado:** que la app diga qué falta para que haya raid, que la incursión
llegue sola a Discord y al calendario, y que marcar disponibilidad se pueda hacer desde
el móvil.

> **Estado del repositorio al planificar:** [`src/lib/timezones.ts`](src/lib/timezones.ts)
> ya expone `RAID_HOURS`, `FULL_HOURS_START_17` y `computeGridPositionRange` (con tests),
> pero [`availability-grid.tsx`](src/components/availability-grid.tsx) todavía no los usa.
> El punto 6 construye sobre esos helpers en lugar de inventar un camino paralelo.

---

## 1. Diagnóstico de quórum ("falta 1 Shield Healer")

> **Corrección al plan anterior.** Decía que se resolvía "con el conteo por subrol que el
> solver ya construye". Eso es incorrecto y daría respuestas falsas: un contador por subrol
> cuenta dos veces a quien tiene flex jobs en subroles distintos. Con un AST que lleva SGE
> de flex, los contadores dicen `PURE_HEALER: 1 ✓` y `SHIELD_HEALER: 1 ✓`, pero esa persona
> no puede ocupar los dos puestos y no hay party.

La respuesta exacta es un **emparejamiento bipartito máximo** entre los 8 puestos y los
miembros disponibles. Con 8 puestos, el algoritmo de Kuhn (caminos aumentantes) son unas 25
líneas y se ejecuta en microsegundos. Si el emparejamiento máximo es 8 hay cobertura de
roles; si es menor, **los puestos que quedan sin emparejar son exactamente lo que falta**,
sin sobreestimar ni inventar.

### Archivos

| Archivo | Cambio |
|---|---|
| [`src/lib/party-matcher.ts`](src/lib/party-matcher.ts) | Nueva función exportada `diagnoseSlot(...)`. Reutiliza `buildCandidates` (ya existe, hoy privada) y `SLOT_SPECS`; hay que exportar o extraer `buildCandidates` para no duplicar la lógica de main/flex jobs y posturas de tanque. |
| [`src/app/api/parties/route.ts`](src/app/api/parties/route.ts) | El `GET` añade `nearMissSlots` al JSON. |
| [`src/components/party-finder-view.tsx`](src/components/party-finder-view.tsx) | Sección nueva bajo el estado vacío de `viableEntries.length === 0` (línea ~491) y también cuando sí hay franjas viables. |

### Forma del resultado

```ts
interface SlotDiagnostic {
  dayOfWeek: number;
  hourSlot: number;
  availableCount: number;
  missingSlots: SlotRole[];           // puestos sin cubrir, del emparejamiento
  reason: 'FALTAN_PERSONAS' | 'FALTAN_ROLES' | 'JOBS_REPETIDOS';
}
```

Los tres `reason` dan mensajes distintos y son los tres casos reales:

- **`FALTAN_PERSONAS`** — hay menos de 8 disponibles.
  *"Faltan 2 personas en esta franja."*
- **`FALTAN_ROLES`** — hay 8 o más pero el emparejamiento falla.
  *"Hay 9 disponibles, pero nadie puede cubrir Shield Healer."*
- **`JOBS_REPETIDOS`** — el emparejamiento da 8 y aun así el solver no encontró party. Es
  el caso residual: el emparejamiento ignora la regla de no repetir job, así que puede
  decir que hay cobertura cuando dos personas solo comparten el mismo job. Mensaje honesto:
  *"Los roles están cubiertos, pero se repite un job."*

**Umbral:** diagnosticar solo franjas con **6 o más disponibles**. Por debajo el mensaje es
ruido, y evita recorrer las 168 franjas. Ordenar por cercanía al quórum y mostrar las 5
mejores.

### Tests

En [`src/lib/__tests__/party-matcher.test.ts`](src/lib/__tests__/party-matcher.test.ts):

1. 7 disponibles con composición perfecta → `FALTAN_PERSONAS`, `availableCount: 7`.
2. 9 disponibles sin ningún Shield Healer → `FALTAN_ROLES`, `missingSlots: ['SH']`.
3. **El caso que rompe el conteo ingenuo:** 8 disponibles donde una sola persona es el
   único Pure Healer y el único Shield Healer (AST con flex SGE) → debe reportar
   `FALTAN_ROLES` con un puesto de healer sin cubrir, no "todo correcto".
4. 8 disponibles cuyos dos melees solo tienen SAM → `JOBS_REPETIDOS`.

---

## 2. Webhook de Discord

**Decisión tomada:** se menciona el rol **`@UWU`**, no a cada convocado. Evita añadir un
`discord_user_id` por miembro y no requiere ninguna migración de esquema.

### Archivos

| Archivo | Cambio |
|---|---|
| `src/lib/discord.ts` *(nuevo, `server-only`)* | `notifyPartyScheduled(party)` y `notifyPartyCancelled(party)`. |
| [`src/app/api/parties/route.ts`](src/app/api/parties/route.ts) | Llamadas en `POST` y `DELETE`. |
| [`.env.example`](.env.example) + [`README.md`](README.md) | `DISCORD_WEBHOOK_URL` y `DISCORD_UWU_ROLE_ID`. |

### Tres detalles que hay que hacer bien

1. **No bloquear la respuesta.** Usar `after()` de `next/server`
   (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`), que está
   pensado exactamente para esto y funciona en Route Handlers. Una promesa suelta sin
   `after()` puede morir cuando la función serverless devuelve la respuesta.
2. **Fallar en silencio.** Si Discord está caído o el webhook está mal, se registra en el
   servidor y la party se oficializa igual. Nunca debe tumbar la petición.
3. **`allowed_mentions` explícito.** El campo `notes` de la party lo escribe el admin en
   texto libre y va dentro del mensaje. Sin
   `allowed_mentions: { roles: [ROLE_ID], parse: [] }`, escribir `@everyone` en las notas
   haría que Discord notifique a todo el servidor. Con la lista blanca, solo se menciona
   `@UWU` y cualquier otra mención del texto queda inerte.

Si `DISCORD_WEBHOOK_URL` no está definida, la función no hace nada: la app funciona igual
sin Discord configurado.

---

## 3. Copiar composición al portapapeles

**Archivo:** `src/lib/format-party.ts` *(nuevo)* con `formatPartyForDiscord(party): string`.

Es **el mismo formateador que usa el webhook** (punto 2): una sola definición de cómo se ve
una party escrita, para que el mensaje automático y el que alguien pega a mano sean
idénticos. Vive fuera de `discord.ts` para que el cliente pueda importarlo sin arrastrar
`server-only`.

Botón en [`upcoming-party-banner.tsx`](src/components/upcoming-party-banner.tsx) y en las
parties activas de [`party-finder-view.tsx`](src/components/party-finder-view.tsx).
`navigator.clipboard.writeText` con `try/catch`: en contextos sin permiso falla, así que el
fallback es mostrar el texto en un `<textarea>` seleccionado para copiar a mano.

---

## 4. Exportar la incursión a `.ics`

**Archivos:** `src/app/api/parties/[id]/calendar.ics/route.ts` *(nuevo)*, más `src/lib/ics.ts`
con el generador.

Aquí el trabajo de la Fase 3 se cobra solo: `getPartyStartDateTime` y `getPartyEndDateTime`
de [`date-utils.ts`](src/lib/date-utils.ts) ya devuelven **instantes absolutos** resueltos
en la zona de la FC, que es exactamente lo que pide un `DTSTART` en UTC. No hay conversión
que reinventar; el `.ics` cae en el calendario de cada quien ya en su hora local.

### Cuatro detalles que rompen los parsers si se ignoran

- Saltos de línea **CRLF**, no LF.
- Plegado de líneas a 75 octetos.
- `UID` **estable** (`{party.id}@uwu-tracker`), para que volver a descargar actualice el
  evento en vez de duplicarlo.
- Escapar `,`, `;` y `\n` en `SUMMARY` y `DESCRIPTION` (las notas del admin son texto libre).

Incluye un `VALARM` de aviso 1 hora antes. La ruta exige sesión iniciada (`requireSession`).

---

## 5. Equidad de rotación

**Datos: ya están.** `party_schedule_members` guarda `confirmation_status`, y una party se
considera jugada cuando su hora de fin pasó (`isPartyExpired`). No hace falta tocar el
esquema ni marcar `COMPLETED` a mano.

| Archivo | Cambio |
|---|---|
| [`src/lib/storage.ts`](src/lib/storage.ts) | `getAttendanceCounts(): Promise<Record<string, number>>`, contando filas con `confirmation_status = 'CONFIRMED'` de parties ya concluidas. |
| [`src/app/page.tsx`](src/app/page.tsx) | Una insignia "3 incursiones" en cada tarjeta del roster. |

### Sobre meterlo en el solver — con cuidado

El branch and bound de [`party-matcher.ts`](src/lib/party-matcher.ts) poda con una cota
inferior construida **solo** sobre el progreso. Si la asistencia entra como factor
ponderado dentro del score, la cota deja de ser admisible y la poda puede descartar la
party óptima, que es justo el bug que arreglamos en la Fase 3.

Por eso entra **únicamente como tercer criterio de desempate** en `compareCombinations`
(después de `totalProgressScore` y `mainJobsCount`), donde no afecta a la cota. Si más
adelante quieres que pese de verdad, lo correcto es un **reordenamiento opcional de los
resultados ya devueltos**, activable por el admin desde la interfaz, sin tocar la búsqueda.

Encaja con la regla de lenguaje del proyecto: nunca "banca", sino *compañeros listos para
rotar*.

---

## 6. Vista móvil de la disponibilidad

**Construir sobre lo que ya existe.** `RAID_HOURS` (17:00–23:00), `FULL_HOURS_START_17` y
`computeGridPositionRange` ya están en [`timezones.ts`](src/lib/timezones.ts) con tests,
pero [`availability-grid.tsx`](src/components/availability-grid.tsx) sigue con
`grid-cols-8` y `min-w-[850px]` (línea 171) y no los usa.

- **Escritorio:** pasar la cuadrícula a `RAID_HOURS` por defecto (7 filas en vez de 24) con
  un interruptor "ver las 24 horas" que cambia a `FULL_HOURS_START_17`. Solo eso ya elimina
  el 70% de las celdas. Conectar `computeGridPositionRange` para permitir arrastrar y
  seleccionar un rectángulo de casillas.
- **Móvil (`< sm`):** un día a la vez. Selector de día reutilizando `DAYS_OF_WEEK`, y debajo
  una columna de horas con casillas grandes. Los atajos "Noches" y "Borrar" ya existen en el
  componente y se reaprovechan.
- **Sin desajuste de hidratación:** renderizar ambas vistas y alternarlas con Tailwind
  (`sm:hidden` / `hidden sm:block`), no con `window.matchMedia`. El estado
  (`userSelectedSlots`) ya vive en el componente y lo comparten las dos.

---

## Orden de ejecución

1. **Punto 1** (diagnóstico) — el de mayor valor y sin dependencias externas.
2. **Punto 6** (móvil) — desbloquea la entrada de datos que alimenta al punto 1.
3. **Puntos 3 y 4** (portapapeles y `.ics`) — el formateador compartido lo necesita el 2.
4. **Punto 2** (Discord) — requiere que tengas el webhook y el ID del rol `@UWU`.
5. **Punto 5** (equidad) — el más opinable; conviene verlo funcionando antes de decidir
   cuánto debe pesar.

---

## Verificación

1. `npm run lint && npx tsc --noEmit && npm test && npm run test:utc` — todo en verde.
2. **Diagnóstico:** con el roster de ejemplo cargado
   (`node --env-file=.env.local scripts/seed.mjs`), quitar la disponibilidad del único
   Shield Healer en una franja y comprobar que aparece *"nadie puede cubrir Shield Healer"*
   en vez de que la franja desaparezca. Añadir el caso AST-con-flex-SGE como test unitario.
3. **Móvil:** abrir la app con el emulador del navegador a 390 px y marcar disponibilidad
   sin scroll horizontal. Verificar que lo marcado en móvil se ve en escritorio.
4. **Portapapeles:** copiar una party y pegarla en Discord; los 8 personajes, sus jobs y la
   fecha deben leerse bien.
5. **`.ics`:** descargar el archivo e importarlo en Google Calendar. La incursión debe caer
   a las 21:00 CDMX y mostrarse en la hora local de quien lo importe. Volver a importarlo no
   debe crear un duplicado.
6. **Discord:** oficializar una party de prueba y comprobar que llega al canal, que menciona
   `@UWU`, y que escribir `@everyone` en las notas **no** notifica a todo el servidor.
7. **Discord caído:** poner una `DISCORD_WEBHOOK_URL` inválida y oficializar una party: debe
   crearse igualmente y solo registrar el error en el servidor.
8. **Equidad:** con dos parties pasadas confirmadas, comprobar que el contador de asistencia
   sale en el roster y que el desempate solo cambia el orden cuando progreso y main jobs
   empatan.
