import {
  GUILD_TIMEZONE,
  addDaysToDateStr,
  diffInDays,
  instantToZonedDateStr,
  instantToZonedDayOfWeek,
  nextDateForDayOfWeek,
  zonedToInstant,
} from './guild-time';

export {
  GUILD_TIMEZONE,
  getCalendarWeek,
  getCalendarWeekRange,
  formatCalendarWeekRange,
  getFfxivWeek,
} from './guild-time';
export type { CalendarWeekInfo } from './guild-time';

/**
 * Fecha de hoy en formato 'YYYY-MM-DD' según la zona indicada (por defecto, la de la FC).
 */
export function getTodayDateString(timezone: string = GUILD_TIMEZONE): string {
  return instantToZonedDateStr(new Date(), timezone);
}

/**
 * Próxima fecha de calendario (YYYY-MM-DD) para un día de la semana
 * (0 = Domingo … 6 = Sábado), resuelta en la zona horaria de la FC.
 */
export function getNextDateForDayOfWeek(
  targetDayOfWeek: number,
  hourSlot?: number,
  baseInstant: Date = new Date()
): string {
  return nextDateForDayOfWeek(targetDayOfWeek, hourSlot, baseInstant);
}

/**
 * Formatea 'YYYY-MM-DD' en texto en español.
 * Ej: '2026-09-04' -> 'viernes, 4 de septiembre de 2026'
 */
export function formatDateToSpanish(dateStr: string, short = false): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;

  // Mediodía UTC: lo bastante lejos de ambas medianoches para que ninguna zona
  // desplace la fecha mostrada.
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (isNaN(date.getTime())) return dateStr;

  return new Intl.DateTimeFormat(
    'es-MX',
    short
      ? { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }
      : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
  ).format(date);
}

/**
 * Instante exacto de inicio de una party (su hora se interpreta en la zona de la FC).
 */
export function getPartyStartDateTime(dateStr: string, hourSlot: number): Date {
  return zonedToInstant(dateStr, hourSlot);
}

/**
 * Instante exacto de finalización de una party.
 */
export function getPartyEndDateTime(
  dateStr: string,
  hourSlot: number,
  durationHours: number = 1
): Date {
  const start = getPartyStartDateTime(dateStr, hourSlot);
  return new Date(start.getTime() + durationHours * 3600_000);
}

/**
 * Instante límite para confirmar asistencia (por defecto, 5 h antes del inicio).
 */
export function getConfirmationDeadline(
  dateStr: string,
  hourSlot: number,
  deadlineHoursBefore: number = 5
): Date {
  const start = getPartyStartDateTime(dateStr, hourSlot);
  return new Date(start.getTime() - deadlineHoursBefore * 3600_000);
}

/**
 * ¿Sigue abierta la ventana de confirmación?
 */
export function isConfirmationWindowOpen(
  dateStr: string,
  hourSlot: number,
  deadlineHoursBefore: number = 5,
  now: Date = new Date()
): boolean {
  return now.getTime() < getConfirmationDeadline(dateStr, hourSlot, deadlineHoursBefore).getTime();
}

/**
 * Detalle del tiempo restante hasta el límite de confirmación.
 */
export function getRemainingConfirmationInfo(
  dateStr: string,
  hourSlot: number,
  deadlineHoursBefore: number = 5,
  now: Date = new Date(),
  displayTimezone: string = GUILD_TIMEZONE
): {
  isOpen: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  deadlineLabel: string;
} {
  const deadline = getConfirmationDeadline(dateStr, hourSlot, deadlineHoursBefore);
  const diffMs = deadline.getTime() - now.getTime();

  const totalMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  return {
    isOpen: diffMs > 0,
    hoursRemaining: Math.floor(totalMinutes / 60),
    minutesRemaining: totalMinutes % 60,
    deadlineLabel: new Intl.DateTimeFormat('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: displayTimezone,
    }).format(deadline),
  };
}

/**
 * ¿Ya pasó una party?
 *
 * Se compara un único instante absoluto contra otro. La versión anterior mezclaba la
 * fecha de hoy en CDMX con un Date construido en la hora local del proceso, de modo
 * que servidor y navegador podían discrepar sobre si una party seguía vigente.
 */
export function isPartyExpired(
  party: {
    scheduledDate?: string;
    dayOfWeek: number;
    hourSlot: number;
    durationHours?: number;
    status: string;
  },
  now: Date = new Date()
): boolean {
  if (party.status === 'CANCELLED' || party.status === 'EXPIRED' || party.status === 'COMPLETED') {
    return true;
  }

  // Sin fecha no hay forma de situarla en el tiempo (caso heredado).
  if (!party.scheduledDate) return false;

  const end = getPartyEndDateTime(
    party.scheduledDate,
    party.hourSlot,
    party.durationHours || 1
  );

  return now.getTime() >= end.getTime();
}

/**
 * Etiqueta relativa ('¡Hoy!', 'Mañana', 'En 3 días', …).
 */
export function getRelativeDateLabel(
  dateStr: string,
  todayStr: string = getTodayDateString()
): string {
  if (dateStr === todayStr) return '¡Hoy!';

  const diffDays = diffInDays(todayStr, dateStr);

  if (diffDays === 1) return 'Mañana';
  if (diffDays > 1) return `En ${diffDays} días`;
  if (diffDays === -1) return 'Ayer';
  if (diffDays < -1) return `Hace ${Math.abs(diffDays)} días`;

  return dateStr;
}

/**
 * Los 7 días de la semana en curso con su fecha, resueltos en la zona de la FC.
 */
export function getCurrentWeekDates(baseInstant: Date = new Date()): {
  dayOfWeek: number;
  dateStr: string;
  shortLabel: string;
  isToday: boolean;
}[] {
  const todayStr = instantToZonedDateStr(baseInstant);
  // El domingo (día 0) que abre la semana en curso.
  const sundayStr = addDaysToDateStr(todayStr, -instantToZonedDayOfWeek(baseInstant));

  return Array.from({ length: 7 }, (_, i) => {
    const dateStr = addDaysToDateStr(sundayStr, i);
    const [y, m, d] = dateStr.split('-').map(Number);

    return {
      dayOfWeek: i,
      dateStr,
      shortLabel: new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(y, m - 1, d, 12))),
      isToday: dateStr === getTodayDateString(),
    };
  });
}
