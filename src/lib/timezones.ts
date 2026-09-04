import { GUILD_TIMEZONE, shiftSlotToZone } from './guild-time';

export interface TimezoneOption {
  id: string;
  name: string;
  label: string;
  utcOffset: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { id: 'America/Mexico_City', name: 'Ciudad de México (CDMX)', label: 'CDMX (UTC-6)', utcOffset: '-06:00' },
  { id: 'UTC', name: 'Server Time / UTC', label: 'FFXIV Server (UTC)', utcOffset: '+00:00' },
  { id: 'America/New_York', name: 'Eastern Time (US / CAN)', label: 'EDT / EST (UTC-4/-5)', utcOffset: '-04:00' },
  { id: 'America/Los_Angeles', name: 'Pacific Time (US / CAN)', label: 'PDT / PST (UTC-7/-8)', utcOffset: '-07:00' },
  { id: 'America/Bogota', name: 'Bogotá / Lima / Quito', label: 'COT (UTC-5)', utcOffset: '-05:00' },
  { id: 'America/Argentina/Buenos_Aires', name: 'Buenos Aires / Santiago', label: 'ART / CLT (UTC-3)', utcOffset: '-03:00' },
  { id: 'Europe/Madrid', name: 'Madrid / París / Europa Central', label: 'CET / CEST (UTC+1/+2)', utcOffset: '+02:00' },
];

export const DAYS_OF_WEEK = [
  { id: 0, name: 'Domingo', short: 'Dom' },
  { id: 1, name: 'Lunes', short: 'Lun' },
  { id: 2, name: 'Martes', short: 'Mar' },
  { id: 3, name: 'Miércoles', short: 'Mié' },
  { id: 4, name: 'Jueves', short: 'Jue' },
  { id: 5, name: 'Viernes', short: 'Vie' },
  { id: 6, name: 'Sábado', short: 'Sáb' },
];

export function formatHourSlot(hour: number): string {
  const h = hour.toString().padStart(2, '0');
  const nextH = ((hour + 1) % 24).toString().padStart(2, '0');
  return `${h}:00 - ${nextH}:00`;
}

export function formatHourOnly(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Etiqueta de una hora de la FC ya convertida a la zona que el miembro eligió ver.
 * Devuelve además el desplazamiento de día, para poder avisar de que la franja cae
 * en la víspera o al día siguiente en esa zona.
 */
export function formatHourInZone(
  dayOfWeek: number,
  hourSlot: number,
  timezone: string
): { label: string; dayOfWeek: number; dayShift: number } {
  const shifted = shiftSlotToZone(dayOfWeek, hourSlot, timezone);

  return {
    label: formatHourOnly(shifted.hourSlot),
    dayOfWeek: shifted.dayOfWeek,
    dayShift: shifted.dayShift,
  };
}

/**
 * Texto corto que sitúa una franja en la zona elegida, p. ej. 'Sáb 05:00'.
 * Si la zona elegida es la de la FC, no añade ruido y devuelve solo la hora.
 */
export function describeSlotInZone(
  dayOfWeek: number,
  hourSlot: number,
  timezone: string
): string {
  if (timezone === GUILD_TIMEZONE) return formatHourOnly(hourSlot);

  const shifted = formatHourInZone(dayOfWeek, hourSlot, timezone);
  const day = DAYS_OF_WEEK.find(d => d.id === shifted.dayOfWeek);

  return `${day?.short ?? ''} ${shifted.label}`.trim();
}

/** Horas habituales de incursiones / raid prime time (17:00 a 23:00) */
export const RAID_HOURS = [17, 18, 19, 20, 21, 22, 23];

/** 24 horas del día ordenadas iniciando a las 17:00 */
export const FULL_HOURS_START_17 = Array.from({ length: 24 }, (_, i) => (17 + i) % 24);

/**
 * Calcula las casillas comprendidas entre dos coordenadas de la cuadrícula
 * basándose en su POSICIÓN espacial (columna y fila), no en orden cronológico lineal.
 */
export function computeGridPositionRange(
  cellA: { day: number; hour: number },
  cellB: { day: number; hour: number },
  displayedHours: number[] = RAID_HOURS,
  daysList: { id: number }[] = DAYS_OF_WEEK
): { day: number; hour: number }[] {
  const colA = daysList.findIndex(d => d.id === cellA.day);
  const colB = daysList.findIndex(d => d.id === cellB.day);
  const rowA = displayedHours.indexOf(cellA.hour);
  const rowB = displayedHours.indexOf(cellB.hour);

  if (colA === -1 || colB === -1 || rowA === -1 || rowB === -1) {
    return [];
  }

  const minCol = Math.min(colA, colB);
  const maxCol = Math.max(colA, colB);
  const minRow = Math.min(rowA, rowB);
  const maxRow = Math.max(rowA, rowB);

  const result: { day: number; hour: number }[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    const hour = displayedHours[r];
    for (let c = minCol; c <= maxCol; c++) {
      result.push({ day: daysList[c].id, hour });
    }
  }

  return result;
}

export { GUILD_TIMEZONE };

