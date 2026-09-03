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
