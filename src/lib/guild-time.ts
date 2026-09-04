import { TZDate } from '@date-fns/tz';

/**
 * Zona horaria canónica de la Free Company.
 *
 * Toda hora almacenada en la base de datos (hourSlot de disponibilidad, hourSlot de
 * una party) se interpreta SIEMPRE en esta zona. Es el único marco de referencia:
 * el navegador del miembro y el proceso del servidor pueden estar en cualquier otra
 * zona (en Vercel el servidor corre en UTC) y los horarios deben seguir significando
 * lo mismo para todos.
 *
 * Lo que el miembro elige en el selector del navbar es solo cómo se MUESTRAN esas
 * horas; nunca cómo se guardan.
 */
export const GUILD_TIMEZONE = process.env.NEXT_PUBLIC_GUILD_TIMEZONE || 'America/Mexico_City';

/**
 * Convierte una fecha y hora expresadas en una zona horaria concreta al instante
 * absoluto (Date en UTC) que les corresponde.
 *
 * Reemplaza a `new Date(year, month - 1, day, hour)`, que interpreta los componentes
 * en la hora local del proceso y por tanto daba resultados distintos en tu máquina
 * (CDMX) y en Vercel (UTC).
 */
export function zonedToInstant(
  dateStr: string,
  hour: number = 0,
  minute: number = 0,
  timezone: string = GUILD_TIMEZONE
): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(
    new TZDate(year, month - 1, day, hour, minute, 0, 0, timezone).getTime()
  );
}

/**
 * Fecha 'YYYY-MM-DD' correspondiente a un instante, vista desde una zona horaria.
 */
export function instantToZonedDateStr(
  instant: Date = new Date(),
  timezone: string = GUILD_TIMEZONE
): string {
  // 'en-CA' produce YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/**
 * Hora del día (0-23) de un instante, vista desde una zona horaria.
 */
export function instantToZonedHour(
  instant: Date = new Date(),
  timezone: string = GUILD_TIMEZONE
): number {
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  }).format(instant);
  // Intl puede devolver '24' para medianoche en algunos entornos.
  return Number(hourStr) % 24;
}

/**
 * Día de la semana (0 = Domingo … 6 = Sábado) de un instante, visto desde una zona.
 */
export function instantToZonedDayOfWeek(
  instant: Date = new Date(),
  timezone: string = GUILD_TIMEZONE
): number {
  const dateStr = instantToZonedDateStr(instant, timezone);
  const [year, month, day] = dateStr.split('-').map(Number);
  // Date.UTC evita que la zona del proceso desplace el día.
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Traduce una franja (día de la semana + hora) de la zona de la FC a la zona que el
 * miembro eligió para visualizar. Devuelve el día y la hora ya desplazados, de modo
 * que una party de Viernes 21:00 CDMX se muestre como Sábado 05:00 en Madrid.
 *
 * `referenceDate` fija qué semana se usa para resolver el desfase, lo que importa en
 * los cambios de horario de verano (México y Europa no los aplican en las mismas fechas).
 */
export function shiftSlotToZone(
  dayOfWeek: number,
  hourSlot: number,
  targetTimezone: string,
  referenceDate: Date = new Date()
): { dayOfWeek: number; hourSlot: number; dayShift: number } {
  if (targetTimezone === GUILD_TIMEZONE) {
    return { dayOfWeek, hourSlot, dayShift: 0 };
  }

  // Ancla: la próxima ocurrencia de ese día de la semana, para tener una fecha real
  // sobre la que Intl pueda resolver el desfase vigente (con o sin horario de verano).
  const anchorDateStr = nextDateForDayOfWeek(dayOfWeek, undefined, referenceDate);
  const instant = zonedToInstant(anchorDateStr, hourSlot);

  return {
    dayOfWeek: instantToZonedDayOfWeek(instant, targetTimezone),
    hourSlot: instantToZonedHour(instant, targetTimezone),
    dayShift:
      instantToZonedDayOfWeek(instant, targetTimezone) - dayOfWeek,
  };
}

/**
 * Próxima fecha 'YYYY-MM-DD' para un día de la semana, calculada en la zona de la FC.
 *
 * Si `hourSlot` se indica y ese día es hoy pero la hora ya pasó, salta a la semana
 * siguiente. Vive aquí (y no en date-utils) porque shiftSlotToZone la necesita.
 */
export function nextDateForDayOfWeek(
  targetDayOfWeek: number,
  hourSlot?: number,
  baseInstant: Date = new Date(),
  timezone: string = GUILD_TIMEZONE
): string {
  const todayStr = instantToZonedDateStr(baseInstant, timezone);
  const currentDayOfWeek = instantToZonedDayOfWeek(baseInstant, timezone);
  const currentHour = instantToZonedHour(baseInstant, timezone);

  let diffDays = targetDayOfWeek - currentDayOfWeek;
  if (diffDays < 0) {
    diffDays += 7;
  } else if (diffDays === 0 && hourSlot !== undefined && currentHour >= hourSlot) {
    diffDays = 7;
  }

  return addDaysToDateStr(todayStr, diffDays);
}

/**
 * Suma días a una fecha 'YYYY-MM-DD' sin salir del calendario civil.
 *
 * Se opera en UTC a propósito: sumar días sobre un instante real haría que un cambio
 * de horario de verano moviera la fecha resultante.
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Diferencia en días de calendario entre dos fechas 'YYYY-MM-DD'.
 */
export function diffInDays(fromDateStr: string, toDateStr: string): number {
  const [fy, fm, fd] = fromDateStr.split('-').map(Number);
  const [ty, tm, td] = toDateStr.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86400000);
}

/**
 * Información completa de una semana del calendario civil.
 */
export interface CalendarWeekInfo {
  year: number;
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  formattedRange: string;
  label: string;
}

/**
 * Formatea un rango de fechas de una semana de calendario en texto en español.
 * Ej: '31 ago - 6 sep 2026' o '7 - 13 sep 2026'
 */
export function formatCalendarWeekRange(startDateStr: string, endDateStr: string): string {
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const startD = new Date(Date.UTC(sy, sm - 1, sd, 12));
  const endD = new Date(Date.UTC(ey, em - 1, ed, 12));

  const startMonth = new Intl.DateTimeFormat('es-MX', { month: 'short', timeZone: 'UTC' }).format(startD);
  const endMonth = new Intl.DateTimeFormat('es-MX', { month: 'short', timeZone: 'UTC' }).format(endD);

  if (sy !== ey) {
    return `${sd} ${startMonth} ${sy} - ${ed} ${endMonth} ${ey}`;
  }
  if (sm === em) {
    return `${sd} - ${ed} ${endMonth} ${ey}`;
  }
  return `${sd} ${startMonth} - ${ed} ${endMonth} ${ey}`;
}

/**
 * Calcula las fechas de inicio (lunes) y fin (domingo) para cualquier semana ISO del calendario.
 */
export function getCalendarWeekRange(year: number, weekNumber: number): {
  weekStartDate: string;
  weekEndDate: string;
  formattedRange: string;
} {
  // El 4 de enero siempre pertenece a la semana 1 del año ISO.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // 1 = Lun, 7 = Dom
  const week1Monday = new Date(Date.UTC(year, 0, 4 - (jan4Day - 1)));
  const targetMonday = new Date(week1Monday.getTime() + (weekNumber - 1) * 7 * 86400000);
  const weekStartDate = targetMonday.toISOString().slice(0, 10);
  const weekEndDate = addDaysToDateStr(weekStartDate, 6);
  const formattedRange = formatCalendarWeekRange(weekStartDate, weekEndDate);

  return { weekStartDate, weekEndDate, formattedRange };
}

/**
 * Semana del calendario civil a la que pertenece un instante.
 *
 * Sigue la norma del calendario (semana de lunes a domingo, estándar ISO-8601).
 * La semana se numera de forma unívoca y abarca exactamente de lunes a domingo.
 */
export function getCalendarWeek(
  instant: Date = new Date(),
  timezone: string = GUILD_TIMEZONE
): CalendarWeekInfo {
  const todayStr = instantToZonedDateStr(instant, timezone);
  const dayOfWeek = instantToZonedDayOfWeek(instant, timezone);

  // Retroceder al lunes (1) que abrió la semana del calendario civil.
  const daysSinceMonday = (dayOfWeek - 1 + 7) % 7;
  const weekStartDate = addDaysToDateStr(todayStr, -daysSinceMonday);
  const weekEndDate = addDaysToDateStr(weekStartDate, 6);

  // En ISO 8601, el año y número de semana lo define el jueves central de la semana.
  const thursdayStr = addDaysToDateStr(weekStartDate, 3);
  const [ty, tm, td] = thursdayStr.split('-').map(Number);
  const thursday = new Date(Date.UTC(ty, tm - 1, td));
  const isoYear = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNumber = Math.ceil(
    ((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  const formattedRange = formatCalendarWeekRange(weekStartDate, weekEndDate);
  const label = `Semana ${weekNumber} (${formattedRange})`;

  return {
    year: isoYear,
    weekNumber,
    weekStartDate,
    weekEndDate,
    formattedRange,
    label,
  };
}

/**
 * Alias de compatibilidad hacia getCalendarWeek.
 */
export function getFfxivWeek(
  instant: Date = new Date(),
  timezone: string = GUILD_TIMEZONE
): CalendarWeekInfo {
  return getCalendarWeek(instant, timezone);
}

