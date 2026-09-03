import { ScheduledParty } from '@/types';

/**
 * Retorna la fecha actual en formato 'YYYY-MM-DD' según la zona horaria indicada.
 */
export function getTodayDateString(timezone: string = 'America/Mexico_City'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // Formato YYYY-MM-DD
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Calcula la fecha calendario más próxima (YYYY-MM-DD) para un día de la semana específico (0 = Domingo, 1 = Lunes, ..., 6 = Sábado).
 * Si el día coincide con hoy pero la hora ya pasó o se desea la siguiente ocurrencia, busca el siguiente.
 */
export function getNextDateForDayOfWeek(
  targetDayOfWeek: number,
  hourSlot?: number,
  baseDate: Date = new Date()
): string {
  const currentDayOfWeek = baseDate.getDay(); // 0 = Domingo, 1 = Lunes, ...
  let diffDays = targetDayOfWeek - currentDayOfWeek;

  if (diffDays < 0) {
    diffDays += 7;
  } else if (diffDays === 0 && hourSlot !== undefined) {
    // Si es hoy, verificar si la hora ya pasó
    if (baseDate.getHours() >= hourSlot) {
      diffDays = 7; // Próxima semana
    }
  }

  const result = new Date(baseDate);
  result.setDate(result.getDate() + diffDays);

  const year = result.getFullYear();
  const month = (result.getMonth() + 1).toString().padStart(2, '0');
  const day = result.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha YYYY-MM-DD en texto amigable en español.
 * Ej: '2026-09-04' -> 'Viernes, 4 de Septiembre de 2026'
 */
export function formatDateToSpanish(dateStr: string, short = false): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);

  if (isNaN(date.getTime())) return dateStr;

  if (short) {
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);
  }

  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Retorna el objeto Date exacto de inicio de una party a partir de su scheduledDate y hourSlot.
 */
export function getPartyStartDateTime(dateStr: string, hourSlot: number): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, hourSlot, 0, 0, 0);
}

/**
 * Retorna el objeto Date exacto de finalización de una party.
 */
export function getPartyEndDateTime(dateStr: string, hourSlot: number, durationHours: number = 1): Date {
  const start = getPartyStartDateTime(dateStr, hourSlot);
  return new Date(start.getTime() + durationHours * 60 * 60 * 1000);
}

/**
 * Calcula la fecha y hora límite de confirmación (5 horas antes del inicio de la party).
 */
export function getConfirmationDeadline(
  dateStr: string,
  hourSlot: number,
  deadlineHoursBefore: number = 5
): Date {
  const start = getPartyStartDateTime(dateStr, hourSlot);
  return new Date(start.getTime() - deadlineHoursBefore * 60 * 60 * 1000);
}

/**
 * Determina si la ventana de confirmación sigue abierta (al menos 5 horas antes de la party).
 */
export function isConfirmationWindowOpen(
  dateStr: string,
  hourSlot: number,
  deadlineHoursBefore: number = 5,
  now: Date = new Date()
): boolean {
  const deadline = getConfirmationDeadline(dateStr, hourSlot, deadlineHoursBefore);
  return now.getTime() < deadline.getTime();
}

/**
 * Retorna información detallada del tiempo restante hasta el límite de confirmación (5h antes).
 */
export function getRemainingConfirmationInfo(
  dateStr: string,
  hourSlot: number,
  deadlineHoursBefore: number = 5,
  now: Date = new Date()
): {
  isOpen: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  deadlineLabel: string;
} {
  const deadline = getConfirmationDeadline(dateStr, hourSlot, deadlineHoursBefore);
  const diffMs = deadline.getTime() - now.getTime();
  const isOpen = diffMs > 0;

  const totalMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
  const hoursRemaining = Math.floor(totalMinutes / 60);
  const minutesRemaining = totalMinutes % 60;

  const deadlineLabel = new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(deadline);

  return {
    isOpen,
    hoursRemaining,
    minutesRemaining,
    deadlineLabel,
  };
}

/**
 * Determina si una party ha expirado (su día ha pasado, o concluyó su horario de incursión).
 * Si ha pasado el día o la hora de finalización, se considera expirada.
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

  // Si no tiene fecha definida, no podemos determinar fecha exacta (caso legacy)
  if (!party.scheduledDate) {
    return false;
  }

  const todayStr = getTodayDateString();

  // Si la fecha agendada es menor que hoy (el día ya pasó)
  if (party.scheduledDate < todayStr) {
    return true;
  }

  // Si es hoy, verificar si ya concluyó la duración de la incursión
  if (party.scheduledDate === todayStr) {
    const endDateTime = getPartyEndDateTime(
      party.scheduledDate,
      party.hourSlot,
      party.durationHours || 1
    );
    return now.getTime() >= endDateTime.getTime();
  }

  return false;
}

/**
 * Retorna etiqueta de tiempo relativo (ej. "¡Hoy!", "Mañana", "En 3 días", "Pasada").
 */
export function getRelativeDateLabel(dateStr: string, todayStr: string = getTodayDateString()): string {
  if (dateStr === todayStr) {
    return '¡Hoy!';
  }

  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const [pY, pM, pD] = dateStr.split('-').map(Number);

  const todayDate = new Date(tY, tM - 1, tD);
  const partyDate = new Date(pY, pM - 1, pD);

  const diffDays = Math.round((partyDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Mañana';
  if (diffDays > 1) return `En ${diffDays} días`;
  if (diffDays === -1) return 'Ayer';
  if (diffDays < -1) return `Hace ${Math.abs(diffDays)} días`;

  return dateStr;
}

/**
 * Retorna un mapa de los 7 días de la semana actual con sus fechas correspondientes (YYYY-MM-DD y etiqueta corta).
 */
export function getCurrentWeekDates(baseDate: Date = new Date()): {
  dayOfWeek: number;
  dateStr: string;
  shortLabel: string;
  isToday: boolean;
}[] {
  const currentDay = baseDate.getDay(); // 0 = Domingo
  const todayStr = getTodayDateString();
  const weekDays = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    const diff = i - currentDay;
    d.setDate(d.getDate() + diff);

    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const shortLabel = new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
    }).format(d);

    weekDays.push({
      dayOfWeek: i,
      dateStr,
      shortLabel,
      isToday: dateStr === todayStr,
    });
  }

  return weekDays;
}
