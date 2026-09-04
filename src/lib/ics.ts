import { ScheduledParty } from '@/types';
import { getPartyStartDateTime, getPartyEndDateTime } from './date-utils';

/**
 * Escapa caracteres especiales según RFC 5545:
 * - Backslash (\) -> \\
 * - Punto y coma (;) -> \;
 * - Coma (,) -> \,
 * - Saltos de línea -> \n
 */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Plegado de líneas a un máximo de 75 octetos (RFC 5545, Sección 3.1).
 * Las líneas continuadas inician con un espacio CRLF + ' '.
 */
export function foldIcsLine(line: string): string {
  if (Buffer.byteLength(line, 'utf-8') <= 75) return line;

  let result = '';
  let currentBytes = 0;
  let isFirst = true;

  for (const char of line) {
    const charBytes = Buffer.byteLength(char, 'utf-8');
    const limit = isFirst ? 75 : 74; // El espacio inicial de continuación ocupa 1 octeto

    if (currentBytes + charBytes > limit) {
      result += '\r\n ' + char;
      currentBytes = 1 + charBytes;
      isFirst = false;
    } else {
      result += char;
      currentBytes += charBytes;
    }
  }

  return result;
}

function formatUtcIcs(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * Genera el archivo .ics en estricto cumplimiento con RFC 5545:
 * - Saltos de línea CRLF (\r\n)
 * - Plegado a 75 octetos
 * - UID estable para actualizar eventos sin duplicar ({party.id}@uwu-tracker)
 * - DTSTART y DTEND resueltos en instantes UTC desde la hora en la zona de la FC
 * - VALARM con aviso 1 hora antes (-PT1H)
 */
export function generatePartyIcs(party: ScheduledParty): string {
  const start = getPartyStartDateTime(party.scheduledDate, party.hourSlot);
  const end = getPartyEndDateTime(party.scheduledDate, party.hourSlot, party.durationHours);
  const now = new Date();

  const summary = escapeIcsText("The Weapon's Refrain (UWU) - Lux Obscura");

  const memberList = party.members
    .map(m => `${m.assignedRole}: ${m.characterName} (${m.assignedJob})`)
    .join('\n');

  const descriptionParts = [
    'Incursión Oficial de Lux Obscura',
    party.notes ? `Notas: ${party.notes}` : '',
    '',
    'Alineación:',
    memberList,
  ].filter(Boolean);

  const description = escapeIcsText(descriptionParts.join('\n'));

  const rawLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lux Obscura//UWU Tracker//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${party.id}@uwu-tracker`,
    `DTSTAMP:${formatUtcIcs(now)}`,
    `DTSTART:${formatUtcIcs(start)}`,
    `DTEND:${formatUtcIcs(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'LOCATION:Final Fantasy XIV - Eorzea',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Incursión UWU en 1 hora',
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return rawLines.map(foldIcsLine).join('\r\n') + '\r\n';
}
